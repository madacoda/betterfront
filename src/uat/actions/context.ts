/**
 * BetterFront UAT - Action Handler Execution Context (Dependency Inversion Interface)
 */

import { Page } from 'playwright';
import {
  UatStep,
  UatScenario,
  ViewportDefinition,
  VisualDefect,
  NetworkAnomalyRecord
} from '../../types/index.js';
import { KinematicsEngine } from '../../agent/kinematics.js';
import { TypistEngine } from '../../agent/typist.js';
import { ScrollerEngine } from '../../agent/scroller.js';
import { FormFillerEngine } from '../../agent/formFiller.js';

export interface UatActionExecutionContext {
  page: Page;
  step: UatStep;
  stepIndex: number;
  scenario: UatScenario;
  activeViewport: ViewportDefinition;
  consoleErrors: any[];
  networkErrors: NetworkAnomalyRecord[];
  kinematics: KinematicsEngine;
  typist: TypistEngine;
  scroller: ScrollerEngine;
  formFiller: FormFillerEngine;
  onViewportChanged: (newVp: ViewportDefinition) => void;
  onAnomalies: (items: VisualDefect[]) => void;
  onScreenshot: (filePath: string) => void;
}
