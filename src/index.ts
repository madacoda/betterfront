/**
 * BetterFront - Public Library Exports
 */

export * from './types/index.js';
export * from './config/index.js';
export * from './core/runner.js';
export * from './core/browserPool.js';
export * from './core/captureRecorder.js';
export * from './agent/kinematics.js';
export * from './agent/scroller.js';
export * from './agent/typist.js';
export * from './agent/crawler.js';
export * from './agent/formFiller.js';
export * from './inspectors/layout/textCollision.js';
export * from './inspectors/layout/horizontalBleed.js';
export * from './inspectors/layout/containerClipping.js';
export * from './inspectors/layout/interactiveOcclusion.js';
export * from './inspectors/layout/unsizedMedia.js';
export * from './inspectors/layout/breakpointSweeper.js';
export * from './inspectors/network/linkChecker.js';
export * from './inspectors/a11y/colorContrast.js';
export * from './inspectors/perf/clsObserver.js';
export * from './inspectors/perf/lighthouseRunner.js';
export * from './inspectors/a11y/touchTargets.js';
export * from './inspectors/a11y/textZoom.js';
export * from './inspectors/a11y/axeRunner.js';
export * from './uat/uatRunner.js';
export * from './uat/validator.js';
export * from './uat/generator.js';
export * from './uat/templates.js';
export * from './vision/vlmClient.js';
export * from './reporter/scoring.js';
export * from './reporter/html.js';
export * from './reporter/json.js';
export * from './uat/recorder.js';

import * as fs from 'fs';
import * as path from 'path';
import {
  UatScenario,
  UatRunResult,
  UatSuiteResult,
  ViewportDefinition,
  UatRecordingOptions,
  BrowserEngineType,
  UatGeneratorOptions
} from './types/index.js';
import { resolveConfigAsync, UserConfigInput, STANDARD_VIEWPORTS } from './config/index.js';
import { AuditRunner } from './core/runner.js';
import { BrowserPool } from './core/browserPool.js';
import { UatRunner, interpolateScenario } from './uat/uatRunner.js';
import { validateScenario } from './uat/validator.js';
import { generateUatScenario } from './uat/generator.js';
import { UAT_WORKFLOW_TEMPLATES, getUatTemplate } from './uat/templates.js';
import { generateUatHtmlReport } from './reporter/html.js';
import { saveUatJsonSummary, saveUatJunitReport } from './reporter/json.js';

/**
 * Convenient one-line programmatic audit function
 */
export async function audit(targetUrl: string, options?: UserConfigInput, configFilePath?: string) {
  const config = await resolveConfigAsync(
    {
      ...options,
      targetUrl
    },
    configFilePath
  );
  const runner = new AuditRunner(config);
  return runner.run();
}

export interface RunUatOptions {
  targetUrl?: string;
  baseUrl?: string;
  template?: string;
  variables?: Record<string, string>;
  viewport?: string | ViewportDefinition;
  viewports?: (string | ViewportDefinition)[];
  browserEngine?: BrowserEngineType;
  browserPool?: BrowserPool;
  headless?: boolean;
  slowMo?: number;
  recordVideo?: boolean;
  recordTrace?: boolean;
  screenshotOnFailure?: boolean;
  artifactsDir?: string;
  saveScenarioPath?: string;
  outputHtml?: string;
  outputJson?: string;
  outputJunit?: string;
}

/**
 * Resolves a UatScenario from a scenario object, file path, template name, or live URL (auto-discovery).
 */
