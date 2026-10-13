import * as fs from 'fs';
import * as path from 'path';
import { Page, BrowserContext } from 'playwright';
import { VisualDefect, CaptureArtifacts, RectBox } from '../types/index.js';

export class CaptureRecorder {
  private baseDir: string;
  private viewportDir: string;
  private viewportName: string;

  constructor(baseArtifactsDir: string, viewportName: string) {
    this.baseDir = path.resolve(baseArtifactsDir);
    this.viewportName = viewportName.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.viewportDir = path.join(this.baseDir, this.viewportName);

    if (!fs.existsSync(this.viewportDir)) {
      fs.mkdirSync(this.viewportDir, { recursive: true });
    }
  }

  public getViewportDir(): string {
    return this.viewportDir;
  }

  public async startTracing(context: BrowserContext): Promise<void> {
    try {
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true
      });
    } catch (err) {
      console.warn(`[CaptureRecorder] Tracing start warning: ${(err as Error).message}`);
    }
  }

  public async stopTracing(context: BrowserContext, hasDefects: boolean): Promise<string | undefined> {
    const tracePath = path.join(this.viewportDir, `trace_${this.viewportName}.zip`);
    try {
      await context.tracing.stop({ path: tracePath });
      return tracePath;
    } catch (err) {
      console.warn(`[CaptureRecorder] Tracing stop warning: ${(err as Error).message}`);
      return undefined;
    }
  }

  public async captureFullPageScreenshot(page: Page): Promise<string> {
    const screenshotPath = path.join(this.viewportDir, `fullpage_${this.viewportName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  public async captureViewportScreenshot(page: Page): Promise<string> {
    const screenshotPath = path.join(this.viewportDir, `viewport_${this.viewportName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    return screenshotPath;
  }

  /**
   * Highlights all detected visual defects directly in the DOM with glowing red/orange overlays
   * and takes an annotated forensic screenshot for developers.
   */
  public async captureAnnotatedScreenshot(page: Page, defects: VisualDefect[]): Promise<string | undefined> {
    if (defects.length === 0) return undefined;

    const annotatedPath = path.join(this.viewportDir, `annotated_${this.viewportName}.png`);

    try {
      // Inject visual highlight overlays into DOM
      await page.evaluate((defectList) => {
        const overlayContainer = document.createElement('div');
        overlayContainer.id = '__betterfront_defect_overlays__';
        overlayContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2147483647;
        `;

        defectList.forEach((defect, idx) => {
          const box = defect.overlapBox || {
            left: defect.elementA.rect.left + window.scrollX,
            top: defect.elementA.rect.top + window.scrollY,
            width: defect.elementA.rect.width,
            height: defect.elementA.rect.height
          };

          const highlight = document.createElement('div');
          highlight.style.cssText = `
            position: absolute;
            left: ${box.left}px;
            top: ${box.top}px;
            width: ${Math.max(box.width, 24)}px;
            height: ${Math.max(box.height, 24)}px;
            border: 3px solid #ff0055;
            background: rgba(255, 0, 85, 0.25);
            box-shadow: 0 0 12px rgba(255, 0, 85, 0.8);
            border-radius: 4px;
            box-sizing: border-box;
          `;

          const tag = document.createElement('span');
          tag.style.cssText = `
            position: absolute;
            top: -24px;
            left: 0;
            background: #ff0055;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 3px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          `;
          tag.textContent = `[#${idx + 1}] ${defect.type.replace(/_/g, ' ')}`;

          highlight.appendChild(tag);
          overlayContainer.appendChild(highlight);
        });

        document.body.appendChild(overlayContainer);
      }, defects);

      await page.screenshot({ path: annotatedPath, fullPage: false });

      // Clean up injected overlays
      await page.evaluate(() => {
        const el = document.getElementById('__betterfront_defect_overlays__');
        if (el) el.remove();
      });

      return annotatedPath;
    } catch (err) {
      console.warn(`[CaptureRecorder] Annotated screenshot warning: ${(err as Error).message}`);
      return undefined;
    }
  }

  /**
   * Generates localized base64 crops for each defect region to display in the report and pass to Vision AI.
   */
  public async extractDefectCrops(page: Page, defects: VisualDefect[]): Promise<Array<{ defectId: string; imagePath: string; base64Data: string }>> {
    const crops: Array<{ defectId: string; imagePath: string; base64Data: string }> = [];

    for (let i = 0; i < defects.length; i++) {
      const defect = defects[i];
      const box = defect.overlapBox || {
        left: defect.elementA.rect.left,
        top: defect.elementA.rect.top,
        width: defect.elementA.rect.width,
        height: defect.elementA.rect.height
      };

      const cropPath = path.join(this.viewportDir, `crop_${defect.id}.png`);

      try {
        // Compute clip rect with 30px contextual margin
        const clip = {
          x: Math.max(0, Math.round(box.left - 30)),
          y: Math.max(0, Math.round(box.top - 30)),
          width: Math.min(1200, Math.round(box.width + 60)),
          height: Math.min(800, Math.round(box.height + 60))
        };

        if (clip.width > 10 && clip.height > 10) {
          const buffer = await page.screenshot({ clip, type: 'png' });
          fs.writeFileSync(cropPath, buffer);
          crops.push({
            defectId: defect.id,
            imagePath: cropPath,
            base64Data: buffer.toString('base64')
          });
        }
      } catch (err) {
        // Fallback or ignore if out of viewport bounds
      }
    }

    return crops;
  }

  /**
   * Finalizes video recording by locating the file written by Playwright.
   */
  public async finalizeVideo(page: Page): Promise<string | undefined> {
    try {
      const video = page.video();
      if (video) {
        const videoPath = await video.path();
        return videoPath;
      }
    } catch (err) {
      // Video might be disabled or still finalizing
    }
    return undefined;
  }
}
