# BetterFront Declarative UAT Scenario Guide & Action Catalog

Welcome to the **BetterFront UAT Scenario Engine**. This directory contains declarative, JSON-driven User Acceptance Testing (UAT) scenarios that simulate realistic human browsing, validate business logic, and enforce visual layout stability without writing brittle test scripts.

Every scenario file in this directory is backed by [`uat-scenario.schema.json`](./uat-scenario.schema.json), providing **instant in-editor autocompletion**, **hover documentation**, and **syntax validation** in VS Code and Antigravity IDE.

---

## 🚀 Quick Start (Zero-Config to Full Customization)

### 0. Zero-Config Auto-UAT (No Test Authoring Required!)
Point BetterFront directly at any live URL (such as Dreamblu on `http://localhost:7777` or any web application). BetterFront automatically inspects the live DOM, discovers topbars, brand lockups, HUD widgets, buttons, and forms, synthesizes a complete UAT workflow, and executes it on the spot:

```bash
# Run zero-config auto-discovered UAT directly against any URL (and optionally save the generated JSON!)
npx betterfront uat http://localhost:7777 --save-scenario ./uat-scenarios/my-auto-uat.json

# Or generate a customizable UAT JSON file from a live URL without executing immediately
npx betterfront uat:generate http://localhost:7777 -o ./uat-scenarios/dreamblu-auto.json

# Or scaffold a full project config + 10 customizable workflow templates in one command
npx betterfront init http://localhost:7777
```

### 1. Run Any of the 10 Built-In Customizable Workflow Templates Out-of-the-Box
You don't need to write tests from scratch—choose from 10 battle-tested workflow templates and override variables on the fly with `--url` and `--var KEY=VALUE`:

```bash
# List all 10 built-in workflow templates and their customizable variables
npx betterfront uat --list-templates

# Run the RPG / Game HUD workflow (Dreamblu ready!) out of the box
npx betterfront uat rpg-game-hud --url http://localhost:7777

# Run the Form Validation & Chaos workflow with custom variable overrides
npx betterfront uat form-validation-chaos --url http://localhost:8912 --var TEST_EMAIL=hero@dreamblu.io --var TEST_NAME="Aria Vanguard"

# Run the 5-Breakpoint Live Responsive Matrix workflow (320px -> 1920px)
npx betterfront uat responsive-breakpoint-matrix --url http://localhost:7777

# Run an entire directory of UAT workflows as a unified suite
npx betterfront uat ./uat-scenarios/templates --url http://localhost:7777
```

| Template ID | Category | What It Tests Out-of-the-Box |
| :--- | :--- | :--- |
| **`universal-smoke`** | Universal | Landmarks, heading, CTA unoccluded hit-target, human scroll, network health & console hygiene. |
| **`rpg-game-hud`** / **`dreamblu-rpg-hud`** | Gaming & HUD | RPG topbar (`header.site-topbar`), brand lockup (`a.brand-lockup`), HUD widgets, hover, clipping & bleed. |
| **`form-validation-chaos`** | Forms & Auth | Typing, clear/refill, `FILL_FORM` synthetic Faker data, submit & feedback verification. |
| **`auth-login-session`** | Forms & Auth | `SET_STORAGE` / `ASSERT_STORAGE` session token seeding, credential typing & login submit. |
| **`ecommerce-checkout`** | E-Commerce & SaaS | Catalog search, Add-to-Cart CTA, `GUEST_CHECKOUT` form auto-fill & network status check. |
| **`navigation-modals-drawers`** | Universal | Navbar traversal, modal trigger click, `Escape` key dismissal & zombie backdrop occlusion check. |
| **`responsive-breakpoint-matrix`** | Responsive & Visual | Live `SET_VIEWPORT` resizes across `320px`, `390px`, `820px`, `1366px`, and `1920px`. |
| **`accessibility-keyboard-ergonomics`** | Accessibility | `Tab` / `Shift+Tab` keyboard focus (`ASSERT_FOCUSED`), WCAG AA contrast & touch target size. |
| **`crud-dashboard-workflow`** | E-Commerce & SaaS | Component counts (`ASSERT_COUNT`), computed CSS (`ASSERT_CSS`) & API network checks (`ASSERT_NETWORK_OK`). |
| **`visual-regression-invariants`** | Responsive & Visual | `ASSERT_ALL_INVARIANTS` (overlap, bleed, clipping, occlusion, console) across scroll positions. |

