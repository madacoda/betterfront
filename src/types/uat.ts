/**
 * BetterFront - Domain Types: Declarative UAT Scenarios, Workflows & Autonomous Generator
 */

import { VisualDefect } from './defects.js';
import { AnomalyToggles } from './config.js';

export type UatActionType =
  // Navigation & Page Lifecycle
  | 'GOTO'
  | 'RELOAD'
  | 'WAIT'
  | 'WAIT_FOR'
  | 'WAIT_FOR_NAV'
  | 'SET_VIEWPORT'
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
  // State & Storage Management
  | 'SET_STORAGE'
  | 'ASSERT_STORAGE'
  // Assertions & Quality Checks
  | 'ASSERT_TEXT'
  | 'ASSERT_VISIBLE'
  | 'ASSERT_HIDDEN'
  | 'ASSERT_NOT_VISIBLE'
  | 'ASSERT_VALUE'
  | 'ASSERT_ATTRIBUTE'
  | 'ASSERT_CSS'
  | 'ASSERT_FOCUSED'
  | 'ASSERT_COUNT'
  | 'ASSERT_URL'
  | 'ASSERT_TITLE'
  | 'ASSERT_NO_OVERLAP'
  | 'ASSERT_NO_BLEED'
  | 'ASSERT_NO_CONSOLE_ERRORS'
  | 'ASSERT_NETWORK_OK'
  | 'ASSERT_UNOCCLUDED'
  | 'ASSERT_NO_CLIPPING'
  | 'ASSERT_TOUCH_TARGET'
  | 'ASSERT_CONTRAST'
  | 'ASSERT_ALL_INVARIANTS'
  // Forensics & Diagnostics
  | 'SCREENSHOT';

export type FormFillerProfile = 'GUEST_CHECKOUT' | 'CONTACT_FORM' | 'SIGNUP' | 'SEARCH' | 'CUSTOM';

export type UatWorkflowTemplateId =
  | 'universal-smoke'
  | 'rpg-game-hud'
  | 'dreamblu-rpg-hud'
  | 'dreamblu'
  | 'shopee-marketplace'
  | 'shopee'
  | 'tokopedia-commerce'
  | 'tokopedia'
  | 'youtube-media-streaming'
  | 'youtube'
  | 'google-search-portal'
  | 'google'
  | 'auth-login-session'
  | 'form-validation-chaos'
  | 'ecommerce-checkout'
  | 'navigation-modals-drawers'
  | 'responsive-breakpoint-matrix'
  | 'accessibility-keyboard-ergonomics'
  | 'crud-dashboard-workflow'
  | 'visual-regression-invariants';

export interface UatStep {
  action: UatActionType;
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
  isMobile?: boolean;
  profile?: FormFillerProfile;
  name?: string;
  fullPage?: boolean;
  script?: string;
  optional?: boolean;
  ifVisible?: boolean | string;
  onlyOnViewport?: string[];
  skipOnViewport?: string[];
  retries?: number;
  retryDelayMs?: number;
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
  template?: UatWorkflowTemplateId | string;
  tags?: string[];
  startUrl: string;
  baseUrl?: string;
  variables?: Record<string, string>;
  viewports?: string[];
  anomalyChecks?: Partial<AnomalyToggles>;
  recording?: UatRecordingOptions;
  beforeSteps?: UatStep[];
  steps: UatStep[];
  afterSteps?: UatStep[];
}

export interface UatStepResult {
  stepIndex: number;
  action: UatActionType;
  description: string;
  passed: boolean;
  skipped?: boolean;
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
  skippedSteps?: number;
  durationMs: number;
  steps: UatStepResult[];
  anomaliesDetected?: VisualDefect[];
  viewportResults?: UatRunResult[];
  videoPath?: string;
  tracePath?: string;
  failureScreenshotPath?: string;
  htmlReportPath?: string;
  jsonReportPath?: string;
  junitReportPath?: string;
}

export interface UatSuiteResult {
  suiteName: string;
  passed: boolean;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationMs: number;
  scenarioResults: UatRunResult[];
  htmlReportPath?: string;
  jsonReportPath?: string;
  junitReportPath?: string;
}

export interface UatGeneratorOptions {
  name?: string;
  description?: string;
  viewports?: string[];
  includeForms?: boolean;
  includeNavigation?: boolean;
  includeHudChecks?: boolean;
  includeModals?: boolean;
  includeInvariants?: boolean;
  maxButtonsToTest?: number;
  maxNavLinksToTest?: number;
  headless?: boolean;
  outputFilePath?: string;
}
