/**
 * BetterFront UAT Templates - Open-Closed Template Registry & Scaffolding Service
 */

import * as fs from 'fs';
import * as path from 'path';
import { UatScenario, UatWorkflowTemplateId } from '../../types/index.js';
import { interpolateScenario } from '../interpolation.js';
import { UatTemplateCatalogEntry } from './types.js';
import { CORE_UAT_TEMPLATES } from './coreTemplates.js';
import { DOMAIN_VARIANT_TEMPLATES } from './domainVariants.js';
import { WORKFLOW_UAT_TEMPLATES } from './workflowTemplates.js';

export const UAT_WORKFLOW_TEMPLATES: Record<string, UatTemplateCatalogEntry> = {
  ...CORE_UAT_TEMPLATES,
  ...DOMAIN_VARIANT_TEMPLATES,
  ...WORKFLOW_UAT_TEMPLATES
};

const ALIAS_TEMPLATE_IDS = new Set([
  'dreamblu-rpg-hud',
  'dreamblu',
  'shopee',
  'tokopedia',
  'youtube',
  'google'
]);

/**
 * Open-Closed Extension Point: registers a custom UAT workflow template at runtime.
 */
export function registerUatTemplate(
  entry:
    | UatTemplateCatalogEntry
    | (Omit<UatTemplateCatalogEntry, 'buildScenario' | 'defaultVariables'> & {
        defaultVariables?: Record<string, string>;
        buildScenario?: (targetUrl?: string) => UatScenario;
        scenario?: UatScenario;
      }),
  options?: { isAlias?: boolean }
): void {
  const key = entry.id.toLowerCase().trim();
  const normalizedEntry: UatTemplateCatalogEntry = {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    description: entry.description,
    defaultVariables: entry.defaultVariables || (entry as any).scenario?.variables || {},
    buildScenario:
      entry.buildScenario ||
      ((targetUrl?: string) => {
        const base = (entry as any).scenario as UatScenario;
        return {
          ...base,
          startUrl: targetUrl || base.startUrl
        };
      })
  };
  UAT_WORKFLOW_TEMPLATES[key] = normalizedEntry;
  if (options?.isAlias) {
    ALIAS_TEMPLATE_IDS.add(key);
  }
}

/**
 * Unregisters a dynamically added UAT workflow template by ID.
 */
export function unregisterUatTemplate(templateId: string): void {
  const key = templateId.toLowerCase().trim();
  delete UAT_WORKFLOW_TEMPLATES[key];
  ALIAS_TEMPLATE_IDS.delete(key);
}

/**
 * Lists all primary customizable UAT workflow templates.
 */
export function listUatTemplates(): Array<Omit<UatTemplateCatalogEntry, 'buildScenario'>> {
  return Object.values(UAT_WORKFLOW_TEMPLATES)
    .filter((entry) => !ALIAS_TEMPLATE_IDS.has(entry.id))
    .map(({ buildScenario: _b, ...rest }) => rest);
}

/**
 * Retrieves and instantiates a built-in UAT workflow template by ID, optionally overriding targetUrl and variables.
 */
export function getUatTemplate(
  templateId: UatWorkflowTemplateId | string,
  targetUrl?: string,
  customVariables?: Record<string, string>
): UatScenario {
  const normalized = templateId.toLowerCase().trim();
  const entry = UAT_WORKFLOW_TEMPLATES[normalized];
  if (!entry) {
    const available = Object.keys(UAT_WORKFLOW_TEMPLATES).join(', ');
    throw new Error(`Unknown UAT workflow template "${templateId}". Available templates: ${available}`);
  }
  const baseScenario = entry.buildScenario(targetUrl || entry.defaultVariables.BASE_URL);
  const mergedVars: Record<string, string> = {
    ...(baseScenario.variables || {}),
    ...(customVariables || {})
  };
  if (targetUrl) {
    mergedVars.BASE_URL = targetUrl;
    baseScenario.startUrl = targetUrl;
  }
  baseScenario.variables = mergedVars;
  return interpolateScenario(baseScenario, mergedVars);
}

/**
 * Materializes all built-in UAT workflow templates as customizable .json files in the specified directory.
 */
export function scaffoldUatTemplatesToDisk(
  targetDir = './uat-scenarios/templates',
  targetUrl = 'http://localhost:7777'
): string[] {
  const absDir = path.resolve(targetDir);
  if (!fs.existsSync(absDir)) {
    fs.mkdirSync(absDir, { recursive: true });
  }
  const writtenPaths: string[] = [];
  for (const [id, entry] of Object.entries(UAT_WORKFLOW_TEMPLATES)) {
    if (ALIAS_TEMPLATE_IDS.has(id)) continue;
    const scenario = entry.buildScenario(targetUrl);
    const filePath = path.join(absDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2), 'utf8');
    writtenPaths.push(filePath);
  }
  return writtenPaths;
}