### 2. In-Editor Autocompletion & Validation
Add `"$schema": "./uat-scenario.schema.json"` at the very top of any scenario JSON file:

```json
{
  "$schema": "./uat-scenario.schema.json",
  "name": "My Custom Feature Flow",
  "description": "Verifies checkout and topbar layout",
  "startUrl": "{{BASE_URL}}",
  "variables": {
    "BASE_URL": "http://localhost:7777",
    "PRIMARY_CTA": "#cta-button"
  },
  "steps": []
}
```

When you type `"action": ""` inside `steps`, your editor will suggest all 38 available actions with full descriptions and documentation.

### 3. Validating a Scenario Before Execution
To instantly check if a scenario has any typos, missing selectors, or invalid fields without launching a browser:

```bash
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --validate-only
```

### 4. Executing a Scenario & Recording Video
```bash
# Standard headless execution
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json

# Record full-motion WebM video and Playwright trace archive of the run
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --video --trace

# Interactive headed mode (watch the browser live on your screen!)
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --headed

# Slow-motion mode (pauses 300ms between actions for visual debugging)
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --headed --slowmo 300

# Override viewport (test on Desktop Full HD or Modern Mobile)
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --viewport desktop_fhd
```

### 5. Interactive Live Action Recording (No Manual JSON Writing!)
Don't want to write JSON by hand? You can record your live clicks, inputs, and navigation directly in the browser:

```bash
# Launch interactive browser recorder
node dist/cli.js record http://localhost:7777 -o ./uat-scenarios/my-recorded-flow.json
```

---

## 📑 Action Quick-Reference Master Table (38 Actions)

