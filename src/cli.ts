#!/usr/bin/env node
import { Command } from 'commander';
import { resolveConfig, STANDARD_VIEWPORTS } from './config/index.js';
import { AuditRunner } from './core/runner.js';
import { BetterFrontConfig, ViewportDefinition } from './types/index.js';

const program = new Command();

program
  .name('betterfront')
  .description('Gold-Standard Autonomous Frontend QA & Production-Readiness Engine')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit a URL for layout collisions, mobile bleeds, CLS, and production readiness')
  .argument('<url>', 'Target URL to audit (e.g. http://localhost:3000 or https://example.com)')
  .option('-p, --preset <preset>', 'Audit preset: production-gate, fast-smoke, comprehensive-deep', 'production-gate')
  .option('--viewports <list>', 'Comma-separated viewport names (e.g. mobile_standard,tablet_portrait,desktop_fhd)')
  .option('--persona <persona>', 'Human simulation persona: impatient-mobile, power-user, cautious-first-timer, keyboard-only')
  .option('--no-video', 'Disable video recording')
  .option('--no-trace', 'Disable Playwright trace archive')
  .option('--html <path>', 'Custom path for interactive HTML report', './betterfront-report.html')
  .option('--json <path>', 'Custom path for JSON summary', './betterfront-summary.json')
  .option('--fail-on-blocker', 'Exit with code 1 if any production blocker is triggered', true)
  .action(async (url: string, options: any) => {
    try {
      let customViewports: ViewportDefinition[] | undefined;
      if (options.viewports) {
        const names = options.viewports.split(',').map((s: string) => s.trim());
        customViewports = names
          .map((n: string) => STANDARD_VIEWPORTS[n])
          .filter(Boolean);
      }

      const config = resolveConfig({
        targetUrl: url,
        preset: options.preset as any,
        viewports: customViewports,
        humanAgent: options.persona ? ({ persona: options.persona } as any) : undefined,
        recording: {
          recordVideo: options.video !== false,
          recordTrace: options.trace !== false,
          captureScreenshots: true,
          highlightAnomalies: true,
          artifactsDir: './betterfront-artifacts'
        },
        reporting: {
          outputHtml: options.html,
          outputJson: options.json
        }
      });

      const runner = new AuditRunner(config);
      const summary = await runner.run();

      if (options.failOnBlocker && !summary.passed) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (err) {
      console.error(`\n❌ BetterFront Audit Failed with Error:\n${(err as Error).stack || (err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('explore')
  .description('Launch an autonomous human-like exploratory crawling session')
  .argument('<url>', 'Target URL to explore')
  .option('--persona <persona>', 'Persona to simulate', 'impatient-mobile')
  .option('--interactions <number>', 'Maximum interactions', '20')
  .action(async (url: string, options: any) => {
    try {
      const config = resolveConfig({
        targetUrl: url,
        preset: 'fast-smoke',
        humanAgent: {
          enabled: true,
          persona: options.persona,
          simulateMouseTrails: true,
          simulateTypingCadence: true,
          simulateScrollMomentum: true,
          maxInteractionsPerPage: parseInt(options.interactions, 10) || 20
        }
      });

      const runner = new AuditRunner(config);
      await runner.run();
    } catch (err) {
      console.error(`\n❌ Exploration Failed:\n${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
