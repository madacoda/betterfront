import * as fs from 'fs';
import * as path from 'path';
import {
  BetterFrontConfig,
  AuditRunSummary,
  ViewportAuditResult,
  VisualDefect,
  UnsizedMediaDefect,
  BrokenLinkDefect,
  LowContrastDefect
} from '../types/index.js';
import { BrowserPool } from './browserPool.js';
import { CaptureRecorder } from './captureRecorder.js';
import { AutonomousCrawler } from '../agent/crawler.js';
import { detectTextCollisions } from '../inspectors/layout/textCollision.js';
import { detectHorizontalBleed } from '../inspectors/layout/horizontalBleed.js';
import { detectContainerClipping } from '../inspectors/layout/containerClipping.js';
import { detectInteractiveOcclusion } from '../inspectors/layout/interactiveOcclusion.js';
import { detectUnsizedMedia } from '../inspectors/layout/unsizedMedia.js';
import { auditPageLinks } from '../inspectors/network/linkChecker.js';
import { auditColorContrast } from '../inspectors/a11y/colorContrast.js';
import { attachClsObserver, extractCapturedLayoutShifts } from '../inspectors/perf/clsObserver.js';
import { auditTouchTargets } from '../inspectors/a11y/touchTargets.js';
import { runTextZoomStressTest } from '../inspectors/a11y/textZoom.js';
import { runAxeAudit } from '../inspectors/a11y/axeRunner.js';
import { VlmClient } from '../vision/vlmClient.js';
import { ScoringEngine } from '../reporter/scoring.js';
import { generateHtmlReport } from '../reporter/html.js';
import { saveJsonSummary } from '../reporter/json.js';

export class AuditRunner {
  private browserPool = new BrowserPool();
  private vlmClient: VlmClient;
  private scoringEngine = new ScoringEngine();

  constructor(private config: BetterFrontConfig) {
    this.vlmClient = new VlmClient(
      config.layoutEngine.vlmProvider,
      config.layoutEngine.vlmApiKey
    );
  }

