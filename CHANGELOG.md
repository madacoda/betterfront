# 📦 Changelog

All notable changes to **BetterFront** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-26

### Added
- **Local Full-Stack `shadcn/ui` UAT Workflow Studio (`bun run studio` / `bunx betterfront studio`)**:
  - Added `BetterFrontStudioServer` & `startStudioServer` (`src/studio/server.ts`) providing REST & Server-Sent Events (`/api/events`) endpoints for managing UAT scenarios, templates, live DOM auto-discovery, and real-time UAT/Audit execution with a shared warm `BrowserPool`.
  - Built React 19 + Vite + Tailwind CSS v4 + `shadcn/ui` single-page application (`studio/`) compiled into `dist/studio-ui/` featuring a collapsible Left App Sidebar (`sidebar-07` style), Connected Vertical Step Timeline + Right-Side Step Inspector, Slide-Over `Sheet` drawers, searchable `SelectMenu`, `Progress` health bars, Executive Release Readiness Briefings (`Copy Summary for Slack / Jira`), and the **TweakCN Theme Engine** (**`Neo-Brutalism`** default with hard `4px` offset shadows, `2px` ink borders & `0px` sharp geometry, plus **`Claude`**, **`Cyberpunk`**, and **`Minimal`** presets, Daylight/Dark mode, and Comfortable Large Text `Aa` mode).
- **9 Optional Web-Based Frontend Checks (`src/inspectors/web/` & `FRONTEND_WEB_CHECKS_CATALOG`)**:
  - `detectBrokenImagesAndSvg` (`brokenImagesAndSvg` / `--check-broken-images` / `ASSERT_NO_BROKEN_IMAGES`): Detects `<img>` decode failures (`naturalWidth === 0`), collapsed `0x0` `<svg>` icons, and broken CSS `background-image` URLs.
  - `auditStickyViewportBudget` (`stickyViewportBudget` / `--check-sticky-budget` / `ASSERT_STICKY_BUDGET`): Enforces that sticky/fixed headers, footers, and banners consume `<= 25%` of mobile viewport height.
  - `auditDarkModeParity` (`darkModeParity` / `--check-dark-mode` / `ASSERT_DARK_MODE_PARITY`): Emulates `prefers-color-scheme: dark` and verifies WCAG AA text contrast parity.
  - `auditI18nTextExpansion` (`i18nTextExpansion` / `--check-i18n` / `ASSERT_I18N_EXPANSION`): Simulates `+35%` pseudo-localized text expansion on buttons, nav links, and badges to catch localization clipping and collisions.
  - `auditFormErgonomics` (`formErgonomics` / `--check-forms` / `ASSERT_FORM_ERGONOMICS`): Audits `<input>`, `<select>`, and `<textarea>` elements for accessible `<label>` pairing, `autocomplete` attributes, and `>= 16px` mobile font-size (preventing iOS Safari auto-zoom).
  - `auditFontLoadingHealth` (`fontLoadingHealth` / `--check-fonts` / `ASSERT_FONT_HEALTH`): Inspects `document.fonts` for failed `FontFace` loads and missing `font-display: swap/optional` declarations.
  - `auditDomComplexityBudget` (`domComplexityBudget` / `--check-dom-budget` / `ASSERT_DOM_BUDGET`): Enforces total DOM node count (`<= 1,500`), max tree depth (`<= 32`), and flags unvirtualized lists (`> 100` direct children).
  - `auditFrontendHygiene` (`frontendHygiene` / `--check-hygiene` / `ASSERT_FRONTEND_HYGIENE`): Audits `<title>`, `<meta name="description">`, `<meta name="viewport">`, `<html lang>`, external `target="_blank"` `rel="noopener"`, mixed content, and sensitive `localStorage` keys.
  - `auditReducedMotionCompliance` (`reducedMotionCompliance` / `--check-reduced-motion` / `ASSERT_REDUCED_MOTION`): Emulates `prefers-reduced-motion: reduce` and flags infinite CSS animations that ignore vestibular safety.
  - Added `ASSERT_A11Y` UAT step action to run WCAG 2.2 AA `axe-core` verification at any point in a UAT workflow (bringing total declarative UAT actions to **48**).
