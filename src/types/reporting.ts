/**
 * BetterFront - Domain Types: Audit Results, Scoring & Reporting Summaries
 */

import {
  ViewportDefinition,
  CaptureArtifacts,
  VisualDefect,
  RectBox,
  LayoutShiftEvent,
  CwvMetrics,
  BreakpointSweepAnomaly,
  TouchTargetDefect,
  UnsizedMediaDefect,
  BrokenLinkDefect,
  LowContrastDefect,
  ConsoleMessageRecord,
  NetworkAnomalyRecord
} from './defects.js';
import { UatRunResult } from './uat.js';

export interface ViewportAuditResult {
  viewport: ViewportDefinition;
  passed: boolean;
  artifacts: CaptureArtifacts;
  defects: VisualDefect[];
  bleeds: Array<{ selector: string; overflowPx: number; rect: RectBox; styleWidth?: string }>;
  layoutShifts: LayoutShiftEvent[];
  cwvMetrics?: CwvMetrics;
  breakpointSweepAnomalies?: BreakpointSweepAnomaly[];
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
  warningsTriggered?: string[];
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
    sarifReport?: string;
    junitReport?: string;
    markdownReport?: string;
    artifactsDir: string;
  };
}
