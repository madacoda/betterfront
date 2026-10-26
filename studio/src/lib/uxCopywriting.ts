import { UatStep, StudioRunRecord } from '@/types';

export interface ActionUxMetadata {
  code: string;
  friendlyName: string;
  shortLabel: string;
  plainHint: string;
  managerImpact: string;
  selectorLabel?: string;
  selectorPlaceholder?: string;
  urlPlaceholder?: string;
  textLabel?: string;
  textPlaceholder?: string;
}

export const COMMON_SELECTOR_PRESETS: Array<{ label: string; selector: string; hint: string }> = [
  { label: 'Main Page Heading (h1)', selector: 'h1', hint: 'Targets the main title on the page' },
  { label: 'Top Navigation Bar (header)', selector: 'header, nav', hint: 'Targets the top website header or menu' },
  { label: 'Submit / Action Button', selector: 'button[type="submit"], button', hint: 'Targets the primary submit or action button' },
  { label: 'Search Box Input', selector: 'input[type="search"], input[name="q"], input[placeholder*="Search" i]', hint: 'Targets a search input bar' },
  { label: 'Email Input Field', selector: 'input[type="email"], input[name="email"]', hint: 'Targets an email address box' },
  { label: 'Password Input Field', selector: 'input[type="password"]', hint: 'Targets a password field' },
  { label: 'Primary Link / Brand Logo', selector: 'header a, a.brand-lockup, a', hint: 'Targets the main logo or link' }
];

export const VIEWPORT_UX_META: Record<
  string,
  {
    id: string;
    friendlyLabel: string;
    dimensions: string;
    deviceCategory: string;
    plainHint: string;
  }
> = {
  desktop_fhd: {
    id: 'desktop_fhd',
    friendlyLabel: 'Desktop Monitor (Full HD)',
    dimensions: '1920×1080',
    deviceCategory: 'Desktop',
    plainHint: 'Standard widescreen office and home monitor. Verifies multi-column desktop layouts.'
  },
  desktop_laptop: {
    id: 'desktop_laptop',
    friendlyLabel: 'Standard Office Laptop',
    dimensions: '1366×768',
    deviceCategory: 'Laptop',
    plainHint: 'The #1 most common corporate laptop resolution worldwide. Great for catching oversized sticky headers.'
  },
  tablet_portrait: {
    id: 'tablet_portrait',
    friendlyLabel: 'iPad Air (Tablet)',
    dimensions: '820×1180',
    deviceCategory: 'Tablet',
    plainHint: 'Touch-enabled tablet screen where desktop menus often collapse into mobile drawers.'
  },
  mobile_standard: {
    id: 'mobile_standard',
    friendlyLabel: 'iPhone 14 / 15 / 16 (Mobile)',
    dimensions: '390×844',
    deviceCategory: 'Mobile Phone',
    plainHint: 'Primary modern smartphone screen size. Essential for checking touch buttons and sideways wobble.'
  },
  mobile_compact: {
    id: 'mobile_compact',
    friendlyLabel: 'iPhone SE (Compact Phone)',
    dimensions: '375×667',
    deviceCategory: 'Compact Mobile',
    plainHint: 'Smaller phone screen where long titles or tight buttons are most likely to wrap or clip.'
  },
  foldable: {
    id: 'foldable',
    friendlyLabel: 'Galaxy Fold (Ultra-Narrow)',
    dimensions: '280×653',
    deviceCategory: 'Foldable Phone',
    plainHint: 'Extreme narrow screen stress-test (280px wide) to guarantee your layout never overflows.'
  }
};