| Action | Required Fields | Optional Fields | Description |
| :--- | :--- | :--- | :--- |
| **`GOTO`** | `url` | `timeoutMs` | Navigates to a page (supports absolute URLs, relative paths, and `{{VARIABLES}}`). |
| **`RELOAD`** | *none* | `timeoutMs` | Reloads the current page (useful for testing state persistence). |
| **`SET_VIEWPORT`** | `width`, `height` | `isMobile`, `name` | Dynamically resizes browser viewport mid-scenario to test responsive reflow. |
| **`CLICK`** | `selector` | `fallbackSelectors`, `timeoutMs` | Natural Bézier curve human mouse move and click with fallback. |
| **`DOUBLE_CLICK`** | `selector` | `fallbackSelectors`, `timeoutMs` | Performs a rapid double-click on target element. |
| **`HOVER`** | `selector` | `fallbackSelectors`, `timeoutMs` | Moves cursor along Bézier path to hover (triggers CSS `:hover` and menus). |
| **`TYPE`** | `selector`, `text` | `clearFirst`, `pressEnter`, `delayMs` | Natural cadence typing with optional pre-clearing and Enter key. |
| **`CLEAR`** | `selector` | `timeoutMs` | Empties an `<input>` or `<textarea>` element. |
| **`PRESS_KEY`** | `key` | `selector` | Dispatches keyboard press (e.g. `'Enter'`, `'Escape'`, `'Tab'`, `'Shift+Tab'`). |
| **`SELECT`** | `selector`, `value` or `text` | `timeoutMs` | Selects an option from a native HTML `<select>` dropdown. |
| **`CHECK`** | `selector` | `timeoutMs` | Checks a checkbox or radio button input. |
| **`UNCHECK`** | `selector` | `timeoutMs` | Unchecks a checkbox input. |
| **`SCROLL`** | *none* | `scrollPx`, `direction` | Smooth inertia scroll down or up with human reading pauses. |
| **`SCROLL_TO`** | `selector` | `timeoutMs` | Smoothly scrolls an element into the viewport. |
| **`WAIT`** | *none* | `waitMs` | Explicit pause in milliseconds (default 1000ms). |
| **`WAIT_FOR`** | `selector` | `state`, `timeoutMs` | Waits for element DOM state (`'visible'`, `'hidden'`, `'attached'`, `'detached'`). |
| **`WAIT_FOR_NAV`**| *none* | `url`, `timeoutMs` | Waits for page navigation or URL pattern to complete. |
| **`FILL_FORM`** | *none* | `profile` | Autonomously populates visible inputs (`GUEST_CHECKOUT`, `CONTACT_FORM`, `SIGNUP`, `SEARCH`). |
| **`SET_STORAGE`** | `key` | `value`, `storageType` | Seeds `localStorage` or `sessionStorage` state. |
| **`ASSERT_STORAGE`** | `key` | `value`, `storageType`, `exact` | Asserts `localStorage` or `sessionStorage` item exists and matches value. |
| **`ASSERT_VISIBLE`** | `selector` | `fallbackSelectors`, `timeoutMs` | Asserts element exists and is visually rendered in the viewport. |
| **`ASSERT_HIDDEN`** | `selector` | `timeoutMs` | Asserts element is hidden or detached (e.g. modal closed, loader gone). |
| **`ASSERT_TEXT`** | `selector`, `text` | `exact`, `timeoutMs` | Verifies element text contains expected string (or exact match). |
| **`ASSERT_VALUE`** | `selector`, `value`/`text`| `timeoutMs` | Verifies input field or select dropdown value matches expected. |
| **`ASSERT_ATTRIBUTE`** | `selector`, `attribute` | `value`, `exact` | Asserts HTML/ARIA attribute (e.g. `aria-expanded="true"`, `href`) on element. |
| **`ASSERT_CSS`** | `selector`, `property` | `value`, `exact` | Asserts computed CSS style property (e.g. `display`, `position`) on element. |
| **`ASSERT_FOCUSED`** | *none* | `selector` | Asserts target element (or any interactive control) holds active keyboard focus. |
| **`ASSERT_COUNT`** | `selector`, `count` | `operator` | Asserts count of matching DOM elements (`'equals'`, `'greaterThan'`, `'lessThan'`). |
| **`ASSERT_URL`** | `url` | *none* | Asserts current browser URL contains expected path or pattern. |
| **`ASSERT_TITLE`** | `text` | *none* | Asserts page title contains expected string. |
| **`ASSERT_NO_OVERLAP`**| *none* | *none* | Runs mathematical text-on-text collision detection at this exact step. |
| **`ASSERT_NO_BLEED`** | *none* | *none* | Asserts zero horizontal page overflow on mobile viewports. |
| **`ASSERT_NO_CONSOLE_ERRORS`**| *none*| *none* | Asserts zero unhandled JavaScript exceptions or console errors. |
| **`ASSERT_NETWORK_OK`** | *none* | `urlPattern` | Asserts zero failed (4xx/5xx or aborted) network requests. |
| **`ASSERT_UNOCCLUDED`** | `selector` | `timeoutMs` | Verifies element is physically reachable via hit-testing without sticky navbar/modal occlusion. |
| **`ASSERT_NO_CLIPPING`**| *none* | `selector`, `timeoutMs` | Verifies element or page has zero hidden text truncation/starvation (`scrollHeight > clientHeight`). |
| **`ASSERT_TOUCH_TARGET`**| `selector` | `minPx` (default 44) | Verifies element meets touch target ergonomics ($44\times 44\text{px}$ per Apple HIG / WCAG 2.5.5). |
| **`ASSERT_CONTRAST`** | `selector` | `minRatio` (default 4.5)| Verifies element text contrast ratio meets WCAG AA standards. |
| **`ASSERT_ALL_INVARIANTS`** | *none* | *none* | Runs overlap, mobile bleed, container clipping, interactive occlusion, and console checks all at once. |
| **`SCREENSHOT`** | *none* | `name`, `fullPage` | Captures high-res screenshot to `betterfront-artifacts/screenshots/`. |
| **`EXECUTE_SCRIPT`**| `script` | *none* | Evaluates arbitrary JavaScript expression in page context. |

---

## 🛠️ Detailed Action Reference & JSON Examples

### 1. Navigation & Page Lifecycle

#### `GOTO`
Navigates to an absolute or relative URL. If a relative path is given (e.g. `"/shop"`), it resolves automatically against `startUrl` or `baseUrl`.
```json
{
  "action": "GOTO",
  "url": "http://localhost:7777",
  "description": "Navigate to Dreamblu Fantasy Homepage"
}
```

