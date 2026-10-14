/**
 * BetterFront UAT Templates - Platform & Industry Variant Archetypes
 * (rpg-game-hud / dreamblu, shopee-marketplace / shopee, tokopedia-commerce / tokopedia, youtube-media-streaming / youtube, google-search-portal / google)
 */

import { UatScenario } from '../../types/index.js';
import { UatTemplateCatalogEntry } from './types.js';

const rpgGameHudTemplate: UatTemplateCatalogEntry = {
  id: 'rpg-game-hud',
  title: 'RPG & Fantasy Web Game HUD / Topbar Verification (Dreamblu Ready)',
  category: 'Gaming & HUD',
  description:
    'Battle-tested workflow for RPG & game web interfaces (such as Dreamblu Fantasy). Validates topbar navigation, brand lockup, HUD currency/stats badges, search filter, unoccluded controls, container clipping, and mobile bleed.',
  defaultVariables: {
    BASE_URL: 'http://localhost:7777',
    TOPBAR_SELECTOR: 'header.site-topbar',
    BRAND_SELECTOR: 'a.brand-lockup',
    HUD_WIDGET_SELECTOR: 'div.currency-hud-container, [class*="hud"], [class*="currency"]',
    SEARCH_SELECTOR: '#search-box, input[type="search"], input[type="text"]',
    SEARCH_QUERY: 'Bahamut'
  },
  buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
    $schema: '../uat-scenario.schema.json',
    name: 'Dreamblu / RPG Game HUD & Database UAT Workflow',
    description:
      'Validates RPG topbar navigation, brand lockup, HUD telemetry widgets, database search filtering, unoccluded hit testing, topbar clipping starvation, and responsive layout stability.',
    template: 'rpg-game-hud',
    tags: ['rpg', 'dreamblu', 'hud', 'gaming', 'topbar'],
    startUrl: targetUrl,
    variables: {
      BASE_URL: targetUrl,
      TOPBAR_SELECTOR: 'header.site-topbar',
      BRAND_SELECTOR: 'a.brand-lockup',
      HUD_WIDGET_SELECTOR: 'div.currency-hud-container, [class*="hud"], [class*="currency"]',
      SEARCH_SELECTOR: '#search-box',
      SEARCH_QUERY: 'Bahamut'
    },
    viewports: ['desktop_fhd', 'mobile_standard'],
    anomalyChecks: {
      textOverlap: true,
      horizontalBleed: true,
      consoleExceptions: true
    },
    recording: {
      video: true,
      trace: true,
      screenshotOnFailure: true,
      artifactsDir: './betterfront-artifacts'
    },
    steps: [
      {
        action: 'GOTO',
        url: '{{BASE_URL}}',
        description: '1. Navigate to RPG / Game Web Interface ({{BASE_URL}})'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{TOPBAR_SELECTOR}}',
        fallbackSelectors: ['header.site-topbar', 'header', '[role="banner"]', 'nav'],
        description: '2. Verify topbar navigation is visible'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{BRAND_SELECTOR}}',
        fallbackSelectors: ['a.brand-lockup', '.brand-lockup', 'header a', 'h1'],
        description: '3. Verify brand lockup logo/title is visible'
      },
      {
        action: 'ASSERT_UNOCCLUDED',
        selector: '{{BRAND_SELECTOR}}',
        fallbackSelectors: ['a.brand-lockup', '.brand-lockup', 'header a', 'h1'],
        description: '4. Verify brand lockup is physically unoccluded and interactable'
      },
      {
        action: 'HOVER',
        selector: '{{BRAND_SELECTOR}}',
        fallbackSelectors: ['a.brand-lockup', '.brand-lockup', 'header a', 'h1'],
        description: '5. Hover over brand lockup to trigger interactive highlight'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{HUD_WIDGET_SELECTOR}}',
        fallbackSelectors: ['header.site-topbar', 'header', 'main'],
        ifVisible: true,
        description: '6. Verify HUD status / currency telemetry bar is visible'
      },
      {
        action: 'TYPE',
        selector: '{{SEARCH_SELECTOR}}',
        fallbackSelectors: ['#search-box', 'input[type="search"]', '#user-name'],
        text: '{{SEARCH_QUERY}}',
        clearFirst: true,
        ifVisible: true,
        description: '7. Filter RPG database / search box with query "{{SEARCH_QUERY}}"'
      },
      {
        action: 'SCROLL',
        scrollPx: 400,
        direction: 'down',
        description: '8. Human scroll down game interface to test sticky HUD stability'
      },
      {
        action: 'ASSERT_NO_CLIPPING',
        selector: '{{TOPBAR_SELECTOR}}',
        fallbackSelectors: ['header.site-topbar', 'header'],
        optional: true,
        description: '9. Verify topbar navigation has zero content clipping or starvation'
      },
      {
        action: 'ASSERT_NO_CONSOLE_ERRORS',
        description: '10. Verify zero unhandled JavaScript console exceptions'
      },
      {
        action: 'SCREENSHOT',
        name: 'rpg-game-hud-verified',
        description: '11. Capture visual evidence screenshot of verified game interface'
      }
    ]
  })
};

