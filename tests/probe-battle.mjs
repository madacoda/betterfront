import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('Logging in...');
  await page.goto('http://localhost:7777/', { waitUntil: 'networkidle' });
  await page.locator('button.save-button').click();
  await page.waitForTimeout(400);
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'Password123');
  await page.click('button:has-text("SIGN IN TO ACCOUNT")');
  await page.waitForTimeout(2000);

  console.log('Navigating to Battle V2...');
  await page.goto('http://localhost:7777/battle-v2', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check initial state
  console.log('\n--- TESTING PAUSE / RESUME ---');
  const pauseBtn = page.locator('button:has-text("PAUSE"), button:has-text("RESUME")').first();
  console.log('Initial pause button text:', await pauseBtn.innerText());
  await pauseBtn.click();
  await page.waitForTimeout(500);
  console.log('After click pause button text:', await pauseBtn.innerText());
  await pauseBtn.click();
  await page.waitForTimeout(500);
  console.log('After resume button text:', await pauseBtn.innerText());

  // Check speed toggle
  console.log('\n--- TESTING SPEED TOGGLE ---');
  const speedBtn = page.locator('button:has-text("SPEED:")').first();
  console.log('Initial speed button text:', await speedBtn.innerText());
  await speedBtn.click();
  await page.waitForTimeout(500);
  console.log('After 1st click speed button text:', await speedBtn.innerText());
  await speedBtn.click();
  await page.waitForTimeout(500);
  console.log('After 2nd click speed button text:', await speedBtn.innerText());

  // Check Auto combat toggle
  console.log('\n--- TESTING AUTO COMBAT TOGGLE ---');
  const autoBtn = page.locator('button:has-text("AUTO COMBAT:")').first();
  console.log('Initial auto combat button text:', await autoBtn.innerText());
  await autoBtn.click();
  await page.waitForTimeout(500);
  console.log('After click auto combat button text:', await autoBtn.innerText());
  await autoBtn.click();
  await page.waitForTimeout(500);
  console.log('Restored auto combat button text:', await autoBtn.innerText());

  // Check combat running over 5 seconds
  console.log('\n--- TESTING REAL COMBAT TICKS (5s) ---');
  await page.waitForTimeout(5000);
  const heroButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button'))
      .map(b => b.innerText.trim())
      .filter(t => t.includes('%'));
  });
  console.log('Hero Energy % after 5s:', heroButtons);

  // Check Tactical Grid switch
  console.log('\n--- TESTING VIEW TOGGLE (Canvas vs Tactical Grid) ---');
  const gridBtn = page.locator('button:has-text("Tactical Grid")').first();
  if (await gridBtn.isVisible()) {
    await gridBtn.click();
    await page.waitForTimeout(500);
    const canvasVisible = await page.locator('canvas').isVisible();
    console.log('Canvas visible after switching to Tactical Grid:', canvasVisible);
  }

  await page.screenshot({ path: './betterfront-artifacts/probe-battle-tested.png' });
  console.log('Saved probe-battle-tested.png');

  await browser.close();
}

main().catch(console.error);
