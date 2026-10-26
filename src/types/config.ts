/**
 * BetterFront - Domain Types: Engine Configuration & Anomaly Toggles
 */

import { BrowserEngineType, ViewportDefinition } from './defects.js';
import { UatScenario } from './uat.js';

/**
 * Granular Anomaly Toggles: Every single check can be turned ON or OFF
 */
export interface AnomalyToggles {
  // Visual & Layout (Core Invariants)
  textOverlap: boolean;
  horizontalBleed: boolean;
  containerClipping: boolean;
  interactiveOcclusion?: boolean;
  unsizedMedia: boolean;
  lowContrast: boolean;
  breakpointSweep?: boolean;

  // Usability & Accessibility (Core Invariants)
  touchTargetSize: boolean;
  textZoom200Percent: boolean;
  a11yWcagViolations: boolean;

  // Performance (Core Invariants)
  layoutShifts: boolean;
  lighthouseCore: boolean;

  // Reliability & Console (Core Invariants)
  consoleExceptions: boolean;
  brokenNetworkRequests: boolean;
  brokenLinks: boolean;

  // Optional Web-Based Frontend Checks (Toggleable ON/OFF)
  brokenImagesAndSvg?: boolean;
  stickyViewportBudget?: boolean;
  darkModeParity?: boolean;
  i18nTextExpansion?: boolean;
  formErgonomics?: boolean;
  fontLoadingHealth?: boolean;
  domComplexityBudget?: boolean;
  frontendHygiene?: boolean;
  reducedMotionCompliance?: boolean;
}

export type FrontendWebCheckCategory =
  | 'Visual & Layout Geometry'
  | 'Responsive & Mobile UX'
  | 'Accessibility & Ergonomics'
  | 'Performance & Core Web Vitals'
  | 'Theming & Localization'
  | 'Forms & Input UX'
  | 'Security, SEO & DOM Hygiene';

export interface FrontendWebCheckDefinition {
  key: keyof AnomalyToggles;
  title: string;
  category: FrontendWebCheckCategory;
  tier: 'required-invariant' | 'optional-web-check';
  defaultEnabled: boolean;
  cliFlag: string;
  uatAction: string;
  description: string;
  whyItMatters: string;
  remediationTip: string;
}

export interface BetterFrontConfig {
  targetUrl: string;
  preset?: 'production-gate' | 'fast-smoke' | 'comprehensive-deep';
  browserEngine?: BrowserEngineType;
  concurrency?: number;
  viewports: ViewportDefinition[];
  anomalyChecks: AnomalyToggles;
  uatScenarios?: (string | UatScenario)[];
  humanAgent: {
    enabled: boolean;
    persona: 'power-user' | 'impatient-mobile' | 'cautious-first-timer' | 'keyboard-only';
    simulateMouseTrails: boolean;
    simulateTypingCadence: boolean;
    simulateScrollMomentum: boolean;
    maxInteractionsPerPage: number;
  };
  layoutEngine: {
    detectTextOverlap: boolean;
    detectHorizontalBleed: boolean;
    detectClipping: boolean;
    detectUnsizedMedia: boolean;
    detectLowContrast: boolean;
    minCollisionAreaPx: number;
    enableAiVisionTriage: boolean;
    vlmProvider?: 'gemini' | 'claude' | 'openai' | 'mock';
    vlmApiKey?: string;
    vlmModel?: string;
  };
  recording: {
    recordVideo: boolean;
    recordTrace: boolean;
    captureScreenshots: boolean;
    highlightAnomalies: boolean;
    artifactsDir: string;
  };
  performance: {
    trackRealtimeCls: boolean;
    runLighthouse: boolean;
    maxAllowedCls: number;
    maxAllowedLcpMs: number;
    maxAllowedInpMs?: number;
  };
  accessibility: {
    enabled: boolean;
    minTouchTargetPx: number;
    test200PercentZoom: boolean;
    checkColorContrast: boolean;
  };
  qualityGate: {
    minOverallScore: number;
    failOnBlocker: boolean;
    blockOnConsoleErrors: boolean;
    blockOnHorizontalBleed: boolean;
    blockOnTextCollision: boolean;
    blockOnComponentOcclusion?: boolean;
    blockOnBrokenLinks: boolean;
    blockOnUnsizedMedia: boolean;
  };
  reporting: {
    outputHtml: string;
    outputJson: string;
    outputSarif?: string;
    outputJunit?: string;
    outputMarkdown?: string;
  };
}