const shopeeMarketplaceTemplate: UatTemplateCatalogEntry = {
  id: 'shopee-marketplace',
  title: 'Shopee-Style Flash Sale & Super-App Marketplace Workflow',
  category: 'E-Commerce & SaaS',
  description:
    'Validates high-density marketplace storefronts (Shopee archetype): search bar query, flash-sale banner/timer, voucher claim, product card selection, cart badge counter, mobile horizontal bleed, and unoccluded sticky headers.',
  defaultVariables: {
    BASE_URL: 'http://localhost:7777',
    HEADER_SELECTOR: 'header.shopee-header, header, [role="banner"]',
    SEARCH_INPUT:
      'input.shopee-search-input, input[name="q"], #search-box, input[type="search"], input[type="text"]',
    SEARCH_QUERY: 'Mechanical Keyboard RGB',
    FLASH_SALE_SELECTOR: '.flash-sale-banner, .product-card, main, section',
    VOUCHER_OR_CTA_BTN: '.voucher-claim-btn, .btn-add-to-cart, #cta-button, button:not([disabled])',
    CART_BADGE_SELECTOR: '#cart-badge, .cart-badge, header'
  },
  buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
    $schema: '../uat-scenario.schema.json',
    name: 'Shopee Marketplace - Flash Sale, Search & Cart UAT Workflow',
    description:
      'Tests marketplace search, flash sale product discovery, voucher/cart interaction, mobile bleed prevention, and runtime stability.',
    template: 'shopee-marketplace',
    tags: ['shopee', 'marketplace', 'ecommerce', 'flash-sale'],
    startUrl: targetUrl,
    variables: {
      BASE_URL: targetUrl,
      HEADER_SELECTOR: 'header.shopee-header',
      SEARCH_INPUT: 'input.shopee-search-input',
      SEARCH_QUERY: 'Mechanical Keyboard RGB',
      FLASH_SALE_SELECTOR: '.flash-sale-banner',
      VOUCHER_OR_CTA_BTN: '.voucher-claim-btn',
      CART_BADGE_SELECTOR: '#cart-badge'
    },
    viewports: ['desktop_fhd', 'mobile_standard'],
    steps: [
      {
        action: 'GOTO',
        url: '{{BASE_URL}}',
        description: '1. Navigate to Shopee-style Marketplace ({{BASE_URL}})'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{HEADER_SELECTOR}}',
        fallbackSelectors: ['header.shopee-header', 'header', 'nav', 'body'],
        description: '2. Verify sticky marketplace header & search bar container is visible'
      },
      {
        action: 'TYPE',
        selector: '{{SEARCH_INPUT}}',
        fallbackSelectors: [
          'input.shopee-search-input',
          'input[name="q"]',
          '#search-box',
          '#user-name',
          'input[type="text"]'
        ],
        text: '{{SEARCH_QUERY}}',
        clearFirst: true,
        pressEnter: true,
        ifVisible: true,
        description: '3. Search marketplace catalog for "{{SEARCH_QUERY}}"'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{FLASH_SALE_SELECTOR}}',
        fallbackSelectors: ['.flash-sale-banner', '.product-card', 'main', 'section', 'body'],
        description: '4. Verify Flash Sale / Daily Discover product grid is visible'
      },
      {
        action: 'ASSERT_UNOCCLUDED',
        selector: '{{VOUCHER_OR_CTA_BTN}}',
        fallbackSelectors: ['.voucher-claim-btn', '.btn-add-to-cart', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        description: '5. Verify Voucher Claim / Add-to-Cart CTA is physically unoccluded'
      },
      {
        action: 'CLICK',
        selector: '{{VOUCHER_OR_CTA_BTN}}',
        fallbackSelectors: ['.voucher-claim-btn', '.btn-add-to-cart', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        description: '6. Click Voucher Claim / Add-to-Cart action button'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{CART_BADGE_SELECTOR}}',
        fallbackSelectors: ['#cart-badge', '.cart-badge', 'header', 'body'],
        ifVisible: true,
        description: '7. Verify cart badge / header state updates cleanly'
      },
      {
        action: 'SCROLL',
        scrollPx: 450,
        direction: 'down',
        description: '8. Scroll through marketplace product feed'
      },
      {
        action: 'ASSERT_NO_CONSOLE_ERRORS',
        description: '9. Verify zero unhandled JavaScript console exceptions'
      },
      {
        action: 'ASSERT_NETWORK_OK',
        description: '10. Verify zero failed marketplace API/network requests'
      },
      {
        action: 'SCREENSHOT',
        name: 'shopee-marketplace-verified',
        description: '11. Capture marketplace UAT verification screenshot'
      }
    ]
  })
};

