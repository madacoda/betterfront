import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { ViewportDefinition, ConsoleMessageRecord, NetworkAnomalyRecord } from '../types/index.js';

export interface ContextSession {
  context: BrowserContext;
  page: Page;
  consoleErrors: ConsoleMessageRecord[];
  networkErrors: NetworkAnomalyRecord[];
}

export class BrowserPool {
  private browser: Browser | null = null;

  public async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-features=TranslateUI',
          '--disable-extensions'
        ]
      });
    }
    return this.browser;
  }

  public async createContextSession(
    viewport: ViewportDefinition,
    recordVideoDir?: string
  ): Promise<ContextSession> {
    const browser = await this.getBrowser();

    const contextOptions: Parameters<Browser['newContext']>[0] = {
      viewport: {
        width: viewport.width,
        height: viewport.height
      },
      deviceScaleFactor: viewport.deviceScaleFactor || 1,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      userAgent: viewport.userAgent
    };

    if (recordVideoDir) {
      contextOptions.recordVideo = {
        dir: recordVideoDir,
        size: {
          width: Math.min(1920, viewport.width),
          height: Math.min(1080, viewport.height)
        }
      };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    const consoleErrors: ConsoleMessageRecord[] = [];
    const networkErrors: NetworkAnomalyRecord[] = [];

    // Intercept console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: 'console.error',
          text: msg.text(),
          location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}` : undefined,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Intercept unhandled page exceptions
    page.on('pageerror', (err) => {
      consoleErrors.push({
        type: 'uncaught_exception',
        text: err.message,
        location: err.stack ? err.stack.split('\n')[1]?.trim() : undefined,
        timestamp: new Date().toISOString()
      });
    });

    // Intercept network anomalies (4xx, 5xx, or long requests)
    page.on('response', (response) => {
      const status = response.status();
      const request = response.request();
      if (status >= 400) {
        networkErrors.push({
          url: response.url(),
          status,
          method: request.method(),
          resourceType: request.resourceType(),
          durationMs: 0,
          failureText: `HTTP ${status} on ${request.method()} ${response.url()}`
        });
      }
    });

    return {
      context,
      page,
      consoleErrors,
      networkErrors
    };
  }

  public async closeAll(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
