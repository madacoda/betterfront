import { FrontendWebCheckDefinition } from '../types/index.js';

/**
 * Complete Catalog of BetterFront Frontend Web Checks:
 * - 12 Required Core Invariants (Gold-Standard Default Checks)
 * - 9 Optional Web-Based Frontend Checks (Deep Senior Frontend Engineering Checks)
 */
export const FRONTEND_WEB_CHECKS_CATALOG: FrontendWebCheckDefinition[] = [
  // ============================================================================
  // TIER 1: 12 REQUIRED CORE INVARIANTS (Default ON)
  // ============================================================================
  {
    key: 'textOverlap',
    title: 'Text-on-Text Collision (Range AABB)',
    category: 'Visual & Layout Geometry',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-text-overlap',
    uatAction: 'ASSERT_NO_OVERLAP',
    description: 'Uses Range.getClientRects() with Y-axis Sweep-and-Prune and Stacking Context verification to detect overlapping text nodes.',
    whyItMatters: 'Overlapping text renders UI copy completely illegible when responsive breakpoints or absolute offsets collide.',
    remediationTip: 'Replace hardcoded height/top offsets with Flexbox/Grid gap flow and min-height: fit-content.'
  },
  {
    key: 'interactiveOcclusion',
    title: '5-Point Hit-Target Occlusion (elementFromPoint)',
    category: 'Visual & Layout Geometry',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-occlusion',
    uatAction: 'ASSERT_UNOCCLUDED',
    description: 'Audits center and 4 quadrant hit-points via document.elementFromPoint(x, y) to ensure sticky headers or zombie modal backdrops do not block clicks.',
    whyItMatters: 'An element can pass DOM visibility assertions while being physically unclickable by real users due to z-index overlays.',
    remediationTip: 'Apply scroll-margin-top to clear sticky headers, or pointer-events: none; visibility: hidden; on inactive backdrops.'
  },
  {
    key: 'containerClipping',
    title: 'Container Starvation & Premature Ellipsis',
    category: 'Visual & Layout Geometry',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-clipping',
    uatAction: 'ASSERT_NO_CLIPPING',
    description: 'Detects overflow: hidden/clip containers where scrollHeight > clientHeight or critical UI labels (prices, badges, CTAs) are prematurely amputated.',
    whyItMatters: 'Truncated prices ("$10,...") or amputated CTA buttons destroy user trust and conversion rates.',
    remediationTip: 'Use width: fit-content; min-height: fit-content; and avoid rigid pixel dimensions on text containers.'
  },
  {
    key: 'horizontalBleed',
    title: 'Mobile Horizontal Viewport Bleed',
    category: 'Responsive & Mobile UX',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-bleed',
    uatAction: 'ASSERT_NO_BLEED',
    description: 'Scans mobile viewports (<768px) for elements extending past document.documentElement.clientWidth causing sideways page wobble.',
    whyItMatters: 'Horizontal wobble during vertical scrolling on iOS/Android makes web apps feel broken and non-native.',
    remediationTip: 'Use max-width: 100%; replace width: 100vw with width: 100%; and apply overflow-x: clip on body.'
  },
  {
    key: 'unsizedMedia',
    title: 'Unsized Media (CLS Prevention)',
    category: 'Performance & Core Web Vitals',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-unsized-media',
    uatAction: 'ASSERT_ALL_INVARIANTS',
    description: 'Flags <img>, <video>, <canvas>, and <iframe> elements lacking explicit width/height attributes or CSS aspect-ratio.',
    whyItMatters: 'Unsized media causes severe layout jumps when images decode asynchronously over network connections.',
    remediationTip: 'Always specify width and height HTML attributes or CSS aspect-ratio: 16/9.'
  },
  {
    key: 'layoutShifts',
    title: 'Real-Time Cumulative Layout Shift (CLS)',
    category: 'Performance & Core Web Vitals',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-shifts',
    uatAction: 'ASSERT_ALL_INVARIANTS',
    description: 'Tracks session-windowed layout-shift entries via PerformanceObserver with exact DOM node delta attribution.',
    whyItMatters: 'Content shifting under a user’s finger milliseconds before a tap causes accidental clicks and rage.',
    remediationTip: 'Reserve min-height skeleton placeholders for async banners, fonts, and dynamic feeds.'
  },
  {
    key: 'touchTargetSize',
    title: 'Ergonomic Touch Target Physics (44x44px)',
    category: 'Accessibility & Ergonomics',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-touch-targets',
    uatAction: 'ASSERT_TOUCH_TARGET',
    description: 'Verifies interactive controls on touch viewports meet the 44x44px Apple HIG / WCAG 2.5.5 minimum hit area.',
    whyItMatters: 'Tiny icon buttons (<24px) cause fat-finger mis-taps on mobile screens.',
    remediationTip: 'Add min-width: 44px; min-height: 44px; or expand hit area via padding.'
  },
  {
    key: 'lowContrast',
    title: 'Photometric Luminance Contrast (WCAG 1.4.3 AA)',
    category: 'Accessibility & Ergonomics',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-low-contrast',
    uatAction: 'ASSERT_CONTRAST',
    description: 'Alpha-composites foreground and multi-layer background colors (including CSS Color 4 oklch/lab) to verify >= 4.5:1 contrast.',
    whyItMatters: 'Low-contrast text is unreadable in bright environments and for users with low vision.',
    remediationTip: 'Darken foreground text or increase background opacity to achieve at least 4.5:1 (3.0:1 for large text).'
  },
  {
    key: 'a11yWcagViolations',
    title: 'WCAG 2.2 AA Semantic Accessibility (Axe-Core)',
    category: 'Accessibility & Ergonomics',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-a11y',
    uatAction: 'ASSERT_A11Y',
    description: 'Executes @axe-core/playwright rules across WCAG 2.0, 2.1, and 2.2 Level A & AA standards.',
    whyItMatters: 'Ensures screen-reader compatibility, ARIA role validity, and legal accessibility compliance.',
    remediationTip: 'Add semantic landmarks, aria-labels on icon buttons, and valid alt attributes on images.'
  },
  {
    key: 'consoleExceptions',
    title: 'Zero Unhandled Console & Page Exceptions',
    category: 'Security, SEO & DOM Hygiene',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-console-errors',
    uatAction: 'ASSERT_NO_CONSOLE_ERRORS',
    description: 'Intercepts window.onerror, unhandledrejection, and console.error emissions throughout user interactions.',
    whyItMatters: 'Silent runtime exceptions crash React/Vue event handlers while leaving the page looking normal in static screenshots.',
    remediationTip: 'Guard optional chaining on API responses and wrap async handlers in error boundaries.'
  },
  {
    key: 'brokenNetworkRequests',
    title: 'Network Asset & API Health (Zero 4xx/5xx)',
    category: 'Security, SEO & DOM Hygiene',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-network-errors',
    uatAction: 'ASSERT_NETWORK_OK',
    description: 'Monitors all XHR/fetch and static asset responses for unexpected HTTP 4xx and 5xx failures.',
    whyItMatters: 'Failed API calls or missing JS/CSS chunks break downstream user journeys.',
    remediationTip: 'Fix broken API endpoints and handle 4xx/5xx states gracefully with retry UI.'
  },
  {
    key: 'brokenLinks',
    title: 'Link & Anchor Integrity Checker',
    category: 'Security, SEO & DOM Hygiene',
    tier: 'required-invariant',
    defaultEnabled: true,
    cliFlag: '--no-broken-links',
    uatAction: 'ASSERT_ALL_INVARIANTS',
    description: 'Detects empty href="#", javascript:void(0) anti-patterns, missing #anchor targets, and dead HTTP links.',
    whyItMatters: 'Dead links trap users, harm SEO crawlability, and misuse <a> tags where <button> should be used.',
    remediationTip: 'Replace action-only <a href="#"> elements with <button type="button"> and verify target IDs.'
  },

  // ============================================================================
  // TIER 2: 9 OPTIONAL WEB-BASED FRONTEND CHECKS (Toggleable Deep Checks)
  // ============================================================================
  {
    key: 'brokenImagesAndSvg',
    title: 'Broken Images, SVGs & Media Render Check',
    category: 'Visual & Layout Geometry',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-broken-images',
    uatAction: 'ASSERT_NO_BROKEN_IMAGES',
    description: 'Audits <img> elements for naturalWidth === 0 / decode failure, visible <svg> icons collapsing to 0x0px, and broken CSS background-image URLs.',
    whyItMatters: 'An <img> tag can exist in the DOM and pass visibility checks even when its image file failed to decode or an SVG lacks viewBox dimensions.',
    remediationTip: 'Verify asset paths, provide onerror fallbacks, and set explicit width/height on <svg> elements.'
  },
  {
    key: 'stickyViewportBudget',
    title: 'Sticky & Fixed Chrome Viewport Budget (<= 25%)',
    category: 'Responsive & Mobile UX',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-sticky-budget',
    uatAction: 'ASSERT_STICKY_BUDGET',
    description: 'Calculates total vertical height consumed by fixed/sticky headers, bottom navs, and cookie banners against viewport height.',
    whyItMatters: 'When sticky topbars, promo bars, and bottom navs stack up to >25-30% of a mobile or 1366x768 laptop screen, users are left with a tiny "peephole" to read content.',
    remediationTip: 'Auto-hide secondary toolbars on scroll down, or compact sticky headers below 64px on mobile.'
  },
  {
    key: 'darkModeParity',
    title: 'Dark Mode & Color Scheme Parity Check',
    category: 'Theming & Localization',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-dark-mode',
    uatAction: 'ASSERT_DARK_MODE_PARITY',
    description: 'Emulates prefers-color-scheme: dark (and .dark / [data-theme="dark"]) to detect unstyled dark-on-dark text, invisible icons, or contrast collapse.',
    whyItMatters: 'Hardcoded text colors (e.g. color: #111) become invisible when a user’s OS or theme toggle switches the background to dark slate.',
    remediationTip: 'Use semantic CSS custom properties (--foreground / --background) across both :root and .dark scopes.'
  },
  {
    key: 'i18nTextExpansion',
    title: 'i18n Pseudo-Localization (+35% Text Expansion Stress)',
    category: 'Theming & Localization',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-i18n',
    uatAction: 'ASSERT_I18N_EXPANSION',
    description: 'Simulates +35% text length expansion on buttons, tabs, badges, and headings (modeling German/French/Indonesian translations) and scans for new clipping or collisions.',
    whyItMatters: 'English UI strings ("Save", "Buy") are compact; translating to German ("Speichern") or Indonesian ("Beli Sekarang") breaks rigid buttons.',
    remediationTip: 'Use min-width instead of width, allow flex-wrap, and test with +35% string padding before shipping.'
  },
  {
    key: 'formErgonomics',
    title: 'Form Ergonomics, Labels & Autocomplete Audit',
    category: 'Forms & Input UX',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-forms',
    uatAction: 'ASSERT_FORM_ERGONOMICS',
    description: 'Audits <input>, <select>, and <textarea> for accessible labels, missing autocomplete tokens on auth/checkout fields, and mobile inputmode ergonomics.',
    whyItMatters: 'Placeholder-only inputs lose context once typed into, and missing autocomplete/inputmode forces painful manual typing on mobile keyboards.',
    remediationTip: 'Pair every input with a <label for="..."> or aria-label, and add autocomplete="email|name|current-password".'
  },
  {
    key: 'fontLoadingHealth',
    title: 'Web Font Loading & FOIT/FOUT Hygiene',
    category: 'Performance & Core Web Vitals',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-fonts',
    uatAction: 'ASSERT_FONT_HEALTH',
    description: 'Inspects document.fonts API for failed FontFace loads and checks @font-face declarations for font-display: swap/optional.',
    whyItMatters: 'Missing font-display causes Flash of Invisible Text (FOIT) on slow mobile networks, delaying readable content.',
    remediationTip: 'Add font-display: swap; or font-display: optional; to all @font-face rules and preload critical WOFF2 files.'
  },
  {
    key: 'domComplexityBudget',
    title: 'DOM Complexity & Unvirtualized List Budget',
    category: 'Performance & Core Web Vitals',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-dom-budget',
    uatAction: 'ASSERT_DOM_BUDGET',
    description: 'Audits total DOM node count (<= 1,500), maximum tree depth (<= 32), and flags unvirtualized containers with > 100 direct child nodes.',
    whyItMatters: 'Bloated DOM trees degrade style recalculation, slow down INP responsiveness, and spike mobile memory usage.',
    remediationTip: 'Virtualize long lists/tables (@tanstack/react-virtual) and flatten unnecessary wrapper <div> elements.'
  },
  {
    key: 'frontendHygiene',
    title: 'Frontend Security, SEO & Storage Hygiene',
    category: 'Security, SEO & DOM Hygiene',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-hygiene',
    uatAction: 'ASSERT_FRONTEND_HYGIENE',
    description: 'Checks external target="_blank" links for rel="noopener", mixed HTTP content, document <html lang> / <meta viewport>, and sensitive token leaks in localStorage.',
    whyItMatters: 'Prevents reverse tabnabbing, broken mobile viewport scaling, SEO indexing penalties, and XSS token exfiltration.',
    remediationTip: 'Add rel="noopener noreferrer" to external links, set <html lang="en">, and store sensitive session tokens in HttpOnly cookies.'
  },
  {
    key: 'reducedMotionCompliance',
    title: 'Prefers-Reduced-Motion Accessibility Compliance',
    category: 'Accessibility & Ergonomics',
    tier: 'optional-web-check',
    defaultEnabled: false,
    cliFlag: '--check-reduced-motion',
    uatAction: 'ASSERT_REDUCED_MOTION',
    description: 'Emulates prefers-reduced-motion: reduce and checks whether infinite or long-duration CSS animations respect user vestibular safety settings.',
    whyItMatters: 'Unstoppable parallax, spinning, or bouncing animations trigger motion sickness for users with vestibular disorders (WCAG 2.3.3).',
    remediationTip: 'Add @media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }.'
  }
];
