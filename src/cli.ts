#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { resolveConfigAsync, STANDARD_VIEWPORTS } from './config/index.js';
import { AuditRunner } from './core/runner.js';
import {
  runUat,
  runUatSuite,
  resolveUatScenarioInput,
  generateUatScenario,
  listUatTemplates,
  getUatTemplate,
  scaffoldUatTemplatesToDisk
} from './index.js';
import { ViewportDefinition, BrowserEngineType } from './types/index.js';
import { validateScenario, formatValidationReport } from './uat/validator.js';
import { UatActionRecorder } from './uat/recorder.js';

function parseKeyValueVars(rawVars?: string[]): Record<string, string> | undefined {
  if (!rawVars || rawVars.length === 0) return undefined;
  const map: Record<string, string> = {};
  for (const entry of rawVars) {
    const idx = entry.indexOf('=');
    if (idx > 0) {
      const k = entry.slice(0, idx).trim();
      const v = entry.slice(idx + 1).trim();
      map[k] = v;
    }
  }
  return Object.keys(map).length > 0 ? map : undefined;
}

const program = new Command();

program
  .name('betterfront')
  .description('Gold-Standard Autonomous Frontend QA & Production-Readiness Engine')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit a URL for layout collisions, mobile bleeds, CLS, CWV, and production readiness')
  .argument('[url]', 'Target URL to audit (or defined in betterfront.config.*)')
  .option('-c, --config <path>', 'Path to custom betterfront.config.{ts,js,mjs,json} file')
  .option('-p, --preset <preset>', 'Audit preset: production-gate, fast-smoke, comprehensive-deep')
  .option('--engine <engine>', 'Browser engine: chromium, webkit, firefox', 'chromium')
  .option('--concurrency <number>', 'Max concurrent browser contexts', '3')
  .option('--viewports <list>', 'Comma-separated viewport names (e.g. mobile_standard,tablet_portrait,desktop_fhd)')
  .option('--persona <persona>', 'Human simulation persona: impatient-mobile, power-user, cautious-first-timer, keyboard-only')
  .option('--uat <items>', 'Comma-separated UAT inputs: "auto", template IDs (e.g. rpg-game-hud,universal-smoke), or .json paths')
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
  .option('--sweep', 'Enable fluid breakpoint sweeper across 320px-1440px')
  .option('--lighthouse', 'Run programmatic Google Lighthouse audit')
  .option('--ai-triage', 'Enable Multimodal VLM AI triage for visual defects')
  .option('--vlm-provider <provider>', 'VLM provider: gemini, claude, openai, mock')
  // Output paths
  .option('--html <path>', 'Custom path for interactive HTML report', './betterfront-report.html')
  .option('--json <path>', 'Custom path for JSON summary', './betterfront-summary.json')
  .option('--sarif <path>', 'Export SARIF 2.1.0 report for GitHub Security / Code Scanning')
  .option('--junit <path>', 'Export JUnit XML report for CI/CD test runners')
  .option('--markdown <path>', 'Export GitHub Pull Request Markdown summary report')
  .option('--fail-on-blocker', 'Exit with code 1 if any production blocker is triggered', true)
  .action(async (url: string | undefined, options: any) => {
    try {
      let customViewports: ViewportDefinition[] | undefined;
      if (options.viewports) {
        const names = options.viewports.split(',').map((s: string) => s.trim());
        customViewports = names
          .map((n: string) => STANDARD_VIEWPORTS[n])
          .filter(Boolean);
      }

      const uatScenarios = options.uat
        ? options.uat.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined;

      const config = await resolveConfigAsync(
        {
          targetUrl: url,
          preset: options.preset as any,
          browserEngine: options.engine as BrowserEngineType,
          concurrency: parseInt(options.concurrency, 10) || 3,
          viewports: customViewports,
          uatScenarios,
          anomalyChecks: {
            textOverlap: options.textOverlap !== false,
            horizontalBleed: options.bleed !== false,
            containerClipping: options.clipping !== false,
            interactiveOcclusion: options.occlusion !== false,
            unsizedMedia: options.unsizedMedia !== false,
            lowContrast: options.lowContrast !== false,
            breakpointSweep: Boolean(options.sweep),
            touchTargetSize: options.touchTargets !== false,
            textZoom200Percent: false,
            a11yWcagViolations: options.a11y !== false,
            layoutShifts: options.shifts !== false,
            lighthouseCore: Boolean(options.lighthouse),
            consoleExceptions: options.consoleErrors !== false,
            brokenNetworkRequests: true,
            brokenLinks: options.brokenLinks !== false
          },
          humanAgent: options.persona ? ({ persona: options.persona } as any) : undefined,
          layoutEngine: {
            enableAiVisionTriage: Boolean(options.aiTriage),
            vlmProvider: options.vlmProvider || 'mock'
          },
          performance: {
            runLighthouse: Boolean(options.lighthouse)
          },
          recording: {
            recordVideo: options.video !== false,
            recordTrace: options.trace !== false,
            captureScreenshots: true,
            highlightAnomalies: true,
            artifactsDir: './betterfront-artifacts'
          },
          reporting: {
            outputHtml: options.html,
            outputJson: options.json,
            outputSarif: options.sarif,
            outputJunit: options.junit,
            outputMarkdown: options.markdown
          }
        },
        options.config
      );

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
  .description('Execute UAT from a live URL (zero-config auto-UAT), workflow template ID, .json scenario file, or directory suite')
  .argument('[target]', 'Target URL (http://...), workflow template ID (e.g. rpg-game-hud), .json file path, or directory')
  .option('-t, --template <id>', 'Built-in UAT workflow template ID (e.g. universal-smoke, rpg-game-hud, form-validation-chaos)')
  .option('-u, --url <url>', 'Override target startUrl / BASE_URL variable')
  .option('--var <key=value...>', 'Custom scenario variables (e.g. --var TOPBAR_SELECTOR=header.nav --var USER_EMAIL=qa@test.io)')
  .option('--list-templates', 'List all built-in customizable UAT workflow templates and exit', false)
  .option('--save-scenario <path>', 'Save the auto-generated or template-resolved UAT scenario JSON to disk')
  .option('-v, --viewport <name>', 'Override or specify target viewport (e.g. mobile_standard, desktop_fhd)')
  .option('--engine <engine>', 'Browser engine: chromium, webkit, firefox', 'chromium')
  .option('--headed', 'Run browser in visible/interactive mode to watch steps live', false)
  .option('--slowmo <ms>', 'Delay between browser actions in ms for easy visual observation', '0')
  .option('--video', 'Record full-motion WebM video of UAT execution')
  .option('--no-video', 'Disable full-motion video recording')
  .option('--trace', 'Record Playwright trace archive of UAT execution')
  .option('--no-trace', 'Disable trace recording')
  .option('--screenshot-on-failure', 'Capture screenshot and highlight element when a step fails')
  .option('--no-screenshot-on-failure', 'Disable automatic failure screenshots')
  .option('--artifacts-dir <dir>', 'Directory where failure captures, videos, and traces are saved')
  .option('--html <path>', 'Generate interactive HTML UAT report at path')
  .option('--json <path>', 'Save JSON UAT run result at path')
  .option('--junit <path>', 'Save JUnit XML UAT report at path')
  .option('--validate-only', 'Validate scenario JSON syntax, schema, and actions without launching browser', false)
  .action(async (target: string | undefined, options: any) => {
    try {
      if (options.listTemplates) {
        const templates = listUatTemplates();
        console.log('\n📚 Built-In Customizable UAT Workflow Templates:');
        console.log('───────────────────────────────────────────────────────────────────────');
        for (const t of templates) {
          console.log(`  🔹 ${t.id.padEnd(34)} [${t.category}]`);
          console.log(`     ${t.description}`);
          console.log(`     Customizable Variables: ${Object.keys(t.defaultVariables).join(', ')}\n`);
        }
        process.exit(0);
      }

      const effectiveInput = target || options.template || options.url;
      if (!effectiveInput) {
        console.error('❌ Please provide a target URL, workflow template ID, .json file, or --list-templates.');
        process.exit(1);
      }

      const customVars = parseKeyValueVars(options.var);
      const recordVideoOpt = options.video !== undefined ? Boolean(options.video) : undefined;
      const recordTraceOpt = options.trace !== undefined ? Boolean(options.trace) : undefined;
      const screenshotOnFailureOpt = options.screenshotOnFailure !== undefined ? Boolean(options.screenshotOnFailure) : undefined;
      const slowMoVal = parseInt(options.slowmo, 10) || 0;

      // Check if target is a directory -> Run multi-scenario suite!
      const maybeDir = path.resolve(effectiveInput);
      if (fs.existsSync(maybeDir) && fs.statSync(maybeDir).isDirectory()) {
        console.log(`\n📂 Executing UAT Workflow Suite from directory: ${maybeDir}`);
        const suiteResult = await runUatSuite(maybeDir, {
          targetUrl: options.url,
          variables: customVars,
          viewport: options.viewport,
          browserEngine: options.engine as BrowserEngineType,
          headless: !options.headed,
          slowMo: slowMoVal,
          recordVideo: recordVideoOpt,
          recordTrace: recordTraceOpt,
          screenshotOnFailure: screenshotOnFailureOpt,
          artifactsDir: options.artifactsDir,
          outputJson: options.json
        });

        console.log(`\n======================================================`);
        console.log(`UAT Suite Execution Summary:`);
        console.log(`Suite:        ${suiteResult.suiteName}`);
        console.log(`Scenarios:    ${suiteResult.passedScenarios}/${suiteResult.totalScenarios} passed`);
        console.log(`Total Steps:  ${suiteResult.passedSteps}/${suiteResult.totalSteps} passed`);
        console.log(`Status:       ${suiteResult.passed ? '✅ SUITE PASSED' : '🚨 SUITE FAILED'}`);
        console.log(`Duration:     ${(suiteResult.durationMs / 1000).toFixed(1)}s`);
        console.log(`======================================================\n`);
        process.exit(suiteResult.passed ? 0 : 1);
      }

      const scenario = await resolveUatScenarioInput(effectiveInput, {
        targetUrl: options.url,
        template: options.template,
        variables: customVars,
        headless: !options.headed,
        saveScenarioPath: options.saveScenario
      });

      const validation = validateScenario(scenario);

      if (options.validateOnly) {
        console.log(formatValidationReport(validation, scenario.name));
        process.exit(validation.valid ? 0 : 1);
      }

      if (!validation.valid) {
        console.log(formatValidationReport(validation, scenario.name));
        console.error(`❌ Scenario execution halted due to validation errors. Fix the errors above or run with --validate-only.`);
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.log(`⚠️  Advisory warnings for "${scenario.name}":`);
        validation.warnings.forEach((w) => console.log(`   🔸 ${w.message}`));
      }

      const shouldRecordVideo = recordVideoOpt ?? scenario.recording?.video ?? false;
      const shouldRecordTrace = recordTraceOpt ?? scenario.recording?.trace ?? false;
      const shouldCaptureFailure = screenshotOnFailureOpt ?? scenario.recording?.screenshotOnFailure ?? true;
      const targetArtifacts = options.artifactsDir || scenario.recording?.artifactsDir || './betterfront-artifacts';

      console.log(`\n======================================================`);
      console.log(`🧪 BetterFront UAT Runner: "${scenario.name}"`);
      console.log(`Target:       ${scenario.startUrl}`);
      if (scenario.template) console.log(`Template:     ${scenario.template}`);
      if (options.viewport) console.log(`Viewport:     ${options.viewport} (override)`);
      if (options.headed) console.log(`Mode:         Headed (interactive visual mode)`);
      if (options.slowmo && options.slowmo !== '0') console.log(`Slow-Mo:      ${options.slowmo}ms`);
      console.log(`Video:        ${shouldRecordVideo ? '🎥 Enabled (recording full-motion WebM)' : 'Disabled'}`);
      console.log(`Trace:        ${shouldRecordTrace ? '🎬 Enabled (recording Playwright trace archive)' : 'Disabled'}`);
      console.log(`Failure Shot: ${shouldCaptureFailure ? '📸 Enabled (red highlight snapshot on error)' : 'Disabled'}`);
      console.log(`Artifacts:    ${path.resolve(targetArtifacts)}`);
      console.log(`======================================================`);

      const result = await runUat(scenario, {
        variables: customVars,
        viewport: options.viewport,
        browserEngine: options.engine as BrowserEngineType,
        headless: !options.headed,
        slowMo: slowMoVal,
        recordVideo: recordVideoOpt,
        recordTrace: recordTraceOpt,
        screenshotOnFailure: screenshotOnFailureOpt,
        artifactsDir: options.artifactsDir,
        outputHtml: options.html,
        outputJson: options.json,
        outputJunit: options.junit
      });

      console.log(`\n======================================================`);
      console.log(`UAT Execution Summary:`);
      console.log(`Scenario:     ${result.scenarioName}`);
      if (result.viewportName) console.log(`Viewport:     ${result.viewportName}`);
      console.log(`Status:       ${result.passed ? '✅ PASSED' : '🚨 FAILED'}`);
      console.log(`Steps:        ${result.passedSteps}/${result.totalSteps} passed`);
      console.log(`Duration:     ${(result.durationMs / 1000).toFixed(1)}s`);
      if (result.htmlReportPath) console.log(`HTML Report:  file:///${result.htmlReportPath.replace(/\\/g, '/')}`);
      if (result.jsonReportPath) console.log(`JSON Report:  file:///${result.jsonReportPath.replace(/\\/g, '/')}`);
      if (result.junitReportPath) console.log(`JUnit XML:    file:///${result.junitReportPath.replace(/\\/g, '/')}`);
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
  .command('uat:generate')
  .description('Autonomously inspect a live URL or instantiate a template to generate a customizable UAT scenario JSON')
  .argument('<url>', 'Target URL to inspect and generate UAT scenario for')
  .option('-o, --output <path>', 'Output JSON scenario file path', './uat-scenarios/auto-generated-uat.json')
  .option('-t, --template <id>', 'Use a specific workflow template instead of live DOM discovery')
  .option('--name <name>', 'Custom name for generated scenario')
  .action(async (url: string, options: any) => {
    try {
      const outPath = path.resolve(options.output);
      let scenario;
      if (options.template) {
        scenario = getUatTemplate(options.template, url);
        if (options.name) scenario.name = options.name;
        const dir = path.dirname(outPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(scenario, null, 2), 'utf8');
      } else {
        console.log(`🔍 Inspecting live DOM at ${url} to synthesize UAT workflow...`);
        scenario = await generateUatScenario(url, {
          name: options.name,
          outputFilePath: outPath
        });
      }
      console.log(`✅ Generated customizable UAT scenario (${scenario.steps.length} steps):`);
      console.log(`   📄 file:///${outPath.replace(/\\/g, '/')}`);
      console.log(`   ▶️  Run now: npx betterfront uat "${outPath}"`);
    } catch (err) {
      console.error(`\n❌ UAT Generation Failed:\n${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Scaffold a production-ready betterfront.config.json and full customizable UAT workflow template suite')
  .argument('[url]', 'Default target URL for configuration and templates', 'http://localhost:7777')
  .option('--dir <path>', 'Directory for UAT workflow templates', './uat-scenarios/templates')
  .action(async (url: string, options: any) => {
    try {
      const configPath = path.resolve('./betterfront.config.json');
      if (!fs.existsSync(configPath)) {
        const defaultConfig = {
          targetUrl: url,
          preset: 'production-gate',
          browserEngine: 'chromium',
          concurrency: 3,
          uatScenarios: ['universal-smoke'],
          humanAgent: {
            enabled: true,
            persona: 'impatient-mobile',
            simulateMouseTrails: true,
            simulateTypingCadence: true,
            simulateScrollMomentum: true,
            maxInteractionsPerPage: 15
          },
          reporting: {
            outputHtml: './betterfront-report.html',
            outputJson: './betterfront-summary.json',
            outputMarkdown: './betterfront-pr-summary.md'
          }
        };
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        console.log(`✅ Created configuration file: ${configPath}`);
      } else {
        console.log(`ℹ️  Configuration file already exists: ${configPath}`);
      }

      const written = scaffoldUatTemplatesToDisk(options.dir, url);
      console.log(`✅ Scaffolded ${written.length} customizable UAT workflow templates in ${path.resolve(options.dir)}:`);
      for (const p of written) {
        console.log(`   - ${path.basename(p)}`);
      }
      console.log(`\n🚀 Ready to run out of the box:`);
      console.log(`   npx betterfront uat ${url}`);
      console.log(`   npx betterfront uat rpg-game-hud --url ${url}`);
      console.log(`   npx betterfront audit ${url}`);
    } catch (err) {
      console.error(`\n❌ Initialization Failed:\n${(err as Error).message}`);
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
      const config = await resolveConfigAsync({
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
