# BetterFront: Gold-Standard Automated Frontend QA & Production-Readiness Engine
## Document 09: Anomaly Catalog & Declarative UAT Checklist

---

### 1. The Twelve Core Frontend Anomalies

BetterFront classifies frontend defects into twelve objective, mathematically verifiable anomaly categories. Every single check can be **turned ON or OFF** independently via `betterfront.config.ts`, programmatic options, or CLI flags.

```
+-----------------------------------------------------------------------------------------+
|                        BETTERFRONT ANOMALY CATALOG MATRIX                               |
+-----------------------------------------------------------------------------------------+
| Category         | Anomaly Code          | Description              | Default | Blocker |
+------------------+-----------------------+--------------------------+---------+---------+
| Visual / Layout  | textOverlap           | Text-on-Text Collision   | ON      | YES     |
| Visual / Layout  | horizontalBleed       | Mobile Sideways Wobble   | ON      | YES     |
| Visual / Layout  | containerClipping     | Starved Height Truncation| ON      | NO      |
| Visual / Layout  | unsizedMedia          | Missing img Width/Height | ON      | NO      |
| Usability / a11y | lowContrast           | Text Contrast < 4.5:1    | ON      | NO      |
| Usability / a11y | touchTargetSize       | Touch Target < 44x44px   | ON      | NO      |
| Usability / a11y | textZoom200Percent    | 200% Font Scale Breakage | OFF     | NO      |
| Usability / a11y | a11yWcagViolations    | Axe WCAG 2.2 AA Rules    | ON      | NO      |
| Performance      | layoutShifts          | Unprovoked CLS > 0.10    | ON      | YES*    |
| Performance      | lighthouseCore        | Lighthouse Lab Audits    | OFF     | NO      |
| Reliability      | consoleExceptions     | Uncaught JS Exceptions   | ON      | YES     |
| Reliability      | brokenNetworkRequests | HTTP 5xx / 4xx Failures  | ON      | YES     |
| Reliability      | brokenLinks           | Dead Anchors / 404 Links | ON      | NO      |
+-----------------------------------------------------------------------------------------+
* CLS is a blocker if aggregate score exceeds 0.25 ("Poor" Google CWV rating).
```

---

### 2. Deep Anomaly Specifications

#### 1. Text-on-Text Collision (`textOverlap`)
- **What it is:** Two distinct rendered text nodes physically intersect, causing characters to overlap and become illegible.
- **Why it matters:** Destroyed readability, broken responsive layouts, legal/regulatory communication failures.
- **Detection Method:** In-browser `Range.prototype.getClientRects()` on all Text Nodes, computing Axis-Aligned Bounding Box (AABB) intersection ($\Delta X \ge 3\text{px}$, $\Delta Y \ge 3\text{px}$, $\text{Area} \ge 12\text{px}^2$). Filters out parent-child nesting.
- **Toggle Flag:** `anomalyChecks.textOverlap: boolean` | CLI: `--no-text-overlap`.
- **Suggested Fix:** Add `margin-bottom`, set `min-height: fit-content;`, or enable flexbox wrapping.

#### 2. Mobile Horizontal Viewport Bleed (`horizontalBleed`)
- **What it is:** Content spills past the viewport right boundary on mobile screens (320px–430px), causing horizontal scrollbars and page wobble.
- **Why it matters:** Severe mobile usability defect; Google mobile-friendly penalty; broken touch scrolling.
- **Detection Method:** Evaluates `rect.right > clientWidth` and `scrollWidth > clientWidth`.
- **Toggle Flag:** `anomalyChecks.horizontalBleed: boolean` | CLI: `--no-bleed`.
- **Suggested Fix:** Replace `width: 100vw` with `width: 100%;`; replace fixed pixel widths with `max-width: 100%`.

#### 3. Container Text Clipping (`containerClipping`)
- **What it is:** A container with `overflow: hidden` or `overflow: clip` has a fixed height smaller than its text content, cutting off lines or descenders (g, y, p, q, j) without `text-overflow: ellipsis`.
- **Why it matters:** Truncated pricing, obscured instructions, and chopped typography.
- **Detection Method:** Evaluates `el.scrollHeight > el.clientHeight + 4px` with `overflowY === 'hidden'` and `textOverflow !== 'ellipsis'`.
- **Toggle Flag:** `anomalyChecks.containerClipping: boolean` | CLI: `--no-clipping`.
- **Suggested Fix:** Remove hardcoded pixel height, or add `text-overflow: ellipsis; white-space: nowrap;`.

#### 4. Unsized Media (`unsizedMedia`)
- **What it is:** `<img>`, `<video>`, `<canvas>`, or `<iframe>` elements lacking HTML `width`/`height` attributes and lacking CSS `aspect-ratio`.
- **Why it matters:** The #1 root cause of Cumulative Layout Shift (CLS). The browser does not know the aspect ratio before decoding, causing surrounding content to violently jump.
- **Detection Method:** Scans all media tags for absence of `width`/`height` attributes and computed `aspect-ratio === 'auto'`.
- **Toggle Flag:** `anomalyChecks.unsizedMedia: boolean` | CLI: `--no-unsized-media`.
- **Suggested Fix:** Add explicit `width="..." height="..."` attributes or CSS `aspect-ratio: 16/9;`.