export const UAT_ACTION_UX_META: Record<string, ActionUxMetadata> = {
  GOTO: {
    code: 'GOTO',
    friendlyName: 'Open Website Page (GOTO)',
    shortLabel: 'Open Website Page',
    plainHint: 'Opens the specified website link or page path in the browser.',
    managerImpact: 'Verifies the page loads cleanly without server crashes or blank screens.',
    urlPlaceholder: '{{BASE_URL}} or /checkout'
  },
  RELOAD: {
    code: 'RELOAD',
    friendlyName: 'Refresh Current Page (RELOAD)',
    shortLabel: 'Refresh Page',
    plainHint: 'Refreshes the browser tab just like pressing F5 or the browser Reload button.',
    managerImpact: 'Ensures customer login sessions, shopping carts, or saved settings survive a page refresh.'
  },
  WAIT: {
    code: 'WAIT',
    friendlyName: 'Pause & Wait (WAIT)',
    shortLabel: 'Pause briefly',
    plainHint: 'Waits for a short moment (e.g., 1000ms = 1 second) to let animations or transitions settle.',
    managerImpact: 'Gives smooth UI animations time to finish before checking the screen.'
  },
  WAIT_FOR: {
    code: 'WAIT_FOR',
    friendlyName: 'Wait Until Element Appears (WAIT_FOR)',
    shortLabel: 'Wait for Element',
    plainHint: 'Waits until a specific part of the page (like a popup, results list, or banner) becomes visible or hidden.',
    managerImpact: 'Prevents false alarms on pages that load data from an API.',
    selectorLabel: 'Page Element to Wait For',
    selectorPlaceholder: '#search-results, .modal-dialog'
  },
  WAIT_FOR_NAV: {
    code: 'WAIT_FOR_NAV',
    friendlyName: 'Wait for Page Redirect (WAIT_FOR_NAV)',
    shortLabel: 'Wait for Page Redirect',
    plainHint: 'Waits for the browser to finish navigating to a new page URL after a click or submit.',
    managerImpact: 'Confirms users are properly redirected after logging in or completing checkout.',
    urlPlaceholder: '/dashboard or /thank-you'
  },
  SET_VIEWPORT: {
    code: 'SET_VIEWPORT',
    friendlyName: 'Resize Screen Dimensions (SET_VIEWPORT)',
    shortLabel: 'Resize Screen',
    plainHint: 'Changes the browser window width and height mid-test (e.g., from Desktop to Mobile phone size).',
    managerImpact: 'Proves the page adapts smoothly when users rotate their phone or resize their window.'
  },
  CLICK: {
    code: 'CLICK',
    friendlyName: 'Click a Button or Link (CLICK)',
    shortLabel: 'Human Click',
    plainHint: 'Moves the mouse along a natural human curve and clicks the target button, link, or tab.',
    managerImpact: 'Verifies that interactive buttons and navigation links actually work when clicked by a real person.',
    selectorLabel: 'Button or Link to Click',
    selectorPlaceholder: '#submit-btn, button[type="submit"]'
  },
  DOUBLE_CLICK: {
    code: 'DOUBLE_CLICK',
    friendlyName: 'Double-Click an Element (DOUBLE_CLICK)',
    shortLabel: 'Human Double-Click',
    plainHint: 'Rapidly clicks an element twice in a row.',
    managerImpact: 'Tests that double-clicking a Buy or Submit button does not cause duplicate orders or crashes.',
    selectorLabel: 'Element to Double-Click',
    selectorPlaceholder: 'button.buy-now'
  },
  HOVER: {
    code: 'HOVER',
    friendlyName: 'Move Mouse Over Element (HOVER)',
    shortLabel: 'Mouse Hover',
    plainHint: 'Moves the mouse cursor over an element without clicking to trigger hover menus or tooltips.',
    managerImpact: 'Verifies dropdown menus, tooltips, and visual hover highlights appear properly.',
    selectorLabel: 'Element to Hover Over',
    selectorPlaceholder: 'nav .dropdown-trigger, a.brand-lockup'
  },
  TYPE: {
    code: 'TYPE',
    friendlyName: 'Type Text into Input Box (TYPE)',
    shortLabel: 'Human Typing',
    plainHint: 'Types text into an input field at a natural human typing speed (and optionally presses Enter).',
    managerImpact: 'Verifies search bars, login boxes, and forms accept customer input accurately.',
    selectorLabel: 'Input Box to Type Into',
    selectorPlaceholder: 'input[name="email"], #search-input',
    textLabel: 'Text to Type',
    textPlaceholder: 'e.g. customer@example.com or Wireless Headphones'
  },
  CLEAR: {
    code: 'CLEAR',
    friendlyName: 'Clear Input Box Text (CLEAR)',
    shortLabel: 'Clear Input Box',
    plainHint: 'Empties any existing text inside an input box or text area.',
    managerImpact: 'Ensures users can easily erase and correct their form entries.',
    selectorLabel: 'Input Box to Clear',
    selectorPlaceholder: 'input#user-email'
  },
  PRESS_KEY: {
    code: 'PRESS_KEY',
    friendlyName: 'Press Keyboard Key (PRESS_KEY)',
    shortLabel: 'Press Keyboard Key',
    plainHint: 'Presses a keyboard key such as Enter, Escape (to close modals), or Tab (for keyboard navigation).',
    managerImpact: 'Ensures popups close with Escape and forms work with the Enter and Tab keys.'
  },
  SELECT: {
    code: 'SELECT',
    friendlyName: 'Choose Dropdown Option (SELECT)',
    shortLabel: 'Select Dropdown Option',
    plainHint: 'Selects an item from a dropdown menu (<select>).',
    managerImpact: 'Confirms customers can pick shipping countries, sizes, or filter options.',
    selectorLabel: 'Dropdown Menu (<select>)',
    selectorPlaceholder: 'select#country'
  },
  CHECK: {
    code: 'CHECK',
    friendlyName: 'Check a Checkbox / Radio (CHECK)',
    shortLabel: 'Check Box',
    plainHint: 'Ticks a checkbox or radio button (such as "Remember Me" or "Accept Terms").',
    managerImpact: 'Verifies consent checkboxes and filter toggles can be selected.',
    selectorLabel: 'Checkbox to Tick',
    selectorPlaceholder: 'input[type="checkbox"]'
  },
  UNCHECK: {
    code: 'UNCHECK',
    friendlyName: 'Uncheck a Checkbox (UNCHECK)',
    shortLabel: 'Uncheck Box',
    plainHint: 'Unticks an active checkbox.',
    managerImpact: 'Verifies users can opt out of optional checkboxes.',
    selectorLabel: 'Checkbox to Untick',
    selectorPlaceholder: 'input#newsletter-opt-in'
  },
  SCROLL: {
    code: 'SCROLL',
    friendlyName: 'Scroll Page Up or Down (SCROLL)',
    shortLabel: 'Smooth Human Scroll',
    plainHint: 'Smoothly scrolls the page down or up like a human reading content.',
    managerImpact: 'Triggers lazy-loaded images and tests whether sticky headers cover up content while scrolling.'
  },
  SCROLL_TO: {
    code: 'SCROLL_TO',
    friendlyName: 'Scroll Until Element is in View (SCROLL_TO)',
    shortLabel: 'Scroll to Element',
    plainHint: 'Scrolls the page until a specific section or button is brought into view.',
    managerImpact: 'Ensures footer links, pricing tables, or lower sections are reachable.',
    selectorLabel: 'Section or Element to Scroll To',
    selectorPlaceholder: '#pricing-section, footer'
  },
  FILL_FORM: {
    code: 'FILL_FORM',
    friendlyName: 'Auto-Fill Entire Form with Realistic Data (FILL_FORM)',
    shortLabel: 'Smart Auto-Fill Form',
    plainHint: 'Automatically detects visible form inputs (name, email, phone, address) and fills them with realistic test data.',
    managerImpact: 'Saves time by testing complete signup or checkout forms in a single step.'
  },
  SET_STORAGE: {
    code: 'SET_STORAGE',
    friendlyName: 'Save Browser Storage Value (SET_STORAGE)',
    shortLabel: 'Set Browser Storage',
    plainHint: 'Sets a key-value item in localStorage or sessionStorage (e.g., a test login token or theme flag).',
    managerImpact: 'Allows testing logged-in pages or pre-dismissed onboarding banners.'
  },
  ASSERT_STORAGE: {
    code: 'ASSERT_STORAGE',
    friendlyName: 'Verify Browser Storage Value (ASSERT_STORAGE)',
    shortLabel: 'Verify Browser Storage',
    plainHint: 'Checks that the website saved the expected key/value in localStorage or sessionStorage.',
    managerImpact: 'Confirms user preferences or auth tokens are properly persisted.'
  },
  ASSERT_VISIBLE: {
    code: 'ASSERT_VISIBLE',
    friendlyName: 'Verify Element is Visible on Screen (ASSERT_VISIBLE)',
    shortLabel: 'Verify Visible',
    plainHint: 'Confirms that a specific heading, banner, button, or section is visibly displayed on the page.',
    managerImpact: 'Guarantees critical UI elements (like the Buy button or main headline) actually rendered.',
    selectorLabel: 'Element That Must Be Visible',
    selectorPlaceholder: 'header h1, #main-content'
  },
  ASSERT_HIDDEN: {
    code: 'ASSERT_HIDDEN',
    friendlyName: 'Verify Element is Hidden / Closed (ASSERT_HIDDEN)',
    shortLabel: 'Verify Hidden',
    plainHint: 'Confirms that a loading spinner, error banner, or closed popup is no longer visible.',
    managerImpact: 'Verifies modals close cleanly and loading spinners do not get stuck forever.',
    selectorLabel: 'Element That Must Be Hidden',
    selectorPlaceholder: '.loading-spinner, .modal-backdrop'
  },
  ASSERT_NOT_VISIBLE: {
    code: 'ASSERT_NOT_VISIBLE',
    friendlyName: 'Verify Element is Not Visible (ASSERT_NOT_VISIBLE)',
    shortLabel: 'Verify Not Visible',
    plainHint: 'Alias for ASSERT_HIDDEN — confirms the target element is hidden from view.',
    managerImpact: 'Confirms dismissed popups or error messages are hidden.',
    selectorLabel: 'Element That Must Not Be Visible',
    selectorPlaceholder: '.error-banner'
  },
  ASSERT_TEXT: {
    code: 'ASSERT_TEXT',
    friendlyName: 'Verify Text Inside an Element (ASSERT_TEXT)',
    shortLabel: 'Verify Text Content',
    plainHint: 'Checks that an element on the page contains the expected words, price, or message.',
    managerImpact: 'Confirms customers see the right headline, confirmation message, or total price.',
    selectorLabel: 'Element Containing the Text',
    selectorPlaceholder: 'h1, #order-status',
    textLabel: 'Expected Text to Find',
    textPlaceholder: 'e.g. Order Confirmed or Welcome'
  },
  ASSERT_VALUE: {
    code: 'ASSERT_VALUE',
    friendlyName: 'Verify Input Box Value (ASSERT_VALUE)',
    shortLabel: 'Verify Input Value',
    plainHint: 'Checks that an input field or dropdown currently holds the expected value.',
    managerImpact: 'Verifies typed or auto-filled form data was not lost or corrupted.',
    selectorLabel: 'Input or Dropdown Element',
    selectorPlaceholder: 'input#user-email'
  },
  ASSERT_ATTRIBUTE: {
    code: 'ASSERT_ATTRIBUTE',
    friendlyName: 'Verify HTML Attribute (ASSERT_ATTRIBUTE)',
    shortLabel: 'Verify HTML Attribute',
    plainHint: 'Checks an HTML attribute such as aria-expanded, href, or disabled on an element.',
    managerImpact: 'Verifies accessibility states and link destinations.',
    selectorLabel: 'Target Element',
    selectorPlaceholder: 'a.cta-link, button[aria-expanded]'
  },
  ASSERT_CSS: {
    code: 'ASSERT_CSS',
    friendlyName: 'Verify Visual Style Property (ASSERT_CSS)',
    shortLabel: 'Verify CSS Style',
    plainHint: 'Checks a computed visual style (like display, opacity, or background-color) on an element.',
    managerImpact: 'Ensures brand styling and layout rules are applied accurately.',
    selectorLabel: 'Target Element',
    selectorPlaceholder: 'header.site-topbar'
  },
  ASSERT_FOCUSED: {
    code: 'ASSERT_FOCUSED',
    friendlyName: 'Verify Keyboard Focus (ASSERT_FOCUSED)',
    shortLabel: 'Verify Keyboard Focus',
    plainHint: 'Checks that an interactive input or button currently has active keyboard focus.',
    managerImpact: 'Ensures keyboard-only users and accessibility tools can navigate the page.'
  },
  ASSERT_COUNT: {
    code: 'ASSERT_COUNT',
    friendlyName: 'Verify Number of Matching Elements (ASSERT_COUNT)',
    shortLabel: 'Verify Item Count',
    plainHint: 'Counts how many matching items (e.g., product cards, table rows) appear on the page.',
    managerImpact: 'Confirms search results, product catalogs, or dashboard cards loaded the expected number of items.',
    selectorLabel: 'Repeating Item to Count',
    selectorPlaceholder: '.product-card, tbody tr'
  },
  ASSERT_URL: {
    code: 'ASSERT_URL',
    friendlyName: 'Verify Current Page URL (ASSERT_URL)',
    shortLabel: 'Verify Page URL',
    plainHint: 'Confirms the browser address bar URL matches or contains the expected path.',
    managerImpact: 'Verifies navigation landed on the right destination page.',
    urlPlaceholder: '/checkout or /account'
  },
  ASSERT_TITLE: {
    code: 'ASSERT_TITLE',
    friendlyName: 'Verify Browser Tab Title (ASSERT_TITLE)',
    shortLabel: 'Verify Tab Title',
    plainHint: 'Checks that the browser tab title (<title>) contains the expected brand or page name.',
    managerImpact: 'Important for Google SEO rankings, browser bookmarks, and professional polish.',
    textLabel: 'Expected Tab Title Text',
    textPlaceholder: 'e.g. My Brand — Checkout'
  },
  ASSERT_UNOCCLUDED: {
    code: 'ASSERT_UNOCCLUDED',
    friendlyName: '🛡️ Verify Button is Not Covered by Popups (ASSERT_UNOCCLUDED)',
    shortLabel: 'Check Not Blocked by Overlay',
    plainHint: 'Tests whether a real user can physically click this element without a sticky header, cookie banner, or invisible backdrop blocking it.',
    managerImpact: 'Prevents the #1 silent conversion killer: buttons that look visible in code but cannot be tapped by customers.',
    selectorLabel: 'Button or Control to Hit-Test',
    selectorPlaceholder: '#submit-btn, button[type="submit"]'
  },
  ASSERT_NO_OVERLAP: {
    code: 'ASSERT_NO_OVERLAP',
    friendlyName: '🛡️ Verify Zero Overlapping Text (ASSERT_NO_OVERLAP)',
    shortLabel: 'Check No Overlapping Text',
    plainHint: 'Mathematically scans every visible text element on the screen to ensure no two titles, labels, or paragraphs collide on top of each other.',
    managerImpact: 'Guarantees 100% readable typography with zero embarrassing text collisions.'
  },
  ASSERT_NO_BLEED: {
    code: 'ASSERT_NO_BLEED',
    friendlyName: '🛡️ Verify Mobile Screen Has Zero Sideways Wobble (ASSERT_NO_BLEED)',
    shortLabel: 'Check No Mobile Horizontal Bleed',
    plainHint: 'Checks that no element extends past the right edge of a mobile screen, preventing annoying horizontal scrolling wobble.',
    managerImpact: 'Makes your mobile website feel like a polished native iOS/Android app.'
  },
  ASSERT_NO_CLIPPING: {
    code: 'ASSERT_NO_CLIPPING',
    friendlyName: '🛡️ Verify Text & Prices Are Not Cut Off (ASSERT_NO_CLIPPING)',
    shortLabel: 'Check No Cut-Off Text',
    plainHint: 'Detects boxes that are too small for their text, cutting off button labels or truncating prices.',
    managerImpact: 'Prevents customers from seeing cut-off prices ("$10,...") or broken buttons.'
  },
  ASSERT_TOUCH_TARGET: {
    code: 'ASSERT_TOUCH_TARGET',
    friendlyName: '🛡️ Verify Button is Big Enough for Fingers >=44px (ASSERT_TOUCH_TARGET)',
    shortLabel: 'Check Finger Tap Size (44px)',
    plainHint: 'Checks that buttons and links meet Apple & WCAG mobile ergonomics (>= 44×44 pixels) so users do not mis-tap.',
    managerImpact: 'Eliminates frustrating "fat-finger" mis-taps on mobile phones.',
    selectorLabel: 'Button or Link to Measure',
    selectorPlaceholder: 'button, a.btn'
  },
  ASSERT_CONTRAST: {
    code: 'ASSERT_CONTRAST',
    friendlyName: '🛡️ Verify Text is Easy to Read / WCAG Contrast (ASSERT_CONTRAST)',
    shortLabel: 'Check Text Contrast Ratio',
    plainHint: 'Measures text color brightness against its background (supporting modern CSS oklch/lab colors) to ensure >= 4.5:1 readability.',
    managerImpact: 'Ensures customers of all ages can easily read your text, even in bright sunlight.',
    selectorLabel: 'Element to Check (or leave blank for page)',
    selectorPlaceholder: 'header h1, .hero-subtitle'
  },
  ASSERT_NO_CONSOLE_ERRORS: {
    code: 'ASSERT_NO_CONSOLE_ERRORS',
    friendlyName: '🛡️ Verify Zero Hidden JavaScript Crashes (ASSERT_NO_CONSOLE_ERRORS)',
    shortLabel: 'Check Zero JS Crashes',
    plainHint: 'Confirms zero unhandled JavaScript errors or crashes happened in the background during the user journey.',
    managerImpact: 'Catches silent code bugs that break buttons behind the scenes.'
  },
  ASSERT_NETWORK_OK: {
    code: 'ASSERT_NETWORK_OK',
    friendlyName: '🛡️ Verify Zero Failed API or Asset Requests (ASSERT_NETWORK_OK)',
    shortLabel: 'Check Zero 404/500 Network Errors',
    plainHint: 'Confirms all API calls, scripts, and data requests succeeded without HTTP 4xx or 5xx server errors.',
    managerImpact: 'Guarantees backend APIs and page assets are healthy.'
  },
  ASSERT_ALL_INVARIANTS: {
    code: 'ASSERT_ALL_INVARIANTS',
    friendlyName: '🛡️ Run All Core Visual & Safety Checks at Once (ASSERT_ALL_INVARIANTS)',
    shortLabel: 'Run All Core Safety Checks',
    plainHint: 'Runs Overlapping Text, Mobile Sideways Bleed, Cut-Off Containers, Blocked Buttons, and Console Crash checks all in parallel!',
    managerImpact: 'One-step comprehensive visual and functional quality gate.'
  },
  ASSERT_NO_BROKEN_IMAGES: {
    code: 'ASSERT_NO_BROKEN_IMAGES',
    friendlyName: '✨ Optional Check: Verify No Broken Images or Icons (ASSERT_NO_BROKEN_IMAGES)',
    shortLabel: 'Check No Broken Images/SVGs',
    plainHint: 'Scans every <img> photo and <svg> icon to ensure none failed to load or collapsed to 0×0 pixels.',
    managerImpact: 'Prevents missing product photos or invisible icons from hurting customer trust.'
  },
  ASSERT_STICKY_BUDGET: {
    code: 'ASSERT_STICKY_BUDGET',
    friendlyName: '✨ Optional Check: Verify Sticky Headers <= 25% of Screen (ASSERT_STICKY_BUDGET)',
    shortLabel: 'Check Sticky Header Height Budget',
    plainHint: 'Checks that floating top headers, promo bars, and cookie banners do not eat up more than 25% of the screen height.',
    managerImpact: 'Ensures mobile and laptop users have plenty of room to actually read your content.'
  },
  ASSERT_DARK_MODE_PARITY: {
    code: 'ASSERT_DARK_MODE_PARITY',
    friendlyName: '✨ Optional Check: Verify Dark Mode Readability (ASSERT_DARK_MODE_PARITY)',
    shortLabel: 'Check Dark Mode Parity',
    plainHint: 'Switches the browser into Dark Mode and checks that no text becomes dark-on-dark or unreadable.',
    managerImpact: 'Protects experience for the 60%+ of mobile and desktop users who use Dark Mode.'
  },
  ASSERT_I18N_EXPANSION: {
    code: 'ASSERT_I18N_EXPANSION',
    friendlyName: '✨ Optional Check: Stress-Test +35% Longer Translated Text (ASSERT_I18N_EXPANSION)',
    shortLabel: 'Check +35% Translation Expansion',
    plainHint: 'Temporarily expands buttons and labels by +35% (simulating German, French, or Indonesian translations) to see if anything clips or collides.',
    managerImpact: 'Ensures your UI will not break when translated into international languages.'
  },
  ASSERT_FORM_ERGONOMICS: {
    code: 'ASSERT_FORM_ERGONOMICS',
    friendlyName: '✨ Optional Check: Verify Form Labels & Mobile Input Ergonomics (ASSERT_FORM_ERGONOMICS)',
    shortLabel: 'Check Form UX & Labels',
    plainHint: 'Checks that every form input has a clear label, browser autofill support, and >= 16px font size on mobile (preventing annoying iOS auto-zoom).',
    managerImpact: 'Makes checkout and signup forms effortless to complete on mobile phones.'
  },
  ASSERT_FONT_HEALTH: {
    code: 'ASSERT_FONT_HEALTH',
    friendlyName: '✨ Optional Check: Verify Web Fonts Loaded Cleanly (ASSERT_FONT_HEALTH)',
    shortLabel: 'Check Web Font Health',
    plainHint: 'Audits custom brand fonts to ensure none failed to download and font-display: swap is configured.',
    managerImpact: 'Prevents invisible text flashes (FOIT) on slower mobile connections.'
  },
  ASSERT_DOM_BUDGET: {
    code: 'ASSERT_DOM_BUDGET',
    friendlyName: '✨ Optional Check: Verify Page Complexity & Speed Budget (ASSERT_DOM_BUDGET)',
    shortLabel: 'Check DOM Complexity Budget',
    plainHint: 'Checks that the page has <= 1,500 HTML elements and <= 32 nesting depth so scrolling and clicks stay fast.',
    managerImpact: 'Keeps the website snappy and responsive even on budget Android phones.'
  },
  ASSERT_FRONTEND_HYGIENE: {
    code: 'ASSERT_FRONTEND_HYGIENE',
    friendlyName: '✨ Optional Check: Verify SEO, Security & Link Hygiene (ASSERT_FRONTEND_HYGIENE)',
    shortLabel: 'Check SEO & Security Hygiene',
    plainHint: 'Verifies page title, meta description, language tag, safe external links (rel="noopener"), and checks for exposed tokens in localStorage.',
    managerImpact: 'Protects Google SEO discoverability and prevents common frontend security leaks.'
  },
  ASSERT_REDUCED_MOTION: {
    code: 'ASSERT_REDUCED_MOTION',
    friendlyName: '✨ Optional Check: Verify Reduced-Motion Safety (ASSERT_REDUCED_MOTION)',
    shortLabel: 'Check Reduced-Motion Safety',
    plainHint: 'Turns on the OS "Reduce Motion" accessibility setting and checks that infinite spinning/bouncing animations pause.',
    managerImpact: 'Protects users with motion sensitivity and vestibular disorders (WCAG 2.3.3).'
  },
  ASSERT_A11Y: {
    code: 'ASSERT_A11Y',
    friendlyName: '✨ Optional Check: Run Full WCAG 2.2 AA Accessibility Audit (ASSERT_A11Y)',
    shortLabel: 'Check WCAG 2.2 AA Accessibility',
    plainHint: 'Runs industry-standard Axe-Core WCAG 2.2 Level AA rules for screen readers, ARIA labels, and semantic HTML.',
    managerImpact: 'Ensures legal accessibility compliance (ADA / EAA / WCAG 2.2 AA) and inclusive UX.'
  },
  SCREENSHOT: {
    code: 'SCREENSHOT',
    friendlyName: '📸 Capture Visual Proof Screenshot (SCREENSHOT)',
    shortLabel: 'Take Proof Screenshot',
    plainHint: 'Takes a high-resolution PNG photo of the current screen and saves it to the Evidence Gallery.',
    managerImpact: 'Provides visual proof for stakeholders and sign-off reports.'
  },
  EXECUTE_SCRIPT: {
    code: 'EXECUTE_SCRIPT',
    friendlyName: '⚙️ Run Custom JavaScript Snippet (EXECUTE_SCRIPT)',
    shortLabel: 'Run Custom JS',
    plainHint: 'Executes a custom JavaScript expression inside the browser tab.',
    managerImpact: 'Allows engineers to seed custom application state when needed.'
  }
};

