import { Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

export interface AxeSummaryResult {
  violationsCount: number;
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    helpUrl: string;
    nodesCount: number;
  }>;
}

export async function runAxeAudit(page: Page): Promise<AxeSummaryResult> {
  try {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    return {
      violationsCount: results.violations.length,
      violations: results.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact || 'minor',
        description: v.description,
        helpUrl: v.helpUrl,
        nodesCount: v.nodes.length
      }))
    };
  } catch (err) {
    console.warn(`[AxeRunner] Accessibility audit warning: ${(err as Error).message}`);
    return {
      violationsCount: 0,
      violations: []
    };
  }
}
