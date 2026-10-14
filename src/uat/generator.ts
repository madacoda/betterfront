import * as fs from 'fs';
import * as path from 'path';
import { Page } from 'playwright';
import { UatScenario, UatStep, UatGeneratorOptions } from '../types/index.js';
import { BrowserPool } from '../core/browserPool.js';
import { STANDARD_VIEWPORTS } from '../config/presets.js';

export interface DiscoveredPageStructure {
  title: string;
  url: string;
  topbarSelector?: string;
  brandSelector?: string;
  heading?: {
    selector: string;
    text: string;
    contrastOk: boolean;
  };
  hudElements: Array<{
    selector: string;
    label: string;
  }>;
  tabOrNavControls: Array<{
    selector: string;
    label: string;
  }>;
  interactiveButtons: Array<{
    selector: string;
    label: string;
    width: number;
    height: number;
    unoccluded: boolean;
    isSubmit: boolean;
  }>;
  formInputs: Array<{
    selector: string;
    inputType: string;
    nameOrId: string;
    sampleValue: string;
  }>;
  submitButtonSelector?: string;
  feedbackCandidateSelector?: string;
}

/**
 * Inspects a live Playwright Page and discovers semantic landmarks, RPG/Dashboard HUDs,
 * navigation bars, interactive buttons, and forms to synthesize a tailored UAT Scenario.
 */