#### 5. Low Color Contrast (`lowContrast`)
- **What it is:** Text color contrast against its effective resolved background is less than the WCAG 2.1 AA minimum of **4.5:1** (or 3:1 for large text).
- **Why it matters:** Unreadable for users with low vision, color blindness, or viewing on mobile screens under direct sunlight.
- **Detection Method:** Computes relative luminance ratio: $(L_1 + 0.05) / (L_2 + 0.05)$, traversing up parent elements to resolve transparent backgrounds.
- **Toggle Flag:** `anomalyChecks.lowContrast: boolean` | CLI: `--no-low-contrast`.
- **Suggested Fix:** Darken text or lighten background to achieve at least 4.5:1 ratio.

#### 6. Undersized Touch Targets (`touchTargetSize`)
- **What it is:** Clickable/tappable elements (buttons, links, inputs) with dimensions under **$44 \times 44\text{px}$** (Apple HIG) or **$48 \times 48\text{px}$** (Google Material).
- **Why it matters:** Frustrating "fat finger" mis-taps on mobile touchscreens.
- **Detection Method:** Inspects bounding rectangles of all interactive selectors on touch viewports (excluding inline paragraph text links).
- **Toggle Flag:** `anomalyChecks.touchTargetSize: boolean` | CLI: `--no-touch-targets`.
- **Suggested Fix:** Add `min-width: 44px; min-height: 44px; padding: 10px;`.

#### 7. Layout Instability / CLS (`layoutShifts`)
- **What it is:** Elements abruptly jumping positions on the page without user interaction.
- **Why it matters:** Accidental clicks on wrong buttons (e.g. clicking "Confirm Cancel" instead of "Keep"), poor Core Web Vitals ranking.
- **Detection Method:** In-browser `PerformanceObserver` targeting `layout-shift` entries with `hadRecentInput === false`, extracting source elements and vertical jump distance ($\Delta Y$).
- **Toggle Flag:** `anomalyChecks.layoutShifts: boolean` | CLI: `--no-shifts`.

#### 8. Uncaught Console Exceptions (`consoleExceptions`)
- **What it is:** Unhandled JavaScript runtime errors (`TypeError`, `ReferenceError`, unhandled promise rejections).
- **Why it matters:** Frozen UI state, broken event listeners, white screens of death.
- **Detection Method:** Intercepts `page.on('pageerror')` and `console.error`.
- **Toggle Flag:** `anomalyChecks.consoleExceptions: boolean` | CLI: `--no-console-errors`.

#### 9. Broken Links & Dead Anchors (`brokenLinks`)
- **What it is:** `<a>` tags with empty `href=""`, placeholder `href="#"`, or hash targets `href="#section"` that do not correspond to any DOM ID on the page.
- **Why it matters:** Broken navigation, dead ends, poor SEO crawlability.
- **Detection Method:** Scans DOM `<a>` elements and cross-references `#anchor` targets against `document.getElementById()`.
- **Toggle Flag:** `anomalyChecks.brokenLinks: boolean` | CLI: `--no-broken-links`.

---

### 3. Granular Configuration Switchboard

Developers have complete control to turn checks ON or OFF in `betterfront.config.ts`:

```typescript
import { defineConfig } from 'betterfront';

export default defineConfig({
  targetUrl: 'https://example.com',
  preset: 'production-gate',

  // Granular Anomaly Toggles: Turn ON or OFF as needed
  anomalyChecks: {
    textOverlap: true,           // Toggle text collision checks
    horizontalBleed: true,       // Toggle mobile sideways scroll checks
    containerClipping: true,     // Toggle text truncation / starvation checks
    unsizedMedia: true,          // Toggle missing image dimension checks
    lowContrast: true,           // Toggle WCAG 4.5:1 contrast checks
    touchTargetSize: true,       // Toggle 44x44px touch target checks
    textZoom200Percent: false,   // Toggle 200% font scale stress test
    a11yWcagViolations: true,    // Toggle axe-core WCAG audits
    layoutShifts: true,          // Toggle real-time CLS attribution
    lighthouseCore: false,       // Toggle Lighthouse lab audits
    consoleExceptions: true,     // Toggle unhandled console error gate
    brokenNetworkRequests: true, // Toggle HTTP 4xx/5xx gate
    brokenLinks: true            // Toggle dead anchor & empty link checks
  },

  // Quality Gate Hard Blockers
  qualityGate: {
    minOverallScore: 85,
    failOnBlocker: true,
    blockOnConsoleErrors: true,
    blockOnHorizontalBleed: true,
    blockOnTextCollision: true,
    blockOnBrokenLinks: false,
    blockOnUnsizedMedia: false
  }
});
```

#### CLI One-Liners to Toggle Checks:
```bash
# Run audit without touch target or contrast checks
betterfront audit https://example.com --no-touch-targets --no-low-contrast

# Fast layout-only audit (disable a11y, video, and trace)
betterfront audit https://example.com --no-a11y --no-video --no-trace
```