export function getActionUxMeta(actionCode: string): ActionUxMetadata {
  const upper = (actionCode || 'CLICK').toUpperCase();
  return (
    UAT_ACTION_UX_META[upper] || {
      code: upper,
      friendlyName: upper,
      shortLabel: upper,
      plainHint: `Executes UAT step action ${upper}.`,
      managerImpact: 'Verifies application behavior.'
    }
  );
}

/**
 * Generates a natural-language sentence explaining a UAT step for non-technical managers.
 */
export function describeStepInPlainEnglish(step: UatStep, index: number): string {
  const act = (step.action || 'CLICK').toUpperCase();
  const target = step.selector ? `"${step.selector}"` : 'the page';
  switch (act) {
    case 'GOTO':
      return `Step ${index + 1}: Open the webpage "${step.url || '{{BASE_URL}}'}" in the browser.`;
    case 'CLICK':
      return `Step ${index + 1}: Move mouse naturally and click on ${target}${step.fallbackSelectors?.length ? ` (or backup selector ${step.fallbackSelectors.join(', ')})` : ''}.`;
    case 'DOUBLE_CLICK':
      return `Step ${index + 1}: Rapidly double-click on ${target}.`;
    case 'HOVER':
      return `Step ${index + 1}: Move the mouse cursor over ${target} to trigger hover effects or menus.`;
    case 'TYPE':
      return `Step ${index + 1}: Type "${step.text || ''}" into ${target}${step.pressEnter ? ' and press Enter' : ''}.`;
    case 'WAIT':
      return `Step ${index + 1}: Pause for ${step.waitMs || 1000}ms (${((step.waitMs || 1000) / 1000).toFixed(1)}s) to let the screen settle.`;
    case 'WAIT_FOR':
      return `Step ${index + 1}: Wait until ${target} becomes ${step.state || 'visible'} on screen.`;
    case 'SCROLL':
      return `Step ${index + 1}: Smoothly scroll ${step.direction || 'down'} by ${step.scrollPx || 500} pixels like a real reader.`;
    case 'SET_VIEWPORT':
      return `Step ${index + 1}: Resize browser screen to ${step.width || 390}×${step.height || 844}px (${step.name || 'Responsive Breakpoint'}).`;
    case 'ASSERT_VISIBLE':
      return `Step ${index + 1}: Confirm that ${target} is visibly displayed on the screen.`;
    case 'ASSERT_HIDDEN':
    case 'ASSERT_NOT_VISIBLE':
      return `Step ${index + 1}: Confirm that ${target} is hidden or closed.`;
    case 'ASSERT_TEXT':
      return `Step ${index + 1}: Confirm that ${target} shows the text "${step.text || ''}".`;
    case 'ASSERT_UNOCCLUDED':
      return `Step ${index + 1}: Verify that ${target} is physically clickable and not blocked by any sticky header or popup.`;
    case 'ASSERT_NO_OVERLAP':
      return `Step ${index + 1}: Scan the entire screen to confirm no text titles or labels overlap each other.`;
    case 'ASSERT_NO_BLEED':
      return `Step ${index + 1}: Confirm the mobile screen has zero horizontal overflow or sideways wobble.`;
    case 'ASSERT_NO_CLIPPING':
      return `Step ${index + 1}: Confirm no text, buttons, or prices are accidentally cut off by tight containers.`;
    case 'ASSERT_ALL_INVARIANTS':
      return `Step ${index + 1}: Run all core visual & runtime safety checks (no overlapping text, no mobile wobble, no blocked buttons, zero JS errors).`;
    case 'SCREENSHOT':
      return `Step ${index + 1}: Take a high-resolution proof screenshot${step.name ? ` named "${step.name}"` : ''}.`;
    default: {
      const meta = getActionUxMeta(act);
      return `Step ${index + 1}: ${meta.plainHint}`;
    }
  }
}

