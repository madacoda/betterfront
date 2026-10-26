# 🛡️ BetterFront

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-3178C6.svg)](./tsconfig.json)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933.svg)](./package.json)
[![Playwright](https://img.shields.io/badge/Engine-Playwright-2EAD33.svg)](https://playwright.dev)

> **The Gold-Standard Autonomous Frontend Quality Assurance, Visual Layout Geometry & Customizable UAT Workflow Engine**  
> *Simulate real human interaction, catch critical visual layout defects (`Range.getClientRects()` AABB collisions, mobile horizontal bleed, container clipping, z-index occlusion), track layout shifts (CLS), audit Core Web Vitals, record full-motion interaction videos, and execute zero-config or customizable UAT workflows across any web application.*

---

## 🌟 Why BetterFront?

Traditional E2E tools only tell you if a DOM node exists (`expect(locator).toBeVisible()`), remaining completely blind to real human UX failures:
- 💥 **Text-on-Text Collision:** Two text nodes overlapping and becoming unreadable after a responsive breakpoint collapse.
- 📐 **Mobile Horizontal Viewport Bleed:** Sideways wobble on mobile screens (`375px`/`390px`) caused by `width: 100vw` or unconstrained flex/grid children.
- 🗂️ **Component Occlusion & Container Clipping:** Fixed-height containers clipping text descenders, or sticky headers/backdrops blocking clicks at `document.elementFromPoint(x, y)`.
- 📉 **Cumulative Layout Shift (CLS):** Content jumping down right as a user attempts to click a button.
- 🤖 **Robotic Testing Blindspots:** Instantaneous teleports that bypass hover states, focus rings, or debounced input race conditions.

**BetterFront** bridges mechanical assertions and human visual perception:
1. **Mathematical In-Browser DOM Geometry** (`Range.getClientRects()`, AABB collision, Stacking Context trees).
2. **2-Stage Cognitive Multimodal Vision Triage** (Gemini 2.0 Flash / Claude 3.5 Sonnet + deterministic heuristic fallback) to distinguish intentional UI patterns (e.g., avatar stacks, badges) from real layout bugs.
3. **Physics-Based Human Kinematics** (Cubic Bézier mouse trajectories, Fitts's Law velocity profiling, human typing cadence, momentum scrolling).
4. **Zero-Config & Customizable UAT Engine** (48 declarative actions, `{{VARIABLE}}` interpolation, resilient `fallbackSelectors`, live DOM auto-discovery, 14 built-in industry templates, and a visual `shadcn/ui` UAT Studio).
5. **Enterprise CI/CD Exporters** (Interactive Dark-Mode HTML Dashboards, SARIF 2.1.0 for GitHub Code Scanning, JUnit XML, GitHub PR Markdown, `.webm` video & Playwright `.zip` traces).

---

## 🏗️ Modular SOLID Architecture

BetterFront is engineered with strict domain boundaries, **SOLID** principles, and high-concurrency `Promise.all` pipelines. See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for full diagrams and design pattern documentation.

```text
src/
├── types/          # Segregated domain contracts (defects, config, reporting, uat)
├── config/         # Zod schema validation, presets (quick-smoke, pr-check, production-gate, chaos-monkey)
├── core/           # Reusable BrowserPool, CaptureRecorder (video/trace/overlays), Concurrent AuditRunner
├── agent/          # Fitts's Law Bézier kinematics, human typist, momentum scroller, Faker form filler, crawler
├── inspectors/
│   ├── layout/     # textCollision (Sweep-and-Prune + Shadow DOM), horizontalBleed, containerClipping, interactiveOcclusion, unsizedMedia, breakpointSweeper
│   ├── a11y/       # axeRunner (WCAG 2.2 AA), colorContrast (CSS Color 4 oklch/lab), touchTargets (44x44px), textZoom (200%)
│   ├── perf/       # clsObserver (PerformanceObserver session windows), lighthouseRunner
│   ├── network/    # linkChecker (empty href & dead #anchor inspector)
│   └── web/        # 9 Optional Web-Based Frontend Checks (brokenImagesAndSvg, stickyViewportBudget, darkModeParity, i18nTextExpansion, formErgonomics, fontLoadingHealth, domComplexityBudget, frontendHygiene, reducedMotionCompliance)
├── uat/
│   ├── actions/    # Command/Strategy handlers (navigationAndState, interaction, assertion)
│   ├── templates/  # Open-Closed registry + 14 built-in workflows (coreTemplates, domainVariants, workflowTemplates)
│   ├── interpolation.ts    # {{VAR}} template engine & relative URL resolver
│   ├── selectorResolver.ts # Primary + fallbackSelectors resolution & viewport filtering
│   ├── generator.ts        # Zero-config live DOM UAT scenario synthesizer
│   ├── validator.ts        # Pre-flight validator with Levenshtein "Did you mean?" suggestions
│   └── uatRunner.ts        # Multi-viewport UAT orchestrator
├── studio/         # Local Full-Stack UAT Studio HTTP/SSE API server (src/studio/server.ts)
├── studio/ (root)  # React 19 + Vite + Tailwind v4 + shadcn/ui Visual UAT Workflow Manager
├── vision/         # Multimodal VLM client (Gemini / Anthropic) + deterministic heuristic fallback
└── reporter/       # Scoring engine, Audit & UAT HTML dashboards, SARIF 2.1.0, JUnit XML, PR Markdown, JSON
```

---

## 🖥️ Visual UAT Workflow Studio (`shadcn/ui` Web App)

Launch the local full-stack **`shadcn/ui` BetterFront Studio** on a single port (`http://localhost:4400`) to visually author, customize, validate, and execute UAT workflows in real time:

```bash
# Start the local shadcn/ui UAT Studio server with Bun
bun run studio
# Or via CLI directly:
bunx betterfront studio --port 4400
```

- **App Sidebar + Focused Workspace (`shadcn/ui` `sidebar-07` + TweakCN Theme Engine)**: Collapsible left navigation sidebar with workspace sections, saved project flows explorer, `Ctrl+K` Command Palette, **TweakCN Theme Preset Switcher** (**`Neo-Brutalism`** default with hard `4px` offset shadows, `2px` ink borders & `0px` sharp geometry, plus **`Claude`**, **`Cyberpunk`**, and **`Minimal`** presets), **Daylight / Dark** toggle, and **Comfortable Large Text (`Aa`)** toggle.
- **Connected Vertical Timeline + Right-Side Step Inspector**: View your user journey as a clean connected step timeline on the left and edit step properties in a sticky right-hand Step Inspector with a searchable `shadcn/ui` `SelectMenu`, 1-click common element chips, and slide-over `Sheet` drawers for device settings and raw JSON.
- **14 Industry Templates & 21 Quality Checks Matrix**: One-click cloning and variable customization (`Sheet` drawer) for all 14 built-in templates (`dreamblu`, `shopee`, `tokopedia`, `youtube`, `google`, etc.) and interactive `Switch` toggles for all 12 Core Protections and 9 Optional Deep Web Checks.
- **Executive Release Readiness Reports & Live Telemetry**: Real-time Server-Sent Events (SSE) browser stream drawer, `shadcn/ui` `Progress` health score cards, 1-click **Copy Summary for Slack / Jira**, and embedded `.webm` video & failure screenshot proof.

---

## 🧪 Zero-Config Auto-UAT & 14 Customizable Workflow Templates

BetterFront is ready to use **out of the box from the first second**—no manual test writing required!

### 1. Zero-Config Live Auto-UAT
Point BetterFront at any live URL. BetterFront inspects the live DOM, discovers navigation landmarks, headings, interactive controls, and forms, synthesizes a complete UAT scenario, and executes it immediately:
```bash
# Auto-discover & execute UAT directly from any live URL
bunx betterfront uat http://localhost:7777 --save-scenario ./uat-scenarios/auto-discovered.json

# Scaffold betterfront.config.json + all 14 customizable workflow templates to disk
bunx betterfront init http://localhost:7777
```

### 2. 14 Built-In Customizable Workflow Templates (Including Major Platform Variants)
Run any of the **14 built-in templates** directly by ID or alias (`dreamblu`, `shopee`, `tokopedia`, `youtube`, `google`) and customize any selector or input payload via `--url` and `--var KEY=VALUE`:

```bash
# List all 14 built-in workflow templates & their customizable variables
bunx betterfront uat --list-templates

# Run major platform & domain workflow variants out-of-the-box
bunx betterfront uat dreamblu  --url http://localhost:7777
bunx betterfront uat shopee    --url http://localhost:8080/shopee    --var SEARCH_QUERY="wireless earbuds"
bunx betterfront uat tokopedia --url http://localhost:8080/tokopedia --var SEARCH_QUERY="mechanical keyboard"
bunx betterfront uat youtube   --url http://localhost:8080/youtube   --var SEARCH_QUERY="web performance"
bunx betterfront uat google    --url http://localhost:8080/google    --var SEARCH_QUERY="BetterFront QA"

# Run the 5-Breakpoint Live Responsive Matrix workflow (320px -> 1920px)
bunx betterfront uat responsive-breakpoint-matrix --url http://localhost:7777
```

| Template ID (and Shorthand Alias) | Category | What It Tests Out-of-the-Box |
| :--- | :--- | :--- |
| **`universal-smoke`** | Smoke & Core | Landmarks, heading, CTA unoccluded hit-target, human scroll, network health & console hygiene. |
| **`rpg-game-hud`** (`dreamblu`) | Gaming & HUD | RPG topbar (`header.site-topbar`), brand lockup (`a.brand-lockup`), HUD widgets, hover, clipping & bleed. |
| **`shopee-marketplace`** (`shopee`) | E-Commerce & SaaS | Flash-sale header, search bar query, product grid cards, Add-to-Cart action, and mobile bleed invariants. |
| **`tokopedia-commerce`** (`tokopedia`) | E-Commerce & SaaS | Sticky search header, category pills, merchant product cards, Keranjang action, and contrast/clipping checks. |
| **`youtube-media-streaming`** (`youtube`) | Media & Search | Masthead search query, primary video player container, transport controls, filter chips, and feed cards. |
| **`google-search-portal`** (`google`) | Media & Search | Search bar focus, query typing, search action trigger, Keyboard `Tab` ergonomics, and all 12 invariants. |
| **`form-validation-chaos`** | Forms & Auth | Typing, clear/refill, `FILL_FORM` synthetic Faker data, submit & feedback verification. |
| **`auth-login-session`** | Forms & Auth | `SET_STORAGE` / `ASSERT_STORAGE` session token seeding, credential typing & login submit. |
| **`ecommerce-checkout`** | E-Commerce & SaaS | Catalog search, Add-to-Cart CTA, `GUEST_CHECKOUT` form auto-fill & network status check. |
| **`navigation-modals-drawers`** | Smoke & Core | Navbar traversal, modal trigger click, `Escape` key dismissal & zombie backdrop occlusion check. |
| **`responsive-breakpoint-matrix`** | Responsive & Visual | Live `SET_VIEWPORT` resizes across `320px`, `390px`, `820px`, `1366px`, and `1920px`. |
| **`accessibility-keyboard-ergonomics`** | Accessibility | `Tab` / `Shift+Tab` keyboard focus (`ASSERT_FOCUSED`), WCAG AA contrast & touch target size. |
| **`crud-dashboard-workflow`** | E-Commerce & SaaS | Component counts (`ASSERT_COUNT`), computed CSS (`ASSERT_CSS`) & API network checks (`ASSERT_NETWORK_OK`). |
| **`visual-regression-invariants`** | Responsive & Visual | `ASSERT_ALL_INVARIANTS` (overlap, bleed, clipping, occlusion, console) across scroll positions. |

---

## 💻 Programmatic TypeScript / Node.js SDK

BetterFront exports a clean, strictly-typed programmatic SDK with `BrowserPool` reuse for high-throughput test suites:

```ts
import {
  BrowserPool,
  audit,
  defineConfig,
  runUat,
  runAutoUat,
  runUatSuite,
  registerUatTemplate
} from 'betterfront';

const browserPool = new BrowserPool({ headless: true });

try {
  // 1. Run a customizable UAT workflow with custom variables
  const uatResult = await runUat('shopee', {
    targetUrl: 'http://localhost:3000',
    viewport: 'desktop_fhd',
    variables: { SEARCH_QUERY: 'gaming monitor' },
    browserPool
  });

  // 2. Run a multi-workflow UAT suite sharing the same warm BrowserPool
  const suiteResult = await runUatSuite(
    ['universal-smoke', 'responsive-breakpoint-matrix', 'accessibility-keyboard-ergonomics'],
    { targetUrl: 'http://localhost:3000', browserPool }
  );
} finally {
  await browserPool.closeAll();
}
```

---

## ⚙️ Granular Anomaly Toggles (Turn ON or OFF)

| Anomaly Key | CLI Flag to Disable | Description | Default |
| :--- | :--- | :--- | :--- |
| `textOverlap` | `--no-text-overlap` | Text-on-text collisions (`Range.getClientRects()`) | **ON** |
| `horizontalBleed` | `--no-bleed` | Mobile sideways wobble & viewport overflow | **ON** |
| `containerClipping` | `--no-clipping` | Starved container height or width cutting text | **ON** |
| `interactiveOcclusion` | `--no-occlusion` | Fixed headers or modals occluding clickables | **ON** |
| `unsizedMedia` | `--no-unsized-media` | Images/videos missing dimensions (CLS cause) | **ON** |
| `lowContrast` | `--no-low-contrast` | Text contrast below WCAG 4.5:1 AA | **ON** |
| `touchTargetSize` | `--no-touch-targets` | Interactive elements smaller than 44x44px | **ON** |
| `textZoom200Percent`| (default disabled) | Layout stress under 200% browser font scale | **OFF** |
| `a11yWcagViolations`| `--no-a11y` | Axe-core WCAG 2.2 AA accessibility rules | **ON** |
| `layoutShifts` | `--no-shifts` | Real-time Cumulative Layout Shift (CLS) | **ON** |
| `consoleExceptions` | `--no-console-errors` | Unhandled JavaScript console exceptions | **ON** |
| `brokenLinks` | `--no-broken-links` | Empty `href` and dead `#anchor` links | **ON** |

### 🧩 9 Optional Web-Based Frontend Checks (Dual-Mode: Global Toggle + UAT `ASSERT_*` Action)

In addition to the 12 core invariants, BetterFront provides **9 specialized Web-Based Frontend Checks** that can be enabled via `AnomalyToggles`, CLI flags, or individual UAT step assertions:

| Optional Check Key | CLI Flag | UAT Step Action | What It Verifies |
| :--- | :--- | :--- | :--- |
| `brokenImagesAndSvg` | `--check-broken-images` | `ASSERT_NO_BROKEN_IMAGES` | Broken `<img>` (`naturalWidth === 0`), collapsed `0x0` `<svg>` icons, and failed CSS background images. |
| `stickyViewportBudget` | `--check-sticky-budget` | `ASSERT_STICKY_BUDGET` | Ensures sticky/fixed headers, footers & banners consume `<= 25%` of mobile viewport height. |
| `darkModeParity` | `--check-dark-mode` | `ASSERT_DARK_MODE_PARITY` | Emulates `prefers-color-scheme: dark` and verifies WCAG AA text contrast parity without dark-on-dark text. |
| `i18nTextExpansion` | `--check-i18n` | `ASSERT_I18N_EXPANSION` | Stress-tests buttons, nav links & badges with `+35%` pseudo-localized text expansion for clipping/overlap. |
| `formErgonomics` | `--check-forms` | `ASSERT_FORM_ERGONOMICS` | Audits inputs for accessible `<label>`, `autocomplete` tokens, and `>= 16px` mobile font-size (prevents iOS auto-zoom). |
| `fontLoadingHealth` | `--check-fonts` | `ASSERT_FONT_HEALTH` | Audits `document.fonts` for failed `FontFace` loads and missing `font-display: swap/optional`. |
| `domComplexityBudget` | `--check-dom-budget` | `ASSERT_DOM_BUDGET` | Enforces total DOM nodes `<= 1,500`, max depth `<= 32`, and flags unvirtualized lists (`> 100` children). |
| `frontendHygiene` | `--check-hygiene` | `ASSERT_FRONTEND_HYGIENE` | Audits `<title>`, `<meta name="description">`, `<html lang>`, `target="_blank"` `rel="noopener"`, mixed content & storage leaks. |
| `reducedMotionCompliance` | `--check-reduced-motion` | `ASSERT_REDUCED_MOTION` | Emulates `prefers-reduced-motion: reduce` and flags infinite CSS animations that ignore vestibular safety. |

---

## 🚀 Quickstart & Commands (Bun-Native)

```bash
# 1. Install dependencies with Bun
bun install

# 2. Typecheck & build TypeScript + shadcn/ui Studio to ./dist
bun run typecheck
bun run build

# 3. Launch the shadcn/ui UAT Workflow Studio
bun run studio

# 4. Run the complete verification suite (Audit, UAT, Multi-Variant & Studio/Web Checks)
bun test
```

---

## 📚 Documentation & Resources

- 🏗️ **[System Architecture & SOLID Design Patterns](./ARCHITECTURE.md)**
- 🤝 **[Contributing Guide](./CONTRIBUTING.md)**
- 🏆 **[Gold-Standard UAT Principles & 12 Frontend Invariants Specification](./docs/GOLD_STANDARD_UAT_AND_FRONTEND_INVARIANTS.md)**
- 📋 **[UAT Action Catalog, Templates & Authoring Recipes](./uat-scenarios/README.md)**
- 🧭 **[Deep Architectural Research & Benchmarks (`/strategies`)](./strategies/00_MASTER_INDEX_AND_EXECUTIVE_SUMMARY.md)**
- 🔒 **[Security Policy](./SECURITY.md)** • 📦 **[Changelog](./CHANGELOG.md)**

---

## 📄 License
[MIT License](./LICENSE) © BetterFront Contributors.
