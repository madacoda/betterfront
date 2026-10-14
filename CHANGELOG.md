# 📦 Changelog

All notable changes to **BetterFront** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
