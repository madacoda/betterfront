/**
 * BetterFront - Standalone Proof-of-Concept Audit Runner
 * Demonstrates:
 * 1. Range.getClientRects() Text-on-Text Collision Detection
 * 2. Mobile Horizontal Viewport Bleed Detection
 * 3. Real-time Layout Shift (CLS) Node-level Attribution
 * 4. Unhandled JavaScript Console Exceptions Monitoring
 */

const { chromium } = require('playwright');

const TARGET_URL = process.argv[2] || 'https://news.ycombinator.com';

const AUDIT_VIEWPORTS = [
  { name: 'iPhone SE (Mobile)', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'Pixel 7 (Android)', width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: 'Desktop Full HD', width: 1920, height: 1080, isMobile: false, hasTouch: false }
];

// In-Browser Text Collision Algorithm (AABB + Range API)
const COLLISION_SCANNER_SCRIPT = `(() => {
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
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            right: r.right,
            width: r.width,
            height: r.height
          },
          text: node.textContent.trim()
        });
      }
    }
  }

  const detectedCollisions = [];

  for (let i = 0; i < textRectItems.length; i++) {
    for (let j = i + 1; j < textRectItems.length; j++) {
      const itemA = textRectItems[i];
      const itemB = textRectItems[j];

      if (itemA.parent === itemB.parent) continue;
      if (itemA.parent.contains(itemB.parent) || itemB.parent.contains(itemA.parent)) continue;

      const rA = itemA.rect;
      const rB = itemB.rect;

      const overlapX = Math.max(0, Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left));
      const overlapY = Math.max(0, Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top));
      const overlapArea = overlapX * overlapY;

      if (overlapX >= 3 && overlapY >= 3 && overlapArea >= 12) {
        detectedCollisions.push({
          type: 'TEXT_ON_TEXT_COLLISION',
          elementA: {
            selector: getUniqueSelector(itemA.parent),
            text: itemA.text.substring(0, 50),
            rect: rA
          },
          elementB: {
            selector: getUniqueSelector(itemB.parent),
            text: itemB.text.substring(0, 50),
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

  return detectedCollisions;
})()`;

// In-Browser Mobile Horizontal Bleed Detection
const BLEED_SCANNER_SCRIPT = `(() => {
  const viewportWidth = document.documentElement.clientWidth;
  const bleeds = [];

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\\s+/)[0];
      if (c) s += '.' + c;
    }
    return s;
  }

  document.querySelectorAll('*').forEach((el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    if (style.display === 'none' || style.visibility === 'hidden') return;

    const overflowRight = rect.right - viewportWidth;
    if (overflowRight > 2) {
      bleeds.push({
        selector: getSelector(el),
        overflowPx: Math.round(overflowRight),
        width: Math.round(rect.width),
        styleWidth: style.width
      });
    }
  });

  return bleeds;
})()`;

// Real-Time CLS Attribution Init Script
const CLS_OBSERVER_INIT_SCRIPT = `
  window.__betterfrontShifts = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;

      const shiftData = {
        value: entry.value,
        sources: []
      };

      if (entry.sources) {
        for (const source of entry.sources) {
          if (!source.node) continue;
          const el = source.node;
          shiftData.sources.push({
            tagName: el.tagName,
            selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
            deltaY: Math.round(source.currentRect.top - source.previousRect.top)
          });
        }
      }

      window.__betterfrontShifts.push(shiftData);
    }
  });

  observer.observe({ type: 'layout-shift', buffered: true });
`;

