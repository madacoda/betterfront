/**
 * BetterFront - Core TypeScript Type Definitions
 */

export type SeverityLevel = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

export type DefectType = 
  | 'TEXT_ON_TEXT_COLLISION' 
  | 'COMPONENT_OCCLUSION' 
  | 'TEXT_CLIPPING' 
  | 'HORIZONTAL_BLEED'
  | 'UNSIZED_MEDIA'
  | 'LOW_COLOR_CONTRAST'
  | 'BROKEN_LINK'
  | 'TOUCH_TARGET_TOO_SMALL'
  | 'LAYOUT_SHIFT_UNEXPECTED'
  | 'CONSOLE_EXCEPTION'
  | 'NETWORK_FAILURE'
  | 'ACCESSIBILITY_VIOLATION';

export interface RectBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface ViewportDefinition {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile: boolean;
  hasTouch: boolean;
  userAgent?: string;
}

export interface ElementSnapshot {
  selector: string;
  tagName: string;
  id?: string | null;
  className?: string | null;
  text?: string | null;
  rect: RectBox;
}

export interface VisualDefect {
  id: string;
  type: DefectType;
  severity: SeverityLevel;
  viewportName: string;
  viewportSize: { width: number; height: number };
  elementA: ElementSnapshot;
  elementB?: ElementSnapshot;
  overlapBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
    area: number;
  };
  overflowPx?: number;
  cropScreenshotBase64?: string;
  annotatedImageUrl?: string;
  aiTriage?: {
    isBug: boolean;
    confidence: number;
    description: string;
    suggestedCssFix: string;
  };
  meta?: Record<string, any>;
}

export interface LayoutShiftSource {
  tagName: string;
  selector: string;
  id?: string | null;
  className?: string | null;
  textContent?: string | null;
  previousRect: RectBox;
  currentRect: RectBox;
  deltaY: number;
  deltaX: number;
}

export interface LayoutShiftEvent {
  value: number;
  startTime: number;
  sources: LayoutShiftSource[];
}

export interface TouchTargetDefect {
  selector: string;
  width: number;
  height: number;
  area: number;
  expectedMinPx: number;
  rect: RectBox;
}

export interface ConsoleMessageRecord {
  type: string;
  text: string;
  location?: string;
  timestamp: string;
}

export interface NetworkAnomalyRecord {
  url: string;
  status: number;
  method: string;
  resourceType: string;
  durationMs: number;
  failureText?: string;
}

export interface UnsizedMediaDefect {
  selector: string;
  tagName: string;
  src?: string | null;
  rect: RectBox;
  missingAttributes: string[];
}

export interface BrokenLinkDefect {
  selector: string;
  href: string;
  issue: 'EMPTY_HREF' | 'MISSING_ANCHOR_TARGET' | 'HTTP_ERROR';
  statusCode?: number;
  anchorId?: string;
}

export interface LowContrastDefect {
  selector: string;
  text: string;
  textColor: string;
  bgColor: string;
  contrastRatio: number;
  requiredRatio: number;
  rect: RectBox;
}

export interface CaptureArtifacts {
  videoPath?: string;
  tracePath?: string;
  fullPageScreenshotPath?: string;
  annotatedScreenshotPath?: string;
  defectCrops: Array<{ defectId: string; imagePath: string; base64Data: string }>;
}

export interface ViewportAuditResult {
  viewport: ViewportDefinition;
  passed: boolean;
  artifacts: CaptureArtifacts;
  defects: VisualDefect[];
  bleeds: Array<{ selector: string; overflowPx: number; rect: RectBox; styleWidth?: string }>;
  layoutShifts: LayoutShiftEvent[];
  touchTargetDefects: TouchTargetDefect[];
  unsizedMediaDefects: UnsizedMediaDefect[];
  brokenLinkDefects: BrokenLinkDefect[];
  lowContrastDefects: LowContrastDefect[];
  consoleErrors: ConsoleMessageRecord[];
  networkErrors: NetworkAnomalyRecord[];
  axeViolations: Array<{ id: string; impact: string; description: string; helpUrl: string; nodesCount: number }>;
}

export interface HealthScoreBreakdown {
  total: number;
  visual: number;
  performance: number;
  accessibility: number;
  uat: number;
  standards: number;
}

export interface AuditRunSummary {
  targetUrl: string;
  timestamp: string;
  durationMs: number;
  passed: boolean;
  score: HealthScoreBreakdown;
  blockersTriggered: string[];
  totalDefects: number;
  totalBleeds: number;
  totalLayoutShifts: number;
  totalConsoleErrors: number;
  totalNetworkErrors: number;
  viewportResults: ViewportAuditResult[];
  uatResults?: UatRunResult[];
  lighthouseSummary?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    lcpMs: number;
    cls: number;
    fcpMs: number;
    tbtMs: number;
  };
  outputPaths: {
    htmlReport?: string;
    jsonReport?: string;
    artifactsDir: string;
  };
}