#### `RELOAD`
Reloads the page to test caching, persistent state (like Redux or LocalStorage), or offline sync.
```json
{
  "action": "RELOAD",
  "description": "Reload page to verify user currency and game state persists"
}
```

#### `WAIT`
Pauses execution for a specified duration in milliseconds.
```json
{
  "action": "WAIT",
  "waitMs": 1500,
  "description": "Wait for chest opening animation to finish"
}
```

#### `WAIT_FOR`
Waits for an element to reach a target state (`visible`, `hidden`, `attached`, or `detached`). Ideal for asynchronous loaders, modals, and dynamic game assets.
```json
{
  "action": "WAIT_FOR",
  "selector": ".modal-rewards",
  "state": "visible",
  "timeoutMs": 12000,
  "description": "Wait up to 12s for quest reward modal to appear"
}
```

---

### 2. User Interactions

#### `CLICK`
Moves the cursor along a natural human Bézier path with micro-tremors and clicks. If kinematics are obstructed, automatically falls back to native locator click.
```json
{
  "action": "CLICK",
  "selector": "button.btn-claim-reward",
  "description": "Click the Claim Reward button"
}
```

#### `DOUBLE_CLICK`
Simulates a rapid double-click on any element.
```json
{
  "action": "DOUBLE_CLICK",
  "selector": ".inventory-slot[data-item-id='402']",
  "description": "Double click weapon item to equip"
}
```

#### `HOVER`
Moves mouse along a natural path to hover over an element. Triggers tooltips, dropdown menus, and interactive RPG HUD card highlights.
```json
{
  "action": "HOVER",
  "selector": "a.brand-lockup",
  "description": "Hover over brand logo to verify glow effect"
}
```

#### `TYPE`
Simulates realistic keystrokes into an input element.
- `clearFirst`: (default `true`) clears input before typing.
- `pressEnter`: (default `false`) presses Enter after finishing.
- `delayMs`: (optional) delay between keystrokes.
```json
{
  "action": "TYPE",
  "selector": "input#player-search",
  "text": "Lancelot",
  "clearFirst": true,
  "pressEnter": true,
  "description": "Search for player character 'Lancelot' and press Enter"
}
```

#### `CLEAR`
Clears text inside an input or textarea element.
```json
{
  "action": "CLEAR",
  "selector": "input#item-qty",
  "description": "Clear item quantity field"
}
```

#### `PRESS_KEY`
Presses any keyboard key (e.g. `'Enter'`, `'Escape'`, `'Tab'`, `'Space'`, `'ArrowDown'`). If `selector` is provided, focuses that element first.
```json
{
  "action": "PRESS_KEY",
  "key": "Escape",
  "description": "Press Escape to close current dialog"
}
```

#### `SELECT`
Selects an option from a `<select>` dropdown by `value` or visible `text`.
```json
{
  "action": "SELECT",
  "selector": "select#party-element",
  "value": "WATER",
  "description": "Select Water element for battle party"
}
```

#### `CHECK` & `UNCHECK`
Checks or unchecks a checkbox or radio button.
```json
{
  "action": "CHECK",
  "selector": "input#auto-battle-toggle",
  "description": "Enable auto-battle mode"
}
```

#### `SCROLL`
Simulates a human scrolling the page with natural inertia and reading pauses.
- `scrollPx`: pixel distance (e.g. 400).
- `direction`: `"down"` (default) or `"up"`.
```json
{
  "action": "SCROLL",
  "scrollPx": 500,
  "direction": "down",
  "description": "Human scroll down through quest banner list"
}
```

#### `SCROLL_TO`
Smoothly scrolls an element directly into the viewport.
```json
{
  "action": "SCROLL_TO",
  "selector": "#raid-boss-section",
  "description": "Scroll down to raid boss encounter section"
}
```

#### `FILL_FORM`
Autonomously detects and fills visible form inputs using realistic synthetic Faker data.
```json
{
  "action": "FILL_FORM",
  "description": "Autonomously populate contact feedback form"
}
```

---

### 3. Assertions & Quality Checks

#### `ASSERT_VISIBLE`
Verifies an element is mounted in the DOM and rendered visibly.
```json
{
  "action": "ASSERT_VISIBLE",
  "selector": "header.site-topbar",
  "description": "Verify topbar navigation is visible"
}
```