  public async run(): Promise<AuditRunSummary> {
    const startTime = Date.now();
    console.log(`\n======================================================`);
    console.log(`🛡️  BetterFront Audit Starting`);
    console.log(`Target: ${this.config.targetUrl}`);
    console.log(`Preset: ${this.config.preset || 'custom'}`);
    console.log(`Viewports: ${this.config.viewports.map((v) => v.name).join(', ')}`);
    console.log(`======================================================\n`);

    const viewportResults: ViewportAuditResult[] = [];

    // Ensure base artifacts directory exists
    const artifactsDir = path.resolve(this.config.recording.artifactsDir);
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    try {
      for (const vp of this.config.viewports) {
        console.log(`🔍 [${vp.name}] (${vp.width}x${vp.height}) - Initiating session...`);

        const recorder = new CaptureRecorder(artifactsDir, vp.name);
        const recordVideoDir = this.config.recording.recordVideo ? recorder.getViewportDir() : undefined;

        const session = await this.browserPool.createContextSession(vp, recordVideoDir);
        const { context, page, consoleErrors, networkErrors } = session;

        // 1. Tracing & CLS hooks
        if (this.config.recording.recordTrace) {
          await recorder.startTracing(context);
        }
        if (this.config.anomalyChecks.layoutShifts) {
          await attachClsObserver(page);
        }

        // 2. Navigation
        console.log(`   Navigating to ${this.config.targetUrl}...`);
        try {
          await page.goto(this.config.targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          await page.waitForTimeout(1500); // Allow fonts/hydration to settle
        } catch (navErr) {
          console.warn(`   ⚠️ Navigation warning: ${(navErr as Error).message}`);
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

        // 4. Autonomous Human Exploration
        if (this.config.humanAgent.enabled) {
          console.log(`   🧑 Human Agent exploring page (Persona: ${this.config.humanAgent.persona})...`);
          const crawler = new AutonomousCrawler();
          const interactions = await crawler.explore(page, {
            maxInteractions: this.config.humanAgent.maxInteractionsPerPage,
            persona: this.config.humanAgent.persona
          });
          console.log(`   Completed ${interactions} autonomous human interactions.`);
        }

        // 5. Run Layout & Visual Collision Inspectors
        const defects: VisualDefect[] = [];

        // Check 1: Text-on-Text Collision
        if (this.config.anomalyChecks.textOverlap) {
          const textCollisions = await detectTextCollisions(page, vp);
          defects.push(...textCollisions);
          if (textCollisions.length > 0) {
            console.log(`   🚨 Text-on-Text Collisions: ${textCollisions.length} detected`);
          } else {
            console.log(`   ✅ Text-on-Text Collisions: 0 detected`);
          }
        }

        // Check 2: Mobile Horizontal Viewport Bleed
        let rawBleeds: any[] = [];
        if (this.config.anomalyChecks.horizontalBleed && vp.isMobile) {
          const bleedResult = await detectHorizontalBleed(page, vp);
          rawBleeds = bleedResult.rawBleeds;
          defects.push(...bleedResult.defects);
          if (bleedResult.defects.length > 0) {
            console.log(`   🚨 Mobile Horizontal Bleed: ${bleedResult.defects.length} element(s) overflowing!`);
          } else {
            console.log(`   ✅ Mobile Horizontal Bleed: Clean (No sideways wobble)`);
          }
        }

        // Check 3: Container Clipping & Starvation
        if (this.config.anomalyChecks.containerClipping) {
          const clippings = await detectContainerClipping(page, vp);
          defects.push(...clippings);
          if (clippings.length > 0) {
            console.log(`   ⚠️ Text Clipping: ${clippings.length} starved container(s)`);
          }
        }

        // Check 3b: Interactive Component Occlusion (Z-Index / Floating Layer Traps)
        if (this.config.anomalyChecks.interactiveOcclusion !== false) {
          const occlusions = await detectInteractiveOcclusion(page, vp);
          defects.push(...occlusions);
          if (occlusions.length > 0) {
            console.log(`   🚨 Interactive Occlusion: ${occlusions.length} element(s) blocked by floating/sticky layers!`);
          }
        }

        // Check 4: Unsized Media (Primary CLS culprit)
        let rawUnsizedMedia: UnsizedMediaDefect[] = [];
        if (this.config.anomalyChecks.unsizedMedia) {
          const unsizedResult = await detectUnsizedMedia(page, vp);
          rawUnsizedMedia = unsizedResult.rawList;
          defects.push(...unsizedResult.defects);
          if (unsizedResult.rawList.length > 0) {
            console.log(`   ⚠️ Unsized Media: ${unsizedResult.rawList.length} element(s) missing dimension attributes`);
          }
        }

        // Check 5: Usability - Touch Targets
        let touchFailures: any[] = [];
        if (this.config.anomalyChecks.touchTargetSize) {
          touchFailures = await auditTouchTargets(page, vp, this.config.accessibility.minTouchTargetPx);
          if (touchFailures.length > 0) {
            console.log(`   ⚠️ Touch Targets: ${touchFailures.length} elements smaller than ${this.config.accessibility.minTouchTargetPx}px`);
          }
        }

        // Check 6: Color Contrast (WCAG 1.4.3 AA)
        let rawContrast: LowContrastDefect[] = [];
        if (this.config.anomalyChecks.lowContrast) {
          const contrastResult = await auditColorContrast(page, vp, 4.5);
          rawContrast = contrastResult.rawList;
          defects.push(...contrastResult.defects);
          if (contrastResult.rawList.length > 0) {
            console.log(`   ⚠️ Color Contrast: ${contrastResult.rawList.length} text elements below 4.5:1 ratio`);
          }
        }

        // Check 7: Broken Links & Dead Anchors
        let rawBrokenLinks: BrokenLinkDefect[] = [];
        if (this.config.anomalyChecks.brokenLinks) {
          const linkResult = await auditPageLinks(page, vp);
          rawBrokenLinks = linkResult.rawList;
          defects.push(...linkResult.defects);
          if (linkResult.rawList.length > 0) {
            console.log(`   ⚠️ Link Integrity: ${linkResult.rawList.length} dead anchor/empty link(s)`);
          }
        }

        // Check 8: 200% Text Scaling Stress Test
        let zoomDefects: VisualDefect[] = [];
        if (this.config.anomalyChecks.textZoom200Percent) {
          zoomDefects = await runTextZoomStressTest(page, vp);
          defects.push(...zoomDefects);
        }

        // Check 9: Axe WCAG 2.2 AA Accessibility
        let axeResult = { violationsCount: 0, violations: [] as any[] };
        if (this.config.anomalyChecks.a11yWcagViolations) {
          axeResult = await runAxeAudit(page);
          if (axeResult.violationsCount > 0) {
            console.log(`   ⚠️ WCAG Accessibility: ${axeResult.violationsCount} violation rules triggered`);
          }
        }

        // Check 10: Real-time CLS extraction
        let layoutShifts: any[] = [];
        if (this.config.anomalyChecks.layoutShifts) {
          layoutShifts = await extractCapturedLayoutShifts(page);
          if (layoutShifts.length > 0) {
            const totalShift = layoutShifts.reduce((acc: number, s: any) => acc + s.value, 0).toFixed(4);
            console.log(`   ⚠️ Layout Instability (CLS): ${layoutShifts.length} shift(s) (Total score: ${totalShift})`);
          } else {
            console.log(`   ✅ Layout Instability (CLS): 0 unprovoked shifts`);
          }
        }

        // Filter console/network errors if anomaly toggles are off
        const activeConsoleErrors = this.config.anomalyChecks.consoleExceptions ? consoleErrors : [];
        const activeNetworkErrors = this.config.anomalyChecks.brokenNetworkRequests ? networkErrors : [];

        // 8. Capture Annotated Screenshot & Forensic Crops
        let annotatedPath: string | undefined;
        let crops: Array<{ defectId: string; imagePath: string; base64Data: string }> = [];

        if (defects.length > 0 && this.config.recording.highlightAnomalies) {
          annotatedPath = await recorder.captureAnnotatedScreenshot(page, defects);
          crops = await recorder.extractDefectCrops(page, defects);

          // Populate base64 in defects and run AI triage
          for (const d of defects) {
            const cropMatch = crops.find((c) => c.defectId === d.id);
            if (cropMatch) {
              d.cropScreenshotBase64 = cropMatch.base64Data;
            }
            d.aiTriage = await this.vlmClient.triageDefect(d, d.cropScreenshotBase64);
          }
        }

        // 9. Stop Tracing & Video
        let tracePath: string | undefined;
        if (this.config.recording.recordTrace) {
          tracePath = await recorder.stopTracing(context, defects.length > 0);
        }

        await context.close();
        const videoPath = await recorder.finalizeVideo(page);

        viewportResults.push({
          viewport: vp,
          passed: defects.length === 0 && activeConsoleErrors.length === 0,
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
          touchTargetDefects: touchFailures,
          unsizedMediaDefects: rawUnsizedMedia,
          brokenLinkDefects: rawBrokenLinks,
          lowContrastDefects: rawContrast,
          consoleErrors: activeConsoleErrors,
          networkErrors: activeNetworkErrors,
          axeViolations: axeResult.violations
        });

        console.log(`   Finished [${vp.name}].\n`);
      }
    } finally {
      await this.browserPool.closeAll();
    }

    // Evaluate Quality Gate & Scores
    const { score, passed, blockersTriggered } = this.scoringEngine.evaluate(
      viewportResults,
      this.config
    );

    const totalDefects = viewportResults.reduce((acc, r) => acc + r.defects.length, 0);
    const totalBleeds = viewportResults.reduce((acc, r) => acc + r.bleeds.length, 0);
    const totalShifts = viewportResults.reduce((acc, r) => acc + r.layoutShifts.length, 0);
    const totalConsoleErrors = viewportResults.reduce((acc, r) => acc + r.consoleErrors.length, 0);
    const totalNetworkErrors = viewportResults.reduce((acc, r) => acc + r.networkErrors.length, 0);

    const summary: AuditRunSummary = {
      targetUrl: this.config.targetUrl,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      passed,
      score,
      blockersTriggered,
      totalDefects,
      totalBleeds,
      totalLayoutShifts: totalShifts,
      totalConsoleErrors,
      totalNetworkErrors,
      viewportResults,
      outputPaths: {
        htmlReport: path.resolve(this.config.reporting.outputHtml),
        jsonReport: path.resolve(this.config.reporting.outputJson),
        artifactsDir
      }
    };

    // Generate HTML Report
    const htmlReportContent = generateHtmlReport(summary);
    fs.writeFileSync(summary.outputPaths.htmlReport!, htmlReportContent, 'utf8');

    // Generate JSON Report
    saveJsonSummary(summary, summary.outputPaths.jsonReport!);

    console.log(`======================================================`);
    console.log(`📊 BetterFront Audit Complete in ${(summary.durationMs / 1000).toFixed(1)}s`);
    console.log(`======================================================`);
    console.log(`Score:              ${score.total}/100`);
    console.log(`Status:             ${passed ? '✅ PASSED (Production Ready)' : '🚨 BLOCKED (Defects Detected)'}`);
    console.log(`Visual Collisions:  ${totalDefects}`);
    console.log(`Mobile Bleeds:      ${totalBleeds}`);
    console.log(`Layout Shifts (CLS):${totalShifts}`);
    console.log(`Console Errors:     ${totalConsoleErrors}`);
    console.log(`HTML Report:        file:///${summary.outputPaths.htmlReport!.replace(/\\/g, '/')}`);
    console.log(`JSON Summary:       file:///${summary.outputPaths.jsonReport!.replace(/\\/g, '/')}`);
    console.log(`Artifacts Dir:      file:///${artifactsDir.replace(/\\/g, '/')}`);
    console.log(`======================================================\n`);

    return summary;
  }
}
