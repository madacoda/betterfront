/**
 * BetterFront - Domain Types: Geometry, Visual Defects, Accessibility & Telemetry
 */

export type SeverityLevel = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

export type BrowserEngineType = 'chromium' | 'webkit' | 'firefox';

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
  | 'ACCESSIBILITY_VIOLATION'
  // Optional Web-Based Frontend Checks
  | 'BROKEN_IMAGE_OR_SVG'
  | 'STICKY_VIEWPORT_OVERFLOW'
  | 'DARK_MODE_CONTRAST_FAILURE'
  | 'I18N_TEXT_OVERFLOW'
  | 'FORM_ERGONOMICS_VIOLATION'
  | 'FONT_LOADING_FAILURE'
  | 'DOM_COMPLEXITY_BUDGET'
  | 'FRONTEND_HYGIENE_VIOLATION'
  | 'REDUCED_MOTION_VIOLATION';

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
  browserEngine?: BrowserEngineType;
}

export interface ElementSnapshot {
  selector: string;
  tagName: string;
  id?: string | null;
  className?: string | null;
  text?: string | null;
  rect: RectBox;
  computedStyles?: Record<string, string>;
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

export interface CwvMetrics {
  lcpMs: number;
  fcpMs: number;
  ttfbMs: number;
  inpMs: number;
  clsWindowed: number;
  clsRawTotal: number;
}

export interface BreakpointSweepAnomaly {
  width: number;
  height: number;
  type: 'HORIZONTAL_BLEED' | 'TEXT_ON_TEXT_COLLISION';
  selector: string;
  overflowPx?: number;
  description: string;
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
  fontSizePx?: number;
  isLargeText?: boolean;
  rect: RectBox;
}

export interface CaptureArtifacts {
  videoPath?: string;
  tracePath?: string;
  fullPageScreenshotPath?: string;
  annotatedScreenshotPath?: string;
  defectCrops: Array<{ defectId: string; imagePath: string; base64Data: string }>;
}
