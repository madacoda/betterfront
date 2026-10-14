#!/usr/bin/env node
/**
 * BetterFront Example 2: Customizable UAT Workflows & Shared BrowserPool
 *
 * Demonstrates:
 *   1. Running built-in domain templates (dreamblu, shopee, tokopedia, youtube, google)
 *   2. Overriding template variables ({{VAR}}) dynamically
 *   3. Registering a custom template via Open-Closed registerUatTemplate()
 *   4. Sharing a single warm BrowserPool across multiple UAT runs for high performance
 *
 * Usage:
 *   npm run build
 *   node examples/custom-uat-workflow.mjs http://localhost:7777
 */

import {
  BrowserPool,
  runUat,
  runAutoUat,
  registerUatTemplate
} from '../dist/index.js';

const targetUrl = process.argv[2] || 'http://localhost:7777';
const browserPool = new BrowserPool({ headless: true });

try {
  // 1. Register a custom reusable workflow template (Open-Closed Principle)
  registerUatTemplate({
    id: 'my-team-smoke',
    title: 'Team Custom Smoke Gate',
    category: 'Smoke & Core',
    description: 'Verifies primary heading, unoccluded CTA, and zero console/bleed anomalies.',
    scenario: {
      name: 'Team Custom Smoke Gate',
      description: 'Fast smoke verification',
      startUrl: '{{BASE_URL}}',
      variables: {
        BASE_URL: targetUrl,
        HEADING_SELECTOR: 'h1'
      },
      steps: [
        { action: 'GOTO', url: '{{BASE_URL}}', description: '1. Navigate to target URL' },
        {
          action: 'ASSERT_VISIBLE',
          selector: '{{HEADING_SELECTOR}}',
          fallbackSelectors: ['header', 'main', 'body'],
          description: '2. Assert primary heading or landmark is visible'
        },
        { action: 'ASSERT_ALL_INVARIANTS', description: '3. Verify all visual & runtime invariants' }
      ]
    }
  });

  // 2. Run the custom registered template
  const smokeResult = await runUat('my-team-smoke', {
    targetUrl,
    viewport: 'desktop_fhd',
    browserPool
  });
  console.log(`Custom Template Result: ${smokeResult.passedSteps}/${smokeResult.totalSteps} steps passed`);

  // 3. Run Zero-Config Auto-Discovered UAT on the same warm BrowserPool
  const { result: autoResult } = await runAutoUat(targetUrl, {
    viewport: 'desktop_fhd',
    browserPool
  });
  console.log(`Zero-Config Auto-UAT Result: ${autoResult.passedSteps}/${autoResult.totalSteps} steps passed`);
} finally {
  await browserPool.closeAll();
}
