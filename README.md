# 🛡️ BetterFront

> **The Gold-Standard Autonomous Frontend Quality Assurance & Production-Readiness Engine**  
> *Simulate real human interaction, catch critical visual layout defects, track layout shifts (CLS), audit Core Web Vitals, record full-motion interaction videos, and automate production quality gates.*

---

## 🌟 The Vision

Modern web development tools tell you if an element is present in the DOM (`toBeVisible()`), but they are completely blind to real human user experience disasters:
- 💥 **Text-on-Text Collision:** Two text nodes colliding and becoming unreadable because of responsive breakpoint collapse.
- 📐 **Mobile Horizontal Viewport Bleed:** Sideways wobble on mobile screens (375px/390px) caused by `width: 100vw` or unconstrained images.
- 🗂️ **Component Occlusion & Clipping:** Fixed-height containers cutting off text descenders, or sticky headers covering page content on anchor scroll.
- 📉 **Cumulative Layout Shift (CLS):** Content jumping 120px down right as a user attempts to click a button.
- 🤖 **Robotic Testing Blindspots:** Instantaneous teleports that never trigger real hover states, focus traps, or debounced search race conditions.
- 🎥 **Visual Evidence Gap:** Lack of continuous full-motion video recordings and annotated forensic screenshot overlays.