#### `ASSERT_HIDDEN` (or `ASSERT_NOT_VISIBLE`)
Verifies an element is hidden or detached (e.g. modal closed, loading spinner dismissed).
```json
{
  "action": "ASSERT_HIDDEN",
  "selector": ".loading-spinner",
  "description": "Verify loading spinner has disappeared"
}
```

#### `ASSERT_TEXT`
Verifies an element contains expected text. Set `"exact": true` for strict equality.
```json
{
  "action": "ASSERT_TEXT",
  "selector": ".currency-crystals .value",
  "text": "3,000",
  "description": "Verify player has 3,000 crystals"
}
```

#### `ASSERT_VALUE`
Verifies an input, textarea, or select field has a specific value.
```json
{
  "action": "ASSERT_VALUE",
  "selector": "input#character-name",
  "value": "Gran",
  "description": "Verify captain name input is 'Gran'"
}
```

#### `ASSERT_COUNT`
Verifies the number of elements matching a selector. Supports `"equals"`, `"greaterThan"`, or `"lessThan"`.
```json
{
  "action": "ASSERT_COUNT",
  "selector": ".party-character-card",
  "count": 4,
  "operator": "equals",
  "description": "Verify exactly 4 character cards are present in battle party"
}
```

#### `ASSERT_URL`
Verifies the current page URL matches or contains an expected string or pattern.
```json
{
  "action": "ASSERT_URL",
  "url": "/quests",
  "description": "Verify user was redirected to /quests"
}
```

#### `ASSERT_TITLE`
Verifies the browser tab title contains expected text.
```json
{
  "action": "ASSERT_TITLE",
  "text": "Dreamblu Fantasy",
  "description": "Verify page title contains 'Dreamblu Fantasy'"
}
```

#### `ASSERT_NO_OVERLAP`
Runs BetterFront's mathematical text collision inspector to ensure zero overlapping text lines or headers.
```json
{
  "action": "ASSERT_NO_OVERLAP",
  "description": "Verify zero text collisions on page"
}
```

#### `ASSERT_NO_BLEED`
Verifies that no content causes horizontal scrolling on mobile viewports (< 430px).
```json
{
  "action": "ASSERT_NO_BLEED",
  "description": "Verify zero mobile horizontal bleed"
}
```

#### `ASSERT_NO_CONSOLE_ERRORS`
Asserts that zero unhandled JavaScript exceptions, uncaught promises, or console errors have fired.
```json
{
  "action": "ASSERT_NO_CONSOLE_ERRORS",
  "description": "Verify zero runtime JavaScript console errors"
}
```

---

### 4. Forensic Evidence & Scripting

#### `SCREENSHOT`
Captures an instant high-resolution screenshot and saves it to `./betterfront-artifacts/screenshots/`.
- `name`: custom filename prefix.
- `fullPage`: (default `false`) if `true`, captures the full scrollable page height.
```json
{
  "action": "SCREENSHOT",
  "name": "dreamblu-home-topbar",
  "fullPage": false,
  "description": "Capture visual screenshot of verified topbar"
}
```

#### `EXECUTE_SCRIPT`
Evaluates a custom JavaScript snippet in the page context.
```json
{
  "action": "EXECUTE_SCRIPT",
  "script": "localStorage.setItem('skipTutorial', 'true');",
  "description": "Set skipTutorial flag in localStorage"
}
```

---

## 🌟 Universal Step Modifiers

Every step supports these optional modifiers:

| Property | Type | Description |
| :--- | :--- | :--- |
| `description` | `string` | Human-readable log line printed in console and reports. |
| `optional` | `boolean` | If `true`, a failure in this step logs a soft warning and **does not stop the scenario**. Perfect for one-time promotional popups or cookie banners! |
| `timeoutMs` | `number` | Overrides the default timeout for this specific step (e.g. `15000` for 15s). |

**Example of an Optional Step:**
```json
{
  "action": "CLICK",
  "selector": "#close-promo-banner",
  "optional": true,
  "timeoutMs": 3000,
  "description": "Dismiss promo popup if present (optional step)"
}
```

---

## 📖 Real-World Recipes