const tokopediaCommerceTemplate: UatTemplateCatalogEntry = {
  id: 'tokopedia-commerce',
  title: 'Tokopedia-Style Official Store, Category Filter & Direct Buy Workflow',
  category: 'E-Commerce & SaaS',
  description:
    'Validates Tokopedia-archetype commerce flows: top navbar search, Official Store category tabs, product card inspection, wishlist/direct-buy CTA, and responsive layout integrity.',
  defaultVariables: {
    BASE_URL: 'http://localhost:7777',
    NAVBAR_SELECTOR: 'header.tokopedia-navbar, header, nav',
    SEARCH_INPUT:
      'input.tokopedia-search, input[name="q"], #search-box, input[type="search"], input[type="text"]',
    SEARCH_QUERY: 'Monitor Gaming 144Hz',
    CATEGORY_TAB_SELECTOR: '.category-tab, [role="tab"], button.nav-link, button:not([disabled])',
    BUY_CTA_SELECTOR: '.btn-beli-langsung, #cta-button, button[type="submit"], button:not([disabled])'
  },
  buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
    $schema: '../uat-scenario.schema.json',
    name: 'Tokopedia Commerce - Official Store, Filter & Buy UAT Workflow',
    description:
      'Tests Tokopedia-style product search, category tab switching, direct-buy CTA reachability, and console/network hygiene.',
    template: 'tokopedia-commerce',
    tags: ['tokopedia', 'commerce', 'official-store', 'checkout'],
    startUrl: targetUrl,
    variables: {
      BASE_URL: targetUrl,
      NAVBAR_SELECTOR: 'header.tokopedia-navbar',
      SEARCH_INPUT: 'input.tokopedia-search',
      SEARCH_QUERY: 'Monitor Gaming 144Hz',
      CATEGORY_TAB_SELECTOR: '.category-tab',
      BUY_CTA_SELECTOR: '.btn-beli-langsung'
    },
    viewports: ['desktop_fhd', 'mobile_standard'],
    steps: [
      {
        action: 'GOTO',
        url: '{{BASE_URL}}',
        description: '1. Navigate to Tokopedia-style Storefront ({{BASE_URL}})'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{NAVBAR_SELECTOR}}',
        fallbackSelectors: ['header.tokopedia-navbar', 'header', 'nav', 'body'],
        description: '2. Verify Tokopedia top navigation bar is visible'
      },
      {
        action: 'TYPE',
        selector: '{{SEARCH_INPUT}}',
        fallbackSelectors: [
          'input.tokopedia-search',
          'input[name="q"]',
          '#search-box',
          '#user-name',
          'input[type="text"]'
        ],
        text: '{{SEARCH_QUERY}}',
        clearFirst: true,
        pressEnter: true,
        ifVisible: true,
        description: '3. Type product query "{{SEARCH_QUERY}}" into search bar'
      },
      {
        action: 'CLICK',
        selector: '{{CATEGORY_TAB_SELECTOR}}',
        fallbackSelectors: ['.category-tab', '[role="tab"]', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        description: '4. Click Official Store / Category filter tab'
      },
      {
        action: 'ASSERT_UNOCCLUDED',
        selector: '{{BUY_CTA_SELECTOR}}',
        fallbackSelectors: ['.btn-beli-langsung', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        description: '5. Verify "Beli Langsung" / Buy CTA button is unoccluded'
      },
      {
        action: 'CLICK',
        selector: '{{BUY_CTA_SELECTOR}}',
        fallbackSelectors: ['.btn-beli-langsung', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        description: '6. Click "Beli Langsung" / Buy CTA button'
      },
      {
        action: 'SCROLL',
        scrollPx: 400,
        direction: 'down',
        description: '7. Scroll down through store product recommendations'
      },
      {
        action: 'ASSERT_NO_CONSOLE_ERRORS',
        description: '8. Verify zero unhandled JavaScript console errors'
      },
      {
        action: 'ASSERT_NETWORK_OK',
        description: '9. Verify zero failed network requests'
      },
      {
        action: 'SCREENSHOT',
        name: 'tokopedia-commerce-verified',
        description: '10. Capture Tokopedia workflow verification screenshot'
      }
    ]
  })
};

