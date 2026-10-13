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
export * from './inspectors/network/linkChecker.js';
export * from './inspectors/a11y/colorContrast.js';
export * from './inspectors/perf/clsObserver.js';
export * from './inspectors/a11y/touchTargets.js';
export * from './inspectors/a11y/textZoom.js';
export * from './inspectors/a11y/axeRunner.js';
export * from './uat/uatRunner.js';
export * from './uat/validator.js';
export * from './vision/vlmClient.js';
export * from './reporter/scoring.js';
export * from './reporter/html.js';
export * from './reporter/json.js';

import * as fs from 'fs';
import * as path from 'path';
import { BetterFrontConfig, UatScenario, UatRunResult, ViewportDefinition, UatRecordingOptions } from './types/index.js';
import { resolveConfig, STANDARD_VIEWPORTS } from './config/index.js';
import { AuditRunner } from './core/runner.js';
import { BrowserPool } from './core/browserPool.js';
import { UatRunner } from './uat/uatRunner.js';
import { validateScenario } from './uat/validator.js';
export * from './uat/recorder.js';

/**
 * Convenient one-line programmatic audit function
 */
export async function audit(targetUrl: string, options?: Partial<BetterFrontConfig>) {
  const config = resolveConfig({
    targetUrl,
    ...options
  });
  const runner = new AuditRunner(config);
  return runner.run();
}

export interface RunUatOptions {
  viewport?: string | ViewportDefinition;
  viewports?: (string | ViewportDefinition)[];
  headless?: boolean;
  slowMo?: number;
  recordVideo?: boolean;
  recordTrace?: boolean;
  screenshotOnFailure?: boolean;
  artifactsDir?: string;
}

/**
 * Convenient one-line programmatic UAT execution function
 */
export async function runUat(scenario: UatScenario, options?: RunUatOptions): Promise<UatRunResult> {
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

  const pool = new BrowserPool({
    headless: options?.headless !== false,
    slowMo: options?.slowMo || 0
  });
  const uatRunner = new UatRunner();

  try {
    const viewportRuns: UatRunResult[] = [];
    const artifactsDir = path.resolve(effectiveRecording.artifactsDir || './betterfront-artifacts');
    const shouldRecordVideo = effectiveRecording.video ?? false;
    const shouldRecordTrace = effectiveRecording.trace ?? false;

    for (const vp of targetViewports) {
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

      try {
        const runResult = await uatRunner.executeScenario(
          session.page,
          scenario,
          vp,
          session.consoleErrors
        );
        viewportRuns.push(runResult);
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

      if (viewportRuns.length > 0) {
        const lastRun = viewportRuns[viewportRuns.length - 1];
        lastRun.videoPath = capturedVideoPath;
        lastRun.tracePath = capturedTracePath;
      }
    }

    if (viewportRuns.length === 1) {
      return viewportRuns[0];
    }

    // Multi-viewport aggregated summary
    const allPassed = viewportRuns.every((r) => r.passed);
    const totalSteps = viewportRuns.reduce((sum, r) => sum + r.totalSteps, 0);
    const passedSteps = viewportRuns.reduce((sum, r) => sum + r.passedSteps, 0);
    const failedSteps = viewportRuns.reduce((sum, r) => sum + r.failedSteps, 0);
    const totalDuration = viewportRuns.reduce((sum, r) => sum + r.durationMs, 0);
    const firstFailure = viewportRuns.find((r) => r.failureScreenshotPath)?.failureScreenshotPath;
    const firstVideo = viewportRuns.find((r) => r.videoPath)?.videoPath;
    const firstTrace = viewportRuns.find((r) => r.tracePath)?.tracePath;

    return {
      scenarioName: scenario.name,
      viewportName: viewportRuns.map((r) => r.viewportName).join(', '),
      passed: allPassed,
      totalSteps,
      passedSteps,
      failedSteps,
      durationMs: totalDuration,
      steps: viewportRuns.flatMap((r) => r.steps),
      viewportResults: viewportRuns,
      failureScreenshotPath: firstFailure,
      videoPath: firstVideo,
      tracePath: firstTrace
    };
  } finally {
    await pool.closeAll();
  }
}