### Recipe 1: Dreamblu Fantasy RPG Topbar & Layout Flow
```json
{
  "$schema": "./uat-scenario.schema.json",
  "name": "Dreamblu Fantasy - Core Homepage & Topbar UAT Flow",
  "description": "Validates the RPG topbar navigation, brand lockup, currency HUD, and responsive layout stability on http://localhost:7777.",
  "startUrl": "http://localhost:7777",
  "viewports": [
    "desktop_fhd",
    "mobile_standard"
  ],
  "anomalyChecks": {
    "textOverlap": true,
    "horizontalBleed": true,
    "consoleExceptions": true
  },
  "steps": [
    {
      "action": "GOTO",
      "url": "http://localhost:7777",
      "description": "1. Navigate to Dreamblu Fantasy Homepage"
    },
    {
      "action": "ASSERT_VISIBLE",
      "selector": "header.site-topbar",
      "description": "2. Verify topbar navigation is visible"
    },
    {
      "action": "ASSERT_VISIBLE",
      "selector": "a.brand-lockup",
      "description": "3. Verify brand lockup logo is visible"
    },
    {
      "action": "HOVER",
      "selector": "a.brand-lockup",
      "description": "4. Hover over brand lockup to trigger visual interactive highlight"
    },
    {
      "action": "SCROLL",
      "scrollPx": 400,
      "description": "5. Human scroll down game interface"
    },
    {
      "action": "ASSERT_NO_BLEED",
      "description": "6. Verify no horizontal viewport bleed on mobile screens"
    },
    {
      "action": "ASSERT_NO_CONSOLE_ERRORS",
      "description": "7. Verify zero unhandled JavaScript console exceptions"
    },
    {
      "action": "SCREENSHOT",
      "name": "dreamblu-homepage-topbar",
      "description": "8. Capture visual evidence screenshot of verified game interface"
    }
  ]
}
```

### Recipe 2: Modal Lifecycle (Open, Assert, Escape, Assert Closed)
```json
{
  "$schema": "./uat-scenario.schema.json",
  "name": "Character Profile Modal Lifecycle",
  "startUrl": "http://localhost:7777",
  "description": "Validates opening and closing character profile modal dialog",
  "steps": [
    {
      "action": "CLICK",
      "selector": "#open-profile-btn",
      "description": "1. Click open profile button"
    },
    {
      "action": "WAIT_FOR",
      "selector": ".modal-character-profile",
      "state": "visible",
      "description": "2. Wait for profile modal to open"
    },
    {
      "action": "ASSERT_TEXT",
      "selector": ".modal-character-profile h2",
      "text": "Character Profile",
      "description": "3. Verify modal title"
    },
    {
      "action": "PRESS_KEY",
      "key": "Escape",
      "description": "4. Press Escape key to dismiss modal"
    },
    {
      "action": "ASSERT_HIDDEN",
      "selector": ".modal-character-profile",
      "description": "5. Verify profile modal closed"
    }
  ]
}
```

---

## 💡 How to Author & Modify Scenarios (Step-by-Step)

1. **Inspect Elements in Browser:**
   - Open your site in Chrome / Edge.
   - Right-click any button or element and select **Inspect**.
   - Use simple, semantic selectors like:
     - IDs: `#cta-button`, `#login-form`
     - Classes: `.site-topbar`, `a.brand-lockup`
     - Data attributes: `[data-testid='inventory-slot']`
2. **Add a Step to the Scenario File:**
   - Open `uat-scenarios/dreamblu-fantasy-uat.json`.
   - Add a new object inside `"steps": [ ... ]`.
   - Autocomplete will provide action choices and field types.
3. **Validate Your Changes:**
   ```bash
   node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --validate-only
   ```
4. **Watch Live in Headed Mode:**
   ```bash
   node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --headed --slowmo 200
   ```
5. **Inspect Screenshots & Evidence:**
   - Captured screenshots are saved in `betterfront-artifacts/screenshots/`.

---

## 🎥 Forensic Error Recording & Exact Problem Capture Setup

When running UAT tests on applications like **Dreamblu Fantasy RPG**, unexpected errors, visual bugs, or state mismatches must be captured with absolute precision. BetterFront provides two flexible ways to configure full-motion recording and exact error forensics:

### 1. Declarative Setup in Scenario JSON (Recommended for CI / Continuous UAT)

You can specify a top-level `"recording"` block directly in your scenario file (e.g. [`uat-scenarios/dreamblu-fantasy-uat.json`](./dreamblu-fantasy-uat.json)):

