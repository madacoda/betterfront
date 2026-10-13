import { Page } from 'playwright';

export class ScrollerEngine {
  /**
   * Performs an inertia-based human scroll down the page,
   * pausing naturally to simulate reading based on visible text density.
   */
  public async humanScroll(page: Page, targetPixels = 600): Promise<void> {
    const direction = targetPixels >= 0 ? 1 : -1;
    const absPixels = Math.abs(targetPixels);
    const steps = Math.max(1, Math.floor(absPixels / 100));
    const pixelPerStep = (absPixels / steps) * direction;

    for (let i = 0; i < steps; i++) {
      // Add slight jitter to step size
      const stepDelta = pixelPerStep + (Math.random() - 0.5) * 20;
      await page.mouse.wheel(0, stepDelta);

      // Rapid scroll tick interval
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 40) + 20));
    }

    // Dynamic dwell time based on text density in viewport
    const visibleWords = await page.evaluate(() => {
      const text = document.body.innerText || '';
      return text.trim().split(/\s+/).length;
    });

    const readingPauseMs = Math.min(2000, Math.max(300, Math.round(visibleWords * 0.5)));
    await new Promise((r) => setTimeout(r, readingPauseMs));

    // 25% chance of slight human adjustment backwards
    if (Math.random() < 0.25) {
      await page.mouse.wheel(0, -60);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  /**
   * Scrolls to the bottom of the page progressively, ensuring dynamic elements trigger.
   */
  public async progressivePageScan(page: Page, maxScrolls = 5): Promise<void> {
    for (let i = 0; i < maxScrolls; i++) {
      const isAtBottom = await page.evaluate(() => {
        return window.innerHeight + window.scrollY >= document.body.offsetHeight - 50;
      });

      if (isAtBottom) break;

      await this.humanScroll(page, 500);
    }
  }
}
