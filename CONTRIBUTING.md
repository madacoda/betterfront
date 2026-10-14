# 🤝 Contributing to BetterFront

Thank you for your interest in contributing to **BetterFront**! This document outlines the development workflow, architectural conventions, and extension points.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js** `>= 18.0.0` (Node 20 LTS or Node 22 LTS recommended)
- **npm** `>= 9.0.0`

### Install & Build
```bash
# 1. Install dependencies
npm install

# 2. Install Playwright Chromium browser
npx playwright install chromium

# 3. Run strict TypeScript typecheck
npm run typecheck

# 4. Compile TypeScript to ./dist
npm run build

# 5. Run the complete verification suite
npm test
```

---

## 🏛️ Architectural Principles (SOLID)

When contributing code to BetterFront, adhere to these core engineering principles:

1. **Single Responsibility Principle (SRP)**:
   - Keep modules focused on a single concern (under ~500 lines per file).
   - Domain types belong in `src/types/{defects,config,reporting,uat}.ts`.
   - UAT step execution logic belongs in `src/uat/actions/{navigationAndStateActions,interactionActions,assertionActions}.ts`.
   - Report formatters belong in dedicated modules under `src/reporter/`.

2. **Open-Closed Principle (OCP)**:
   - New UAT workflow templates can be registered via `registerUatTemplate()` in `src/uat/templates/registry.ts` (or added to `coreTemplates.ts`, `domainVariants.ts`, or `workflowTemplates.ts`).
   - New anomaly inspectors should implement a pure function `async (page: Page, viewport: ViewportDefinition) => Promise<VisualDefect[]>` under `src/inspectors/` and be wired into `src/core/runner.ts`.

3. **Dependency Inversion & Resource Reuse**:
   - Always accept an optional `BrowserPool` in high-level runners (`RunUatOptions.browserPool`, `UatGeneratorOptions.browserPool`) so callers and test suites can share warm browser instances.

4. **Performance First**:
   - Execute independent read-only page evaluations concurrently via `Promise.all(...)`.
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
      { action: 'ASSERT_ALL_INVARIANTS', description: '3. Verify all visual & runtime invariants' }
    ]
  }
});
```

---

## 🧪 Testing Requirements

All Pull Requests must pass:
- `npm run typecheck` (Zero TypeScript errors under `"strict": true`)
- `npm run build`
- `npm test` (`tests/audit.test.js`, `tests/uat.test.js`, and `tests/variants.test.js`)
