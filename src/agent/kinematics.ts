import { Page } from 'playwright';

interface Point {
  x: number;
  y: number;
}

export class KinematicsEngine {
  private currentPos: Point = { x: 100, y: 100 };

  /**
   * Computes psychomotor traversal duration (ms) using Fitts's Law:
   * T = a + b * log2(1 + D / W)
   */
  public computeFittsDurationMs(distance: number, targetWidth: number, a = 90, b = 130): number {
    const safeWidth = Math.max(8, targetWidth);
    const indexOfDifficulty = Math.log2(1 + distance / safeWidth);
    return Math.round(a + b * indexOfDifficulty);
  }

  /**
   * Generates a natural human-like Cubic Bézier path between two points.
   * Includes Fitts's Law step scaling, lateral drift, micro-tremor, and overshoot correction (> 300px).
   */
  public generateHumanPath(start: Point, target: Point, targetWidth = 44): Point[] {
    const points: Point[] = [];
    const distance = Math.hypot(target.x - start.x, target.y - start.y);
    const durationMs = this.computeFittsDurationMs(distance, targetWidth);
    const steps = Math.max(8, Math.min(16, Math.round(durationMs / 18)));

    const angle = Math.atan2(target.y - start.y, target.x - start.x);
    const perpAngle = angle + Math.PI / 2;
    const driftMagnitude = Math.min(45, distance * 0.12) * (Math.random() > 0.5 ? 1 : -1);

    // If distance > 300px, humans frequently overshoot by 4-10px before corrective return
    const shouldOvershoot = distance > 300;
    const overshootDist = shouldOvershoot ? 4 + Math.random() * 6 : 0;
    const primaryLanding: Point = shouldOvershoot
      ? {
          x: target.x + Math.cos(angle) * overshootDist,
          y: target.y + Math.sin(angle) * overshootDist
        }
      : target;

    const p1: Point = {
      x: start.x + (primaryLanding.x - start.x) * 0.25 + Math.cos(perpAngle) * driftMagnitude,
      y: start.y + (primaryLanding.y - start.y) * 0.25 + Math.sin(perpAngle) * driftMagnitude
    };

    const p2: Point = {
      x: start.x + (primaryLanding.x - start.x) * 0.75 + Math.cos(perpAngle) * (driftMagnitude * 0.5),
      y: start.y + (primaryLanding.y - start.y) * 0.75 + Math.sin(perpAngle) * (driftMagnitude * 0.5)
    };

    for (let i = 0; i <= steps; i++) {
      // Ease-out time parameterization so cursor decelerates as it approaches target
      const rawT = i / steps;
      const t = 1 - Math.pow(1 - rawT, 1.6);

      const x =
        Math.pow(1 - t, 3) * start.x +
        3 * Math.pow(1 - t, 2) * t * p1.x +
        3 * (1 - t) * Math.pow(t, 2) * p2.x +
        Math.pow(t, 3) * primaryLanding.x;

      const y =
        Math.pow(1 - t, 3) * start.y +
        3 * Math.pow(1 - t, 2) * t * p1.y +
        3 * (1 - t) * Math.pow(t, 2) * p2.y +
        Math.pow(t, 3) * primaryLanding.y;

      const jitterScale = (1 - rawT) * 1.2;
      const jitterX = (Math.random() - 0.5) * jitterScale;
      const jitterY = (Math.random() - 0.5) * jitterScale;

      points.push({ x: x + jitterX, y: y + jitterY });
    }

    // Corrective micro-return vector after overshoot
    if (shouldOvershoot) {
      const correctionSteps = 2;
      for (let j = 1; j <= correctionSteps; j++) {
        const ct = j / correctionSteps;
        points.push({
          x: primaryLanding.x + (target.x - primaryLanding.x) * ct,
          y: primaryLanding.y + (target.y - primaryLanding.y) * ct
        });
      }
    }

    return points;
  }

  /**
   * Moves mouse smoothly along Bézier trajectory and performs a human click.
   */
  public async humanMoveAndClick(
    page: Page,
    targetSelector: string,
    simulateTrails = true
  ): Promise<boolean> {
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

      if (simulateTrails) {
        const path = this.generateHumanPath(this.currentPos, targetPoint, Math.min(box.width, box.height));
        for (const pt of path) {
          await page.mouse.move(pt.x, pt.y);
          await new Promise((r) => setTimeout(r, 2));
        }
        // Cognitive hover dwell time
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20) + 15));
      } else {
        await page.mouse.move(targetPoint.x, targetPoint.y);
      }

      this.currentPos = targetPoint;

      await page.mouse.down();
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 15) + 10));
      await page.mouse.up();

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Moves mouse smoothly along Bézier trajectory to hover over an element.
   */
  public async humanHover(page: Page, targetSelector: string, simulateTrails = true): Promise<boolean> {
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

      if (simulateTrails) {
        const path = this.generateHumanPath(this.currentPos, targetPoint, Math.min(box.width, box.height));
        for (const pt of path) {
          await page.mouse.move(pt.x, pt.y);
          await new Promise((r) => setTimeout(r, 2));
        }
      } else {
        await page.mouse.move(targetPoint.x, targetPoint.y);
      }

      this.currentPos = targetPoint;
      await new Promise((r) => setTimeout(r, 40));
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
        await el.click({ delay: Math.floor(Math.random() * 15) + 8 });
        await new Promise((r) => setTimeout(r, 30));
      }
    } catch {
      // Ignore click issues
    }
  }
}
