import { Page } from 'playwright';
import { ViewportDefinition, VisualDefect } from '../../types/index.js';

export interface DomBudgetThresholds {
  maxTotalNodes?: number;
  maxTreeDepth?: number;
  maxChildrenPerNode?: number;
}

export async function auditDomComplexityBudget(
  page: Page,
  viewport: ViewportDefinition,
  thresholds?: DomBudgetThresholds
): Promise<VisualDefect[]> {
  const maxTotalNodes = thresholds?.maxTotalNodes ?? 1500;
  const maxTreeDepth = thresholds?.maxTreeDepth ?? 32;
  const maxChildrenPerNode = thresholds?.maxChildrenPerNode ?? 100;

  const stats = await page.evaluate(
    ({ maxNodes, maxDepth, maxChildren }) => {
      const allElements = document.querySelectorAll('*');
      const totalNodes = allElements.length;
      let deepestLevel = 0;
      let deepestSelector = 'body';
      let largestChildCount = 0;
      let largestParentSelector = 'body';

      function getSelector(el: Element): string {
        if (el.id) return '#' + el.id;
        let s = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const c = el.className.trim().split(/\s+/)[0];
          if (c) s += '.' + c;
        }
        return s;
      }

      allElements.forEach((el) => {
        const childCount = el.children.length;
        if (childCount > largestChildCount) {
          largestChildCount = childCount;
          largestParentSelector = getSelector(el);
        }

        let depth = 0;
        let curr: Element | null = el;
        while (curr && curr !== document.documentElement) {
          depth++;
          curr = curr.parentElement;
        }
        if (depth > deepestLevel) {
          deepestLevel = depth;
          deepestSelector = getSelector(el);
        }
      });

      const violations: Array<{
        selector: string;
        metric: string;
        description: string;
        suggestedFix: string;
      }> = [];

      if (totalNodes > maxNodes) {
        violations.push({
          selector: 'document.body',
          metric: `${totalNodes} DOM nodes`,
          description: `Total DOM size (${totalNodes} elements) exceeds the ${maxNodes}-node performance budget, increasing style recalculation and INP latency.`,
          suggestedFix: `Use list virtualization, lazy-render offscreen modals/tabs, and prune redundant wrapper <div> nodes.`
        });
      }

      if (deepestLevel > maxDepth) {
        violations.push({
          selector: deepestSelector,
          metric: `Depth ${deepestLevel}`,
          description: `DOM tree depth reaches ${deepestLevel} levels at <${deepestSelector}> (budget <= ${maxDepth}), slowing CSS layout passes.`,
          suggestedFix: `Flatten component wrapper hierarchy using CSS Grid or Flexbox instead of deeply nested containers.`
        });
      }

      if (largestChildCount > maxChildren) {
        violations.push({
          selector: largestParentSelector,
          metric: `${largestChildCount} direct children`,
          description: `Container <${largestParentSelector}> renders ${largestChildCount} direct child elements without virtualization (budget <= ${maxChildren}).`,
          suggestedFix: `Implement windowed rendering (e.g. @tanstack/react-virtual) or pagination for large feeds/tables.`
        });
      }

      return violations;
    },
    { maxNodes: maxTotalNodes, maxDepth: maxTreeDepth, maxChildren: maxChildrenPerNode }
  );

  return stats.map((v, idx) => ({
    id: `dom_budget_${viewport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'DOM_COMPLEXITY_BUDGET',
    severity: 'MINOR',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: {
      selector: v.selector,
      tagName: 'dom-tree',
      text: v.metric,
      rect: { top: 0, bottom: 40, left: 0, right: 240, width: 240, height: 40 }
    },
    aiTriage: {
      isBug: true,
      confidence: 0.93,
      description: v.description,
      suggestedCssFix: v.suggestedFix
    }
  }));
}
