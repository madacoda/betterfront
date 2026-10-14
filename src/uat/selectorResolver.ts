/**
 * BetterFront UAT - Resilient Multi-Selector Fallback & Viewport Guard Resolver
 */

import { Page } from 'playwright';
import { UatStep, ViewportDefinition } from '../types/index.js';

/**
 * Resolves the best matching selector from step.selector and step.fallbackSelectors.
 * Prioritizes currently visible elements, then attached DOM elements, then primary candidate.
 */
export async function resolveSelector(page: Page, step: UatStep): Promise<string> {
  const candidates: string[] = [];
  if (step.selector) candidates.push(step.selector);
  if (Array.isArray(step.fallbackSelectors)) {
    candidates.push(...step.fallbackSelectors.filter(Boolean));
  }
  if (candidates.length === 0) {
    throw new Error(`${step.action} action requires "selector" or "fallbackSelectors"`);
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  // 1. Try finding the first currently visible candidate
  for (const candidate of candidates) {
    try {
      const isVis = await page.locator(candidate).first().isVisible();
      if (isVis) return candidate;
    } catch {
      // Ignore invalid candidate syntax
    }
  }

  // 2. Try finding the first attached candidate
  for (const candidate of candidates) {
    try {
      const count = await page.locator(candidate).count();
      if (count > 0) return candidate;
    } catch {
      // Ignore
    }
  }

  return candidates[0];
}

/**
 * Evaluates whether a step's conditional `ifVisible` target is currently visible on the page.
 * If `ifVisible: true` (boolean), checks if `step.selector` OR any of `step.fallbackSelectors` is visible.
 */
export async function isStepConditionVisible(
  page: Page,
  step: UatStep
): Promise<{ visible: boolean; checkedLabel: string }> {
  if (typeof step.ifVisible === 'string') {
    const isVis = await page.locator(step.ifVisible).first().isVisible().catch(() => false);
    return { visible: isVis, checkedLabel: step.ifVisible };
  }

  const candidates: string[] = [];
  if (step.selector) candidates.push(step.selector);
  if (Array.isArray(step.fallbackSelectors)) {
    candidates.push(...step.fallbackSelectors.filter(Boolean));
  }
  if (candidates.length === 0) {
    return { visible: true, checkedLabel: '' };
  }

  for (const candidate of candidates) {
    const isVis = await page.locator(candidate).first().isVisible().catch(() => false);
    if (isVis) {
      return { visible: true, checkedLabel: candidate };
    }
  }

  return { visible: false, checkedLabel: candidates[0] };
}

/**
 * Evaluates whether the active viewport matches a step's `onlyOnViewport` or `skipOnViewport` filter list.
 */
export function matchesViewportFilter(viewport: ViewportDefinition, filterList?: string[]): boolean {
  if (!filterList || filterList.length === 0) return false;
  const vpLower = viewport.name.toLowerCase();
  return filterList.some((item) => {
    const f = item.toLowerCase();
    if (vpLower.includes(f)) return true;
    if (f === 'mobile' && viewport.isMobile) return true;
    if (f === 'desktop' && !viewport.isMobile) return true;
    if (f === 'mobile_standard' && viewport.width === 390) return true;
    if (f === 'mobile_compact' && viewport.width === 375) return true;
    if (f === 'tablet_portrait' && viewport.width === 820) return true;
    if (f === 'desktop_laptop' && viewport.width === 1366) return true;
    if (f === 'desktop_fhd' && viewport.width === 1920) return true;
    if (f === 'foldable' && viewport.width === 320) return true;
    return false;
  });
}
