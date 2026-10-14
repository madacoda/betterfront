/**
 * BetterFront UAT - Variable & Dynamic Token Interpolation Engine
 */

import * as crypto from 'crypto';
import { UatScenario, UatStep } from '../types/index.js';

export function resolveUrl(targetUrl: string, baseUrl?: string): string {
  if (!baseUrl || targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    return targetUrl;
  }
  try {
    const baseObj = new URL(baseUrl);
    return new URL(targetUrl, baseObj.origin).toString();
  } catch {
    return targetUrl;
  }
}

/**
 * Interpolates {{VAR}}, {{$env.VAR}}, {{$timestamp}}, {{$randomInt}}, {{$uuid}}, {{$faker.email}}, {{$faker.name}}
 */
export function interpolateString(raw: string, vars: Record<string, string>): string {
  if (!raw || typeof raw !== 'string' || !raw.includes('{{')) return raw;
  return raw.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expr: string) => {
    const token = expr.trim();
    if (token === '$timestamp') return Date.now().toString();
    if (token === '$randomInt') return Math.floor(1000 + Math.random() * 9000).toString();
    if (token === '$uuid') return crypto.randomUUID();
    if (token === '$faker.email') return `qa_${Date.now().toString().slice(-6)}@betterfront.io`;
    if (token === '$faker.name') return 'Quality Champion';
    if (token.startsWith('$env.')) {
      const envKey = token.slice(5);
      return process.env[envKey] ?? '';
    }
    if (Object.prototype.hasOwnProperty.call(vars, token)) {
      return vars[token];
    }
    if (process.env[token] !== undefined) {
      return process.env[token]!;
    }
    return `{{${token}}}`;
  });
}

/**
 * Recursively interpolates all variable placeholders across a UatScenario and its steps.
 */
export function interpolateScenario(
  scenario: UatScenario,
  overrideVariables?: Record<string, string>
): UatScenario {
  const mergedVars: Record<string, string> = {
    ...(scenario.variables || {}),
    ...(overrideVariables || {})
  };
  if (scenario.startUrl && !mergedVars.BASE_URL) {
    mergedVars.BASE_URL = scenario.baseUrl || scenario.startUrl;
  }

  const interpStep = (step: UatStep): UatStep => {
    const copy: UatStep = { ...step };
    if (copy.description) copy.description = interpolateString(copy.description, mergedVars);
    if (copy.selector) copy.selector = interpolateString(copy.selector, mergedVars);
    if (copy.fallbackSelectors) {
      copy.fallbackSelectors = copy.fallbackSelectors.map((s) => interpolateString(s, mergedVars));
    }
    if (copy.url) copy.url = interpolateString(copy.url, mergedVars);
    if (copy.urlPattern) copy.urlPattern = interpolateString(copy.urlPattern, mergedVars);
    if (copy.text) copy.text = interpolateString(copy.text, mergedVars);
    if (copy.value) copy.value = interpolateString(copy.value, mergedVars);
    if (copy.key) copy.key = interpolateString(copy.key, mergedVars);
    if (copy.attribute) copy.attribute = interpolateString(copy.attribute, mergedVars);
    if (copy.property) copy.property = interpolateString(copy.property, mergedVars);
    if (copy.name) copy.name = interpolateString(copy.name, mergedVars);
    if (copy.script) copy.script = interpolateString(copy.script, mergedVars);
    if (typeof copy.ifVisible === 'string') {
      copy.ifVisible = interpolateString(copy.ifVisible, mergedVars);
    }
    return copy;
  };

  return {
    ...scenario,
    name: interpolateString(scenario.name, mergedVars),
    description: interpolateString(scenario.description, mergedVars),
    startUrl: interpolateString(scenario.startUrl, mergedVars),
    baseUrl: scenario.baseUrl ? interpolateString(scenario.baseUrl, mergedVars) : undefined,
    variables: mergedVars,
    beforeSteps: scenario.beforeSteps?.map(interpStep),
    steps: scenario.steps.map(interpStep),
    afterSteps: scenario.afterSteps?.map(interpStep)
  };
}
