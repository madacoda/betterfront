import { chromium } from 'playwright';
import { AuditRunSummary } from '../../types/index.js';

export type LighthouseSummary = NonNullable<AuditRunSummary['lighthouseSummary']>;

/**
 * Runs programmatic Google Lighthouse against the target URL using an isolated Chromium debugging port.
 */
export async function runLighthouseAudit(targetUrl: string): Promise<LighthouseSummary | undefined> {
  const debugPort = 9222 + Math.floor(Math.random() * 500);
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        `--remote-debugging-port=${debugPort}`,
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });

    const lighthouseModule = await import('lighthouse');
    const lighthouseFn = lighthouseModule.default || (lighthouseModule as any);

    const runnerResult = await lighthouseFn(targetUrl, {
      port: debugPort,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
    });

    if (!runnerResult || !runnerResult.lhr) {
      return undefined;
    }

    const lhr = runnerResult.lhr;
    const getCategoryScore = (key: string) => Math.round(((lhr.categories?.[key]?.score ?? 0) as number) * 100);

    return {
      performance: getCategoryScore('performance'),
      accessibility: getCategoryScore('accessibility'),
      bestPractices: getCategoryScore('best-practices'),
      seo: getCategoryScore('seo'),
      lcpMs: Math.round(lhr.audits?.['largest-contentful-paint']?.numericValue ?? 0),
      cls: Number((lhr.audits?.['cumulative-layout-shift']?.numericValue ?? 0).toFixed(4)),
      fcpMs: Math.round(lhr.audits?.['first-contentful-paint']?.numericValue ?? 0),
      tbtMs: Math.round(lhr.audits?.['total-blocking-time']?.numericValue ?? 0)
    };
  } catch (err) {
    console.warn(`[Lighthouse] Programmatic Lighthouse warning: ${(err as Error).message}`);
    return undefined;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
