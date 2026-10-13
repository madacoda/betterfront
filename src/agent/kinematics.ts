import { Page } from 'playwright';

interface Point {
  x: number;
  y: number;
}

export class KinematicsEngine {
  private currentPos: Point = { x: 100, y: 100 };

  /**
   * Generates a natural human-like Cubic Bézier path between two points.
   * Includes lateral drift, acceleration, deceleration, and micro-tremor.
   */
  public generateHumanPath(start: Point, target: Point, steps = 24): Point[] {
    const points: Point[] = [];
    const distance = Math.hypot(target.x - start.x, target.y - start.y);

    const angle = Math.atan2(target.y - start.y, target.x - start.x);
    const perpAngle = angle + Math.PI / 2;
    const driftMagnitude = Math.min(45, distance * 0.12) * (Math.random() > 0.5 ? 1 : -1);

    const p1: Point = {
      x: start.x + (target.x - start.x) * 0.25 + Math.cos(perpAngle) * driftMagnitude,
      y: start.y + (target.y - start.y) * 0.25 + Math.sin(perpAngle) * driftMagnitude
    };

    const p2: Point = {
      x: start.x + (target.x - start.x) * 0.75 + Math.cos(perpAngle) * (driftMagnitude * 0.5),
      y: start.y + (target.y - start.y) * 0.75 + Math.sin(perpAngle) * (driftMagnitude * 0.5)
    };

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Cubic Bézier
      const x = Math.pow(1 - t, 3) * start.x
              + 3 * Math.pow(1 - t, 2) * t * p1.x
              + 3 * (1 - t) * Math.pow(t, 2) * p2.x
              + Math.pow(t, 3) * target.x;

      const y = Math.pow(1 - t, 3) * start.y
              + 3 * Math.pow(1 - t, 2) * t * p1.y
              + 3 * (1 - t) * Math.pow(t, 2) * p2.y
              + Math.pow(t, 3) * target.y;

      // Inject human micro-tremor
      const jitterX = (Math.random() - 0.5) * 1.2;
      const jitterY = (Math.random() - 0.5) * 1.2;

      points.push({ x: x + jitterX, y: y + jitterY });
    }

    return points;
  }

  /**
   * Moves mouse smoothly along Bézier trajectory and performs a human click.
   */
  public async humanMoveAndClick(page: Page, targetSelector: string): Promise<boolean> {
    try {
      const el = page.locator(targetSelector).first();
      const isVisible = await el.isVisible();
      if (!isVisible) return false;

      const box = await el.boundingBox();
      if (!box || box.width === 0 || box.height === 0) return false;

      // Click within inner 60% of element
      const targetPoint: Point = {
        x: box.x + box.width * 0.2 + Math.random() * (box.width * 0.6),
        y: box.y + box.height * 0.2 + Math.random() * (box.height * 0.6)
      };

      const path = this.generateHumanPath(this.currentPos, targetPoint);
      for (const pt of path) {
        await page.mouse.move(pt.x, pt.y);
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 6) + 4));
      }

      this.currentPos = targetPoint;

      // Cognitive hover dwell time
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 100) + 50));

      await page.mouse.down();
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 40) + 30));
      await page.mouse.up();

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Moves mouse smoothly along Bézier trajectory to hover over an element.
   */
  public async humanHover(page: Page, targetSelector: string): Promise<boolean> {
    try {
      const el = page.locator(targetSelector).first();
      const isVisible = await el.isVisible();
      if (!isVisible) return false;

      const box = await el.boundingBox();
      if (!box || box.width === 0 || box.height === 0) return false;

      const targetPoint: Point = {
        x: box.x + box.width * 0.5,
        y: box.y + box.height * 0.5
      };

      const path = this.generateHumanPath(this.currentPos, targetPoint);
      for (const pt of path) {
        await page.mouse.move(pt.x, pt.y);
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 6) + 4));
      }

      this.currentPos = targetPoint;
      await new Promise((r) => setTimeout(r, 150));
      return true;
    } catch {
      return false;
    }
  }

  public async rageClick(page: Page, targetSelector: string, clicks = 5): Promise<void> {
    try {
      const el = page.locator(targetSelector).first();
      const isVisible = await el.isVisible();
      if (!isVisible) return;

      for (let i = 0; i < clicks; i++) {
        await el.click({ delay: Math.floor(Math.random() * 20) + 10 });
        await new Promise((r) => setTimeout(r, 40));
      }
    } catch {
      // Ignore click issues
    }
  }
}
