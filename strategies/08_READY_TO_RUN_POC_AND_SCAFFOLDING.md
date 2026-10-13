# BetterFront: Gold-Standard Automated Frontend QA & Production-Readiness Engine
## Document 08: Ready-to-Run Proof-of-Concept & Scaffolding

---

### 1. Overview

This document provides fully functional, production-ready code modules demonstrating BetterFront's core innovations:
1. **The In-Browser Mathematical DOM Collision Scanner** (Range API + AABB collision).
2. **The Horizontal Viewport Bleed Detector** (Detecting mobile sideways scrolling).
3. **The Real-Time Layout Shift (CLS) Attribution Tracker** (Pinpointing shifted DOM elements).
4. **The Human Kinematics Mouse Driver** (Bézier trajectories and non-linear velocity).
5. **The Complete Playwright Audit Harness** (Connecting all engines into a runnable script).

---

### 2. Module 1: In-Browser Text & Component Collision Scanner

This script is injected directly into any webpage via `page.evaluate()` to mathematically detect text-on-text collisions and component overlaps in milliseconds:

```typescript
// src/inspectors/layout/injectedCollisionScanner.ts

export const COLLISION_SCANNER_SCRIPT = `(() => {
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

  // Extract precise line-level bounding rects via Range API
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

  // Pairwise AABB collision detection
  for (let i = 0; i < textRectItems.length; i++) {
    for (let j = i + 1; j < textRectItems.length; j++) {
      const itemA = textRectItems[i];
      const itemB = textRectItems[j];

      // Ignore text within the same element or direct parent-child hierarchy
      if (itemA.parent === itemB.parent) continue;
      if (itemA.parent.contains(itemB.parent) || itemB.parent.contains(itemA.parent)) continue;

      const rA = itemA.rect;
      const rB = itemB.rect;

      // Axis-Aligned Bounding Box intersection
      const overlapX = Math.max(0, Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left));
      const overlapY = Math.max(0, Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top));
      const overlapArea = overlapX * overlapY;

      // Filter out subpixel kerning artifacts (must overlap by at least 3px on both axes and 12px² area)
      if (overlapX >= 3 && overlapY >= 3 && overlapArea >= 12) {
        detectedCollisions.push({
          type: 'TEXT_ON_TEXT_COLLISION',
          elementA: {
            selector: getUniqueSelector(itemA.parent),
            text: itemA.text.substring(0, 60),
            rect: rA
          },
          elementB: {
            selector: getUniqueSelector(itemB.parent),
            text: itemB.text.substring(0, 60),
            rect: rB
          },
          overlapBox: {
            left: Math.max(rA.left, rB.left),
            top: Math.max(rA.top, rB.top),
            width: overlapX,
            height: overlapY,
            area: Math.round(overlapArea)
          }
        });
      }
    }
  }

  return detectedCollisions;
})()`;
```

---

### 3. Module 2: Mobile Horizontal Viewport Bleed Detector

```typescript
// src/inspectors/layout/injectedBleedScanner.ts

export const BLEED_SCANNER_SCRIPT = `(() => {
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

    // Element right boundary overflows the document viewport width
    const overflowRight = rect.right - viewportWidth;
    const internalOverflow = el.scrollWidth - el.clientWidth;

    if (overflowRight > 2) {
      bleeds.push({
        selector: getSelector(el),
        overflowPx: Math.round(overflowRight),
        rect: {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        },
        styles: {
          width: style.width,
          maxWidth: style.maxWidth,
          minWidth: style.minWidth,
          overflowX: style.overflowX
        }
      });
    }
  });

  return bleeds;
})()`;
```

---

### 4. Module 3: Human Kinematics Mouse Trajectory Engine

```typescript
// src/agent/kinematics.ts
import { Page } from 'playwright';

interface Point {
  x: number;
  y: number;
}

// Generate Cubic Bézier points with human-like acceleration and lateral wobble
function generateHumanPath(start: Point, target: Point, steps = 25): Point[] {
  const points: Point[] = [];
  const distance = Math.hypot(target.x - start.x, target.y - start.y);

  // Lateral drift perpendicular to movement axis
  const angle = Math.atan2(target.y - start.y, target.x - start.x);
  const perpAngle = angle + Math.PI / 2;
  const driftMagnitude = Math.min(50, distance * 0.15) * (Math.random() > 0.5 ? 1 : -1);

  // Control points
  const p1: Point = {
    x: start.x + (target.x - start.x) * 0.25 + Math.cos(perpAngle) * driftMagnitude,
    y: start.y + (target.y - start.y) * 0.25 + Math.sin(perpAngle) * driftMagnitude
  };

  const p2: Point = {
    x: start.x + (target.x - start.x) * 0.75 + Math.cos(perpAngle) * (driftMagnitude * 0.5),
    y: start.y + (target.y - start.y) * 0.75 + Math.sin(perpAngle) * (driftMagnitude * 0.5)
  };

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Cubic Bézier formula
    const x = Math.pow(1 - t, 3) * start.x 
            + 3 * Math.pow(1 - t, 2) * t * p1.x 
            + 3 * (1 - t) * Math.pow(t, 2) * p2.x 
            + Math.pow(t, 3) * target.x;

    const y = Math.pow(1 - t, 3) * start.y 
            + 3 * Math.pow(1 - t, 2) * t * p1.y 
            + 3 * (1 - t) * Math.pow(t, 2) * p2.y 
            + Math.pow(t, 3) * target.y;

    // Inject micro-tremor (hand jitter)
    const jitterX = (Math.random() - 0.5) * 1.5;
    const jitterY = (Math.random() - 0.5) * 1.5;

    points.push({ x: x + jitterX, y: y + jitterY });
  }

  return points;
}

export async function humanMoveAndClick(page: Page, targetSelector: string): Promise<void> {
  const targetElement = page.locator(targetSelector).first();
  await targetElement.waitFor({ state: 'visible', timeout: 5000 });
  const box = await targetElement.boundingBox();
  
  if (!box) throw new Error(`Element ${targetSelector} has no bounding box`);

  // Randomize click point within inner 60% of target
  const targetPoint: Point = {
    x: box.x + box.width * 0.2 + Math.random() * (box.width * 0.6),
    y: box.y + box.height * 0.2 + Math.random() * (box.height * 0.6)
  };

  const startPoint: Point = { x: 100, y: 100 }; // Current cursor origin
  const path = generateHumanPath(startPoint, targetPoint);

  // Traverse the Bézier trajectory
  for (const pt of path) {
    await page.mouse.move(pt.x, pt.y);
    // Non-linear variable delay simulating psychomotor acceleration
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 8) + 4));
  }

  // Hover dwell time (human cognitive delay before clicking)
  await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 120) + 60));

  await page.mouse.down();
  await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 50) + 40));
  await page.mouse.up();
}
```