export async function resolveUatScenarioInput(
  input: UatScenario | string,
  options?: RunUatOptions
): Promise<UatScenario> {
  let scenario: UatScenario;
  const effectiveTargetUrl = options?.targetUrl || options?.baseUrl || options?.variables?.BASE_URL;

  if (typeof input === 'object' && input !== null) {
    scenario = { ...input };
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    // 1. Check if it matches a built-in workflow template ID
    if (Object.prototype.hasOwnProperty.call(UAT_WORKFLOW_TEMPLATES, trimmed.toLowerCase())) {
      scenario = getUatTemplate(trimmed.toLowerCase(), effectiveTargetUrl, options?.variables);
    }
    // 2. Check if it is an existing JSON file on disk
    else if (fs.existsSync(path.resolve(trimmed)) && fs.statSync(path.resolve(trimmed)).isFile()) {
      const raw = fs.readFileSync(path.resolve(trimmed), 'utf8');
      scenario = JSON.parse(raw) as UatScenario;
    }
    // 3. Check if it is a live HTTP/HTTPS URL -> Auto-generate UAT scenario on the fly!
    else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (options?.template) {
        scenario = getUatTemplate(options.template, trimmed, options?.variables);
      } else {
        scenario = await generateUatScenario(
          trimmed,
          {
            headless: options?.headless !== false,
            outputFilePath: options?.saveScenarioPath
          },
          options?.browserPool
        );
      }
    } else {
      throw new Error(
        `Could not resolve UAT input "${trimmed}". Provide a valid .json file path, a template ID (${Object.keys(UAT_WORKFLOW_TEMPLATES).join(', ')}), or a live http(s):// URL.`
      );
    }
  } else {
    throw new Error('Invalid UAT scenario input.');
  }

  if (effectiveTargetUrl) {
    scenario.startUrl = effectiveTargetUrl;
    scenario.variables = {
      ...(scenario.variables || {}),
      BASE_URL: effectiveTargetUrl
    };
  }

  if (effectiveTargetUrl || options?.variables) {
    scenario = interpolateScenario(scenario, {
      ...(effectiveTargetUrl ? { BASE_URL: effectiveTargetUrl } : {}),
      ...(options?.variables || {})
    });
  }

  if (options?.saveScenarioPath) {
    const outPath = path.resolve(options.saveScenarioPath);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(scenario, null, 2), 'utf8');
  }

  return scenario;
}

/**
 * Convenient one-line programmatic UAT execution function.
 * Accepts a UatScenario object, a .json file path, a workflow template ID, or a live URL!
 */