```json
{
  "$schema": "./uat-scenario.schema.json",
  "name": "Dreamblu Fantasy - Core Homepage & Topbar UAT Flow",
  "startUrl": "http://localhost:7777",
  "recording": {
    "video": true,
    "trace": true,
    "screenshotOnFailure": true,
    "artifactsDir": "./betterfront-artifacts"
  },
  "steps": [ ... ]
}
```

#### Supported `recording` Properties:
- **`video`** (`boolean`, default: `false`): Records full-motion WebM video of the browser session up to completion or failure.
- **`trace`** (`boolean`, default: `false`): Records a Playwright trace archive with network requests, console logs, and step-by-step DOM snapshots.
- **`screenshotOnFailure`** (`boolean`, default: `true`): Automatically snaps high-resolution screenshot and highlights the problematic DOM element when any step fails.
- **`artifactsDir`** (`string`, default: `"./betterfront-artifacts"`): Base folder where failure screenshots, videos, and trace archives are stored.

---

### 2. Manual On-Demand Setup via CLI (Recommended for Ad-Hoc Debugging)

CLI flags always take precedence over scenario JSON settings. You can enable or disable recordings dynamically:

```bash
# Enable full-motion WebM video and Playwright trace archive
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --video --trace

# Watch the browser live in slow-motion while recording video
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --headed --slowmo 300 --video

# Explicitly disable video or trace if enabled in JSON
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --no-video --no-trace

# Custom artifacts directory
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --artifacts-dir ./ci-artifacts/run-104

# Run against a specific viewport override
node dist/cli.js uat ./uat-scenarios/dreamblu-fantasy-uat.json --viewport mobile_standard --video
```

---

### 3. What Happens When an Error is Found?

When an assertion fails (or an element cannot be found/clicked), BetterFront executes an automated forensic triage:

1. **Visual Highlight Injection:**
   BetterFront identifies the failed selector in the live DOM and injects a vivid red bounding outline with glow box-shadow:
   ```css
   outline: 4px solid #ef4444 !important;
   outline-offset: 3px !important;
   box-shadow: 0 0 20px rgba(239, 68, 68, 0.9) !important;
   ```
2. **Exact Problem Snapshot:**
   Captures a high-resolution PNG snapshot saving it to:
   `./betterfront-artifacts/failures/failure_step_<N>_<action>_<viewport>_<timestamp>.png`
3. **Flushes Video Stream:**
   Saves the WebM video recording of everything that occurred right up to the moment of failure in `./betterfront-artifacts/videos/<viewport>/`.
4. **Flushes Playwright Trace:**
   Saves the `.zip` trace archive in `./betterfront-artifacts/trace_uat_<viewport>.zip`.
5. **Interactive Terminal Links:**
   Outputs direct clickable `file:///` links right in your terminal so developers can open the exact problem screenshot in VS Code / Antigravity with a single click:
   ```text
   🚨 FORENSIC FAILURE EVIDENCE & RECORDINGS:
      📸 Exact Problem Snapshot: file:///c:/laragon/www/betterfront/betterfront-artifacts/failures/failure_step_2_assert_text_desktop_fhd_1791865024607.png
         (Failed element highlighted with red boundary glow)
      🎥 Full-Motion Video:      file:///c:/laragon/www/betterfront/betterfront-artifacts/videos/desktop_fhd/page@be5c1.webm
      🎬 Playwright Trace:        file:///c:/laragon/www/betterfront/betterfront-artifacts/trace_uat_desktop_fhd.zip
         🔍 Inspect step-by-step: npx playwright show-trace "./betterfront-artifacts/trace_uat_desktop_fhd.zip"
   ```

---

### 4. How to Inspect Trace Archives & Recordings

1. **Inspect Playwright Trace:**
   Playwright Trace Viewer lets you scrub backwards and forwards through the entire execution timeline, inspecting console logs, network payloads, and DOM trees at every microsecond:
   ```bash
   npx playwright show-trace ./betterfront-artifacts/trace_uat_desktop_fhd.zip
   ```
2. **Watch Video:**
   Open the `.webm` video in any media player (VLC, Chrome, Edge) or embed it directly in GitHub pull requests and Slack issue reports.