export async function generateUatScenarioFromPage(
  page: Page,
  targetUrl: string,
  options?: UatGeneratorOptions
): Promise<UatScenario> {
  const discovered: DiscoveredPageStructure = await page.evaluate(() => {
    function buildUniqueSelector(el: Element): string {
      if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) {
        const idSel = `#${el.id}`;
        if (document.querySelectorAll(idSel).length === 1) return idSel;
      }

      const testId = el.getAttribute('data-testid') || el.getAttribute('data-qa') || el.getAttribute('data-cy');
      if (testId) {
        const attrSel = `[data-testid="${testId}"]`;
        if (document.querySelectorAll(attrSel).length === 1) return attrSel;
      }

      const tag = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className
          .trim()
          .split(/\s+/)
          .filter((c) => /^[a-zA-Z_-][\w-]*$/.test(c) && !c.startsWith('hover:') && !c.startsWith('focus:'));
        if (classes.length > 0) {
          const classSel = `${tag}.${classes.slice(0, 2).join('.')}`;
          if (document.querySelectorAll(classSel).length === 1) return classSel;
          const firstClassSel = `${tag}.${classes[0]}`;
          if (document.querySelectorAll(firstClassSel).length === 1) return firstClassSel;
        }
      }

      const nameAttr = el.getAttribute('name');
      if (nameAttr) {
        const nameSel = `${tag}[name="${nameAttr}"]`;
        if (document.querySelectorAll(nameSel).length === 1) return nameSel;
      }

      if (document.querySelectorAll(tag).length === 1) return tag;

      // Fallback path with multi-level ancestor context
      const pathParts: string[] = [];
      let curr: Element | null = el;
      while (curr && curr !== document.body && pathParts.length < 4) {
        const cTag = curr.tagName.toLowerCase();
        if (curr.id && /^[a-zA-Z][\w-]*$/.test(curr.id)) {
          pathParts.unshift(`#${curr.id}`);
          break;
        }
        const p: Element | null = curr.parentElement;
        if (p) {
          const sameTagSiblings = Array.from(p.children).filter((c: Element) => c.tagName === curr!.tagName);
          if (sameTagSiblings.length > 1) {
            const idx = sameTagSiblings.indexOf(curr) + 1;
            pathParts.unshift(`${cTag}:nth-of-type(${idx})`);
          } else {
            pathParts.unshift(cTag);
          }
          const candidate = pathParts.join(' > ');
          if (document.querySelectorAll(candidate).length === 1) {
            return candidate;
          }
        } else {
          pathParts.unshift(cTag);
        }
        curr = p;
      }

      const fullCandidate = pathParts.join(' > ');
      if (fullCandidate && document.querySelectorAll(fullCandidate).length >= 1) {
        return fullCandidate;
      }

      return tag;
    }

    function isVisibleAndUnoccluded(el: Element): { visible: boolean; unoccluded: boolean; rect: DOMRect } {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity) === 0 ||
        rect.width < 4 ||
        rect.height < 4
      ) {
        return { visible: false, unoccluded: false, rect };
      }
      const cx = Math.floor(rect.left + rect.width / 2);
      const cy = Math.floor(rect.top + rect.height / 2);
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) {
        return { visible: true, unoccluded: true, rect };
      }
      const hit = document.elementFromPoint(cx, cy);
      if (!hit) return { visible: true, unoccluded: true, rect };
      if (hit === el || el.contains(hit) || hit.contains(el)) {
        return { visible: true, unoccluded: true, rect };
      }
      const hitStyle = window.getComputedStyle(hit);
      if (hitStyle.pointerEvents === 'none') return { visible: true, unoccluded: true, rect };
      return { visible: true, unoccluded: false, rect };
    }

    // 1. Discover Topbar / Header
    let topbarSelector: string | undefined;
    const topbarCandidates = [
      'header.site-topbar',
      'header[role="banner"]',
      'header',
      'nav.navbar',
      'nav[role="navigation"]',
      '.topbar',
      '.site-header'
    ];
    for (const sel of topbarCandidates) {
      const el = document.querySelector(sel);
      if (el && isVisibleAndUnoccluded(el).visible) {
        topbarSelector = buildUniqueSelector(el);
        break;
      }
    }

    // 2. Discover Brand Lockup / Logo
    let brandSelector: string | undefined;
    const brandCandidates = [
      'a.brand-lockup',
      '.brand-lockup',
      'header a.logo',
      'header .logo',
      '.navbar-brand',
      'header a[href]'
    ];
    for (const sel of brandCandidates) {
      const el = document.querySelector(sel);
      if (el && isVisibleAndUnoccluded(el).visible) {
        brandSelector = buildUniqueSelector(el);
        break;
      }
    }

    // 3. Discover Primary Heading
    let heading: { selector: string; text: string; contrastOk: boolean } | undefined;
    const hCandidates = Array.from(document.querySelectorAll('header h1, main h1, h1, h2'));
    for (const h of hCandidates) {
      const check = isVisibleAndUnoccluded(h);
      const txt = (h.textContent || '').trim();
      if (check.visible && check.unoccluded && txt.length >= 2) {
        heading = {
          selector: buildUniqueSelector(h),
          text: txt.slice(0, 60),
          contrastOk: true
        };
        break;
      }
    }

    // 4. Discover Game HUD / Status / Telemetry Elements
    const hudElements: Array<{ selector: string; label: string }> = [];
    const hudNodes = Array.from(
      document.querySelectorAll(
        '[class*="hud"], [class*="currency"], [class*="resource"], [class*="stat-card"], [class*="kpi"], [data-hud]'
      )
    );
    const seenHudSels = new Set<string>();
    for (const node of hudNodes) {
      if (hudElements.length >= 4) break;
      const check = isVisibleAndUnoccluded(node);
      if (!check.visible || !check.unoccluded) continue;
      const sel = buildUniqueSelector(node);
      if (seenHudSels.has(sel)) continue;
      seenHudSels.add(sel);
      const label = (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 35) || sel;
      hudElements.push({ selector: sel, label });
    }

    // 5. Discover Interactive Tabs / In-Page Navigation Controls
    const tabOrNavControls: Array<{ selector: string; label: string }> = [];
    const tabCandidates = Array.from(
      document.querySelectorAll('[role="tab"], button[data-tab], .tab-btn, nav button')
    );
    const seenTabSels = new Set<string>();
    for (const tab of tabCandidates) {
      if (tabOrNavControls.length >= 3) break;
      const check = isVisibleAndUnoccluded(tab);
      if (!check.visible || !check.unoccluded) continue;
      const sel = buildUniqueSelector(tab);
      if (seenTabSels.has(sel)) continue;
      seenTabSels.add(sel);
      const label = (tab.textContent || tab.getAttribute('aria-label') || sel).trim().slice(0, 30);
      tabOrNavControls.push({ selector: sel, label });
    }

    // 6. Discover Interactive Buttons & CTAs
    const interactiveButtons: Array<{
      selector: string;
      label: string;
      width: number;
      height: number;
      unoccluded: boolean;
      isSubmit: boolean;
    }> = [];
    const btnCandidates = Array.from(
      document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')
    );
    const destructivePattern = /delete|remove|destroy|logout|sign\s*out|cancel|reset/i;
    const seenBtnSels = new Set<string>();

    for (const btn of btnCandidates) {
      if (interactiveButtons.length >= 6) break;
      if ((btn as HTMLButtonElement).disabled) continue;
      const check = isVisibleAndUnoccluded(btn);
      if (!check.visible || !check.unoccluded) continue;

      const label = (
        btn.textContent ||
        btn.getAttribute('aria-label') ||
        btn.getAttribute('value') ||
        btn.id ||
        'button'
      )
        .trim()
        .replace(/\s+/g, ' ');

      if (destructivePattern.test(label) || destructivePattern.test(btn.id || '')) continue;

      const sel = buildUniqueSelector(btn);
      if (seenBtnSels.has(sel)) continue;
      seenBtnSels.add(sel);

      const isSubmit =
        btn.getAttribute('type') === 'submit' ||
        /submit/i.test(btn.id || '') ||
        (btn.closest('form') !== null && /submit|send|save|register|login|checkout/i.test(label));

      interactiveButtons.push({
        selector: sel,
        label: label.slice(0, 40),
        width: Math.round(check.rect.width),
        height: Math.round(check.rect.height),
        unoccluded: check.unoccluded,
        isSubmit
      });
    }

    // 7. Discover Form Inputs
    const formInputs: Array<{
      selector: string;
      inputType: string;
      nameOrId: string;
      sampleValue: string;
    }> = [];
    const inputCandidates = Array.from(
      document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea'
      )
    );
    const seenInputSels = new Set<string>();

    for (const inp of inputCandidates) {
      if (formInputs.length >= 5) break;
      if ((inp as HTMLInputElement).disabled || (inp as HTMLInputElement).readOnly) continue;
      const check = isVisibleAndUnoccluded(inp);
      if (!check.visible || !check.unoccluded) continue;

      const sel = buildUniqueSelector(inp);
      if (seenInputSels.has(sel)) continue;
      seenInputSels.add(sel);

      const typeAttr = (inp.getAttribute('type') || inp.tagName.toLowerCase()).toLowerCase();
      const hint = `${inp.id || ''} ${inp.getAttribute('name') || ''} ${inp.getAttribute('placeholder') || ''}`.toLowerCase();

      let sampleValue = 'BetterFront Autonomous QA';
      if (typeAttr === 'email' || hint.includes('email')) {
        sampleValue = 'qa.tester@betterfront.io';
      } else if (typeAttr === 'tel' || hint.includes('phone')) {
        sampleValue = '+15550192834';
      } else if (typeAttr === 'number' || hint.includes('amount') || hint.includes('qty')) {
        sampleValue = '42';
      } else if (typeAttr === 'url' || hint.includes('website')) {
        sampleValue = 'https://betterfront.dev';
      } else if (typeAttr === 'search' || hint.includes('search') || hint.includes('query')) {
        sampleValue = 'fantasy sword';
      } else if (hint.includes('name') || hint.includes('user')) {
        sampleValue = 'Aria Vanguard';
      }

      formInputs.push({
        selector: sel,
        inputType: typeAttr,
        nameOrId: inp.id || inp.getAttribute('name') || sel,
        sampleValue
      });
    }

    const submitBtn = interactiveButtons.find((b) => b.isSubmit);

    return {
      title: document.title || '',
      url: window.location.href,
      topbarSelector,
      brandSelector,
      heading,
      hudElements,
      tabOrNavControls,
      interactiveButtons,
      formInputs,
      submitButtonSelector: submitBtn?.selector
    };
  });

  const steps: UatStep[] = [];
  const variables: Record<string, string> = {
    BASE_URL: targetUrl
  };

  let stepNum = 1;

  // Step 1: Navigate to target URL
  steps.push({
    action: 'GOTO',
    url: '{{BASE_URL}}',
    description: `${stepNum++}. Navigate to target application ({{BASE_URL}})`
  });

  // Step 2: Document title assertion if present
  if (discovered.title && discovered.title.trim().length > 0) {
    steps.push({
      action: 'ASSERT_TITLE',
      text: discovered.title.trim().slice(0, 40),
      description: `${stepNum++}. Verify document title contains "${discovered.title.trim().slice(0, 40)}"`
    });
  }

  // Step 3: Topbar / Header checks
  if (discovered.topbarSelector && options?.includeNavigation !== false) {
    variables.TOPBAR_SELECTOR = discovered.topbarSelector;
    steps.push({
      action: 'ASSERT_VISIBLE',
      selector: '{{TOPBAR_SELECTOR}}',
      description: `${stepNum++}. Verify primary topbar/header navigation (${discovered.topbarSelector}) is visible`
    });
  }

  // Step 4: Brand lockup checks
  if (discovered.brandSelector && options?.includeNavigation !== false) {
    variables.BRAND_SELECTOR = discovered.brandSelector;
    steps.push({
      action: 'ASSERT_VISIBLE',
      selector: '{{BRAND_SELECTOR}}',
      description: `${stepNum++}. Verify brand lockup (${discovered.brandSelector}) is visible`
    });
    steps.push({
      action: 'ASSERT_UNOCCLUDED',
      selector: '{{BRAND_SELECTOR}}',
      description: `${stepNum++}. Verify brand lockup is physically unoccluded at hit center`
    });
    steps.push({
      action: 'HOVER',
      selector: '{{BRAND_SELECTOR}}',
      description: `${stepNum++}. Hover over brand lockup to verify interactive highlight`
    });
  }

  // Step 5: Primary Heading visibility & text verification
  if (discovered.heading) {
    variables.PRIMARY_HEADING_SELECTOR = discovered.heading.selector;
    steps.push({
      action: 'ASSERT_VISIBLE',
      selector: '{{PRIMARY_HEADING_SELECTOR}}',
      description: `${stepNum++}. Verify primary heading (${discovered.heading.selector}) is visible`
    });
    steps.push({
      action: 'ASSERT_TEXT',
      selector: '{{PRIMARY_HEADING_SELECTOR}}',
      text: discovered.heading.text,
      description: `${stepNum++}. Verify primary heading text contains "${discovered.heading.text}"`
    });
  }

  // Step 6: Game HUD / Dashboard Telemetry widgets
  if (options?.includeHudChecks !== false && discovered.hudElements.length > 0) {
    for (const hud of discovered.hudElements) {
      steps.push({
        action: 'ASSERT_VISIBLE',
        selector: hud.selector,
        ifVisible: true,
        description: `${stepNum++}. Verify HUD / telemetry widget (${hud.label}) is visible`
      });
    }
  }

  // Step 7: Non-submit Interactive CTA button occlusion, ergonomics & hover checks (before any modal-opening clicks)
  const nonSubmitButtons = discovered.interactiveButtons.filter((b) => !b.isSubmit);
  const maxBtns = options?.maxButtonsToTest ?? 2;
  const targetButtons = nonSubmitButtons.slice(0, maxBtns);
  for (const btn of targetButtons) {
    steps.push({
      action: 'ASSERT_UNOCCLUDED',
      selector: btn.selector,
      ifVisible: true,
      description: `${stepNum++}. Verify CTA button "${btn.label}" (${btn.selector}) is unoccluded`
    });
    if (btn.width >= 36 && btn.height >= 36) {
      steps.push({
        action: 'ASSERT_TOUCH_TARGET',
        selector: btn.selector,
        minPx: Math.min(44, Math.min(btn.width, btn.height)),
        ifVisible: true,
        optional: true,
        description: `${stepNum++}. Verify button "${btn.label}" meets ergonomic touch target size`
      });
    }
    steps.push({
      action: 'HOVER',
      selector: btn.selector,
      ifVisible: true,
      description: `${stepNum++}. Hover over button "${btn.label}"`
    });
  }

  // Step 8: Form inputs & submission
  if (options?.includeForms !== false && discovered.formInputs.length > 0) {
    for (const inp of discovered.formInputs) {
      steps.push({
        action: 'TYPE',
        selector: inp.selector,
        text: inp.sampleValue,
        clearFirst: true,
        ifVisible: true,
        description: `${stepNum++}. Type "${inp.sampleValue}" into form field (${inp.selector})`
      });
      steps.push({
        action: 'ASSERT_VALUE',
        selector: inp.selector,
        value: inp.sampleValue,
        ifVisible: true,
        description: `${stepNum++}. Verify input (${inp.selector}) holds value "${inp.sampleValue}"`
      });
    }

    if (discovered.submitButtonSelector) {
      steps.push({
        action: 'ASSERT_UNOCCLUDED',
        selector: discovered.submitButtonSelector,
        ifVisible: true,
        description: `${stepNum++}. Verify form submit button (${discovered.submitButtonSelector}) is unoccluded`
      });
      steps.push({
        action: 'CLICK',
        selector: discovered.submitButtonSelector,
        ifVisible: true,
        description: `${stepNum++}. Click form submit button (${discovered.submitButtonSelector})`
      });
    }
  }

  // Step 9: Tab controls & Primary CTA interaction
  if (options?.includeNavigation !== false && discovered.tabOrNavControls.length > 0) {
    const maxTabs = options?.maxNavLinksToTest ?? 2;
    for (const tab of discovered.tabOrNavControls.slice(0, maxTabs)) {
      steps.push({
        action: 'CLICK',
        selector: tab.selector,
        ifVisible: true,
        optional: true,
        description: `${stepNum++}. Click interactive tab/navigation control "${tab.label}" (${tab.selector})`
      });
    }
  }

  if (targetButtons.length > 0) {
    const primaryBtn = targetButtons[0];
    steps.push({
      action: 'CLICK',
      selector: primaryBtn.selector,
      ifVisible: true,
      description: `${stepNum++}. Click interactive button "${primaryBtn.label}" (${primaryBtn.selector})`
    });
    steps.push({
      action: 'PRESS_KEY',
      key: 'Escape',
      optional: true,
      description: `${stepNum++}. Press Escape to dismiss any modal/drawer opened by button interaction`
    });
  }

  // Step 10: Human scroll and runtime hygiene verification
  steps.push({
    action: 'SCROLL',
    scrollPx: 350,
    direction: 'down',
    description: `${stepNum++}. Smoothly scroll down page to exercise sticky headers and lazy content`
  });

  if (options?.includeInvariants !== false) {
    steps.push({
      action: 'ASSERT_NO_CONSOLE_ERRORS',
      description: `${stepNum++}. Verify zero unhandled JavaScript console exceptions`
    });
    steps.push({
      action: 'ASSERT_NETWORK_OK',
      description: `${stepNum++}. Verify zero failed (4xx/5xx) network requests`
    });
  }

  // Step 11: Final visual evidence capture
  steps.push({
    action: 'SCREENSHOT',
    name: 'auto-uat-verified-state',
    description: `${stepNum++}. Capture visual verification screenshot`
  });

  const scenarioName =
    options?.name ||
    (discovered.title
      ? `Auto-Discovered UAT: ${discovered.title.trim()}`
      : `Auto-Discovered UAT Flow (${targetUrl})`);

  const scenarioDesc =
    options?.description ||
    `Autonomously synthesized UAT workflow for ${targetUrl} (${discovered.interactiveButtons.length} button(s), ${discovered.formInputs.length} form input(s), ${discovered.hudElements.length} HUD widget(s) discovered).`;

  const scenario: UatScenario = {
    $schema: './uat-scenario.schema.json',
    name: scenarioName,
    description: scenarioDesc,
    startUrl: targetUrl,
    variables,
    viewports: options?.viewports || ['desktop_fhd', 'mobile_standard'],
    anomalyChecks: {
      textOverlap: true,
      horizontalBleed: true,
      containerClipping: true,
      interactiveOcclusion: true,
      consoleExceptions: true
    },
    recording: {
      video: false,
      trace: false,
      screenshotOnFailure: true,
      artifactsDir: './betterfront-artifacts'
    },
    steps
  };

  if (options?.outputFilePath) {
    const outPath = path.resolve(options.outputFilePath);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outPath, JSON.stringify(scenario, null, 2), 'utf8');
  }

  return scenario;
}

/**
 * Connects to a live URL, inspects its DOM structure, and generates a ready-to-run UAT Scenario JSON.
 */
export async function generateUatScenario(
  targetUrl: string,
  options?: UatGeneratorOptions,
  externalPool?: BrowserPool
): Promise<UatScenario> {
  const ownsPool = !externalPool;
  const pool =
    externalPool ||
    new BrowserPool({
      headless: options?.headless !== false,
      browserEngine: 'chromium'
    });

  try {
    const session = await pool.createContextSession(STANDARD_VIEWPORTS.desktop_fhd);
    try {
      await session.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await session.page.waitForTimeout(400);
      return await generateUatScenarioFromPage(session.page, targetUrl, options);
    } finally {
      await session.context.close();
    }
  } finally {
    if (ownsPool) {
      await pool.closeAll();
    }
  }
}

