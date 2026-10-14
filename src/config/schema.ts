import { z } from 'zod';

export const ViewportSchema = z.object({
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  deviceScaleFactor: z.number().optional().default(1),
  isMobile: z.boolean().default(false),
  hasTouch: z.boolean().default(false),
  userAgent: z.string().optional(),
  browserEngine: z.enum(['chromium', 'webkit', 'firefox']).optional()
});

export const AnomalyTogglesSchema = z.object({
  textOverlap: z.boolean().default(true),
  horizontalBleed: z.boolean().default(true),
  containerClipping: z.boolean().default(true),
  interactiveOcclusion: z.boolean().default(true),
  unsizedMedia: z.boolean().default(true),
  lowContrast: z.boolean().default(true),
  breakpointSweep: z.boolean().default(false),
  touchTargetSize: z.boolean().default(true),
  textZoom200Percent: z.boolean().default(false),
  a11yWcagViolations: z.boolean().default(true),
  layoutShifts: z.boolean().default(true),
  lighthouseCore: z.boolean().default(false),
  consoleExceptions: z.boolean().default(true),
  brokenNetworkRequests: z.boolean().default(true),
  brokenLinks: z.boolean().default(true)
}).default({
  textOverlap: true,
  horizontalBleed: true,
  containerClipping: true,
  interactiveOcclusion: true,
  unsizedMedia: true,
  lowContrast: true,
  breakpointSweep: false,
  touchTargetSize: true,
  textZoom200Percent: false,
  a11yWcagViolations: true,
  layoutShifts: true,
  lighthouseCore: false,
  consoleExceptions: true,
  brokenNetworkRequests: true,
  brokenLinks: true
});

export const ConfigSchema = z.object({
  targetUrl: z.string().url(),
  preset: z.enum(['production-gate', 'fast-smoke', 'comprehensive-deep']).optional().default('production-gate'),
  browserEngine: z.enum(['chromium', 'webkit', 'firefox']).optional().default('chromium'),
  concurrency: z.number().int().min(1).max(16).optional().default(3),
  viewports: z.array(ViewportSchema).min(1),
  anomalyChecks: AnomalyTogglesSchema,
  uatScenarios: z.array(z.any()).optional(),
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
    detectUnsizedMedia: z.boolean().default(true),
    detectLowContrast: z.boolean().default(true),
    minCollisionAreaPx: z.number().default(12),
    enableAiVisionTriage: z.boolean().default(false),
    vlmProvider: z.enum(['gemini', 'claude', 'openai', 'mock']).default('mock'),
    vlmApiKey: z.string().optional(),
    vlmModel: z.string().optional()
  }).default({
    detectTextOverlap: true,
    detectHorizontalBleed: true,
    detectClipping: true,
    detectUnsizedMedia: true,
    detectLowContrast: true,
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
    maxAllowedLcpMs: z.number().default(2500),
    maxAllowedInpMs: z.number().optional().default(200)
  }).default({
    trackRealtimeCls: true,
    runLighthouse: false,
    maxAllowedCls: 0.10,
    maxAllowedLcpMs: 2500,
    maxAllowedInpMs: 200
  }),
  accessibility: z.object({
    enabled: z.boolean().default(true),
    minTouchTargetPx: z.number().default(44),
    test200PercentZoom: z.boolean().default(false),
    checkColorContrast: z.boolean().default(true)
  }).default({
    enabled: true,
    minTouchTargetPx: 44,
    test200PercentZoom: false,
    checkColorContrast: true
  }),
  qualityGate: z.object({
    minOverallScore: z.number().min(0).max(100).default(85),
    failOnBlocker: z.boolean().default(true),
    blockOnConsoleErrors: z.boolean().default(true),
    blockOnHorizontalBleed: z.boolean().default(true),
    blockOnTextCollision: z.boolean().default(true),
    blockOnComponentOcclusion: z.boolean().optional().default(true),
    blockOnBrokenLinks: z.boolean().default(false),
    blockOnUnsizedMedia: z.boolean().default(false)
  }).default({
    minOverallScore: 85,
    failOnBlocker: true,
    blockOnConsoleErrors: true,
    blockOnHorizontalBleed: true,
    blockOnTextCollision: true,
    blockOnComponentOcclusion: true,
    blockOnBrokenLinks: false,
    blockOnUnsizedMedia: false
  }),
  reporting: z.object({
    outputHtml: z.string().default('./betterfront-report.html'),
    outputJson: z.string().default('./betterfront-summary.json'),
    outputSarif: z.string().optional(),
    outputJunit: z.string().optional(),
    outputMarkdown: z.string().optional()
  }).default({
    outputHtml: './betterfront-report.html',
    outputJson: './betterfront-summary.json'
  })
});