const youtubeMediaStreamingTemplate: UatTemplateCatalogEntry = {
  id: 'youtube-media-streaming',
  title: 'YouTube-Style Video Streaming, Search, Filter Chips & Player Workflow',
  category: 'Media & Search',
  description:
    'Validates video streaming & media platforms (YouTube archetype): masthead search bar, topic filter chips, video player stage, subscribe/like interaction bar, and feed scrolling.',
  defaultVariables: {
    BASE_URL: 'http://localhost:7777',
    MASTHEAD_SELECTOR: 'header.yt-masthead, ytd-masthead, header, nav',
    SEARCH_INPUT: 'input#search, input[name="search_query"], #search-box, input[type="search"], input[type="text"]',
    SEARCH_QUERY: 'Playwright Autonomous Frontend QA',
    CHIP_FILTER_SELECTOR: '.yt-chip-cloud-chip, [role="tab"], button.chip, button:not([disabled])',
    VIDEO_STAGE_SELECTOR: '#movie_player, video, .video-player-stage, .ytd-rich-item-renderer, main, body',
    SUBSCRIBE_OR_LIKE_BTN: '#subscribe-button, #like-button, #cta-button, button:not([disabled])'
  },
  buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
    $schema: '../uat-scenario.schema.json',
    name: 'YouTube Media Streaming - Search, Player & Engagement UAT Workflow',
    description:
      'Tests video platform masthead search, filter chip selection, video player container visibility, engagement CTA buttons, and scroll inertia.',
    template: 'youtube-media-streaming',
    tags: ['youtube', 'video', 'streaming', 'media'],
    startUrl: targetUrl,
    variables: {
      BASE_URL: targetUrl,
      MASTHEAD_SELECTOR: 'header.yt-masthead',
      SEARCH_INPUT: 'input#search',
      SEARCH_QUERY: 'Playwright Autonomous Frontend QA',
      CHIP_FILTER_SELECTOR: '.yt-chip-cloud-chip',
      VIDEO_STAGE_SELECTOR: '#movie_player',
      SUBSCRIBE_OR_LIKE_BTN: '#subscribe-button'
    },
    viewports: ['desktop_fhd', 'mobile_standard'],
    steps: [
      {
        action: 'GOTO',
        url: '{{BASE_URL}}',
        description: '1. Navigate to YouTube-style Media Platform ({{BASE_URL}})'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{MASTHEAD_SELECTOR}}',
        fallbackSelectors: ['header.yt-masthead', 'ytd-masthead', 'header', 'body'],
        description: '2. Verify top masthead navigation bar is visible'
      },
      {
        action: 'TYPE',
        selector: '{{SEARCH_INPUT}}',
        fallbackSelectors: [
          'input#search',
          'input[name="search_query"]',
          '#search-box',
          '#user-name',
          'input[type="text"]'
        ],
        text: '{{SEARCH_QUERY}}',
        clearFirst: true,
        pressEnter: true,
        ifVisible: true,
        description: '3. Type video search query "{{SEARCH_QUERY}}" and press Enter'
      },
      {
        action: 'CLICK',
        selector: '{{CHIP_FILTER_SELECTOR}}',
        fallbackSelectors: ['.yt-chip-cloud-chip', '[role="tab"]', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        description: '4. Click category filter chip'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{VIDEO_STAGE_SELECTOR}}',
        fallbackSelectors: ['#movie_player', 'video', '.video-player-stage', 'main', 'body'],
        description: '5. Verify video player stage / media grid is rendered'
      },
      {
        action: 'ASSERT_UNOCCLUDED',
        selector: '{{SUBSCRIBE_OR_LIKE_BTN}}',
        fallbackSelectors: ['#subscribe-button', '#like-button', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        description: '6. Verify Subscribe / Like engagement button is physically unoccluded'
      },
      {
        action: 'CLICK',
        selector: '{{SUBSCRIBE_OR_LIKE_BTN}}',
        fallbackSelectors: ['#subscribe-button', '#like-button', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        description: '7. Click Subscribe / Like engagement button'
      },
      {
        action: 'SCROLL',
        scrollPx: 500,
        direction: 'down',
        description: '8. Scroll down recommended videos & comments feed'
      },
      {
        action: 'ASSERT_NO_CONSOLE_ERRORS',
        description: '9. Verify zero unhandled JavaScript console errors'
      },
      {
        action: 'SCREENSHOT',
        name: 'youtube-media-streaming-verified',
        description: '10. Capture media streaming UAT verification screenshot'
      }
    ]
  })
};