export interface ExecutiveSummaryBrief {
  verdictBadge: string;
  headline: string;
  narrative: string;
  recommendation: string;
  highlights: Array<{ label: string; value: string; status: 'good' | 'warn' | 'bad' }>;
}

/**
 * Translates any Studio Run (UAT, Audit, or Suite) into a plain-English Executive Manager Briefing.
 */
export function buildExecutiveSummary(run: StudioRunRecord): ExecutiveSummaryBrief {
  const data = run.summaryData || {};
  const durationSec = ((run.durationMs || data.durationMs || 0) / 1000).toFixed(1);

  if (run.type === 'uat') {
    const totalSteps = data.totalSteps || 0;
    const passedSteps = data.passedSteps || 0;
    const anomaliesCount = (data.anomaliesDetected || []).length;
    const passed = Boolean(run.passed);

    return {
      verdictBadge: passed ? '✅ READY FOR RELEASE' : '🚨 ACTION REQUIRED',
      headline: passed
        ? `User Journey Verified — All ${passedSteps} of ${totalSteps} Steps Succeeded`
        : `User Journey Blocked — ${data.failedSteps || 1} Step(s) Failed During Testing`,
      narrative: passed
        ? `BetterFront simulated a real user completing "${run.name}" on ${data.viewportName || 'target devices'} in ${durationSec} seconds. Every button, form interaction, and visual quality check passed cleanly.`
        : `While testing "${run.name}" on ${data.viewportName || 'target devices'}, a customer-facing step failed after ${durationSec} seconds. Review the highlighted red failure photo and step timeline below to see the exact element that needs attention.`,
      recommendation: passed
        ? anomaliesCount === 0
          ? 'Safe to approve for production deployment. Zero functional or visual defects found.'
          : `Functional flow passed, but ${anomaliesCount} visual/optional warning(s) were noted below for engineering review.`
        : 'Hold deployment until the failing step highlighted in red below is resolved and re-verified.',
      highlights: [
        {
          label: 'Journey Completion',
          value: `${passedSteps}/${totalSteps} Steps Passed`,
          status: passed ? 'good' : 'bad'
        },
        {
          label: 'Visual & UX Warnings',
          value: anomaliesCount === 0 ? '0 Issues (Clean)' : `${anomaliesCount} Flagged`,
          status: anomaliesCount === 0 ? 'good' : 'warn'
        },
        {
          label: 'Customer Speed',
          value: `${durationSec}s Total Flow`,
          status: 'good'
        }
      ]
    };
  }

  if (run.type === 'audit') {
    const score = data.score?.total ?? 0;
    const blockers = data.blockersTriggered?.length || 0;
    const warnings = data.warningsTriggered?.length || 0;
    const passed = Boolean(run.passed);

    return {
      verdictBadge: passed ? '✅ PRODUCTION READY' : '🚨 QUALITY GATE BLOCKED',
      headline: passed
        ? `Overall Frontend Health Score: ${score}/100 — Passed Quality Gate`
        : `Overall Frontend Health Score: ${score}/100 — ${blockers} Critical Blocker(s) Found`,
      narrative: `BetterFront audited "${run.targetUrl}" across ${(data.viewportResults || []).length || 1} screen size(s) in ${durationSec} seconds, checking layout geometry, mobile responsiveness, accessibility contrast, and runtime stability.`,
      recommendation: passed
        ? 'This page meets Gold-Standard visual and ergonomic thresholds.'
        : `Share the "${blockers} Production Blockers" list and Suggested CSS Fixes below with your frontend developer.`,
      highlights: [
        {
          label: 'Health Score Index',
          value: `${score}/100`,
          status: score >= 85 ? 'good' : score >= 70 ? 'warn' : 'bad'
        },
        {
          label: 'Release Blockers',
          value: blockers === 0 ? '0 Blockers' : `${blockers} Critical`,
          status: blockers === 0 ? 'good' : 'bad'
        },
        {
          label: 'Advisory Warnings',
          value: `${warnings} Note(s)`,
          status: warnings === 0 ? 'good' : 'warn'
        }
      ]
    };
  }

  return {
    verdictBadge: run.passed ? '✅ SUITE PASSED' : '🚨 SUITE FAILED',
    headline: `${data.passedScenarios || 0} of ${data.totalScenarios || 0} UAT Workflows Passed`,
    narrative: `Executed multi-workflow UAT suite in ${durationSec} seconds.`,
    recommendation: run.passed
      ? 'All user workflows passed verification.'
      : 'One or more workflows failed verification.',
    highlights: [
      {
        label: 'Suite Completion',
        value: `${data.passedScenarios || 0}/${data.totalScenarios || 0} Flows Passed`,
        status: run.passed ? 'good' : 'bad'
      },
      {
        label: 'Total Steps',
        value: `${data.passedSteps || 0}/${data.totalSteps || 0} Steps`,
        status: run.passed ? 'good' : 'warn'
      },
      {
        label: 'Execution Time',
        value: `${durationSec}s`,
        status: 'good'
      }
    ]
  };
}

/**
 * Generates a formatted Slack / Jira / Email Executive Summary text for 1-click sharing.
 */
export function formatExecutiveReportForClipboard(run: StudioRunRecord): string {
  const brief = buildExecutiveSummary(run);
  const kpiLine = brief.highlights.map((h) => `• ${h.label}: ${h.value}`).join('\n');
  return [
    `🛡️ BetterFront Executive Quality Report — ${brief.verdictBadge}`,
    `Test / Audit: ${run.name}`,
    `Target Website: ${run.targetUrl}`,
    `Headline: ${brief.headline}`,
    '',
    `Summary: ${brief.narrative}`,
    `Recommended Action: ${brief.recommendation}`,
    '',
    kpiLine ? `Key Metrics:\n${kpiLine}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}