**BetterFront** bridges the gap between mechanical assertions and human visual perception by combining:
1. **Mathematical In-Browser DOM Geometry** (`Range.getClientRects()`, AABB collision, Stacking Context trees).
2. **Cognitive Multimodal Vision AI** (Gemini 2.0 Flash / Claude 3.5 Sonnet) to filter intentional UI design patterns with zero false positives.
3. **Autonomous Human Kinematics** (Bézier mouse trajectories, Fitts's law, typing cadence with typos, scroll inertia).
4. **Real-Time Layout Instability Attribution** (`PerformanceObserver` + CDP for node-level CLS tracking).
5. **Visual Flight Recorder** (Continuous 60fps `.webm` video recording, Playwright `.zip` traces, and annotated screenshot overlays).
6. **Declarative UAT Scenario Engine** (Clean JSON checklists with human-like execution).
7. **Production-Ready Quality Gates** (Objective 0–100 score + zero-tolerance blocker enforcement).

---

## 📚 Architectural Strategies & Deep Research Suite

All deep architectural research, comparative benchmarks, formulas, algorithms, and engineering specifications are located in the [`/strategies`](./strategies) folder:

| Document | Description |
| :--- | :--- |
| 📖 **[00: Master Index & Executive Architecture Summary](./strategies/00_MASTER_INDEX_AND_EXECUTIVE_SUMMARY.md)** | Executive vision, system architecture diagram, and core tenets. |
| ⚡ **[01: Tech Stack Evaluation & Recommendations](./strategies/01_STACK_EVALUATION_AND_RECOMMENDATIONS.md)** | Exhaustive benchmarks (Playwright vs Cypress vs Puppeteer; Stagehand vs Midscene; Lighthouse vs CDP). |
| 🧑‍💻 **[02: Autonomous Human-Like Agent Simulation](./strategies/02_AUTONOMOUS_HUMAN_USER_SIMULATION.md)** | Physics-based motor kinematics (Bézier curves, Fitts's Law), cognitive traversal, and chaos personas. |
| 👁️ **[03: Visual Defect & Layout Collision Engine](./strategies/03_VISUAL_DEFECT_DETECTION_ENGINE.md)** | Mathematics of text/component overlap, mobile horizontal bleed, container clipping, and the 2-stage VLM pipeline. |
| 📱 **[04: Responsiveness & Cross-Device Matrix](./strategies/04_RESPONSIVENESS_AND_DEVICE_MATRIX.md)** | Multi-device matrix (280px to 3840px), fluid breakpoint sweep scanning, 200% zoom stress, and touch target standards. |
| 🚀 **[05: Performance, Lighthouse & Optimization Engine](./strategies/05_PERFORMANCE_LIGHTHOUSE_AND_OPTIMIZATION.md)** | Programmatic Lighthouse, real-time CLS attribution script with `PerformanceObserver`, and remediation engine. |
| 🚦 **[06: UAT & Production-Readiness Quality Gate](./strategies/06_UAT_AND_PRODUCTION_READINESS_STANDARD.md)** | The 0–100 Health Index, Hard Blockers vs Soft Warnings, declarative UAT journeys, and CI/CD PR gating. |
| 🏗️ **[07: System Architecture & Implementation Blueprint](./strategies/07_SYSTEM_ARCHITECTURE_AND_IMPLEMENTATION_BLUEPRINT.md)** | Modular codebase organization, `betterfront.config.ts` specification, and TypeScript interfaces. |
| 🧪 **[08: Ready-to-Run Proof-of-Concept & Scaffolding](./strategies/08_READY_TO_RUN_POC_AND_SCAFFOLDING.md)** | Production-ready, runnable TypeScript modules and CLI scaffolding ready to test immediately. |
| 📋 **[09: Anomaly Catalog & Declarative UAT Checklist](./strategies/09_ANOMALY_CATALOG_AND_UAT_CHECKLIST.md)** | Comprehensive 12-anomaly catalog, granular ON/OFF toggles, declarative UAT scenario schema, and QA sign-off checklist. |

---

## ⚙️ Granular Anomaly Toggles (Turn ON or OFF)

BetterFront allows developers to independently enable or disable any specific anomaly check via `betterfront.config.ts` or CLI flags:

| Anomaly Key | CLI Flag to Disable | Description | Default |
| :--- | :--- | :--- | :--- |
| `textOverlap` | `--no-text-overlap` | Text-on-text collisions | **ON** |
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

---

## 🧪 Declarative UAT Scenario Testing

Define human-like user acceptance testing workflows in simple, readable JSON files with **full IDE autocompletion**, **schema validation**, and **human kinematics**:

```json
{
  "$schema": "./uat-scenario.schema.json",
  "name": "User Onboarding & Checkout Flow",
  "startUrl": "http://localhost:7777",
  "viewports": ["desktop_fhd", "mobile_standard"],
  "steps": [
    { "action": "GOTO", "url": "http://localhost:7777", "description": "1. Open app" },
    { "action": "ASSERT_VISIBLE", "selector": "header.site-topbar" },
    { "action": "HOVER", "selector": "a.brand-lockup" },
    { "action": "SCROLL", "scrollPx": 400 },
    { "action": "ASSERT_NO_BLEED" },
    { "action": "ASSERT_NO_CONSOLE_ERRORS" },
    { "action": "SCREENSHOT", "name": "topbar-verification" }
  ]
}
```

### CLI Execution Options:
```bash
# Validate scenario syntax and actions (without launching browser)
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --validate-only

# Run headless across configured viewports
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json

# Record full-motion WebM video and Playwright trace archive of the UAT run
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --video --trace

# Run in interactive headed mode to watch live in the browser
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --headed

# Slow down execution by 250ms for visual observation
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --headed --slowmo 250

# Override target viewport
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --viewport desktop_fhd

# Live Action Recording: launch browser and record clicks/inputs to scenario JSON
node dist/cli.js record http://localhost:7777 -o ./uat-scenarios/my-flow.json
```

📖 **Detailed Documentation & Standards:**
- 🏆 **[Gold-Standard UAT Principles & 12 Frontend Invariants Specification](./docs/GOLD_STANDARD_UAT_AND_FRONTEND_INVARIANTS.md)**
- [UAT Action Catalog & Authoring Recipes](./uat-scenarios/README.md)
- [UAT Engine Architectural Specification](./docs/UAT_ACTION_GUIDE.md)
- [JSON Schema Definition](./uat-scenarios/uat-scenario.schema.json)

---

## 🚀 Quickstart & Usage

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/betterfront.git
cd betterfront

# Install dependencies (Windows PowerShell)
npm.cmd install

# Compile TypeScript
npm.cmd run build
```

### 2. Run Comprehensive Production Audit
```bash
# Run audit with full video recording and trace archive
node dist/cli.js audit https://example.com

# Run fast smoke audit (single mobile viewport)
node dist/cli.js audit https://example.com --preset=fast-smoke

# Run audit with specific anomaly checks disabled
node dist/cli.js audit https://example.com --no-touch-targets --no-low-contrast
```

### 3. Run Self-Tests
```bash
npm.cmd test
```

---

## 📄 License
MIT License. Created for the next generation of high-reliability frontend applications.