---

### 4. Simple Declarative UAT Test Checklist

BetterFront enables teams to express **User Acceptance Testing (UAT)** as clean, declarative scenario checklists.

#### 4.1 The UAT Scenario File Schema (`.json`)
A simple JSON checklist that anyone (Product Managers, QA, Engineers) can write:

```json
{
  "name": "E-Commerce Add-to-Cart UAT Flow",
  "description": "Verifies that a customer can find a product, add it to the cart, open the drawer, and proceed to checkout with zero visual or runtime defects.",
  "startUrl": "https://example.com/shop",
  "anomalyChecks": {
    "textOverlap": true,
    "horizontalBleed": true,
    "consoleExceptions": true
  },
  "steps": [
    {
      "action": "GOTO",
      "url": "https://example.com/shop",
      "description": "1. Navigate to Store Catalog"
    },
    {
      "action": "ASSERT_VISIBLE",
      "selector": ".product-grid",
      "description": "2. Verify product grid is visible"
    },
    {
      "action": "SCROLL",
      "scrollPx": 400,
      "description": "3. Scroll down catalog"
    },
    {
      "action": "ASSERT_NO_OVERLAP",
      "description": "4. Verify no overlapping cards or prices"
    },
    {
      "action": "CLICK",
      "selector": ".product-card:first-child button.add-to-cart",
      "description": "5. Click Add to Cart on first product"
    },
    {
      "action": "WAIT",
      "waitMs": 800,
      "description": "6. Wait for cart state update"
    },
    {
      "action": "CLICK",
      "selector": "#cart-drawer-toggle",
      "description": "7. Open cart drawer"
    },
    {
      "action": "ASSERT_VISIBLE",
      "selector": "#cart-drawer",
      "description": "8. Verify cart drawer opened"
    },
    {
      "action": "ASSERT_NO_BLEED",
      "description": "9. Verify drawer does not break mobile layout"
    },
    {
      "action": "ASSERT_NO_CONSOLE_ERRORS",
      "description": "10. Verify zero JavaScript console errors"
    }
  ]
}
```

#### 4.2 Available UAT Step Actions:
| Action | Arguments | Purpose |
| :--- | :--- | :--- |
| `GOTO` | `url` | Navigates to a page. |
| `CLICK` | `selector` | Moves cursor along natural Bézier curve and clicks. |
| `TYPE` | `selector`, `text` | Types text with human cadence and debouncing. |
| `SCROLL` | `scrollPx` | Smooth scroll with inertia and reading pause. |
| `WAIT` | `waitMs` | Explicit pause for animations/transitions. |
| `FILL_FORM` | none | Autonomously detects and fills inputs with synthetic Faker data. |
| `ASSERT_TEXT` | `selector`, `text` | Verifies element contains expected text. |
| `ASSERT_VISIBLE` | `selector` | Asserts element is mounted and rendered. |
| `ASSERT_NO_OVERLAP` | none | Runs mathematical collision check at this exact step. |
| `ASSERT_NO_BLEED` | none | Runs horizontal bleed check at this exact step. |
| `ASSERT_NO_CONSOLE_ERRORS` | none | Asserts zero console errors have occurred up to this point. |

#### 4.3 Running UAT Scenarios via CLI:
```bash
# Execute any UAT scenario checklist
npx betterfront uat ./uat-scenarios/sample-contact-flow.json
```

---

### 5. Manual vs. Automated UAT Sign-Off Checklist

For release managers, this checklist defines the **Gold Industry Standard** sign-off criteria:

- [ ] **1. Visual Geometry Sanity:**
  - [ ] 0 confirmed text-on-text collisions across iPhone, iPad, and Desktop viewports.
  - [ ] 0 mobile horizontal bleeds (no sideways page wobble on 375px/390px screens).
  - [ ] 0 starved container clippings (all text descenders and wrapped lines visible).
- [ ] **2. Media & Layout Stability:**
  - [ ] All `<img>` tags specify `width`/`height` or CSS `aspect-ratio` (0 unsized media).
  - [ ] Cumulative Layout Shift (CLS) $\le 0.10$ during user interaction.
- [ ] **3. Usability & Touch:**
  - [ ] All primary buttons and navigation links $\ge 44 \times 44\text{px}$.
  - [ ] All text passes WCAG 2.1 AA 4.5:1 contrast against resolved backgrounds.
- [ ] **4. Navigation & Link Integrity:**
  - [ ] 0 empty `href="#"` links without click handlers.
  - [ ] 0 dead anchor links (`#section-id` missing in DOM).
- [ ] **5. Runtime Health:**
  - [ ] 0 unhandled JavaScript exceptions in browser console.
  - [ ] 0 critical 5xx server errors on API requests.
- [ ] **6. Visual Evidence Archived:**
  - [ ] Full-motion `.webm` interaction video recorded and stored in artifacts.
  - [ ] Playwright trace `.zip` saved for forensic debugging.