- **Bun-Native Execution & Test Pipeline**:
  - Added `bunfig.toml`, updated `bin/betterfront.js` and `package.json` scripts to execute TypeScript directly via `bun` and run all 4 E2E verification suites via `bun test`.

### Changed
- **Core Geometry & Accessibility Inspector Upgrades**:
  - `src/inspectors/layout/textCollision.ts`: Upgraded to Y-axis Sweep-and-Prune (`O(N log N)`) sorting with early exit and open Shadow DOM (`shadowRoot` & `root.elementsFromPoint`) traversal.
  - `src/inspectors/a11y/colorContrast.ts`: Added 1×1 `<canvas>` 2D context fallback in `parseRgba` for full CSS Color Level 4 (`oklch()`, `lab()`, `lch()`, `color()`) support.
  - `src/inspectors/a11y/textZoom.ts`: Expanded 200% text-scale stress test to detect newly induced container clipping and horizontal bleed in addition to text collisions.
  - Disambiguated CSS selectors across layout and touch-target inspectors using `[data-testid]` and `:nth-of-type()`.

## [1.0.0] - 2026-10-14

### Added
- **Mathematical In-Browser Layout Inspectors (`src/inspectors/layout/`)**:
  - `Range.getClientRects()` AABB text-on-text collision detection with Stacking Context filtering.
  - Mobile horizontal viewport bleed (`scrollWidth > innerWidth`) detection.
  - Container text clipping and starvation (`overflow: hidden | clip`) detection.
  - Interactive hit-target occlusion (`document.elementFromPoint`) detection.
  - Unsized media (`<img>`, `<video>`, `<iframe>`) CLS-risk detection.
  - Fluid responsive breakpoint sweeper (`320px` to `1440px`).
- **Accessibility & Ergonomics Engine (`src/inspectors/a11y/`)**:
  - WCAG 2.2 AA `axe-core` audit runner.
  - Foreground/background luminance contrast ratio inspector.
  - Touch target minimum size (`44x44px`) verifier.
  - 200% browser text-zoom layout stress tester.
- **Physics-Based Human Simulation Agent (`src/agent/`)**:
  - Cubic Bézier mouse kinematics with Fitts's Law velocity profiling.
  - Human keystroke cadence with realistic burst rhythm and typo recovery.
  - Momentum wheel scrolling and `@faker-js/faker` form auto-filling.
  - 4 autonomous exploration personas (`curious-user`, `chaos-monkey`, `impatient-mobile`, `keyboard-only`).
- **Declarative & Autonomous UAT Workflow Engine (`src/uat/`)**:
  - 38 declarative UAT actions across Navigation, Interactions, State/Storage, Assertions, and Forensics.
  - `{{VARIABLE}}` interpolation, resilient `fallbackSelectors`, conditional `ifVisible` steps, and `onlyViewports` filtering.
  - Zero-Config Autonomous UAT Generator (`runAutoUat`, `generateUatFromUrl`) that inspects live DOMs and synthesizes ready-to-run UAT scenarios.
  - 14 built-in customizable UAT workflow templates (including `dreamblu`/`rpg-game-hud`, `shopee`/`shopee-marketplace`, `tokopedia`/`tokopedia-commerce`, `youtube`/`youtube-media-streaming`, and `google`/`google-search-portal`) plus Open-Closed `registerUatTemplate()` API.
- **Multi-Format CI/CD Reporting (`src/reporter/`)**:
  - Interactive dark-mode HTML dashboards for both Audits and UAT runs.
  - SARIF 2.1.0 (GitHub Code Scanning), JUnit XML, GitHub PR Markdown, and JSON exporters.
  - Continuous `.webm` video recording, Playwright `.zip` traces, and annotated failure screenshots.
