export interface UatStep {
  action: string;
  description?: string;
  selector?: string;
  fallbackSelectors?: string[];
  url?: string;
  urlPattern?: string;
  text?: string;
  value?: string;
  key?: string;
  attribute?: string;
  property?: string;
  storageType?: 'local' | 'session';
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
  width?: number;
  height?: number;
  name?: string;
  fullPage?: boolean;
  script?: string;
  optional?: boolean;
  ifVisible?: boolean | string;
  onlyOnViewport?: string[];
  skipOnViewport?: string[];
  retries?: number;
}

export interface UatScenario {
  $schema?: string;
  name: string;
  description: string;
  template?: string;
  tags?: string[];
  startUrl: string;
  baseUrl?: string;
  variables?: Record<string, string>;
  viewports?: string[];
  anomalyChecks?: Record<string, boolean>;
  recording?: {
    video?: boolean;
    trace?: boolean;
    screenshotOnFailure?: boolean;
    artifactsDir?: string;
  };
  steps: UatStep[];
}

export interface ValidationIssue {
  stepIndex?: number;
  field?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  formattedReport?: string;
}

export interface DiskScenarioItem {
  fileName: string;
  relativePath: string;
  scenario: UatScenario;
  validation: ValidationResult;
  updatedAt: string;
}

export interface TemplateMetadata {
  id: string;
  title: string;
  category: string;
  description: string;
  defaultVariables: Record<string, string>;
  scenario: UatScenario;
}

export interface FrontendWebCheckDefinition {
  key: string;
  title: string;
  category: string;
  tier: 'required-invariant' | 'optional-web-check';
  defaultEnabled: boolean;
  cliFlag: string;
  uatAction: string;
  description: string;
  whyItMatters: string;
  remediationTip: string;
}

export interface ViewportDefinition {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile: boolean;
  hasTouch: boolean;
}

export interface StudioRunRecord {
  runId: string;
  type: 'uat' | 'suite' | 'audit';
  name: string;
  targetUrl: string;
  timestamp: string;
  passed: boolean;
  durationMs: number;
  summaryData: any;
}
