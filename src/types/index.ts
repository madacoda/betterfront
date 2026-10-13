/**
 * BetterFront - Core TypeScript Type Definitions
 */

export type SeverityLevel = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

export type DefectType = 
  | 'TEXT_ON_TEXT_COLLISION' 
  | 'COMPONENT_OCCLUSION' 
  | 'TEXT_CLIPPING' 
  | 'HORIZONTAL_BLEED'
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

export interface BetterFrontConfig {
  targetUrl: string;
  preset?: 'production-gate' | 'fast-smoke' | 'comprehensive-deep';
  viewports: ViewportDefinition[];
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
  };
  qualityGate: {
    minOverallScore: number;
    failOnBlocker: true;
    blockOnConsoleErrors: boolean;
    blockOnHorizontalBleed: boolean;
    blockOnTextCollision: boolean;
  };
  reporting: {
    outputHtml: string;
    outputJson: string;
  };
}
