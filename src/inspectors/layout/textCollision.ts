import { Page } from 'playwright';
import { VisualDefect, ViewportDefinition } from '../../types/index.js';

export const INJECTED_TEXT_COLLISION_SCANNER = `(() => {
  function getUniqueSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return '#' + el.id;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\\s+/).filter(c => c && !c.includes(':')).slice(0, 2);
        if (classes.length > 0) selector += '.' + classes.join('.');
      }
      let sibling = el;
      let nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.tagName === el.tagName) nth++;
      }
      selector += ':nth-of-type(' + nth + ')';
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const style = window.getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  const textRectItems = [];
  const range = document.createRange();

  for (const node of textNodes) {
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r.width > 2 && r.height > 2) {
        textRectItems.push({
          node,
          parent: node.parentElement,
          rect: {
            top: r.top + window.scrollY,
            bottom: r.bottom + window.scrollY,
            left: r.left + window.scrollX,
            right: r.right + window.scrollX,
            width: r.width,
            height: r.height
          },
          text: node.textContent.trim()
        });
      }
    }
  }

  const collisions = [];

  for (let i = 0; i < textRectItems.length; i++) {
    for (let j = i + 1; j < textRectItems.length; j++) {
      const itemA = textRectItems[i];
      const itemB = textRectItems[j];

      // Ignore text within same element or direct nesting hierarchy
      if (itemA.parent === itemB.parent) continue;
      if (itemA.parent.contains(itemB.parent) || itemB.parent.contains(itemA.parent)) continue;

      const rA = itemA.rect;
      const rB = itemB.rect;

      const overlapX = Math.max(0, Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left));
      const overlapY = Math.max(0, Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top));
      const overlapArea = overlapX * overlapY;

      // Threshold: at least 3px overlap in both dimensions and 12px² area
      if (overlapX >= 3 && overlapY >= 3 && overlapArea >= 12) {
        collisions.push({
          type: 'TEXT_ON_TEXT_COLLISION',
          elementA: {
            selector: getUniqueSelector(itemA.parent),
            tagName: itemA.parent.tagName.toLowerCase(),
            id: itemA.parent.id || null,
            className: itemA.parent.className || null,
            text: itemA.text.substring(0, 60),
            rect: rA
          },
          elementB: {
            selector: getUniqueSelector(itemB.parent),
            tagName: itemB.parent.tagName.toLowerCase(),
            id: itemB.parent.id || null,
            className: itemB.parent.className || null,
            text: itemB.text.substring(0, 60),
            rect: rB
          },
          overlapBox: {
            left: Math.round(Math.max(rA.left, rB.left)),
            top: Math.round(Math.max(rA.top, rB.top)),
            width: Math.round(overlapX),
            height: Math.round(overlapY),
            area: Math.round(overlapArea)
          }
        });
      }
    }
  }

  return collisions;
})()`;

export async function detectTextCollisions(
  page: Page,
  viewport: ViewportDefinition
): Promise<VisualDefect[]> {
  const rawCollisions = await page.evaluate(INJECTED_TEXT_COLLISION_SCANNER);

  return (rawCollisions as any[]).map((c, idx) => ({
    id: `text_collision_${viewport.name}_${idx + 1}`,
    type: 'TEXT_ON_TEXT_COLLISION',
    severity: 'CRITICAL',
    viewportName: viewport.name,
    viewportSize: { width: viewport.width, height: viewport.height },
    elementA: c.elementA,
    elementB: c.elementB,
    overlapBox: c.overlapBox
  }));
}