export async function runUat(
  scenarioOrInput: UatScenario | string,
  options?: RunUatOptions
): Promise<UatRunResult> {
  const ownsPool = !options?.browserPool;
  const pool =
    options?.browserPool ||
    new BrowserPool({
      headless: options?.headless !== false,
      slowMo: options?.slowMo || 0,
      browserEngine: options?.browserEngine || 'chromium'
    });

  try {
    const scenario = await resolveUatScenarioInput(scenarioOrInput, {
      ...options,
      browserPool: pool
    });

    // Pre-flight syntax and action validation
    const validation = validateScenario(scenario);
    if (!validation.valid) {
      const errorDetails = validation.errors
        .map((e) => `   ❌ ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`)
        .join('\n');
      throw new Error(`UAT Scenario validation failed with ${validation.errors.length} error(s):\n${errorDetails}`);
    }

    // Synchronize effective recording configuration (CLI/options take precedence over scenario JSON)
    const effectiveRecording: UatRecordingOptions = {
      video: options?.recordVideo ?? scenario.recording?.video ?? false,
      trace: options?.recordTrace ?? scenario.recording?.trace ?? false,
      screenshotOnFailure: options?.screenshotOnFailure ?? scenario.recording?.screenshotOnFailure ?? true,
      artifactsDir: options?.artifactsDir || scenario.recording?.artifactsDir || './betterfront-artifacts'
    };
    scenario.recording = effectiveRecording;

    // Determine target viewports
    let targetViewports: ViewportDefinition[] = [];
    if (options?.viewport) {
      const vp = typeof options.viewport === 'string' ? STANDARD_VIEWPORTS[options.viewport] : options.viewport;
      if (vp) targetViewports.push(vp);
    } else if (options?.viewports && options.viewports.length > 0) {
      targetViewports = options.viewports
        .map((v) => (typeof v === 'string' ? STANDARD_VIEWPORTS[v] : v))
        .filter((v): v is ViewportDefinition => Boolean(v));
    } else if (scenario.viewports && scenario.viewports.length > 0) {
      targetViewports = scenario.viewports
        .map((v) => STANDARD_VIEWPORTS[v])
        .filter((v): v is ViewportDefinition => Boolean(v));
    }

    if (targetViewports.length === 0) {
      targetViewports.push(STANDARD_VIEWPORTS.mobile_standard);
    }

    const artifactsDir = path.resolve(effectiveRecording.artifactsDir || './betterfront-artifacts');
    const shouldRecordVideo = effectiveRecording.video ?? false;
    const shouldRecordTrace = effectiveRecording.trace ?? false;

    // Execute viewports concurrently in isolated browser contexts
    const viewportRuns = await Promise.all(
      targetViewports.map(async (vp) => {
        const uatRunner = new UatRunner();
        let videoDir: string | undefined;
        if (shouldRecordVideo) {
          videoDir = path.join(artifactsDir, 'videos', vp.name.replace(/[^a-zA-Z0-9_-]/g, '_'));
          if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
        }

        const session = await pool.createContextSession(vp, videoDir);

        if (shouldRecordTrace) {
          await session.context.tracing.start({ screenshots: true, snapshots: true, sources: true }).catch(() => {});
        }

        let capturedTracePath: string | undefined;
        let capturedVideoPath: string | undefined;
        let runResult!: UatRunResult;

        try {
          runResult = await uatRunner.executeScenario(
            session.page,
            scenario,
            vp,
            session.consoleErrors,
            session.networkErrors,
            options?.variables
          );
        } finally {
          if (shouldRecordTrace) {
            const tracePath = path.join(artifactsDir, `trace_uat_${vp.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`);
            await session.context.tracing.stop({ path: tracePath }).catch(() => {});
            capturedTracePath = tracePath;
            console.log(`   🎬 Trace archive recorded: ${tracePath}`);
          }
          const video = session.page.video();
          if (video) {
            const vPath = await video.path().catch(() => undefined);
            if (vPath) {
              capturedVideoPath = vPath;
              console.log(`   🎥 Full-motion video recorded: ${vPath}`);
            }
          }
          await session.context.close();
        }

        runResult.videoPath = capturedVideoPath;
        runResult.tracePath = capturedTracePath;
        return runResult;
      })
    );

    let finalResult: UatRunResult;
    if (viewportRuns.length === 1) {
      finalResult = {
        ...viewportRuns[0],
        viewportResults: viewportRuns
      };
    } else {
      const allPassed = viewportRuns.every((r) => r.passed);
      const totalSteps = viewportRuns.reduce((sum, r) => sum + r.totalSteps, 0);
      const passedSteps = viewportRuns.reduce((sum, r) => sum + r.passedSteps, 0);
      const failedSteps = viewportRuns.reduce((sum, r) => sum + r.failedSteps, 0);
      const skippedSteps = viewportRuns.reduce((sum, r) => sum + (r.skippedSteps || 0), 0);
      const totalDuration = Math.max(...viewportRuns.map((r) => r.durationMs));
      const firstFailure = viewportRuns.find((r) => r.failureScreenshotPath)?.failureScreenshotPath;
      const firstVideo = viewportRuns.find((r) => r.videoPath)?.videoPath;
      const firstTrace = viewportRuns.find((r) => r.tracePath)?.tracePath;

      finalResult = {
        scenarioName: scenario.name,
        viewportName: viewportRuns.map((r) => r.viewportName).join(', '),
        passed: allPassed,
        totalSteps,
        passedSteps,
        failedSteps,
        skippedSteps,
        durationMs: totalDuration,
        steps: viewportRuns.flatMap((r) => r.steps),
        anomaliesDetected: viewportRuns.flatMap((r) => r.anomaliesDetected || []),
        viewportResults: viewportRuns,
        failureScreenshotPath: firstFailure,
        videoPath: firstVideo,
        tracePath: firstTrace
      };
    }

    if (options?.outputHtml) {
      const htmlPath = path.resolve(options.outputHtml);
      const dir = path.dirname(htmlPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(htmlPath, generateUatHtmlReport(finalResult), 'utf8');
      finalResult.htmlReportPath = htmlPath;
    }

    if (options?.outputJson) {
      const jsonPath = path.resolve(options.outputJson);
      saveUatJsonSummary(finalResult, jsonPath);
      finalResult.jsonReportPath = jsonPath;
    }

    if (options?.outputJunit) {
      const junitPath = path.resolve(options.outputJunit);
      saveUatJunitReport(finalResult, junitPath);
      finalResult.junitReportPath = junitPath;
    }

    return finalResult;
  } finally {
    if (ownsPool) {
      await pool.closeAll();
    }
  }
}

/**
 * Zero-Config Autonomous UAT: inspects a live URL, synthesizes a complete UAT scenario, and executes it immediately
 * while reusing the same BrowserPool across discovery and execution.
 */
export async function runAutoUat(
  targetUrl: string,
  options?: RunUatOptions & UatGeneratorOptions
): Promise<{ passed: boolean; scenario: UatScenario; result: UatRunResult }> {
  const ownsPool = !options?.browserPool;
  const pool =
    options?.browserPool ||
    new BrowserPool({
      headless: options?.headless !== false,
      slowMo: options?.slowMo || 0,
      browserEngine: options?.browserEngine || 'chromium'
    });

  try {
    const scenario = await generateUatScenario(
      targetUrl,
      {
        ...options,
        headless: options?.headless !== false,
        outputFilePath: options?.saveScenarioPath || options?.outputFilePath
      },
      pool
    );
    const result = await runUat(scenario, {
      ...options,
      browserPool: pool
    });
    return { passed: result.passed, scenario, result };
  } finally {
    if (ownsPool) {
      await pool.closeAll();
    }
  }
}

/**
 * Executes a multi-scenario UAT workflow suite while sharing a warm BrowserPool across all scenarios.
 */
export async function runUatSuite(
  scenariosOrDirectory: Array<UatScenario | string> | string,
  options?: RunUatOptions & { suiteName?: string }
): Promise<UatSuiteResult> {
  const startTime = Date.now();
  let inputs: Array<UatScenario | string> = [];

  if (typeof scenariosOrDirectory === 'string') {
    const absPath = path.resolve(scenariosOrDirectory);
    if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
      const files = fs
        .readdirSync(absPath)
        .filter((f) => f.endsWith('.json') && !f.endsWith('.schema.json'))
        .map((f) => path.join(absPath, f));
      inputs = files;
    } else {
      inputs = scenariosOrDirectory.split(',').map((s) => s.trim()).filter(Boolean);
    }
  } else {
    inputs = scenariosOrDirectory;
  }

  if (inputs.length === 0) {
    throw new Error('No UAT scenarios found to execute in suite.');
  }

  const ownsPool = !options?.browserPool;
  const pool =
    options?.browserPool ||
    new BrowserPool({
      headless: options?.headless !== false,
      slowMo: options?.slowMo || 0,
      browserEngine: options?.browserEngine || 'chromium'
    });

  const scenarioResults: UatRunResult[] = [];
  try {
    for (const item of inputs) {
      const res = await runUat(item, {
        ...options,
        browserPool: pool,
        outputHtml: undefined,
        outputJson: undefined,
        outputJunit: undefined
      });
      scenarioResults.push(res);
    }
  } finally {
    if (ownsPool) {
      await pool.closeAll();
    }
  }

  const passedScenarios = scenarioResults.filter((r) => r.passed).length;
  const failedScenarios = scenarioResults.length - passedScenarios;
  const totalSteps = scenarioResults.reduce((s, r) => s + r.totalSteps, 0);
  const passedSteps = scenarioResults.reduce((s, r) => s + r.passedSteps, 0);
  const failedSteps = scenarioResults.reduce((s, r) => s + r.failedSteps, 0);
  const suitePassed = failedScenarios === 0;

  const suiteResult: UatSuiteResult = {
    suiteName: options?.suiteName || `BetterFront UAT Suite (${scenarioResults.length} Workflows)`,
    passed: suitePassed,
    totalScenarios: scenarioResults.length,
    passedScenarios,
    failedScenarios,
    totalSteps,
    passedSteps,
    failedSteps,
    durationMs: Date.now() - startTime,
    scenarioResults
  };

  if (options?.outputJson) {
    const jsonPath = path.resolve(options.outputJson);
    const dir = path.dirname(jsonPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(suiteResult, null, 2), 'utf8');
    suiteResult.jsonReportPath = jsonPath;
  }

  return suiteResult;
}

