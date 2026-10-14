/**
 * BetterFront UAT Templates - Catalog Entry Type Definition
 */

import { UatScenario, UatWorkflowTemplateId } from '../../types/index.js';

export type UatTemplateCategory =
  | 'Universal'
  | 'Gaming & HUD'
  | 'E-Commerce & SaaS'
  | 'Media & Search'
  | 'Forms & Auth'
  | 'Responsive & Visual'
  | 'Accessibility';

export interface UatTemplateCatalogEntry {
  id: UatWorkflowTemplateId | string;
  title: string;
  category: UatTemplateCategory;
  description: string;
  defaultVariables: Record<string, string>;
  buildScenario: (targetUrl?: string) => UatScenario;
}
