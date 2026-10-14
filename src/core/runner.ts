import * as fs from 'fs';
import * as path from 'path';
import {
  BetterFrontConfig,
  AuditRunSummary,
  ViewportAuditResult,
  ViewportDefinition,
  VisualDefect,
  UnsizedMediaDefect,
  BrokenLinkDefect,
  LowContrastDefect,
  UatRunResult,
  UatScenario
} from '../types/index.js';
import { BrowserPool } from './browserPool.js';
import { CaptureRecorder } from './captureRecorder.js';
import { AutonomousCrawler } from '../agent/crawler.js';
import { detectTextCollisions } from '../inspectors/layout/textCollision.js';
import { detectHorizontalBleed } from '../inspectors/layout/horizontalBleed.js';
import { detectContainerClipping } from '../inspectors/layout/containerClipping.js';
import { detectInteractiveOcclusion } from '../inspectors/layout/interactiveOcclusion.js';
import { detectUnsizedMedia } from '../inspectors/layout/unsizedMedia.js';
import { runBreakpointSweep } from '../inspectors/layout/breakpointSweeper.js';
import { auditPageLinks } from '../inspectors/network/linkChecker.js';
import { auditColorContrast } from '../inspectors/a11y/colorContrast.js';
import {
  attachClsObserver,
  extractCapturedLayoutShifts,
  extractCwvMetrics
} from '../inspectors/perf/clsObserver.js';
import { runLighthouseAudit } from '../inspectors/perf/lighthouseRunner.js';
import { auditTouchTargets } from '../inspectors/a11y/touchTargets.js';
import { runTextZoomStressTest } from '../inspectors/a11y/textZoom.js';
import { runAxeAudit } from '../inspectors/a11y/axeRunner.js';
import { VlmClient } from '../vision/vlmClient.js';
import { ScoringEngine } from '../reporter/scoring.js';
import { generateHtmlReport } from '../reporter/html.js';
import {
  saveJsonSummary,
  saveSarifReport,
  saveJunitReport,
  saveMarkdownReport
} from '../reporter/json.js';
import { UatRunner } from '../uat/uatRunner.js';
import { generateUatScenarioFromPage } from '../uat/generator.js';
import { UAT_WORKFLOW_TEMPLATES, getUatTemplate } from '../uat/templates.js';

export class AuditRunner {
  private browserPool: BrowserPool;
  private vlmClient: VlmClient;
  private scoringEngine = new ScoringEngine();

  constructor(private config: BetterFrontConfig) {
    this.browserPool = new BrowserPool({
      browserEngine: config.browserEngine || 'chromium'
    });
    this.vlmClient = new VlmClient(
      config.layoutEngine.vlmProvider,
      config.layoutEngine.vlmApiKey,
      config.layoutEngine.vlmModel
    );
  }