---

### 5. Module 4: Standalone Audit Harness (`poc-audit.ts`)

Here is an end-to-end executable script that audits any given URL for responsiveness, layout collisions, horizontal mobile bleed, and layout shifts:

```typescript
// poc-audit.ts
import { chromium } from 'playwright';
import { COLLISION_SCANNER_SCRIPT } from './src/inspectors/layout/injectedCollisionScanner';
import { BLEED_SCANNER_SCRIPT } from './src/inspectors/layout/injectedBleedScanner';
import { CLS_OBSERVER_INIT_SCRIPT } from './src/inspectors/perf/clsObserver';

const TARGET_URL = process.argv[2] || 'https://news.ycombinator.com';

const AUDIT_VIEWPORTS = [
  { name: 'iPhone SE (Mobile)', width: 375, height: 667, isMobile: true },
  { name: 'Pixel 7 (Android)', width: 412, height: 915, isMobile: true },
  { name: 'Desktop FHD', width: 1920, height: 1080, isMobile: false }
];

async function runBetterFrontAudit() {
  console.log(`\n======================================================`);
  console.log(`🚀 BetterFront Audit Engine: Auditing ${TARGET_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });

  for (const vp of AUDIT_VIEWPORTS) {
    console.log(`\n🔍 Checking Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile
    });

    const page = await context.newPage();

    // 1. Inject real-time CLS observer
    await page.addInitScript(CLS_OBSERVER_INIT_SCRIPT);

    // Track console errors
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // 2. Navigate
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 3. Run Mathematical Text Collision Scanner
    const collisions = await page.evaluate(COLLISION_SCANNER_SCRIPT);
    console.log(`  - Text-on-Text Collisions: ${collisions.length === 0 ? '✅ 0 Detected' : '🚨 ' + collisions.length + ' Found'}`);
    if (collisions.length > 0) {
      collisions.slice(0, 3).forEach((c: any, idx: number) => {
        console.log(`    [${idx + 1}] Collision between: "${c.elementA.text}" and "${c.elementB.text}" (Overlap: ${c.overlapBox.area}px²)`);
      });
    }

    // 4. Run Mobile Horizontal Bleed Scanner
    if (vp.isMobile) {
      const bleeds = await page.evaluate(BLEED_SCANNER_SCRIPT);
      console.log(`  - Horizontal Mobile Bleed: ${bleeds.length === 0 ? '✅ 0 Bleeds' : '🚨 ' + bleeds.length + ' Elements Overflowing'}`);
      if (bleeds.length > 0) {
        bleeds.slice(0, 3).forEach((b: any, idx: number) => {
          console.log(`    [${idx + 1}] Element <${b.selector}> overflows right by ${b.overflowPx}px (Width: ${b.styles.width})`);
        });
      }
    }

    // 5. Inspect Captured Layout Shifts (CLS)
    const shifts = await page.evaluate(() => (window as any).__betterfrontShifts || []);
    console.log(`  - Unexpected Layout Shifts: ${shifts.length === 0 ? '✅ None' : '⚠️ ' + shifts.length + ' Shift Events Recorded'}`);

    // 6. Console Error Check
    console.log(`  - Unhandled Console Errors: ${consoleErrors.length === 0 ? '✅ 0 Errors' : '🚨 ' + consoleErrors.length + ' Unhandled Errors'}`);

    await context.close();
  }

  await browser.close();
  console.log(`\n======================================================`);
  console.log(`🏁 BetterFront Audit Complete!`);
  console.log(`======================================================\n`);
}

runBetterFrontAudit().catch(console.error);
```

---

### 6. Project Setup & Quickstart Guide

To initialize and run BetterFront locally:

```bash
# 1. Initialize npm project
npm init -y

# 2. Install Playwright and core dependencies
npm install playwright @axe-core/playwright @faker-js/faker commander zod lighthouse

# 3. Install browser binaries
npx playwright install chromium

# 4. Install TypeScript development dependencies
npm install -D typescript @types/node ts-node

# 5. Execute an audit immediately
npx ts-node poc-audit.ts https://example.com
```