async function runAudit() {
  console.log(`\n======================================================`);
  console.log(`🛡️  BetterFront Quality Gate: Auditing [${TARGET_URL}]`);
  console.log(`======================================================`);

  const browser = await chromium.launch({ headless: true });
  let totalCollisions = 0;
  let totalBleeds = 0;
  let totalConsoleErrors = 0;

  for (const vp of AUDIT_VIEWPORTS) {
    console.log(`\n🔍 Checking Viewport: ${vp.name} (${vp.width}x${vp.height})...`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch
    });

    const page = await context.newPage();
    await page.addInitScript(CLS_OBSERVER_INIT_SCRIPT);

    const consoleErrors = [];
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
      totalConsoleErrors++;
    });

    try {
      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000); // Allow fonts & hydration to settle
    } catch (e) {
      console.error(`  ⚠️ Navigation warning: ${e.message}`);
    }

    // 1. Text Collision Audit
    const collisions = await page.evaluate(COLLISION_SCANNER_SCRIPT);
    totalCollisions += collisions.length;
    if (collisions.length === 0) {
      console.log(`  ✅ Text-on-Text Collision: 0 detected`);
    } else {
      console.log(`  🚨 Text-on-Text Collision: ${collisions.length} collision(s) detected!`);
      collisions.slice(0, 3).forEach((c, idx) => {
        console.log(`     [#${idx + 1}] "${c.elementA.text}" <-> "${c.elementB.text}" (${c.overlapBox.area}px² overlap)`);
      });
    }

    // 2. Mobile Horizontal Bleed Audit
    if (vp.isMobile) {
      const bleeds = await page.evaluate(BLEED_SCANNER_SCRIPT);
      totalBleeds += bleeds.length;
      if (bleeds.length === 0) {
        console.log(`  ✅ Mobile Horizontal Bleed: Clean (No sideways wobble)`);
      } else {
        console.log(`  🚨 Mobile Horizontal Bleed: ${bleeds.length} element(s) overflowing viewport!`);
        bleeds.slice(0, 3).forEach((b, idx) => {
          console.log(`     [#${idx + 1}] <${b.selector}> exceeds viewport by ${b.overflowPx}px (Width: ${b.width}px)`);
        });
      }
    }

    // 3. Layout Shift (CLS) Audit
    const shifts = await page.evaluate(() => window.__betterfrontShifts || []);
    if (shifts.length === 0) {
      console.log(`  ✅ Layout Instability (CLS): 0 unprovoked shifts`);
    } else {
      const totalShiftValue = shifts.reduce((acc, s) => acc + s.value, 0).toFixed(3);
      console.log(`  ⚠️ Layout Instability (CLS): Total score ${totalShiftValue} across ${shifts.length} shift(s)`);
      shifts.slice(0, 2).forEach((s, idx) => {
        if (s.sources.length > 0) {
          console.log(`     [#${idx + 1}] Element <${s.sources[0].selector}> jumped ${s.sources[0].deltaY}px vertically`);
        }
      });
    }

    // 4. Console Exceptions
    if (consoleErrors.length === 0) {
      console.log(`  ✅ Console Health: 0 unhandled exceptions`);
    } else {
      console.log(`  🚨 Console Health: ${consoleErrors.length} unhandled error(s)!`);
      consoleErrors.slice(0, 2).forEach((err, idx) => console.log(`     [#${idx + 1}] ${err}`));
    }

    await context.close();
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`📊 Production Readiness Summary for [${TARGET_URL}]`);
  console.log(`======================================================`);
  console.log(`- Total Text Collisions:    ${totalCollisions}`);
  console.log(`- Total Mobile Bleeds:      ${totalBleeds}`);
  console.log(`- Total Console Errors:     ${totalConsoleErrors}`);

  const isProductionReady = totalCollisions === 0 && totalBleeds === 0 && totalConsoleErrors === 0;
  if (isProductionReady) {
    console.log(`\n🎉 RESULT: [PASS] - This frontend meets BetterFront Gold Industry Standards!\n`);
  } else {
    console.log(`\n🚨 RESULT: [BLOCKED] - Critical defects found. Deployment halted.\n`);
  }
}

if (require.main === module) {
  runAudit().catch(console.error);
}

module.exports = { runAudit };
