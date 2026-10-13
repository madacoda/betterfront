import { Page } from 'playwright';

export class TypistEngine {
  private nearbyKeys: Record<string, string[]> = {
    a: ['s', 'q', 'z'],
    b: ['v', 'g', 'h', 'n'],
    c: ['x', 'd', 'v'],
    d: ['s', 'e', 'r', 'f', 'c', 'x'],
    e: ['w', 'r', 'd', 's'],
    f: ['d', 'r', 't', 'g', 'v', 'c'],
    g: ['f', 't', 'y', 'h', 'b', 'v'],
    h: ['g', 'y', 'u', 'j', 'n', 'b'],
    i: ['u', 'o', 'k', 'j'],
    j: ['h', 'u', 'i', 'k', 'm', 'n'],
    k: ['j', 'i', 'o', 'l', 'm'],
    l: ['k', 'o', 'p'],
    m: ['n', 'j', 'k'],
    n: ['b', 'h', 'j', 'm'],
    o: ['i', 'p', 'l', 'k'],
    p: ['o', 'l'],
    q: ['w', 'a'],
    r: ['e', 't', 'f', 'd'],
    s: ['a', 'w', 'e', 'd', 'x', 'z'],
    t: ['r', 'y', 'g', 'f'],
    u: ['y', 'i', 'j', 'h'],
    v: ['c', 'f', 'g', 'b'],
    w: ['q', 'e', 's', 'a'],
    x: ['z', 's', 'd', 'c'],
    y: ['t', 'u', 'h', 'g'],
    z: ['a', 's', 'x']
  };

  /**
   * Types text naturally into an input element with variable cadence and simulated typos.
   */
  public async humanType(
    page: Page,
    selector: string,
    text: string,
    typoRate = 0.04,
    clearFirst = true,
    pressEnter = false
  ): Promise<void> {
    const el = page.locator(selector).first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    try {
      await el.click({ timeout: 2000 });
    } catch {
      await el.focus().catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 100));

    // Clear existing value if requested
    if (clearFirst) {
      await el.fill('');
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const lower = char.toLowerCase();

      // Check if typo should be injected
      if (Math.random() < typoRate && this.nearbyKeys[lower]) {
        const typoCandidates = this.nearbyKeys[lower];
        const typoChar = typoCandidates[Math.floor(Math.random() * typoCandidates.length)];

        await page.keyboard.press(typoChar);
        // Realization pause (human notices typo)
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 150) + 120));

        // Backspace to fix typo
        await page.keyboard.press('Backspace');
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 80) + 60));
      }

      await page.keyboard.press(char);

      // Log-normal inter-key delay (simulates natural typing rhythm)
      const baseDelay = Math.floor(Math.random() * 60) + 50;
      await new Promise((r) => setTimeout(r, baseDelay));
    }

    // Press Enter while element is still focused if requested
    if (pressEnter) {
      await page.keyboard.press('Enter');
      await new Promise((r) => setTimeout(r, 100));
    }

    // Trigger change event and blur safely without blind clicking
    await el.evaluate((node) => node.dispatchEvent(new Event('change', { bubbles: true }))).catch(() => {});
    await el.blur().catch(() => {});
  }
}
