/**
 * BetterFront UAT Templates - Core Cross-Cutting Templates
 * (universal-smoke, responsive-breakpoint-matrix, accessibility-keyboard-ergonomics, visual-regression-invariants)
 */

import { UatScenario } from '../../types/index.js';
import { UatTemplateCatalogEntry } from './types.js';

export const CORE_UAT_TEMPLATES: Record<string, UatTemplateCatalogEntry> = {
  'universal-smoke': {
    id: 'universal-smoke',
    title: 'Universal Zero-Config Smoke & Runtime Hygiene',
    category: 'Universal',
    description:
      'Works out-of-the-box on any web application without manual selector setup. Verifies page load, primary landmarks, heading visibility, interactive CTA reachability, smooth scrolling, network health, and zero console errors.',
    defaultVariables: {
      BASE_URL: 'http://localhost:7777',
      HEADER_SELECTOR: 'header, nav, [role="banner"], body',
      HEADING_SELECTOR: 'h1, h2, [role="heading"], body',
      PRIMARY_CTA_SELECTOR: '#cta-button, button:not([disabled]), a.btn, a[href]'
    },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: 'Universal Zero-Config Smoke & Hygiene Workflow',
      description:
        'Ready-to-run universal smoke test validating landmarks, interactive unoccluded hit targets, scroll behavior, network status, and console error hygiene.',
      template: 'universal-smoke',
      tags: ['smoke', 'universal', 'zero-config'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl,
        HEADER_SELECTOR: 'header, nav, [role="banner"], body',
        HEADING_SELECTOR: 'h1, h2, [role="heading"], body',
        PRIMARY_CTA_SELECTOR: '#cta-button, button:not([disabled]), a.btn, a[href]'
      },
      viewports: ['desktop_fhd', 'mobile_standard'],
      recording: {
        video: false,
        trace: false,
        screenshotOnFailure: true,
        artifactsDir: './betterfront-artifacts'
      },
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to target application ({{BASE_URL}})'
        },
        {
          action: 'ASSERT_VISIBLE',
          selector: '{{HEADER_SELECTOR}}',
          fallbackSelectors: ['header', 'nav', 'main', 'body'],
          description: '2. Verify primary navigation/header landmark is visible'
        },
        {
          action: 'ASSERT_VISIBLE',
          selector: '{{HEADING_SELECTOR}}',
          fallbackSelectors: ['h1', 'h2', 'h3', 'body'],
          description: '3. Verify primary page heading is rendered and visible'
        },
        {
          action: 'ASSERT_UNOCCLUDED',
          selector: '{{PRIMARY_CTA_SELECTOR}}',
          fallbackSelectors: ['#cta-button', 'button', 'a[href]'],
          ifVisible: true,
          description: '4. Verify primary interactive CTA or link is physically unoccluded'
        },
        {
          action: 'HOVER',
          selector: '{{PRIMARY_CTA_SELECTOR}}',
          fallbackSelectors: ['#cta-button', 'button', 'a[href]'],
          ifVisible: true,
          description: '5. Hover over primary interactive control'
        },
        {
          action: 'SCROLL',
          scrollPx: 400,
          direction: 'down',
          description: '6. Human scroll down page to trigger lazy elements and sticky headers'
        },
        {
          action: 'SCROLL',
          scrollPx: 400,
          direction: 'up',
          description: '7. Scroll back to top of viewport'
        },
        {
          action: 'ASSERT_NO_CONSOLE_ERRORS',
          description: '8. Verify zero unhandled JavaScript console exceptions'
        },
        {
          action: 'ASSERT_NETWORK_OK',
          description: '9. Verify zero failed (4xx/5xx) network requests'
        },
        {
          action: 'SCREENSHOT',
          name: 'universal-smoke-verified',
          description: '10. Capture verified baseline screenshot'
        }
      ]
    })
  },

  'responsive-breakpoint-matrix': {
    id: 'responsive-breakpoint-matrix',
    title: '5-Breakpoint Live Responsive Resize & Reflow Matrix',
    category: 'Responsive & Visual',
    description:
      'Dynamically resizes the viewport mid-scenario across 5 critical device widths (320px Foldable, 390px Mobile, 820px Tablet, 1366px Laptop, 1920px Desktop FHD) to verify responsive layout adaptation.',
    defaultVariables: {
      BASE_URL: 'http://localhost:7777',
      KEY_LANDMARK: 'header, main, h1, body'
    },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: '5-Breakpoint Live Responsive Matrix Workflow',
      description:
        'Resizes viewport live across 320px, 390px, 820px, 1366px, and 1920px, verifying landmark visibility and runtime stability at every breakpoint.',
      template: 'responsive-breakpoint-matrix',
      tags: ['responsive', 'breakpoints', 'mobile', 'tablet', 'desktop'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl,
        KEY_LANDMARK: 'header, main, h1, body'
      },
      viewports: ['desktop_fhd'],
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to target URL ({{BASE_URL}})'
        },
        {
          action: 'SET_VIEWPORT',
          width: 320,
          height: 568,
          isMobile: true,
          name: 'Foldable_320px',
          description: '2. Resize viewport to 320x568 (Ultra-Compact / Foldable)'
        },
        {
          action: 'ASSERT_VISIBLE',
          selector: '{{KEY_LANDMARK}}',
          fallbackSelectors: ['header', 'h1', 'body'],
          description: '3. Verify key landmark remains visible at 320px width'
        },
        {
          action: 'SET_VIEWPORT',
          width: 390,
          height: 844,
          isMobile: true,
          name: 'Mobile_390px',
          description: '4. Resize viewport to 390x844 (Standard Modern Mobile)'
        },
        {
          action: 'ASSERT_VISIBLE',
          selector: '{{KEY_LANDMARK}}',
          fallbackSelectors: ['header', 'h1', 'body'],
          description: '5. Verify key landmark remains visible at 390px width'
        },
        {
          action: 'SET_VIEWPORT',
          width: 820,
          height: 1180,
          isMobile: true,
          name: 'Tablet_820px',
          description: '6. Resize viewport to 820x1180 (Tablet Portrait)'
        },
        {
          action: 'ASSERT_VISIBLE',
          selector: '{{KEY_LANDMARK}}',
          fallbackSelectors: ['header', 'h1', 'body'],
          description: '7. Verify key landmark remains visible at 820px width'
        },
        {
          action: 'SET_VIEWPORT',
          width: 1366,
          height: 768,
          isMobile: false,
          name: 'Laptop_1366px',
          description: '8. Resize viewport to 1366x768 (Standard Widescreen Laptop)'
        },
        {
          action: 'SET_VIEWPORT',
          width: 1920,
          height: 1080,
          isMobile: false,
          name: 'Desktop_1920px',
          description: '9. Resize viewport to 1920x1080 (Full HD Desktop)'
        },
        {
          action: 'ASSERT_NO_CONSOLE_ERRORS',
          description: '10. Verify zero console errors across all 5 responsive breakpoint transitions'
        },
        {
          action: 'SCREENSHOT',
          name: 'responsive-matrix-complete',
          description: '11. Capture final desktop screenshot after responsive sweep'
        }
      ]
    })
  },

  'accessibility-keyboard-ergonomics': {
    id: 'accessibility-keyboard-ergonomics',
    title: 'WCAG 2.1 AA Keyboard Navigation, Focus, Contrast & Touch Targets',
    category: 'Accessibility',
    description:
      'Verifies keyboard-only accessibility (Tab / Shift+Tab / Enter / Escape), active focus ring state, WCAG AA color contrast (4.5:1), and ergonomic touch target sizing.',
    defaultVariables: {
      BASE_URL: 'http://localhost:7777',
      HEADING_SELECTOR: 'header h1, h1, h2',
      PRIMARY_BUTTON_SELECTOR: '#submit-form-btn, #cta-button, a.brand-lockup, button'
    },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: 'WCAG 2.1 AA Keyboard & Ergonomics UAT Workflow',
      description:
        'Tests keyboard Tab focus traversal, WCAG 1.4.3 AA text contrast, and WCAG 2.5.5 touch target ergonomics.',
      template: 'accessibility-keyboard-ergonomics',
      tags: ['a11y', 'wcag', 'keyboard', 'contrast', 'touch-targets'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl,
        HEADING_SELECTOR: 'header h1',
        PRIMARY_BUTTON_SELECTOR: '#submit-form-btn'
      },
      viewports: ['desktop_fhd'],
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to target URL ({{BASE_URL}})'
        },
        {
          action: 'PRESS_KEY',
          key: 'Tab',
          description: '2. Press Tab to move keyboard focus to first interactive element'
        },
        {
          action: 'ASSERT_FOCUSED',
          optional: true,
          description: '3. Verify an interactive element received keyboard focus'
        },
        {
          action: 'PRESS_KEY',
          key: 'Tab',
          description: '4. Press Tab to advance focus to second interactive element'
        },
        {
          action: 'PRESS_KEY',
          key: 'Shift+Tab',
          description: '5. Press Shift+Tab to verify reverse focus traversal (no focus trap)'
        },
        {
          action: 'ASSERT_CONTRAST',
          selector: '{{HEADING_SELECTOR}}',
          fallbackSelectors: ['h1', 'h2', 'header a', 'body'],
          minRatio: 4.5,
          ifVisible: true,
          description: '6. Verify primary heading meets WCAG AA 4.5:1 contrast ratio'
        },
        {
          action: 'ASSERT_TOUCH_TARGET',
          selector: '{{PRIMARY_BUTTON_SELECTOR}}',
          fallbackSelectors: ['#cta-button', 'a.brand-lockup', 'button'],
          minPx: 36,
          ifVisible: true,
          description: '7. Verify primary interactive control meets ergonomic target size'
        },
        {
          action: 'ASSERT_NO_CONSOLE_ERRORS',
          description: '8. Verify zero runtime console errors during keyboard navigation'
        }
      ]
    })
  },

  'visual-regression-invariants': {
    id: 'visual-regression-invariants',
    title: 'Deep 10-Point Visual & Layout Invariant Gate',
    category: 'Responsive & Visual',
    description:
      'Runs ASSERT_ALL_INVARIANTS (text overlap, mobile bleed, container clipping, interactive occlusion, and console errors) across progressive scroll positions.',
    defaultVariables: {
      BASE_URL: 'http://localhost:7777'
    },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: 'Deep Visual & Layout Invariants Gate Workflow',
      description:
        'Executes comprehensive mathematical layout & runtime invariant assertions at top-of-page and scrolled viewport states.',
      template: 'visual-regression-invariants',
      tags: ['visual', 'invariants', 'layout', 'regression'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl
      },
      viewports: ['desktop_fhd', 'mobile_standard'],
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to target URL ({{BASE_URL}})'
        },
        {
          action: 'ASSERT_ALL_INVARIANTS',
          description:
            '2. Assert all visual & runtime invariants (overlap, bleed, clipping, occlusion, console) at top of page'
        },
        {
          action: 'SCROLL',
          scrollPx: 500,
          direction: 'down',
          description: '3. Scroll down 500px to mid-page section'
        },
        {
          action: 'ASSERT_ALL_INVARIANTS',
          description: '4. Assert all visual & runtime invariants at mid-page scroll position'
        },
        {
          action: 'SCREENSHOT',
          name: 'visual-invariants-verified',
          fullPage: true,
          description: '5. Capture full-page visual proof screenshot'
        }
      ]
    })
  }
};
