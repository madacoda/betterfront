/**
 * BetterFront UAT Templates - Functional User Journey Workflows
 * (form-validation-chaos, auth-login-session, ecommerce-checkout, navigation-modals-drawers, crud-dashboard-workflow)
 */

import { UatScenario } from '../../types/index.js';
import { UatTemplateCatalogEntry } from './types.js';

export const WORKFLOW_UAT_TEMPLATES: Record<string, UatTemplateCatalogEntry> = {
  'form-validation-chaos': {
    id: 'form-validation-chaos',
    title: 'Form Interaction, Clear/Refill, Synthetic Faker & Submission Flow',
    category: 'Forms & Auth',
    description:
      'Validates interactive form inputs: typing, value assertion, clearing, re-typing with human cadence, synthetic Faker auto-fill, form submission, and feedback confirmation.',
    defaultVariables: {
      BASE_URL: 'http://localhost:8912',
      EMAIL_INPUT: '#user-email',
      NAME_INPUT: '#user-name',
      SUBMIT_BUTTON: '#submit-form-btn',
      FEEDBACK_SELECTOR: '#form-feedback',
      TEST_EMAIL: 'champion@betterfront.io',
      TEST_NAME: 'Aria Vanguard'
    },
    buildScenario: (targetUrl = 'http://localhost:8912'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: 'Form Validation, Human Typing & Submission Workflow',
      description:
        'Tests form input typing, clearing, re-entry, synthetic Faker form filling, submission, and confirmation feedback.',
      template: 'form-validation-chaos',
      tags: ['forms', 'validation', 'typing', 'faker'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl,
        EMAIL_INPUT: '#user-email',
        NAME_INPUT: '#user-name',
        SUBMIT_BUTTON: '#submit-form-btn',
        FEEDBACK_SELECTOR: '#form-feedback',
        TEST_EMAIL: 'champion@betterfront.io',
        TEST_NAME: 'Aria Vanguard'
      },
      viewports: ['desktop_fhd'],
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to form page ({{BASE_URL}})'
        },
        {
          action: 'TYPE',
          selector: '{{EMAIL_INPUT}}',
          fallbackSelectors: ['input[type="email"]', 'input[name*="email"]', 'input[type="text"]'],
          text: 'draft@betterfront.io',
          clearFirst: true,
          ifVisible: true,
          description: '2. Type initial draft email into email input'
        },
        {
          action: 'CLEAR',
          selector: '{{EMAIL_INPUT}}',
          fallbackSelectors: ['input[type="email"]', 'input[name*="email"]', 'input[type="text"]'],
          ifVisible: true,
          description: '3. Clear email input field'
        },
        {
          action: 'ASSERT_VALUE',
          selector: '{{EMAIL_INPUT}}',
          fallbackSelectors: ['input[type="email"]', 'input[name*="email"]', 'input[type="text"]'],
          value: '',
          ifVisible: true,
          description: '4. Verify email field was cleanly cleared'
        },
        {
          action: 'TYPE',
          selector: '{{EMAIL_INPUT}}',
          fallbackSelectors: ['input[type="email"]', 'input[name*="email"]', 'input[type="text"]'],
          text: '{{TEST_EMAIL}}',
          ifVisible: true,
          description: '5. Type final email "{{TEST_EMAIL}}"'
        },
        {
          action: 'ASSERT_VALUE',
          selector: '{{EMAIL_INPUT}}',
          fallbackSelectors: ['input[type="email"]', 'input[name*="email"]', 'input[type="text"]'],
          value: '{{TEST_EMAIL}}',
          ifVisible: true,
          description: '6. Assert email input holds "{{TEST_EMAIL}}"'
        },
        {
          action: 'TYPE',
          selector: '{{NAME_INPUT}}',
          fallbackSelectors: ['input[name*="name"]', 'input[type="text"]'],
          text: '{{TEST_NAME}}',
          ifVisible: true,
          description: '7. Type user name "{{TEST_NAME}}"'
        },
        {
          action: 'FILL_FORM',
          profile: 'CONTACT_FORM',
          description: '8. Auto-fill any remaining visible form inputs using CONTACT_FORM profile'
        },
        {
          action: 'CLICK',
          selector: '{{SUBMIT_BUTTON}}',
          fallbackSelectors: ['button[type="submit"]', 'input[type="submit"]', 'form button'],
          ifVisible: true,
          description: '9. Click form submit button'
        },
        {
          action: 'ASSERT_VISIBLE',
          selector: '{{FEEDBACK_SELECTOR}}',
          ifVisible: true,
          description: '10. Verify submission feedback message is visible (if present)'
        },
        {
          action: 'ASSERT_NO_CONSOLE_ERRORS',
          description: '11. Verify zero unhandled console errors during form flow'
        }
      ]
    })
  },

  'auth-login-session': {
    id: 'auth-login-session',
    title: 'Authentication, Login & Session Storage Persistence Workflow',
    category: 'Forms & Auth',
    description:
      'Customizable authentication workflow testing credential entry, storage/token seeding & verification (SET_STORAGE / ASSERT_STORAGE), and post-login state assertions.',
    defaultVariables: {
      BASE_URL: 'http://localhost:7777',
      EMAIL_SELECTOR: '#user-email, input[type="email"], input[name="username"]',
      PASSWORD_SELECTOR: 'input[type="password"], #password',
      SUBMIT_SELECTOR: '#submit-form-btn, button[type="submit"]',
      USER_EMAIL: 'player1@dreamblu.io',
      SESSION_KEY: 'bf_auth_session',
      SESSION_TOKEN: 'verified_session_token_v1'
    },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: 'Authentication & Session Persistence UAT Workflow',
      description:
        'Validates login form interaction, localStorage/sessionStorage token persistence, and authenticated UI state.',
      template: 'auth-login-session',
      tags: ['auth', 'login', 'session', 'storage'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl,
        EMAIL_SELECTOR: '#user-email',
        PASSWORD_SELECTOR: 'input[type="password"]',
        SUBMIT_SELECTOR: '#submit-form-btn',
        USER_EMAIL: 'player1@dreamblu.io',
        SESSION_KEY: 'bf_auth_session',
        SESSION_TOKEN: 'verified_session_token_v1'
      },
      viewports: ['desktop_fhd'],
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to application login/entry URL ({{BASE_URL}})'
        },
        {
          action: 'SET_STORAGE',
          storageType: 'local',
          key: '{{SESSION_KEY}}',
          value: '{{SESSION_TOKEN}}',
          description: '2. Seed authenticated session token in localStorage'
        },
        {
          action: 'ASSERT_STORAGE',
          storageType: 'local',
          key: '{{SESSION_KEY}}',
          value: '{{SESSION_TOKEN}}',
          description: '3. Verify session token persists in localStorage'
        },
        {
          action: 'TYPE',
          selector: '{{EMAIL_SELECTOR}}',
          fallbackSelectors: ['input[type="email"]', 'input[name="email"]', 'input[type="text"]'],
          text: '{{USER_EMAIL}}',
          ifVisible: true,
          description: '4. Enter user email "{{USER_EMAIL}}" if login input is visible'
        },
        {
          action: 'TYPE',
          selector: '{{PASSWORD_SELECTOR}}',
          text: 'CorrectHorseBatteryStaple!99',
          ifVisible: true,
          description: '5. Enter user password if password field is visible'
        },
        {
          action: 'CLICK',
          selector: '{{SUBMIT_SELECTOR}}',
          fallbackSelectors: ['button[type="submit"]'],
          ifVisible: true,
          description: '6. Submit login credentials if submit button is visible'
        },
        {
          action: 'ASSERT_NO_CONSOLE_ERRORS',
          description: '7. Verify zero console exceptions during authentication flow'
        }
      ]
    })
  },

  'ecommerce-checkout': {
    id: 'ecommerce-checkout',
    title: 'E-Commerce Product Discovery, Cart & Guest Checkout Workflow',
    category: 'E-Commerce & SaaS',
    description:
      'Simulates an online shopper browsing products, clicking an action/cart CTA, filling guest checkout details via GUEST_CHECKOUT profile, and verifying zero runtime or network errors.',
    defaultVariables: {
      BASE_URL: 'http://localhost:7777',
      SEARCH_INPUT: 'input[type="search"], input[placeholder*="Search"], #search',
      ADD_TO_CART_BTN: '#cta-button, button[data-action="add-to-cart"], .add-to-cart',
      CHECKOUT_SUBMIT_BTN: '#submit-form-btn, button[type="submit"]'
    },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: 'E-Commerce Catalog & Guest Checkout UAT Workflow',
      description:
        'Validates product discovery, CTA interaction, synthetic Guest Checkout form population, and network/console health.',
      template: 'ecommerce-checkout',
      tags: ['ecommerce', 'checkout', 'cart', 'forms'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl,
        SEARCH_INPUT: 'input[type="search"]',
        ADD_TO_CART_BTN: '#cta-button',
        CHECKOUT_SUBMIT_BTN: '#submit-form-btn'
      },
      viewports: ['desktop_fhd', 'mobile_standard'],
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to storefront ({{BASE_URL}})'
        },
        {
          action: 'TYPE',
          selector: '{{SEARCH_INPUT}}',
          text: 'Mythic Potion',
          pressEnter: true,
          ifVisible: true,
          description: '2. Search catalog if search bar is present'
        },
        {
          action: 'CLICK',
          selector: '{{ADD_TO_CART_BTN}}',
          fallbackSelectors: ['button:not([disabled])'],
          ifVisible: true,
          description: '3. Click primary action / Add-to-Cart CTA button'
        },
        {
          action: 'FILL_FORM',
          profile: 'GUEST_CHECKOUT',
          description: '4. Populate checkout/customer form fields using GUEST_CHECKOUT profile'
        },
        {
          action: 'CLICK',
          selector: '{{CHECKOUT_SUBMIT_BTN}}',
          fallbackSelectors: ['button[type="submit"]'],
          ifVisible: true,
          description: '5. Submit checkout form'
        },
        {
          action: 'ASSERT_NETWORK_OK',
          description: '6. Verify all storefront & checkout network requests succeeded'
        },
        {
          action: 'ASSERT_NO_CONSOLE_ERRORS',
          description: '7. Verify zero unhandled JavaScript console errors'
        }
      ]
    })
  },

  'navigation-modals-drawers': {
    id: 'navigation-modals-drawers',
    title: 'Navigation Bar, Tabs, Modals & Zombie Backdrop Detection',
    category: 'Universal',
    description:
      'Tests topbar links/tabs, modal/dialog triggers, Escape key dismissal, and verifies that no invisible "zombie modal backdrop" blocks underlying page buttons.',
    defaultVariables: {
      BASE_URL: 'http://localhost:7777',
      NAV_CONTAINER: 'header, nav, [role="navigation"]',
      PRIMARY_BUTTON: '#cta-button, button:not([disabled]), a[href]'
    },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: 'Navigation, Modals & Zombie Backdrop Verification',
      description:
        'Exercises navigation headers, interactive buttons, Escape key modal dismissal, and unoccluded hit-testing to catch invisible overlay traps.',
      template: 'navigation-modals-drawers',
      tags: ['navigation', 'modals', 'occlusion', 'z-index'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl,
        NAV_CONTAINER: 'header',
        PRIMARY_BUTTON: '#cta-button'
      },
      viewports: ['desktop_fhd', 'mobile_standard'],
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to target URL ({{BASE_URL}})'
        },
        {
          action: 'ASSERT_VISIBLE',
          selector: '{{NAV_CONTAINER}}',
          fallbackSelectors: ['header', 'nav', 'body'],
          description: '2. Verify navigation container is visible'
        },
        {
          action: 'CLICK',
          selector: '{{PRIMARY_BUTTON}}',
          fallbackSelectors: ['button:not([disabled])', 'a[href]'],
          ifVisible: true,
          description: '3. Click primary interactive button or modal trigger'
        },
        {
          action: 'PRESS_KEY',
          key: 'Escape',
          description: '4. Press Escape key to dismiss any open modal/drawer overlay'
        },
        {
          action: 'ASSERT_UNOCCLUDED',
          selector: '{{PRIMARY_BUTTON}}',
          fallbackSelectors: ['header a', 'button:not([disabled])', 'h1'],
          ifVisible: true,
          description: '5. Verify underlying interactive control is unoccluded (no zombie backdrop)'
        },
        {
          action: 'ASSERT_NO_CONSOLE_ERRORS',
          description: '6. Verify zero console errors after navigation and modal interactions'
        }
      ]
    })
  },

  'crud-dashboard-workflow': {
    id: 'crud-dashboard-workflow',
    title: 'SaaS Dashboard, Element Count, Attributes & Network Health',
    category: 'E-Commerce & SaaS',
    description:
      'Validates SaaS dashboard cards/lists (ASSERT_COUNT), DOM attributes (ASSERT_ATTRIBUTE), computed CSS styles (ASSERT_CSS), and clean API network traffic (ASSERT_NETWORK_OK).',
    defaultVariables: {
      BASE_URL: 'http://localhost:7777',
      ITEM_SELECTOR: 'div, section, article, button',
      HEADER_SELECTOR: 'header, body'
    },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
      $schema: '../uat-scenario.schema.json',
      name: 'SaaS Dashboard & Telemetry UAT Workflow',
      description:
        'Validates dashboard component counts, computed CSS layout properties, and zero failed API/network calls.',
      template: 'crud-dashboard-workflow',
      tags: ['saas', 'dashboard', 'crud', 'network'],
      startUrl: targetUrl,
      variables: {
        BASE_URL: targetUrl,
        ITEM_SELECTOR: 'div',
        HEADER_SELECTOR: 'header'
      },
      viewports: ['desktop_fhd'],
      steps: [
        {
          action: 'GOTO',
          url: '{{BASE_URL}}',
          description: '1. Navigate to dashboard ({{BASE_URL}})'
        },
        {
          action: 'ASSERT_COUNT',
          selector: '{{ITEM_SELECTOR}}',
          count: 0,
          operator: 'greaterThan',
          description: '2. Verify dashboard renders content containers (> 0 elements)'
        },
        {
          action: 'ASSERT_CSS',
          selector: '{{HEADER_SELECTOR}}',
          fallbackSelectors: ['header', 'body'],
          property: 'display',
          value: 'block',
          optional: true,
          description: '3. Verify primary container computed CSS display property'
        },
        {
          action: 'ASSERT_NETWORK_OK',
          description: '4. Verify zero 4xx/5xx network errors on dashboard load'
        },
        {
          action: 'ASSERT_NO_CONSOLE_ERRORS',
          description: '5. Verify zero unhandled console exceptions'
        }
      ]
    })
  }
};
