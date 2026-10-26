# 🤝 Contributing to BetterFront

Thank you for your interest in contributing to **BetterFront**! This document outlines the development workflow, architectural conventions, and extension points.

---

## 🛠️ Development Setup (Bun-Native)

### Prerequisites
- **Bun** `>= 1.1.0` (Bun `1.4+` recommended)
- **Node.js** `>= 18.0.0` (compatible for downstream npm/node consumers)

### Install, Build & Run
```bash
# 1. Install dependencies with Bun
bun install

# 2. Install Playwright Chromium browser
bunx playwright install chromium

# 3. Run strict TypeScript typecheck (Core Engine + shadcn/ui Studio)
bun run typecheck

# 4. Compile TypeScript (dist/) and Vite/React Studio UI (dist/studio-ui/)
bun run build

# 5. Launch the local shadcn/ui UAT Workflow Studio
bun run studio

# 6. Run the complete verification suite
bun test
```

---

## 🏛️ Architectural Principles (SOLID)

When contributing code to BetterFront, adhere to these core engineering principles:

1. **Single Responsibility Principle (SRP)**:
   - Keep modules focused on a single concern (under ~500 lines per file).
   - Domain types belong in `src/types/{defects,config,reporting,uat}.ts`.
   - Core & Optional Web Check catalog definitions belong in `src/config/webChecksCatalog.ts`.
   - UAT step execution logic belongs in `src/uat/actions/{navigationAndStateActions,interactionActions,assertionActions}.ts`.
   - Report formatters belong in dedicated modules under `src/reporter/`.
   - Studio server endpoints belong in `src/studio/server.ts` and `shadcn/ui` React views belong in `studio/src/components/`.

2. **Open-Closed Principle (OCP)**:
   - New UAT workflow templates can be registered via `registerUatTemplate()` in `src/uat/templates/registry.ts` (or added to `coreTemplates.ts`, `domainVariants.ts`, or `workflowTemplates.ts`).
   - New anomaly or optional web check inspectors should implement a pure function `async (page: Page, viewport: ViewportDefinition) => Promise<VisualDefect[]>` under `src/inspectors/` (`layout/`, `a11y/`, `perf/`, `network/`, or `web/`) and be wired into `src/core/runner.ts` and `src/uat/actions/assertionActions.ts`.

3. **Dependency Inversion & Resource Reuse**:
   - Always accept an optional `BrowserPool` in high-level runners (`RunUatOptions.browserPool`, `UatGeneratorOptions.browserPool`, `BetterFrontStudioServer`) so callers and test suites can share warm browser instances.

4. **Performance First**:
   - Execute independent read-only page evaluations concurrently via `Promise.all(...)`.
   - Use Y-axis Sweep-and-Prune (`O(N log N)`) for 2D bounding-box collision checks.
   - Avoid unnecessary hard `waitForTimeout` delays where deterministic DOM state checks or parallel evaluations suffice.

---

## 🔌 Adding a New UAT Workflow Template

You can register a new UAT workflow template either programmatically at runtime or permanently in `src/uat/templates/`:

```ts
import { registerUatTemplate } from 'betterfront';

registerUatTemplate({
  id: 'my-custom-workflow',
  title: 'My Custom Domain Workflow',
  category: 'E-Commerce & SaaS',
  description: 'Validates custom domain user journey with fallback selectors.',
  scenario: {
    name: 'My Custom Domain Workflow',
    description: 'End-to-end verification',
    startUrl: '{{BASE_URL}}',
    variables: {
      BASE_URL: 'http://localhost:3000',
      PRIMARY_CTA: '[data-testid="buy-now"]'
    },
    steps: [
      { action: 'GOTO', url: '{{BASE_URL}}', description: '1. Open page' },
      {
        action: 'CLICK',
        selector: '{{PRIMARY_CTA}}',
        fallbackSelectors: ['button[type="submit"]', 'button'],
        description: '2. Click primary CTA'
      },
      { action: 'ASSERT_ALL_INVARIANTS', description: '3. Verify all visual & runtime invariants' },
      { action: 'ASSERT_FRONTEND_HYGIENE', description: '4. Verify SEO, security & document hygiene' }
    ]
  }
});
```

---

## 🧪 Testing Requirements

All Pull Requests must pass:
- `bun run typecheck` (Zero TypeScript errors across both `tsconfig.json` and `studio/tsconfig.json` under `"strict": true`)
- `bun run build` (Clean compilation of `dist/` and `dist/studio-ui/`)
- `bun test` (`tests/audit.test.js`, `tests/uat.test.js`, `tests/variants.test.js`, and `tests/studio-and-webchecks.test.js`)