/**
 * Granular Anomaly Toggles: Every single check can be turned ON or OFF
 */
export interface AnomalyToggles {
  // Visual & Layout
  textOverlap: boolean;
  horizontalBleed: boolean;
  containerClipping: boolean;
  interactiveOcclusion?: boolean;
  unsizedMedia: boolean;
  lowContrast: boolean;

  // Usability & Accessibility
  touchTargetSize: boolean;
  textZoom200Percent: boolean;
  a11yWcagViolations: boolean;

  // Performance
  layoutShifts: boolean;
  lighthouseCore: boolean;

  // Reliability & Console
  consoleExceptions: boolean;
  brokenNetworkRequests: boolean;
  brokenLinks: boolean;
}

export interface BetterFrontConfig {
  targetUrl: string;
  preset?: 'production-gate' | 'fast-smoke' | 'comprehensive-deep';
  viewports: ViewportDefinition[];
  anomalyChecks: AnomalyToggles;
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
    blockOnBrokenLinks: boolean;
    blockOnUnsizedMedia: boolean;
  };
  reporting: {
    outputHtml: string;
    outputJson: string;
  };
}

// -------------------------------------------------------------
// Declarative UAT Scenario Models
// -------------------------------------------------------------

export type UatActionType = 
  // Navigation & Page Lifecycle
  | 'GOTO'
  | 'RELOAD'
  | 'WAIT'
  | 'WAIT_FOR'
  | 'WAIT_FOR_NAV'
  // User Interactions
  | 'CLICK'
  | 'DOUBLE_CLICK'
  | 'HOVER'
  | 'TYPE'
  | 'CLEAR'
  | 'PRESS_KEY'
  | 'SELECT'
  | 'CHECK'
  | 'UNCHECK'
  | 'SCROLL'
  | 'SCROLL_TO'
  | 'FILL_FORM'
  | 'EXECUTE_SCRIPT'
  // Assertions & Quality Checks
  | 'ASSERT_TEXT'
  | 'ASSERT_VISIBLE'
  | 'ASSERT_HIDDEN'
  | 'ASSERT_NOT_VISIBLE'
  | 'ASSERT_VALUE'
  | 'ASSERT_COUNT'
  | 'ASSERT_URL'
  | 'ASSERT_TITLE'
  | 'ASSERT_NO_OVERLAP'
  | 'ASSERT_NO_BLEED'
  | 'ASSERT_NO_CONSOLE_ERRORS'
  | 'ASSERT_UNOCCLUDED'
  | 'ASSERT_NO_CLIPPING'
  | 'ASSERT_TOUCH_TARGET'
  | 'ASSERT_CONTRAST'
  // Forensics & Diagnostics
  | 'SCREENSHOT';

export interface UatStep {
  action: UatActionType;
  description?: string;
  selector?: string;
  url?: string;
  text?: string;
  value?: string;
  key?: string;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
  count?: number;
  operator?: 'equals' | 'greaterThan' | 'lessThan';
  exact?: boolean;
  clearFirst?: boolean;
  pressEnter?: boolean;
  delayMs?: number;
  scrollPx?: number;
  direction?: 'down' | 'up';
  waitMs?: number;
  timeoutMs?: number;
  minPx?: number;
  minRatio?: number;
  profile?: 'GUEST_CHECKOUT' | 'CONTACT_FORM' | 'SIGNUP' | 'SEARCH' | 'CUSTOM';
  name?: string;
  fullPage?: boolean;
  script?: string;
  optional?: boolean;
}

export interface UatRecordingOptions {
  video?: boolean;
  trace?: boolean;
  screenshotOnFailure?: boolean;
  artifactsDir?: string;
}

export interface UatScenario {
  $schema?: string;
  name: string;
  description: string;
  startUrl: string;
  baseUrl?: string;
  viewports?: string[];
  anomalyChecks?: Partial<AnomalyToggles>;
  recording?: UatRecordingOptions;
  steps: UatStep[];
}

export interface UatStepResult {
  stepIndex: number;
  action: UatActionType;
  description: string;
  passed: boolean;
  durationMs: number;
  optional?: boolean;
  warning?: string;
  error?: string;
  anomaliesDetected?: VisualDefect[];
  screenshotPath?: string;
  failureScreenshotPath?: string;
}

export interface UatRunResult {
  scenarioName: string;
  viewportName?: string;
  passed: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationMs: number;
  steps: UatStepResult[];
  viewportResults?: UatRunResult[];
  videoPath?: string;
  tracePath?: string;
  failureScreenshotPath?: string;
}

