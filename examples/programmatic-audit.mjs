#!/usr/bin/env node
/**
 * BetterFront Example 1: Programmatic Multi-Viewport Production Audit
 *
 * Usage:
 *   npm run build
 *   node examples/programmatic-audit.mjs http://localhost:7777
 */

import { audit, defineConfig } from '../dist/index.js';

const targetUrl = process.argv[2] || 'http://localhost:7777';

const config = defineConfig({
  preset: 'production-gate',
  concurrency: 3,
  humanAgent: {
    enabled: true,
    persona: 'curious-user',
    maxInteractionsPerPage: 8
  },
  recording: {
    recordVideo: true,
    recordTrace: true,
    captureScreenshots: true,
    highlightAnomalies: true,
    artifactsDir: './betterfront-artifacts'
  },
  reporting: {
    outputHtml: './betterfront-report.html',
    outputJson: './betterfront-summary.json',
    outputSarif: './betterfront-report.sarif.json',
    outputJunit: './betterfront-report.junit.xml',
    outputMarkdown: './betterfront-report.md'
  }
});

const summary = await audit(targetUrl, config);
console.log(`\nHealth Score: ${summary.score.total}/100 (${summary.passed ? 'PASSED' : 'BLOCKED'})`);
process.exit(summary.passed ? 0 : 1);
