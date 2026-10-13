import { z } from 'zod';
import { ViewportDefinition, BetterFrontConfig } from '../types/index.js';

export const ViewportSchema = z.object({
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  deviceScaleFactor: z.number().optional().default(1),
  isMobile: z.boolean().default(false),
  hasTouch: z.boolean().default(false),
  userAgent: z.string().optional()
});

export const ConfigSchema = z.object({
  targetUrl: z.string().url(),
  preset: z.enum(['production-gate', 'fast-smoke', 'comprehensive-deep']).optional().default('production-gate'),
  viewports: z.array(ViewportSchema).min(1),
  humanAgent: z.object({
    enabled: z.boolean().default(true),
    persona: z.enum(['power-user', 'impatient-mobile', 'cautious-first-timer', 'keyboard-only']).default('impatient-mobile'),
    simulateMouseTrails: z.boolean().default(true),
    simulateTypingCadence: z.boolean().default(true),
    simulateScrollMomentum: z.boolean().default(true),
    maxInteractionsPerPage: z.number().default(10)
  }).default({
    enabled: true,
    persona: 'impatient-mobile',
    simulateMouseTrails: true,
    simulateTypingCadence: true,
    simulateScrollMomentum: true,
    maxInteractionsPerPage: 10
  }),
  layoutEngine: z.object({
    detectTextOverlap: z.boolean().default(true),
    detectHorizontalBleed: z.boolean().default(true),
    detectClipping: z.boolean().default(true),
    minCollisionAreaPx: z.number().default(12),
    enableAiVisionTriage: z.boolean().default(false),
    vlmProvider: z.enum(['gemini', 'claude', 'openai', 'mock']).default('mock'),
    vlmApiKey: z.string().optional()
  }).default({
    detectTextOverlap: true,
    detectHorizontalBleed: true,
    detectClipping: true,
    minCollisionAreaPx: 12,
    enableAiVisionTriage: false,
    vlmProvider: 'mock'
  }),
  recording: z.object({
    recordVideo: z.boolean().default(true),
    recordTrace: z.boolean().default(true),
    captureScreenshots: z.boolean().default(true),
    highlightAnomalies: z.boolean().default(true),
    artifactsDir: z.string().default('./betterfront-artifacts')
  }).default({
    recordVideo: true,
    recordTrace: true,
    captureScreenshots: true,
    highlightAnomalies: true,
    artifactsDir: './betterfront-artifacts'
  }),
  performance: z.object({
    trackRealtimeCls: z.boolean().default(true),
    runLighthouse: z.boolean().default(false),
    maxAllowedCls: z.number().default(0.10),
    maxAllowedLcpMs: z.number().default(2500)
  }).default({
    trackRealtimeCls: true,
    runLighthouse: false,
    maxAllowedCls: 0.10,
    maxAllowedLcpMs: 2500
  }),
  accessibility: z.object({
    enabled: z.boolean().default(true),
    minTouchTargetPx: z.number().default(44),
    test200PercentZoom: z.boolean().default(false)
  }).default({
    enabled: true,
    minTouchTargetPx: 44,
    test200PercentZoom: false
  }),
  qualityGate: z.object({
    minOverallScore: z.number().min(0).max(100).default(85),
    failOnBlocker: z.literal(true).default(true),
    blockOnConsoleErrors: z.boolean().default(true),
    blockOnHorizontalBleed: z.boolean().default(true),
    blockOnTextCollision: z.boolean().default(true)
  }).default({
    minOverallScore: 85,
    failOnBlocker: true,
    blockOnConsoleErrors: true,
    blockOnHorizontalBleed: true,
    blockOnTextCollision: true
  }),
  reporting: z.object({
    outputHtml: z.string().default('./betterfront-report.html'),
    outputJson: z.string().default('./betterfront-summary.json')
  }).default({
    outputHtml: './betterfront-report.html',
    outputJson: './betterfront-summary.json'
  })
});
