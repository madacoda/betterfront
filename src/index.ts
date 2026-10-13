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
export * from './inspectors/layout/unsizedMedia.js';
export * from './inspectors/network/linkChecker.js';
export * from './inspectors/a11y/colorContrast.js';
export * from './inspectors/perf/clsObserver.js';
export * from './inspectors/a11y/touchTargets.js';
export * from './inspectors/a11y/textZoom.js';
export * from './inspectors/a11y/axeRunner.js';
export * from './uat/uatRunner.js';
export * from './vision/vlmClient.js';
export * from './reporter/scoring.js';
export * from './reporter/html.js';
export * from './reporter/json.js';

import { BetterFrontConfig, UatScenario, UatRunResult } from './types/index.js';
import { resolveConfig, STANDARD_VIEWPORTS } from './config/index.js';
import { AuditRunner } from './core/runner.js';
import { BrowserPool } from './core/browserPool.js';
import { UatRunner } from './uat/uatRunner.js';

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

/**
 * Convenient one-line programmatic UAT execution function
 */
export async function runUat(scenario: UatScenario): Promise<UatRunResult> {
  const pool = new BrowserPool();
  const uatRunner = new UatRunner();
  const vp = STANDARD_VIEWPORTS.mobile_standard;

  try {
    const session = await pool.createContextSession(vp);
    const result = await uatRunner.executeScenario(
      session.page,
      scenario,
      vp,
      session.consoleErrors
    );
    await session.context.close();
    return result;
  } finally {
    await pool.closeAll();
  }
}
