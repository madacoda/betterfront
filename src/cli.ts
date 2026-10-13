#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { resolveConfig, STANDARD_VIEWPORTS } from './config/index.js';
import { AuditRunner } from './core/runner.js';
import { runUat } from './index.js';
import { BetterFrontConfig, ViewportDefinition, UatScenario } from './types/index.js';
import { validateScenario, formatValidationReport } from './uat/validator.js';
import { UatActionRecorder } from './uat/recorder.js';

const program = new Command();

program
  .name('betterfront')
  .description('Gold-Standard Autonomous Frontend QA & Production-Readiness Engine')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit a URL for layout collisions, mobile bleeds, CLS, and production readiness')
  .argument('<url>', 'Target URL to audit (e.g. http://localhost:3000 or https://example.com)')
  .option('-p, --preset <preset>', 'Audit preset: production-gate, fast-smoke, comprehensive-deep', 'production-gate')
  .option('--viewports <list>', 'Comma-separated viewport names (e.g. mobile_standard,tablet_portrait,desktop_fhd)')
  .option('--persona <persona>', 'Human simulation persona: impatient-mobile, power-user, cautious-first-timer, keyboard-only')
  // Recording toggles
  .option('--no-video', 'Disable video recording')
  .option('--no-trace', 'Disable Playwright trace archive')
  // Anomaly toggles (can be turned ON or OFF)
  .option('--no-text-overlap', 'Disable text collision checking')
  .option('--no-bleed', 'Disable mobile horizontal bleed checking')
  .option('--no-clipping', 'Disable container text clipping checking')
  .option('--no-occlusion', 'Disable interactive element occlusion checking')
  .option('--no-unsized-media', 'Disable unsized media detection')
  .option('--no-low-contrast', 'Disable color contrast checks')
  .option('--no-touch-targets', 'Disable touch target size auditing')
  .option('--no-a11y', 'Disable WCAG accessibility auditing')
  .option('--no-shifts', 'Disable layout shift (CLS) tracking')
  .option('--no-console-errors', 'Disable console error blocking')
  .option('--no-broken-links', 'Disable broken link and anchor checking')
  // Output paths
  .option('--html <path>', 'Custom path for interactive HTML report', './betterfront-report.html')
  .option('--json <path>', 'Custom path for JSON summary', './betterfront-summary.json')
  .option('--fail-on-blocker', 'Exit with code 1 if any production blocker is triggered', true)
  .action(async (url: string, options: any) => {
    try {
      let customViewports: ViewportDefinition[] | undefined;
      if (options.viewports) {
        const names = options.viewports.split(',').map((s: string) => s.trim());
        customViewports = names
          .map((n: string) => STANDARD_VIEWPORTS[n])
          .filter(Boolean);
      }

      const config = resolveConfig({
        targetUrl: url,
        preset: options.preset as any,
        viewports: customViewports,
        anomalyChecks: {
          textOverlap: options.textOverlap !== false,
          horizontalBleed: options.bleed !== false,
          containerClipping: options.clipping !== false,
          interactiveOcclusion: options.occlusion !== false,
          unsizedMedia: options.unsizedMedia !== false,
          lowContrast: options.lowContrast !== false,
          touchTargetSize: options.touchTargets !== false,
          textZoom200Percent: false,
          a11yWcagViolations: options.a11y !== false,
          layoutShifts: options.shifts !== false,
          lighthouseCore: false,
          consoleExceptions: options.consoleErrors !== false,
          brokenNetworkRequests: true,
          brokenLinks: options.brokenLinks !== false
        },
        humanAgent: options.persona ? ({ persona: options.persona } as any) : undefined,
        recording: {
          recordVideo: options.video !== false,
          recordTrace: options.trace !== false,
          captureScreenshots: true,
          highlightAnomalies: true,
          artifactsDir: './betterfront-artifacts'
        },
        reporting: {
          outputHtml: options.html,
          outputJson: options.json
        }
      });

      const runner = new AuditRunner(config);
      const summary = await runner.run();

      if (options.failOnBlocker && !summary.passed) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (err) {
      console.error(`\n❌ BetterFront Audit Failed with Error:\n${(err as Error).stack || (err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('uat')
  .description('Execute a declarative UAT test scenario checklist file (JSON)')
  .argument('<scenarioFile>', 'Path to UAT scenario file (.json)')
  .option('-v, --viewport <name>', 'Override or specify target viewport (e.g. mobile_standard, desktop_fhd)')
  .option('--headed', 'Run browser in visible/interactive mode to watch steps live', false)
  .option('--slowmo <ms>', 'Delay between browser actions in ms for easy visual observation', '0')
  .option('--video', 'Record full-motion WebM video of UAT execution')
  .option('--no-video', 'Disable full-motion video recording')
  .option('--trace', 'Record Playwright trace archive of UAT execution')
  .option('--no-trace', 'Disable trace recording')
  .option('--screenshot-on-failure', 'Capture screenshot and highlight element when a step fails')
  .option('--no-screenshot-on-failure', 'Disable automatic failure screenshots')
  .option('--artifacts-dir <dir>', 'Directory where failure captures, videos, and traces are saved')
  .option('--validate-only', 'Validate scenario JSON syntax, schema, and actions without launching browser', false)
  .action(async (scenarioFile: string, options: any) => {
    try {
      const fullPath = path.resolve(scenarioFile);
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ UAT Scenario file not found: ${fullPath}`);
        process.exit(1);
      }

      let raw: string;
      let scenario: UatScenario;
      try {
        raw = fs.readFileSync(fullPath, 'utf8');
        scenario = JSON.parse(raw) as UatScenario;
      } catch (jsonErr) {
        console.error(`\n🚨 Invalid JSON in scenario file: ${fullPath}`);
        console.error(`   ${(jsonErr as Error).message}\n`);
        process.exit(1);
      }

      // Pre-flight semantic & action validation
      const validation = validateScenario(scenario);

      if (options.validateOnly) {
        console.log(formatValidationReport(validation, scenario.name || path.basename(scenarioFile)));
        process.exit(validation.valid ? 0 : 1);
      }

      if (!validation.valid) {
        console.log(formatValidationReport(validation, scenario.name || path.basename(scenarioFile)));
        console.error(`❌ Scenario execution halted due to validation errors. Fix the errors above or run with --validate-only.`);
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.log(`⚠️  Advisory warnings for "${scenario.name}":`);
        validation.warnings.forEach((w) => console.log(`   🔸 ${w.message}`));
      }

      const recordVideoOpt = options.video !== undefined ? Boolean(options.video) : undefined;
      const recordTraceOpt = options.trace !== undefined ? Boolean(options.trace) : undefined;
      const screenshotOnFailureOpt = options.screenshotOnFailure !== undefined ? Boolean(options.screenshotOnFailure) : undefined;

      const shouldRecordVideo = recordVideoOpt ?? scenario.recording?.video ?? false;
      const shouldRecordTrace = recordTraceOpt ?? scenario.recording?.trace ?? false;
      const shouldCaptureFailure = screenshotOnFailureOpt ?? scenario.recording?.screenshotOnFailure ?? true;
      const targetArtifacts = options.artifactsDir || scenario.recording?.artifactsDir || './betterfront-artifacts';

      console.log(`\n======================================================`);
      console.log(`🧪 BetterFront UAT Runner: "${scenario.name}"`);
      console.log(`Target:       ${scenario.startUrl}`);
      if (options.viewport) console.log(`Viewport:     ${options.viewport} (override)`);
      if (options.headed) console.log(`Mode:         Headed (interactive visual mode)`);
      if (options.slowmo && options.slowmo !== '0') console.log(`Slow-Mo:      ${options.slowmo}ms`);
      console.log(`Video:        ${shouldRecordVideo ? '🎥 Enabled (recording full-motion WebM)' : 'Disabled'}`);
      console.log(`Trace:        ${shouldRecordTrace ? '🎬 Enabled (recording Playwright trace archive)' : 'Disabled'}`);
      console.log(`Failure Shot: ${shouldCaptureFailure ? '📸 Enabled (red highlight snapshot on error)' : 'Disabled'}`);
      console.log(`Artifacts:    ${path.resolve(targetArtifacts)}`);
      console.log(`======================================================`);

      const slowMoVal = parseInt(options.slowmo, 10) || 0;
      const result = await runUat(scenario, {
        viewport: options.viewport,
        headless: !options.headed,
        slowMo: slowMoVal,
        recordVideo: recordVideoOpt,
        recordTrace: recordTraceOpt,
        screenshotOnFailure: screenshotOnFailureOpt,
        artifactsDir: options.artifactsDir
      });

      console.log(`\n======================================================`);
      console.log(`UAT Execution Summary:`);
      console.log(`Scenario:     ${result.scenarioName}`);
      if (result.viewportName) console.log(`Viewport:     ${result.viewportName}`);
      console.log(`Status:       ${result.passed ? '✅ PASSED' : '🚨 FAILED'}`);
      console.log(`Steps:        ${result.passedSteps}/${result.totalSteps} passed`);
      console.log(`Duration:     ${(result.durationMs / 1000).toFixed(1)}s`);
      console.log(`======================================================`);

      if (!result.passed) {
        console.log(`\n🚨 FORENSIC FAILURE EVIDENCE & RECORDINGS:`);
        if (result.failureScreenshotPath) {
          const fileUrl = 'file:///' + result.failureScreenshotPath.replace(/\\/g, '/');
          console.log(`   📸 Exact Problem Snapshot: ${fileUrl}`);
          console.log(`      (Failed element highlighted with red boundary glow)`);
        }
        if (result.videoPath) {
          const videoUrl = 'file:///' + result.videoPath.replace(/\\/g, '/');
          console.log(`   🎥 Full-Motion Video:      ${videoUrl}`);
        }
        if (result.tracePath) {
          const traceUrl = 'file:///' + result.tracePath.replace(/\\/g, '/');
          console.log(`   🎬 Playwright Trace:        ${traceUrl}`);
          console.log(`      🔍 Inspect step-by-step: npx playwright show-trace "${result.tracePath}"`);
        }
        console.log(`======================================================\n`);
        process.exit(1);
      } else {
        if (result.videoPath || result.tracePath) {
          console.log(`\n📦 RECORDED ARTIFACTS:`);
          if (result.videoPath) {
            const videoUrl = 'file:///' + result.videoPath.replace(/\\/g, '/');
            console.log(`   🎥 Full-Motion Video: ${videoUrl}`);
          }
          if (result.tracePath) {
            const traceUrl = 'file:///' + result.tracePath.replace(/\\/g, '/');
            console.log(`   🎬 Playwright Trace:  ${traceUrl}`);
            console.log(`      🔍 Inspect: npx playwright show-trace "${result.tracePath}"`);
          }
          console.log(`======================================================\n`);
        }
        process.exit(0);
      }
    } catch (err) {
      console.error(`\n❌ UAT Execution Failed with Error:\n${(err as Error).stack || (err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('explore')
  .description('Launch an autonomous human-like exploratory crawling session')
  .argument('<url>', 'Target URL to explore')
  .option('--persona <persona>', 'Persona to simulate', 'impatient-mobile')
  .option('--interactions <number>', 'Maximum interactions', '20')
  .action(async (url: string, options: any) => {
    try {
      const config = resolveConfig({
        targetUrl: url,
        preset: 'fast-smoke',
        humanAgent: {
          enabled: true,
          persona: options.persona,
          simulateMouseTrails: true,
          simulateTypingCadence: true,
          simulateScrollMomentum: true,
          maxInteractionsPerPage: parseInt(options.interactions, 10) || 20
        }
      });

      const runner = new AuditRunner(config);
      await runner.run();
    } catch (err) {
      console.error(`\n❌ Exploration Failed:\n${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('record')
  .description('Launch an interactive live browser to record clicks, inputs, and navigation into a UAT scenario JSON')
  .argument('<url>', 'Target URL to open and record')
  .option('-o, --output <path>', 'Output JSON scenario file path', './uat-scenarios/recorded-scenario.json')
  .option('--name <name>', 'Descriptive name for recorded scenario')
  .action(async (url: string, options: any) => {
    try {
      const recorder = new UatActionRecorder();
      await recorder.startRecording({
        startUrl: url,
        outputFile: options.output,
        name: options.name
      });
    } catch (err) {
      console.error(`\n❌ Recording Failed:\n${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

