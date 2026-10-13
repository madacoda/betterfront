# 🛡️ BetterFront

> **The Gold-Standard Autonomous Frontend Quality Assurance & Production-Readiness Engine**  
> *Simulate real human interaction, catch critical visual layout defects, track layout shifts (CLS), audit Core Web Vitals, and automate production quality gates.*

---

## 🌟 The Vision

Modern web development tools tell you if an element is present in the DOM (`toBeVisible()`), but they are completely blind to real human user experience disasters:
- 💥 **Text-on-Text Collision:** Two text nodes colliding and becoming unreadable because of responsive breakpoint collapse.
- 📐 **Mobile Horizontal Viewport Bleed:** Sideways wobble on mobile screens (375px/390px) caused by `width: 100vw` or unconstrained images.
- 🗂️ **Component Occlusion & Clipping:** Fixed-height containers cutting off text descenders, or sticky headers covering page content on anchor scroll.
- 📉 **Cumulative Layout Shift (CLS):** Content jumping 120px down right as a user attempts to click a button.
- 🤖 **Robotic Testing Blindspots:** Instantaneous teleports that never trigger real hover states, focus traps, or debounced search race conditions.

**BetterFront** bridges the gap between mechanical assertions and human visual perception by combining:
1. **Mathematical In-Browser DOM Geometry** (`Range.getClientRects()`, AABB collision, Stacking Context trees).
2. **Cognitive Multimodal Vision AI** (Gemini 2.0 Flash / Claude 3.5 Sonnet) to filter intentional UI design patterns with zero false positives.
3. **Autonomous Human Kinematics** (Bézier mouse trajectories, Fitts's law, typing cadence with typos, scroll inertia).
4. **Real-Time Layout Instability Attribution** (`PerformanceObserver` + CDP for node-level CLS tracking).
5. **Production-Ready Quality Gates** (Objective 0–100 score + zero-tolerance blocker enforcement).

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

---

## 🚀 Quickstart

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/betterfront.git
cd betterfront

# Install dependencies using npm.cmd (Windows) or npm
npm.cmd install
```

### 2. Run the In-Browser Layout & CLS Audit PoC
```bash
# Audit any URL across Mobile (iPhone SE), Android (Pixel 7), and Desktop viewports
npm.cmd run poc https://example.com
```

---

## 📄 License
MIT License. Created for the next generation of high-reliability frontend applications.
