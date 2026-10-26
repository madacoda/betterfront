import { Page } from 'playwright';
import { VisualDefect, ViewportDefinition } from '../../types/index.js';

export const INJECTED_TEXT_COLLISION_SCANNER = `((minAreaPx) => {
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

  function getStickyOrFixedRoot(el) {
    let curr = el;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      const style = window.getComputedStyle(curr);
      if (style.position === 'fixed' || style.position === 'sticky') {
        return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  }

  function clipRectToScrollAncestors(rawRect, el) {
    let top = rawRect.top;
    let bottom = rawRect.bottom;
    let left = rawRect.left;
    let right = rawRect.right;

    let curr = el;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      const style = window.getComputedStyle(curr);
      const clipX = ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX);
      const clipY = ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY);
      if (clipX || clipY) {
        const cRect = curr.getBoundingClientRect();
        if (clipX) {
          left = Math.max(left, cRect.left);
          right = Math.min(right, cRect.right);
        }
        if (clipY) {
          top = Math.max(top, cRect.top);
          bottom = Math.min(bottom, cRect.bottom);
        }
      }
      curr = curr.parentElement;
    }

    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    return { top, bottom, left, right, width, height };
  }

  function extractStyles(el) {
    const s = window.getComputedStyle(el);
    return {
      position: s.position,
      zIndex: s.zIndex,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      borderRadius: s.borderRadius,
      marginLeft: s.marginLeft,
      marginTop: s.marginTop,
      opacity: s.opacity
    };
  }

  const textNodes = [];
  function collectTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement || (node.parentNode && node.parentNode.host ? node.parentNode.host : null);
        if (!parent) return NodeFilter.FILTER_REJECT;
        let curr = parent;
        while (curr && curr !== document.documentElement) {
          const style = window.getComputedStyle(curr);
          if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          curr = curr.parentElement || (curr.getRootNode && curr.getRootNode().host ? curr.getRootNode().host : null);
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    // Traverse open Shadow DOM roots
    const allEls = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (let k = 0; k < allEls.length; k++) {
      if (allEls[k].shadowRoot) {
        collectTextNodes(allEls[k].shadowRoot);
      }
    }
  }

  collectTextNodes(document.body);

  const textRectItems = [];
  const range = document.createRange();

  for (const node of textNodes) {
    const parent = node.parentElement || (node.parentNode && node.parentNode.host ? node.parentNode.host : null);
    if (!parent) continue;
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    const stickyRoot = getStickyOrFixedRoot(parent);

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r.width <= 2 || r.height <= 2) continue;

      // Clip against ancestor overflow/scroll containers
      const clipped = clipRectToScrollAncestors(r, parent);
      if (clipped.width <= 2 || clipped.height <= 2) continue;

      textRectItems.push({
        node,
        parent,
        stickyRoot,
        viewportRect: clipped,
        rect: {
          top: clipped.top + window.scrollY,
          bottom: clipped.bottom + window.scrollY,
          left: clipped.left + window.scrollX,
          right: clipped.right + window.scrollX,
          width: clipped.width,
          height: clipped.height
        },
        text: node.textContent.trim()
      });
    }
  }

  // Sort by top coordinate for O(N log N) Sweep-and-Prune collision detection
  textRectItems.sort((a, b) => a.rect.top - b.rect.top);

  const collisions = [];
  const minArea = typeof minAreaPx === 'number' ? minAreaPx : 12;

  for (let i = 0; i < textRectItems.length; i++) {
    const itemA = textRectItems[i];
    const rA = itemA.rect;

    for (let j = i + 1; j < textRectItems.length; j++) {
      const itemB = textRectItems[j];
      const rB = itemB.rect;

      // Sweep-and-Prune early exit: since items are sorted by top, if rB.top > rA.bottom, no subsequent item can overlap vertically
      if (rB.top > rA.bottom) break;

      // Ignore text within same element or direct nesting hierarchy
      if (itemA.parent === itemB.parent) continue;
      if (itemA.parent.contains(itemB.parent) || itemB.parent.contains(itemA.parent)) continue;

      // Ignore when one element is inside a sticky/fixed chrome layer and the other is normal document flow
      if (itemA.stickyRoot !== itemB.stickyRoot) continue;

      const overlapX = Math.max(0, Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left));
      const overlapY = Math.max(0, Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top));
      const overlapArea = overlapX * overlapY;

      if (overlapX >= 3 && overlapY >= 3 && overlapArea >= minArea) {
        // Verify visibility plane via elementsFromPoint if intersection is within current viewport
        const vpLeft = Math.max(itemA.viewportRect.left, itemB.viewportRect.left);
        const vpTop = Math.max(itemA.viewportRect.top, itemB.viewportRect.top);
        const cx = vpLeft + overlapX / 2;
        const cy = vpTop + overlapY / 2;

        if (cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight) {
          const rootA = itemA.parent.getRootNode ? itemA.parent.getRootNode() : document;
          const rootB = itemB.parent.getRootNode ? itemB.parent.getRootNode() : document;
          const stackA = (rootA && rootA.elementsFromPoint) ? rootA.elementsFromPoint(cx, cy) : document.elementsFromPoint(cx, cy);
          const stackB = (rootB && rootB.elementsFromPoint) ? rootB.elementsFromPoint(cx, cy) : document.elementsFromPoint(cx, cy);
          if (stackA && stackA.length > 0 && stackB && stackB.length > 0) {
            const idxA = stackA.findIndex(el => el === itemA.parent || itemA.parent.contains(el) || el.contains(itemA.parent));
            const idxB = stackB.findIndex(el => el === itemB.parent || itemB.parent.contains(el) || el.contains(itemB.parent));
            if (idxA === -1 || idxB === -1) continue;
          }
        }

        collisions.push({
          type: 'TEXT_ON_TEXT_COLLISION',
          elementA: {
            selector: getUniqueSelector(itemA.parent),
            tagName: itemA.parent.tagName.toLowerCase(),
            id: itemA.parent.id || null,
            className: typeof itemA.parent.className === 'string' ? itemA.parent.className : null,
            text: itemA.text.substring(0, 60),
            rect: rA,
            computedStyles: extractStyles(itemA.parent)
          },
          elementB: {
            selector: getUniqueSelector(itemB.parent),
            tagName: itemB.parent.tagName.toLowerCase(),
            id: itemB.parent.id || null,
            className: typeof itemB.parent.className === 'string' ? itemB.parent.className : null,
            text: itemB.text.substring(0, 60),
            rect: rB,
            computedStyles: extractStyles(itemB.parent)
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
})`;

export async function detectTextCollisions(
  page: Page,
  viewport: ViewportDefinition | string,
  minCollisionAreaPx = 12
): Promise<VisualDefect[]> {
  const rawCollisions = await page.evaluate(`${INJECTED_TEXT_COLLISION_SCANNER}(${minCollisionAreaPx})`);
  const vpName = typeof viewport === 'string' ? viewport : viewport.name;
  const vpSize =
    typeof viewport === 'string'
      ? page.viewportSize() || { width: 1280, height: 720 }
      : { width: viewport.width, height: viewport.height };

  return (rawCollisions as any[]).map((c, idx) => ({
    id: `text_collision_${vpName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}`,
    type: 'TEXT_ON_TEXT_COLLISION',
    severity: 'CRITICAL',
    viewportName: vpName,
    viewportSize: vpSize,
    elementA: c.elementA,
    elementB: c.elementB,
    overlapBox: c.overlapBox
  }));
}