  public async run(): Promise<AuditRunSummary> {
    const startTime = Date.now();
    const concurrency = Math.max(1, this.config.concurrency || 3);

    console.log(`\n======================================================`);
    console.log(`🛡️  BetterFront Audit Starting`);
    console.log(`Target:      ${this.config.targetUrl}`);
    console.log(`Preset:      ${this.config.preset || 'custom'}`);
    console.log(`Engine:      ${this.config.browserEngine || 'chromium'} (Concurrency: ${concurrency})`);
    console.log(`Viewports:   ${this.config.viewports.map((v) => v.name).join(', ')}`);
    console.log(`======================================================\n`);

    const artifactsDir = path.resolve(this.config.recording.artifactsDir);
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    const viewportResults: ViewportAuditResult[] = new Array(this.config.viewports.length);
    const uatResults: UatRunResult[] = [];
    let lighthouseSummary: AuditRunSummary['lighthouseSummary'];

    try {
      // Execute viewports with bounded worker concurrency
      let nextIdx = 0;
      const workers = Array.from({ length: Math.min(concurrency, this.config.viewports.length) }, async () => {
        while (nextIdx < this.config.viewports.length) {
          const currentIdx = nextIdx++;
          const vp = this.config.viewports[currentIdx];
          viewportResults[currentIdx] = await this.auditSingleViewport(vp, artifactsDir);
        }
      });

      await Promise.all(workers);

      // Run attached UAT scenarios if configured
      if (this.config.uatScenarios && this.config.uatScenarios.length > 0) {
        const uatRunner = new UatRunner();
        const primaryVp = this.config.viewports[0];
        for (const item of this.config.uatScenarios) {
          const session = await this.browserPool.createContextSession(primaryVp);
          try {
            let scenarioObj: UatScenario | undefined;
            if (typeof item === 'string') {
              const trimmed = item.trim();
              if (trimmed.toLowerCase() === 'auto') {
                await session.page.goto(this.config.targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await session.page.waitForTimeout(800);
                scenarioObj = await generateUatScenarioFromPage(session.page, this.config.targetUrl);
              } else if (Object.prototype.hasOwnProperty.call(UAT_WORKFLOW_TEMPLATES, trimmed.toLowerCase())) {
                scenarioObj = getUatTemplate(trimmed.toLowerCase(), this.config.targetUrl);
              } else {
                const p = path.resolve(trimmed);
                if (fs.existsSync(p)) {
                  scenarioObj = JSON.parse(fs.readFileSync(p, 'utf8')) as UatScenario;
                }
              }
            } else {
              scenarioObj = item;
            }
            if (scenarioObj) {
              const res = await uatRunner.executeScenario(
                session.page,
                scenarioObj,
                primaryVp,
                session.consoleErrors,
                session.networkErrors
              );
              uatResults.push(res);
            }
          } finally {
            await session.context.close();
          }
        }
      }

      // Run Programmatic Lighthouse if enabled
      if (this.config.performance.runLighthouse || this.config.anomalyChecks.lighthouseCore) {
        console.log(`🚀 Running Programmatic Google Lighthouse Audit...`);
        lighthouseSummary = await runLighthouseAudit(this.config.targetUrl);
      }
    } finally {
      await this.browserPool.closeAll();
    }

    // Evaluate Quality Gate & Scores
    const { score, passed, blockersTriggered, warningsTriggered } = this.scoringEngine.evaluate(
      viewportResults,
      this.config,
      uatResults,
      lighthouseSummary
    );

    const totalDefects = viewportResults.reduce((acc, r) => acc + r.defects.length, 0);
    const totalBleeds = viewportResults.reduce((acc, r) => acc + r.bleeds.length, 0);
    const totalShifts = viewportResults.reduce((acc, r) => acc + r.layoutShifts.length, 0);
    const totalConsoleErrors = viewportResults.reduce((acc, r) => acc + r.consoleErrors.length, 0);
    const totalNetworkErrors = viewportResults.reduce((acc, r) => acc + r.networkErrors.length, 0);

    const outputPaths: AuditRunSummary['outputPaths'] = {
      htmlReport: path.resolve(this.config.reporting.outputHtml),
      jsonReport: path.resolve(this.config.reporting.outputJson),
      sarifReport: this.config.reporting.outputSarif ? path.resolve(this.config.reporting.outputSarif) : undefined,
      junitReport: this.config.reporting.outputJunit ? path.resolve(this.config.reporting.outputJunit) : undefined,
      markdownReport: this.config.reporting.outputMarkdown ? path.resolve(this.config.reporting.outputMarkdown) : undefined,
      artifactsDir
    };

    const summary: AuditRunSummary = {
      targetUrl: this.config.targetUrl,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      passed,
      score,
      blockersTriggered,
      warningsTriggered,
      totalDefects,
      totalBleeds,
      totalLayoutShifts: totalShifts,
      totalConsoleErrors,
      totalNetworkErrors,
      viewportResults,
      uatResults: uatResults.length > 0 ? uatResults : undefined,
      lighthouseSummary,
      outputPaths
    };

    // Generate HTML Report
    const htmlReportContent = generateHtmlReport(summary);
    const htmlDir = path.dirname(outputPaths.htmlReport!);
    if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(outputPaths.htmlReport!, htmlReportContent, 'utf8');

    // Generate JSON, SARIF, JUnit XML, and PR Markdown Reports
    saveJsonSummary(summary, outputPaths.jsonReport!);
    if (outputPaths.sarifReport) {
      saveSarifReport(summary, outputPaths.sarifReport);
    }
    if (outputPaths.junitReport) {
      saveJunitReport(summary, outputPaths.junitReport);
    }
    if (outputPaths.markdownReport) {
      saveMarkdownReport(summary, outputPaths.markdownReport);
    }

    console.log(`======================================================`);
    console.log(`📊 BetterFront Audit Complete in ${(summary.durationMs / 1000).toFixed(1)}s`);
    console.log(`======================================================`);
    console.log(`Score:              ${score.total}/100 (Visual: ${score.visual}, Perf: ${score.performance}, A11y: ${score.accessibility}, UAT: ${score.uat}, Standards: ${score.standards})`);
    console.log(`Status:             ${passed ? '✅ PASSED (Production Ready)' : '🚨 BLOCKED (Defects Detected)'}`);
    console.log(`Visual Collisions:  ${totalDefects}`);
    console.log(`Mobile Bleeds:      ${totalBleeds}`);
    console.log(`Layout Shifts (CLS):${totalShifts}`);
    console.log(`Console Errors:     ${totalConsoleErrors}`);
    console.log(`HTML Report:        file:///${outputPaths.htmlReport!.replace(/\\/g, '/')}`);
    console.log(`JSON Summary:       file:///${outputPaths.jsonReport!.replace(/\\/g, '/')}`);
    if (outputPaths.sarifReport) {
      console.log(`SARIF Report:       file:///${outputPaths.sarifReport.replace(/\\/g, '/')}`);
    }
    if (outputPaths.junitReport) {
      console.log(`JUnit XML Report:   file:///${outputPaths.junitReport.replace(/\\/g, '/')}`);
    }
    if (outputPaths.markdownReport) {
      console.log(`PR Markdown Report: file:///${outputPaths.markdownReport.replace(/\\/g, '/')}`);
    }
    console.log(`Artifacts Dir:      file:///${artifactsDir.replace(/\\/g, '/')}`);
    console.log(`======================================================\n`);

    return summary;
  }

  private async auditSingleViewport(
    vp: ViewportDefinition,
    artifactsDir: string
  ): Promise<ViewportAuditResult> {
    console.log(`🔍 [${vp.name}] (${vp.width}x${vp.height}) - Initiating session...`);

    const recorder = new CaptureRecorder(artifactsDir, vp.name);
    const recordVideoDir = this.config.recording.recordVideo ? recorder.getViewportDir() : undefined;

    const session = await this.browserPool.createContextSession(vp, recordVideoDir);
    const { context, page, consoleErrors, networkErrors } = session;

    // 1. Tracing & CWV/CLS hooks
    if (this.config.recording.recordTrace) {
      await recorder.startTracing(context);
    }
    if (this.config.anomalyChecks.layoutShifts || this.config.performance.trackRealtimeCls) {
      await attachClsObserver(page);
    }

    // 2. Navigation
    console.log(`   [${vp.name}] Navigating to ${this.config.targetUrl}...`);
    try {
      await page.goto(this.config.targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await page.waitForTimeout(500); // Allow fonts/hydration to settle
    } catch (navErr) {
      console.warn(`   ⚠️ [${vp.name}] Navigation warning: ${(navErr as Error).message}`);
    }

    // 3. Baseline Screenshots
    let fullPagePath: string | undefined;
    if (this.config.recording.captureScreenshots) {
      try {
        fullPagePath = await recorder.captureFullPageScreenshot(page);
      } catch {
        // Ignore screenshot failure on special pages
      }
    }

    const defects: VisualDefect[] = [];
    const seenDefectKeys = new Set<string>();
    const pushUniqueDefects = (items: VisualDefect[]) => {
      for (const item of items) {
        const key = `${item.type}::${item.elementA.selector}::${item.elementB?.selector || ''}`;
        if (!seenDefectKeys.has(key)) {
          seenDefectKeys.add(key);
          defects.push(item);
        }
      }
    };

    // 4. Autonomous Human Exploration with parallel incremental state anomaly scanning
    if (this.config.humanAgent.enabled) {
      console.log(`   🧑 [${vp.name}] Human Agent exploring page (Persona: ${this.config.humanAgent.persona})...`);
      const crawler = new AutonomousCrawler();
      const exploreRes = await crawler.exploreDetailed(page, {
        maxInteractions: this.config.humanAgent.maxInteractionsPerPage,
        persona: this.config.humanAgent.persona,
        simulateMouseTrails: this.config.humanAgent.simulateMouseTrails,
        simulateTypingCadence: this.config.humanAgent.simulateTypingCadence,
        simulateScrollMomentum: this.config.humanAgent.simulateScrollMomentum,
        viewport: vp,
        onStepComplete: async () => {
          const [stepCollisions, stepOcclusions] = await Promise.all([
            this.config.anomalyChecks.textOverlap
              ? detectTextCollisions(page, vp, this.config.layoutEngine.minCollisionAreaPx).catch(() => [])
              : Promise.resolve([]),
            this.config.anomalyChecks.interactiveOcclusion !== false
              ? detectInteractiveOcclusion(page, vp).catch(() => [])
              : Promise.resolve([])
          ]);
          pushUniqueDefects(stepCollisions);
          pushUniqueDefects(stepOcclusions);
        }
      });
      pushUniqueDefects(exploreRes.keyboardDefects);
      console.log(`   [${vp.name}] Completed ${exploreRes.interactionCount} interactions across ${exploreRes.visitedStates} DOM state(s).`);
    }

    // 5. Run Read-Only Layout, Visual, Accessibility & Link Inspectors Concurrently
    const [
      textCollisions,
      bleedResult,
      clippings,
      occlusions,
      unsizedResult,
      touchFailures,
      contrastResult,
      linkResult
    ] = await Promise.all([
      this.config.anomalyChecks.textOverlap
        ? detectTextCollisions(page, vp, this.config.layoutEngine.minCollisionAreaPx)
        : Promise.resolve([] as VisualDefect[]),
      this.config.anomalyChecks.horizontalBleed && vp.isMobile
        ? detectHorizontalBleed(page, vp)
        : Promise.resolve({ rawBleeds: [] as any[], defects: [] as VisualDefect[] }),
      this.config.anomalyChecks.containerClipping
        ? detectContainerClipping(page, vp)
        : Promise.resolve([] as VisualDefect[]),
      this.config.anomalyChecks.interactiveOcclusion !== false
        ? detectInteractiveOcclusion(page, vp)
        : Promise.resolve([] as VisualDefect[]),
      this.config.anomalyChecks.unsizedMedia
        ? detectUnsizedMedia(page, vp)
        : Promise.resolve({ rawList: [] as UnsizedMediaDefect[], defects: [] as VisualDefect[] }),
      this.config.anomalyChecks.touchTargetSize
        ? auditTouchTargets(page, vp, this.config.accessibility.minTouchTargetPx)
        : Promise.resolve([] as any[]),
      this.config.anomalyChecks.lowContrast
        ? auditColorContrast(page, vp, 4.5)
        : Promise.resolve({ rawList: [] as LowContrastDefect[], defects: [] as VisualDefect[] }),
      this.config.anomalyChecks.brokenLinks
        ? auditPageLinks(page, vp, true)
        : Promise.resolve({ rawList: [] as BrokenLinkDefect[], defects: [] as VisualDefect[] })
    ]);

    if (this.config.anomalyChecks.textOverlap) {
      pushUniqueDefects(textCollisions);
      const totalTextCollisions = defects.filter((d) => d.type === 'TEXT_ON_TEXT_COLLISION').length;
      if (totalTextCollisions > 0) {
        console.log(`   🚨 [${vp.name}] Text-on-Text Collisions: ${totalTextCollisions} detected`);
      } else {
        console.log(`   ✅ [${vp.name}] Text-on-Text Collisions: 0 detected`);
      }
    }

    const rawBleeds = bleedResult.rawBleeds;
    if (this.config.anomalyChecks.horizontalBleed && vp.isMobile) {
      pushUniqueDefects(bleedResult.defects);
      if (bleedResult.defects.length > 0) {
        console.log(`   🚨 [${vp.name}] Mobile Horizontal Bleed: ${bleedResult.defects.length} element(s) overflowing!`);
      } else {
        console.log(`   ✅ [${vp.name}] Mobile Horizontal Bleed: Clean (No sideways wobble)`);
      }
    }

    if (this.config.anomalyChecks.containerClipping) {
      pushUniqueDefects(clippings);
      if (clippings.length > 0) {
        console.log(`   ⚠️ [${vp.name}] Text Clipping: ${clippings.length} starved container(s)`);
      }
    }

    if (this.config.anomalyChecks.interactiveOcclusion !== false) {
      pushUniqueDefects(occlusions);
      const totalOcclusions = defects.filter((d) => d.type === 'COMPONENT_OCCLUSION').length;
      if (totalOcclusions > 0) {
        console.log(`   🚨 [${vp.name}] Interactive Occlusion: ${totalOcclusions} element(s) blocked by floating/sticky layers!`);
      }
    }

    const rawUnsizedMedia = unsizedResult.rawList;
    if (this.config.anomalyChecks.unsizedMedia) {
      pushUniqueDefects(unsizedResult.defects);
      if (unsizedResult.rawList.length > 0) {
        console.log(`   ⚠️ [${vp.name}] Unsized Media: ${unsizedResult.rawList.length} element(s) missing dimension attributes`);
      }
    }

    if (this.config.anomalyChecks.touchTargetSize && touchFailures.length > 0) {
      console.log(`   ⚠️ [${vp.name}] Touch Targets: ${touchFailures.length} elements smaller than ${this.config.accessibility.minTouchTargetPx}px`);
    }

    const rawContrast = contrastResult.rawList;
    if (this.config.anomalyChecks.lowContrast) {
      pushUniqueDefects(contrastResult.defects);
      if (contrastResult.rawList.length > 0) {
        console.log(`   ⚠️ [${vp.name}] Color Contrast: ${contrastResult.rawList.length} text elements below required ratio`);
      }
    }

    const rawBrokenLinks = linkResult.rawList;
    if (this.config.anomalyChecks.brokenLinks) {
      pushUniqueDefects(linkResult.defects);
      if (linkResult.rawList.length > 0) {
        console.log(`   ⚠️ [${vp.name}] Link Integrity: ${linkResult.rawList.length} broken/dead link(s)`);
      }
    }

    // Check 8: 200% Text Scaling Stress Test (mutates zoom, so run sequentially)
    if (this.config.anomalyChecks.textZoom200Percent) {
      const zoomDefects = await runTextZoomStressTest(page, vp);
      pushUniqueDefects(zoomDefects);
    }

    // Check 8b: Fluid Breakpoint Sweeper (mutates viewport size, so run sequentially)
    let breakpointSweepAnomalies: any[] | undefined;
    if (this.config.anomalyChecks.breakpointSweep && vp.isMobile) {
      const sweepRes = await runBreakpointSweep(page, vp);
      breakpointSweepAnomalies = sweepRes.anomalies;
      pushUniqueDefects(sweepRes.defects);
    }

    // Check 9 & 10: Axe WCAG 2.2 AA Accessibility + Real-time CLS & CWV extraction concurrently
    const [axeResult, layoutShifts, cwvMetrics] = await Promise.all([
      this.config.anomalyChecks.a11yWcagViolations
        ? runAxeAudit(page)
        : Promise.resolve({ violationsCount: 0, violations: [] as any[] }),
      this.config.anomalyChecks.layoutShifts
        ? extractCapturedLayoutShifts(page)
        : Promise.resolve([] as any[]),
      extractCwvMetrics(page)
    ]);

    if (this.config.anomalyChecks.a11yWcagViolations && axeResult.violationsCount > 0) {
      console.log(`   ⚠️ [${vp.name}] WCAG Accessibility: ${axeResult.violationsCount} violation rules triggered`);
    }

    if (this.config.anomalyChecks.layoutShifts) {
      if (layoutShifts.length > 0) {
        const totalShift = layoutShifts.reduce((acc: number, s: any) => acc + s.value, 0).toFixed(4);
        console.log(`   ⚠️ [${vp.name}] Layout Instability (CLS): ${layoutShifts.length} shift(s) (Total score: ${totalShift})`);
      } else {
        console.log(`   ✅ [${vp.name}] Layout Instability (CLS): 0 unprovoked shifts`);
      }
    }

    // Filter console/network errors if anomaly toggles are off
    const activeConsoleErrors = this.config.anomalyChecks.consoleExceptions ? consoleErrors : [];
    const activeNetworkErrors = this.config.anomalyChecks.brokenNetworkRequests ? networkErrors : [];

    // 8. Capture Annotated Screenshot, Forensic Crops & Run Concurrent VLM/Heuristic Triage
    let annotatedPath: string | undefined;
    let crops: Array<{ defectId: string; imagePath: string; base64Data: string }> = [];

    if (defects.length > 0) {
      if (this.config.recording.highlightAnomalies) {
        annotatedPath = await recorder.captureAnnotatedScreenshot(page, defects);
        crops = await recorder.extractDefectCrops(page, defects);
      }

      const cropMap = new Map(crops.map((c) => [c.defectId, c.base64Data]));
      await Promise.all(
        defects.map(async (d) => {
          const base64 = cropMap.get(d.id);
          if (base64) {
            d.cropScreenshotBase64 = base64;
          }
          d.aiTriage = await this.vlmClient.triageDefect(
            d,
            d.cropScreenshotBase64,
            this.config.layoutEngine.enableAiVisionTriage
          );
        })
      );
    }

    // 9. Stop Tracing & Video
    let tracePath: string | undefined;
    if (this.config.recording.recordTrace) {
      tracePath = await recorder.stopTracing(context, defects.length > 0);
    }

    await context.close();
    const videoPath = await recorder.finalizeVideo(page);

    const confirmedDefectsCount = defects.filter((d) => !d.aiTriage || d.aiTriage.isBug).length;

    console.log(`   Finished [${vp.name}].\n`);

    return {
      viewport: vp,
      passed: confirmedDefectsCount === 0 && activeConsoleErrors.length === 0,
      artifacts: {
        videoPath,
        tracePath,
        fullPageScreenshotPath: fullPagePath,
        annotatedScreenshotPath: annotatedPath,
        defectCrops: crops
      },
      defects,
      bleeds: rawBleeds,
      layoutShifts,
      cwvMetrics,
      breakpointSweepAnomalies,
      touchTargetDefects: touchFailures,
      unsizedMediaDefects: rawUnsizedMedia,
      brokenLinkDefects: rawBrokenLinks,
      lowContrastDefects: rawContrast,
      consoleErrors: activeConsoleErrors,
      networkErrors: activeNetworkErrors,
      axeViolations: axeResult.violations
    };
  }
}
