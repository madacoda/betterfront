/**
 * Realistic Multi-Variant Web Application Showcase Server
 * Provides interactive, high-fidelity web application archetypes for:
 * - /dreamblu  (RPG Fantasy Wiki, Topbar, Brand Lockup, Currency HUD & Search)
 * - /shopee    (Flash-Sale Marketplace, Search Bar, Voucher Claim & Cart Badge)
 * - /tokopedia (Official Store Commerce, Category Tabs, Filter & Direct Buy)
 * - /youtube   (Video Streaming Masthead, Search, Filter Chips, Video Stage & Subscribe/Like)
 * - /google    (Search Engine Portal, Instant Query Input, Submit & Knowledge Card Results)
 */

export const VARIANT_HTML_PAGES = {
  '/dreamblu': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dreamblu Fantasy Database</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; min-height: 140vh; }
    header.site-topbar {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px; background: #1e293b; border-bottom: 1px solid #334155;
    }
    a.brand-lockup {
      display: inline-flex; align-items: center; gap: 10px;
      min-height: 44px; padding: 8px 14px;
      color: #38bdf8; font-weight: 800; font-size: 18px; text-decoration: none;
      border-radius: 8px; background: #0f172a;
    }
    a.brand-lockup:hover { background: #1e3a8a; color: #ffffff; }
    .currency-hud-container {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 16px; background: #0f172a; border: 1px solid #475569; border-radius: 999px;
      font-weight: 700; color: #fde047;
    }
    main { max-width: 1100px; margin: 0 auto; padding: 32px 20px; }
    h1.home-hero-title { font-size: 32px; color: #ffffff; margin-bottom: 16px; line-height: 1.3; }
    .search-panel { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
    #search-box {
      flex: 1; min-width: 220px; min-height: 46px; padding: 10px 16px;
      border-radius: 8px; border: 1px solid #64748b; background: #1e293b; color: #ffffff; font-size: 16px;
    }
    button.rpg-action-btn {
      min-width: 120px; min-height: 46px; padding: 10px 20px;
      background: #2563eb; color: #ffffff; border: none; border-radius: 8px;
      font-weight: 700; font-size: 15px; cursor: pointer;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { padding: 20px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; }
    .card h2 { font-size: 18px; color: #f8fafc; margin-bottom: 8px; }
    .card p { font-size: 14px; color: #cbd5e1; line-height: 1.5; }
  </style>
</head>
<body>
  <header class="site-topbar">
    <a href="/dreamblu" class="brand-lockup shrink-0">⚔️ Dreamblu Fantasy</a>
    <div class="currency-hud-container flex" data-testid="currency-hud">
      <span>💎 12.5K</span>
      <span>🪙 4500</span>
    </div>
  </header>
  <main>
    <h1 class="home-hero-title">Dreamblu Fantasy<br/>Wiki &amp; Database</h1>
    <div class="search-panel">
      <input id="search-box" type="search" name="q" placeholder="Search summons, weapons, characters..." />
      <button id="cta-button" class="rpg-action-btn" type="button" onclick="document.getElementById('status-msg').textContent = 'Filtered: ' + document.getElementById('search-box').value">Search Wiki</button>
    </div>
    <p id="status-msg" style="margin-bottom: 16px; color: #38bdf8; font-weight: 600;">Showing All SSR Entries</p>
    <div class="grid">
      <article class="card"><h2>Proto Bahamut</h2><p>Sky-shattering primordial dragon summon with party-wide ATK boost.</p></article>
      <article class="card"><h2>Lucifer (Grand)</h2><p>Supreme primarch of light granting HP recovery and elemental mastery.</p></article>
      <article class="card"><h2>Sword of Renown</h2><p>SSR Wind Element blade forged for frontline raid captains.</p></article>
    </div>
  </main>
</body>
</html>`,

  '/shopee': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shopee Super Marketplace - Flash Sale &amp; Daily Vouchers</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; min-height: 140vh; }
    header.shopee-header {
      position: sticky; top: 0; z-index: 40;
      background: #9a3412; color: #ffffff; padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
    }
    .brand { font-size: 20px; font-weight: 800; color: #ffffff; text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    .search-wrap { display: flex; flex: 1; min-width: 200px; gap: 8px; }
    input.shopee-search-input {
      flex: 1; min-height: 44px; padding: 8px 14px; border-radius: 6px; border: none; font-size: 15px; color: #0f172a; background: #ffffff;
    }
    #cart-badge {
      min-width: 48px; min-height: 44px; padding: 8px 14px;
      background: #7c2d12; color: #ffffff; border-radius: 8px; font-weight: 700; display: inline-flex; align-items: center;
    }
    main { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 26px; color: #0f172a; margin-bottom: 16px; }
    .flash-sale-banner {
      background: #ffffff; border: 2px solid #ea580c; border-radius: 12px; padding: 20px; margin-bottom: 24px;
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
    }
    .voucher-claim-btn, .btn-add-to-cart {
      min-width: 140px; min-height: 46px; padding: 10px 18px;
      background: #9a3412; color: #ffffff; border: none; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer;
    }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .product-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; }
    .product-card h2 { font-size: 16px; color: #0f172a; margin-bottom: 8px; }
    .price { font-size: 18px; font-weight: 800; color: #9a3412; margin-bottom: 12px; }
  </style>
</head>
<body>
  <header class="shopee-header">
    <a href="/shopee" class="brand">🛍️ Shopee Mall</a>
    <div class="search-wrap">
      <input class="shopee-search-input" name="q" type="search" placeholder="Search Flash Sale deals &amp; vouchers..." />
    </div>
    <div id="cart-badge" role="status">🛒 Cart: <span id="cart-count">1</span></div>
  </header>
  <main>
    <h1>⚡ 10.10 Super Flash Sale Live</h1>
    <section class="flash-sale-banner">
      <div>
        <h2 style="font-size: 20px; color: #0f172a; margin-bottom: 4px;">50% Off Cashback Voucher + Free Shipping</h2>
        <p style="color: #334155;">Limited-time sitewide marketplace voucher</p>
      </div>
      <button type="button" class="voucher-claim-btn" id="cta-button" onclick="document.getElementById('cart-count').textContent = '2'; this.textContent = 'Voucher Claimed ✓'">Claim Voucher</button>
    </section>
    <div class="product-grid">
      <article class="product-card">
        <h2>Mechanical Keyboard RGB Hot-Swap</h2>
        <div class="price">Rp 459.000</div>
        <button type="button" class="btn-add-to-cart" onclick="document.getElementById('cart-count').textContent = '3'">Add to Cart</button>
      </article>
      <article class="product-card">
        <h2>Ultra-Light Wireless Gaming Mouse</h2>
        <div class="price">Rp 329.000</div>
        <button type="button" class="btn-add-to-cart" onclick="document.getElementById('cart-count').textContent = '3'">Add to Cart</button>
      </article>
    </div>
  </main>
</body>
</html>`,

  '/tokopedia': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tokopedia Official Store - Belanja Online Aman &amp; Nyaman</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; min-height: 140vh; }
    header.tokopedia-navbar {
      position: sticky; top: 0; z-index: 40;
      background: #14532d; color: #ffffff; padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
    }
    .logo { font-size: 20px; font-weight: 800; color: #ffffff; text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    input.tokopedia-search {
      flex: 1; min-width: 200px; min-height: 44px; padding: 8px 14px; border-radius: 8px; border: none; font-size: 15px; color: #0f172a; background: #ffffff;
    }
    main { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 26px; color: #0f172a; margin-bottom: 16px; }
    .tabs { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .category-tab {
      min-width: 120px; min-height: 44px; padding: 10px 18px;
      background: #ffffff; color: #14532d; border: 2px solid #14532d; border-radius: 999px;
      font-weight: 700; cursor: pointer;
    }
    .product-item-card {
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 16px;
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
    }
    .btn-beli-langsung {
      min-width: 150px; min-height: 46px; padding: 10px 20px;
      background: #14532d; color: #ffffff; border: none; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer;
    }
  </style>
</head>
<body>
  <header class="tokopedia-navbar">
    <a href="/tokopedia" class="logo">🟢 Tokopedia Official</a>
    <input class="tokopedia-search" name="q" type="search" placeholder="Cari di Tokopedia Official Store..." />
  </header>
  <main>
    <h1>Tokopedia Official Store Deals</h1>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" class="category-tab" onclick="this.style.background='#dcfce7'">Official Store</button>
      <button type="button" role="tab" class="category-tab" onclick="this.style.background='#dcfce7'">Bebas Ongkir</button>
    </div>
    <article class="product-item-card">
      <div>
        <h2 style="font-size: 18px; color: #0f172a; margin-bottom: 6px;">Monitor Gaming 144Hz IPS 27 Inch HDR</h2>
        <p style="color: #14532d; font-weight: 800; font-size: 18px;">Rp 2.499.000</p>
      </div>
      <button type="button" id="cta-button" class="btn-beli-langsung" onclick="this.textContent = 'Added to Checkout ✓'">Beli Langsung</button>
    </article>
  </main>
</body>
</html>`,

  '/youtube': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YouTube - Broadcast &amp; Stream Tech Channels</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #f1f1f1; min-height: 140vh; }
    header.yt-masthead {
      position: sticky; top: 0; z-index: 50;
      background: #0f0f0f; border-bottom: 1px solid #272727; padding: 12px 20px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .yt-logo { font-size: 20px; font-weight: 800; color: #ffffff; text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    input#search {
      flex: 1; min-width: 200px; min-height: 44px; padding: 8px 16px;
      background: #121212; border: 1px solid #3f3f3f; border-radius: 999px; color: #ffffff; font-size: 15px;
    }
    main { max-width: 1100px; margin: 0 auto; padding: 20px 16px; }
    .chips { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .yt-chip-cloud-chip {
      min-height: 44px; padding: 8px 16px; border-radius: 8px;
      background: #272727; color: #f1f1f1; border: none; font-weight: 600; cursor: pointer;
    }
    #movie_player {
      width: 100%; height: 320px; background: #1e293b; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
      border: 1px solid #334155;
    }
    h1 { font-size: 22px; color: #ffffff; margin-bottom: 12px; }
    .action-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    #subscribe-button, #like-button {
      min-width: 120px; min-height: 44px; padding: 10px 20px; border-radius: 999px;
      background: #f1f1f1; color: #0f0f0f; border: none; font-weight: 700; font-size: 14px; cursor: pointer;
    }
  </style>
</head>
<body>
  <header class="yt-masthead">
    <a href="/youtube" class="yt-logo">▶️ YouTube Studio</a>
    <input id="search" name="search_query" type="search" placeholder="Search videos, channels, live streams..." />
  </header>
  <main>
    <div class="chips" role="tablist">
      <button type="button" role="tab" class="yt-chip-cloud-chip">All Videos</button>
      <button type="button" role="tab" class="yt-chip-cloud-chip">Automated QA</button>
      <button type="button" role="tab" class="yt-chip-cloud-chip">Web Engineering</button>
    </div>
    <div id="movie_player" class="video-player-stage">
      <span style="font-size: 20px; font-weight: 700; color: #ffffff;">🎬 HD 60FPS Stream Player Active</span>
    </div>
    <h1>Autonomous Visual QA &amp; Production Readiness Deep Dive</h1>
    <div class="action-bar">
      <button type="button" id="subscribe-button" onclick="this.textContent = 'Subscribed 🔔'">Subscribe</button>
      <button type="button" id="like-button" onclick="this.textContent = '👍 14.2K'">👍 14.1K</button>
    </div>
  </main>
</body>
</html>`,

  '/google': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Google Search Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #ffffff; color: #0f172a; min-height: 140vh; }
    header.google-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; border-bottom: 1px solid #e2e8f0;
    }
    .brand { font-size: 22px; font-weight: 800; color: #1e3a8a; text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    main { max-width: 860px; margin: 0 auto; padding: 32px 20px; }
    h1 { font-size: 28px; color: #0f172a; margin-bottom: 20px; }
    .search-box-wrap { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
    input[name="q"] {
      flex: 1; min-width: 220px; min-height: 48px; padding: 10px 18px;
      border-radius: 999px; border: 2px solid #475569; font-size: 16px; color: #0f172a;
    }
    button.search-submit-btn {
      min-width: 130px; min-height: 48px; padding: 10px 22px;
      border-radius: 999px; background: #1e3a8a; color: #ffffff; border: none; font-weight: 700; font-size: 15px; cursor: pointer;
    }
    #search-results { display: flex; flex-direction: column; gap: 16px; }
    .g-result-card { padding: 18px; border: 1px solid #cbd5e1; border-radius: 12px; background: #f8fafc; }
    .g-result-card h2 { font-size: 18px; color: #1e3a8a; margin-bottom: 6px; }
    .g-result-card p { font-size: 14px; color: #334155; line-height: 1.5; }
  </style>
</head>
<body>
  <header class="google-nav">
    <a href="/google" class="brand">🔍 Google Search</a>
  </header>
  <main>
    <h1>Instant Knowledge &amp; Web Search</h1>
    <div class="search-box-wrap">
      <input name="q" id="search-box" type="search" placeholder="Search the web or type a URL..." />
      <button type="button" id="cta-button" class="search-submit-btn" onclick="document.getElementById('query-echo').textContent = 'Results for: ' + document.getElementById('search-box').value">Google Search</button>
    </div>
    <p id="query-echo" style="font-weight: 700; color: #0f172a; margin-bottom: 16px;">Top Verified Results</p>
    <section id="search-results">
      <article class="g-result-card">
        <h2>BetterFront — Autonomous Frontend QA &amp; Production Readiness Engine</h2>
        <p>Gold-standard visual layout geometry, Fitts's Law human kinematics, and zero-config UAT workflows.</p>
      </article>
      <article class="g-result-card">
        <h2>WCAG 2.1 AA Accessibility &amp; Core Web Vitals Specification</h2>
        <p>Comprehensive standards for color contrast, 44x44px touch targets, and Cumulative Layout Shift (CLS).</p>
      </article>
    </section>
  </main>
</body>
</html>`
};
