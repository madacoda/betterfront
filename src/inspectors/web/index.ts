import { Page } from 'playwright';
import { AnomalyToggles, ViewportDefinition, VisualDefect } from '../../types/index.js';
import { detectBrokenImagesAndSvg } from './brokenImagesAndSvg.js';
import { auditStickyViewportBudget } from './stickyViewportBudget.js';
import { auditDarkModeParity } from './darkModeParity.js';
import { auditI18nTextExpansion } from './i18nTextExpansion.js';
import { auditFormErgonomics } from './formErgonomics.js';
import { auditFontLoadingHealth } from './fontLoadingHealth.js';
import { auditDomComplexityBudget } from './domComplexityBudget.js';
import { auditFrontendHygiene } from './frontendHygiene.js';
import { auditReducedMotionCompliance } from './reducedMotionCompliance.js';

export {
  detectBrokenImagesAndSvg,
  auditStickyViewportBudget,
  auditDarkModeParity,
  auditI18nTextExpansion,
  auditFormErgonomics,
  auditFontLoadingHealth,
  auditDomComplexityBudget,
  auditFrontendHygiene,
  auditReducedMotionCompliance
};

/**
 * Executes all enabled Optional Web-Based Frontend Checks for a given Page & Viewport.
 * Read-only checks run concurrently via Promise.all; state-mutating emulation checks
 * (dark mode, i18n text expansion, reduced motion) run sequentially after read-only checks.
 */
export async function runOptionalWebChecks(
  page: Page,
  viewport: ViewportDefinition,
  toggles?: Partial<AnomalyToggles>
): Promise<VisualDefect[]> {
  if (!toggles) return [];

  const collected: VisualDefect[] = [];

  // 1. Concurrent read-only DOM/CSS checks
  const [brokenMedia, stickyBudget, formIssues, fontIssues, domIssues, hygieneIssues] = await Promise.all([
    toggles.brokenImagesAndSvg ? detectBrokenImagesAndSvg(page, viewport) : Promise.resolve([]),
    toggles.stickyViewportBudget ? auditStickyViewportBudget(page, viewport) : Promise.resolve([]),
    toggles.formErgonomics ? auditFormErgonomics(page, viewport) : Promise.resolve([]),
    toggles.fontLoadingHealth ? auditFontLoadingHealth(page, viewport) : Promise.resolve([]),
    toggles.domComplexityBudget ? auditDomComplexityBudget(page, viewport) : Promise.resolve([]),
    toggles.frontendHygiene ? auditFrontendHygiene(page, viewport) : Promise.resolve([])
  ]);

  collected.push(
    ...brokenMedia,
    ...stickyBudget,
    ...formIssues,
    ...fontIssues,
    ...domIssues,
    ...hygieneIssues
  );

  // 2. Sequential media/DOM emulation checks (each restores original state in finally)
  if (toggles.darkModeParity) {
    const darkDefects = await auditDarkModeParity(page, viewport);
    collected.push(...darkDefects);
  }

  if (toggles.i18nTextExpansion) {
    const i18nDefects = await auditI18nTextExpansion(page, viewport);
    collected.push(...i18nDefects);
  }

  if (toggles.reducedMotionCompliance) {
    const motionDefects = await auditReducedMotionCompliance(page, viewport);
    collected.push(...motionDefects);
  }

  return collected;
}