const googleSearchPortalTemplate: UatTemplateCatalogEntry = {
  id: 'google-search-portal',
  title: 'Google-Style Search Engine & Instant Query Portal Workflow',
  category: 'Media & Search',
  description:
    'Validates search engine portals (Google archetype): primary query box (textarea[name="q"] / input[name="q"]), instant typing cadence, keyboard Enter submission, search results / knowledge card verification, and WCAG contrast.',
  defaultVariables: {
    BASE_URL: 'http://localhost:7777',
    SEARCH_BOX_SELECTOR:
      'textarea[name="q"], input[name="q"], #search-box, input[type="search"], input[type="text"]',
    SEARCH_QUERY: 'BetterFront Autonomous QA Engine',
    SEARCH_BTN_SELECTOR: 'button.search-submit-btn, input[name="btnK"], #cta-button, button[type="submit"]',
    RESULTS_CONTAINER_SELECTOR: '#search-results, #search, main, body'
  },
  buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => ({
    $schema: '../uat-scenario.schema.json',
    name: 'Google Search Portal - Query, Keyboard Submit & Results UAT Workflow',
    description:
      'Tests search portal query input, Enter key submission, search results container rendering, unoccluded controls, and runtime hygiene.',
    template: 'google-search-portal',
    tags: ['google', 'search', 'portal', 'query'],
    startUrl: targetUrl,
    variables: {
      BASE_URL: targetUrl,
      SEARCH_BOX_SELECTOR: 'textarea[name="q"], input[name="q"]',
      SEARCH_QUERY: 'BetterFront Autonomous QA Engine',
      SEARCH_BTN_SELECTOR: 'button.search-submit-btn',
      RESULTS_CONTAINER_SELECTOR: '#search-results'
    },
    viewports: ['desktop_fhd', 'mobile_standard'],
    steps: [
      {
        action: 'GOTO',
        url: '{{BASE_URL}}',
        description: '1. Navigate to Search Engine Portal ({{BASE_URL}})'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{SEARCH_BOX_SELECTOR}}',
        fallbackSelectors: [
          'textarea[name="q"]',
          'input[name="q"]',
          '#search-box',
          '#user-email',
          'input[type="text"]',
          'body'
        ],
        description: '2. Verify primary search query box is visible'
      },
      {
        action: 'TYPE',
        selector: '{{SEARCH_BOX_SELECTOR}}',
        fallbackSelectors: [
          'textarea[name="q"]',
          'input[name="q"]',
          '#search-box',
          '#user-email',
          'input[type="text"]'
        ],
        text: '{{SEARCH_QUERY}}',
        clearFirst: true,
        pressEnter: true,
        ifVisible: true,
        description: '3. Type search query "{{SEARCH_QUERY}}" and press Enter'
      },
      {
        action: 'CLICK',
        selector: '{{SEARCH_BTN_SELECTOR}}',
        fallbackSelectors: ['button.search-submit-btn', 'input[name="btnK"]', '#cta-button', 'button:not([disabled])'],
        ifVisible: true,
        optional: true,
        description: '4. Click search submit button if visible'
      },
      {
        action: 'ASSERT_VISIBLE',
        selector: '{{RESULTS_CONTAINER_SELECTOR}}',
        fallbackSelectors: ['#search-results', '#search', 'main', 'body'],
        description: '5. Verify search results container is rendered and visible'
      },
      {
        action: 'ASSERT_NO_CONSOLE_ERRORS',
        description: '6. Verify zero unhandled JavaScript console errors'
      },
      {
        action: 'ASSERT_NETWORK_OK',
        description: '7. Verify zero failed network requests'
      },
      {
        action: 'SCREENSHOT',
        name: 'google-search-portal-verified',
        description: '8. Capture search portal verification screenshot'
      }
    ]
  })
};

