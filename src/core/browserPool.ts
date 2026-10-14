import { chromium, webkit, firefox, Browser, BrowserContext, Page } from 'playwright';
import {
  ViewportDefinition,
  ConsoleMessageRecord,
  NetworkAnomalyRecord,
  BrowserEngineType
} from '../types/index.js';

export interface ContextSession {
  context: BrowserContext;
  page: Page;
  consoleErrors: ConsoleMessageRecord[];
  networkErrors: NetworkAnomalyRecord[];
}

export interface BrowserPoolOptions {
  headless?: boolean;
  slowMo?: number;
  browserEngine?: BrowserEngineType;
}

export class BrowserPool {
  private browsers = new Map<BrowserEngineType, Browser>();
  private headless: boolean = true;
  private slowMo: number = 0;
  private defaultEngine: BrowserEngineType = 'chromium';

  constructor(options?: BrowserPoolOptions | boolean) {
    if (typeof options === 'boolean') {
      this.headless = options;
    } else if (options) {
      if (options.headless !== undefined) {
        this.headless = options.headless;
      }
      if (options.slowMo !== undefined) {
        this.slowMo = options.slowMo;
      }
      if (options.browserEngine) {
        this.defaultEngine = options.browserEngine;
      }
    }
  }

  public async init(): Promise<void> {
    await this.getBrowser(this.defaultEngine);
  }

  public async getBrowser(engine: BrowserEngineType = this.defaultEngine): Promise<Browser> {
    const existing = this.browsers.get(engine);
    if (existing) {
      return existing;
    }

    let launched: Browser;
    if (engine === 'webkit') {
      launched = await webkit.launch({
        headless: this.headless,
        slowMo: this.slowMo
      });
    } else if (engine === 'firefox') {
      launched = await firefox.launch({
        headless: this.headless,
        slowMo: this.slowMo
      });
    } else {
      launched = await chromium.launch({
        headless: this.headless,
        slowMo: this.slowMo,
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-features=TranslateUI',
          '--disable-extensions'
        ]
      });
    }

    this.browsers.set(engine, launched);
    return launched;
  }

  public async createContextSession(
    viewport: ViewportDefinition,
    recordVideoDir?: string
  ): Promise<ContextSession> {
    const engine = viewport.browserEngine || this.defaultEngine;
    const browser = await this.getBrowser(engine);

    const contextOptions: Parameters<Browser['newContext']>[0] = {
      viewport: {
        width: viewport.width,
        height: viewport.height
      },
      deviceScaleFactor: viewport.deviceScaleFactor || 1,
      isMobile: engine === 'firefox' ? false : viewport.isMobile,
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
    const requestStartTimes = new WeakMap<object, number>();

    page.on('request', (req) => {
      requestStartTimes.set(req, Date.now());
    });

    // Intercept console errors (excluding synthetic browser network status logs tracked in networkErrors)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.startsWith('Failed to load resource: the server responded with a status of ')) {
          return;
        }
        consoleErrors.push({
          type: 'console.error',
          text,
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

    // Intercept network anomalies (4xx, 5xx)
    page.on('response', (response) => {
      const status = response.status();
      const request = response.request();
      const started = requestStartTimes.get(request);
      const durationMs = started ? Date.now() - started : 0;

      if (status >= 400) {
        networkErrors.push({
          url: response.url(),
          status,
          method: request.method(),
          resourceType: request.resourceType(),
          durationMs,
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
    for (const browser of this.browsers.values()) {
      await browser.close().catch(() => {});
    }
    this.browsers.clear();
  }

  public async close(): Promise<void> {
    await this.closeAll();
  }
}