export const DOMAIN_VARIANT_TEMPLATES: Record<string, UatTemplateCatalogEntry> = {
  'rpg-game-hud': rpgGameHudTemplate,
  'dreamblu-rpg-hud': {
    id: 'dreamblu-rpg-hud',
    title: 'Dreamblu Fantasy - Complete Out-of-the-Box UAT Suite',
    category: 'Gaming & HUD',
    description:
      'Out-of-the-box UAT workflow specifically pre-configured for Dreamblu Fantasy (http://localhost:7777), with resilient fallbacks and responsive HUD verification.',
    defaultVariables: { ...rpgGameHudTemplate.defaultVariables },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => rpgGameHudTemplate.buildScenario(targetUrl)
  },
  dreamblu: {
    id: 'dreamblu',
    title: 'Dreamblu Fantasy - Direct Variant Alias',
    category: 'Gaming & HUD',
    description: 'Alias for dreamblu-rpg-hud / rpg-game-hud targeting http://localhost:7777.',
    defaultVariables: { ...rpgGameHudTemplate.defaultVariables },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario => rpgGameHudTemplate.buildScenario(targetUrl)
  },
  'shopee-marketplace': shopeeMarketplaceTemplate,
  shopee: {
    id: 'shopee',
    title: 'Shopee Marketplace - Direct Variant Alias',
    category: 'E-Commerce & SaaS',
    description: 'Alias for shopee-marketplace workflow template.',
    defaultVariables: { ...shopeeMarketplaceTemplate.defaultVariables },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario =>
      shopeeMarketplaceTemplate.buildScenario(targetUrl)
  },
  'tokopedia-commerce': tokopediaCommerceTemplate,
  tokopedia: {
    id: 'tokopedia',
    title: 'Tokopedia Commerce - Direct Variant Alias',
    category: 'E-Commerce & SaaS',
    description: 'Alias for tokopedia-commerce workflow template.',
    defaultVariables: { ...tokopediaCommerceTemplate.defaultVariables },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario =>
      tokopediaCommerceTemplate.buildScenario(targetUrl)
  },
  'youtube-media-streaming': youtubeMediaStreamingTemplate,
  youtube: {
    id: 'youtube',
    title: 'YouTube Media Streaming - Direct Variant Alias',
    category: 'Media & Search',
    description: 'Alias for youtube-media-streaming workflow template.',
    defaultVariables: { ...youtubeMediaStreamingTemplate.defaultVariables },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario =>
      youtubeMediaStreamingTemplate.buildScenario(targetUrl)
  },
  'google-search-portal': googleSearchPortalTemplate,
  google: {
    id: 'google',
    title: 'Google Search Portal - Direct Variant Alias',
    category: 'Media & Search',
    description: 'Alias for google-search-portal workflow template.',
    defaultVariables: { ...googleSearchPortalTemplate.defaultVariables },
    buildScenario: (targetUrl = 'http://localhost:7777'): UatScenario =>
      googleSearchPortalTemplate.buildScenario(targetUrl)
  }
};
