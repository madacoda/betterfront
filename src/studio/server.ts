import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  UatScenario,
  UatRunResult,
  AuditRunSummary,
  AnomalyToggles
} from '../types/index.js';
import {
  STANDARD_VIEWPORTS,
  FRONTEND_WEB_CHECKS_CATALOG
} from '../config/index.js';
import {
  audit,
  runUat,
  runUatSuite,
  listUatTemplates,
  getUatTemplate,
  generateUatScenario,
  validateScenario,
  formatValidationReport,
  SUPPORTED_UAT_ACTIONS,
  BrowserPool
} from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StudioServerOptions {
  port?: number;
  host?: string;
  scenariosDir?: string;
  artifactsDir?: string;
  uiDistDir?: string;
}

export interface StudioRunRecord {
  runId: string;
  type: 'uat' | 'suite' | 'audit';
  name: string;
  targetUrl: string;
  timestamp: string;
  passed: boolean;
  durationMs: number;
  summaryData: UatRunResult | AuditRunSummary | any;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
  '.ico': 'image/x-icon'
};

export class BetterFrontStudioServer {
  private server?: http.Server;
  private sseClients = new Set<http.ServerResponse>();
  private recentRuns: StudioRunRecord[] = [];
  private sharedPool = new BrowserPool({ headless: true, browserEngine: 'chromium' });
  private port: number;
  private host: string;
  private scenariosDir: string;
  private artifactsDir: string;
  private uiDistDir: string;

  constructor(options?: StudioServerOptions) {
    this.port = options?.port ?? 4400;
    this.host = options?.host ?? 'localhost';
    this.scenariosDir = path.resolve(options?.scenariosDir || './uat-scenarios');
    this.artifactsDir = path.resolve(options?.artifactsDir || './betterfront-artifacts');
    // Resolve dist/studio-ui relative to compiled dist/studio/server.js, src/studio/server.ts, or project root
    const candidateFromDist = path.resolve(__dirname, '..', 'studio-ui');
    const candidateFromSrc = path.resolve(__dirname, '..', '..', 'dist', 'studio-ui');
    const candidateFromRoot = path.resolve(process.cwd(), 'dist', 'studio-ui');
    this.uiDistDir =
      options?.uiDistDir ||
      (fs.existsSync(candidateFromDist)
        ? candidateFromDist
        : fs.existsSync(candidateFromSrc)
          ? candidateFromSrc
          : candidateFromRoot);

    this.loadExistingSummaryIfPresent();
  }

  private loadExistingSummaryIfPresent(): void {
    try {
      const summaryPath = path.resolve('./betterfront-summary.json');
      if (fs.existsSync(summaryPath)) {
        const raw = JSON.parse(fs.readFileSync(summaryPath, 'utf8')) as AuditRunSummary;
        if (raw && raw.targetUrl) {
          this.recentRuns.push({
            runId: 'initial-disk-audit',
            type: 'audit',
            name: `Audit: ${raw.targetUrl}`,
            targetUrl: raw.targetUrl,
            timestamp: raw.timestamp || new Date().toISOString(),
            passed: Boolean(raw.passed),
            durationMs: raw.durationMs || 0,
            summaryData: raw
          });
        }
      }
    } catch {
      // Ignore corrupt summary file
    }
  }

  private broadcastEvent(event: string, payload: unknown): void {
    const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(data);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private sendJson(res: http.ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(payload);
  }

  private async readJsonBody<T = any>(req: http.IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          resolve(raw ? JSON.parse(raw) : ({} as T));
        } catch (err) {
          reject(new Error(`Invalid JSON body: ${(err as Error).message}`));
        }
      });
      req.on('error', reject);
    });
  }

  private listDiskScenarios(): Array<{
    fileName: string;
    relativePath: string;
    scenario: UatScenario;
    validation: ReturnType<typeof validateScenario>;
    updatedAt: string;
  }> {
    const items: Array<{
      fileName: string;
      relativePath: string;
      scenario: UatScenario;
      validation: ReturnType<typeof validateScenario>;
      updatedAt: string;
    }> = [];

    if (!fs.existsSync(this.scenariosDir)) {
      fs.mkdirSync(this.scenariosDir, { recursive: true });
    }

    const scanDir = (dir: string, prefix = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scanDir(fullPath, relPath);
        } else if (
          entry.isFile() &&
          entry.name.endsWith('.json') &&
          !entry.name.endsWith('.schema.json')
        ) {
          try {
            const raw = fs.readFileSync(fullPath, 'utf8');
            const scenario = JSON.parse(raw) as UatScenario;
            const stat = fs.statSync(fullPath);
            const validation = validateScenario(scenario);
            items.push({
              fileName: entry.name,
              relativePath: relPath,
              scenario,
              validation,
              updatedAt: stat.mtime.toISOString()
            });
          } catch {
            // Skip malformed non-scenario JSON
          }
        }
      }
    };

    scanDir(this.scenariosDir);
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private normalizeArtifactPathsForWeb(result: any): any {
    if (!result || typeof result !== 'object') return result;
    const clone = JSON.parse(JSON.stringify(result));

    const toWebUrl = (absOrRel?: string) => {
      if (!absOrRel) return undefined;
      const abs = path.resolve(absOrRel);
      if (abs.startsWith(this.artifactsDir)) {
        const rel = path.relative(this.artifactsDir, abs).replace(/\\/g, '/');
        return `/artifacts/${rel}`;
      }
      return undefined;
    };

    if (clone.failureScreenshotPath) {
      clone.failureScreenshotUrl = toWebUrl(clone.failureScreenshotPath);
    }
    if (clone.videoPath) {
      clone.videoUrl = toWebUrl(clone.videoPath);
    }
    if (clone.tracePath) {
      clone.traceUrl = toWebUrl(clone.tracePath);
    }
    if (clone.htmlReportPath) {
      clone.htmlReportUrl = toWebUrl(clone.htmlReportPath);
    }
    if (clone.jsonReportPath) {
      clone.jsonReportUrl = toWebUrl(clone.jsonReportPath);
    }
    if (Array.isArray(clone.steps)) {
      clone.steps = clone.steps.map((s: any) => ({
        ...s,
        screenshotUrl: toWebUrl(s.screenshotPath),
        failureScreenshotUrl: toWebUrl(s.failureScreenshotPath)
      }));
    }
    if (Array.isArray(clone.viewportResults)) {
      clone.viewportResults = clone.viewportResults.map((vr: any) =>
        this.normalizeArtifactPathsForWeb(vr)
      );
    }
    return clone;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    try {
      // 1. Server-Sent Events (SSE) stream
      if (req.method === 'GET' && pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() })}\n\n`);
        this.sseClients.add(res);
        req.on('close', () => this.sseClients.delete(res));
        return;
      }

      // 2. Studio Overview & Metadata Catalog
      if (req.method === 'GET' && (pathname === '/api/overview' || pathname === '/api/health')) {
        const scenarios = this.listDiskScenarios();
        const templates = listUatTemplates().map((t) => ({
          ...t,
          scenario: getUatTemplate(t.id)
        }));
        this.sendJson(res, 200, {
          status: 'ok',
          version: '1.1.0',
          workspaceDir: process.cwd(),
          scenariosDir: this.scenariosDir,
          artifactsDir: this.artifactsDir,
          viewports: STANDARD_VIEWPORTS,
          webChecksCatalog: FRONTEND_WEB_CHECKS_CATALOG,
          supportedActions: SUPPORTED_UAT_ACTIONS,
          templates,
          templatesCount: templates.length,
          scenariosCount: scenarios.length,
          recentRuns: this.recentRuns.slice(0, 25)
        });
        return;
      }

      // 3. Built-In Customizable Workflow Templates
      if (req.method === 'GET' && pathname === '/api/templates') {
        const templates = listUatTemplates().map((t) => ({
          ...t,
          scenario: getUatTemplate(t.id)
        }));
        this.sendJson(res, 200, { templates });
        return;
      }

      // 4. Scenarios CRUD
      if (req.method === 'GET' && pathname === '/api/scenarios') {
        const scenarios = this.listDiskScenarios();
        this.sendJson(res, 200, { scenarios });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/scenarios') {
        const body = await this.readJsonBody<{ fileName?: string; scenario: UatScenario }>(req);
        if (!body.scenario) {
          this.sendJson(res, 400, { error: 'Missing "scenario" object in request body.' });
          return;
        }
        const validation = validateScenario(body.scenario);
        const rawName = body.fileName || body.scenario.name || 'custom-scenario';
        const safeBase = rawName
          .replace(/\.json$/i, '')
          .replace(/[^a-zA-Z0-9_-]/g, '-')
          .toLowerCase();
        const finalFileName = `${safeBase}.json`;
        const targetPath = path.join(this.scenariosDir, finalFileName);

        if (!fs.existsSync(this.scenariosDir)) {
          fs.mkdirSync(this.scenariosDir, { recursive: true });
        }
        const scenarioToSave: UatScenario = {
          $schema: './uat-scenario.schema.json',
          ...body.scenario
        };
        fs.writeFileSync(targetPath, JSON.stringify(scenarioToSave, null, 2), 'utf8');

        this.sendJson(res, 200, {
          saved: true,
          fileName: finalFileName,
          relativePath: finalFileName,
          validation,
          scenario: scenarioToSave
        });
        return;
      }

      if (req.method === 'DELETE' && pathname === '/api/scenarios') {
        const relFile = parsedUrl.searchParams.get('file');
        if (!relFile) {
          this.sendJson(res, 400, { error: 'Missing "file" query parameter.' });
          return;
        }
        const resolved = path.resolve(this.scenariosDir, relFile);
        if (!resolved.startsWith(this.scenariosDir) || !fs.existsSync(resolved)) {
          this.sendJson(res, 404, { error: 'Scenario file not found.' });
          return;
        }
        fs.unlinkSync(resolved);
        this.sendJson(res, 200, { deleted: true, file: relFile });
        return;
      }

      // 5. Real-Time Scenario Validation
      if (req.method === 'POST' && pathname === '/api/validate') {
        const body = await this.readJsonBody<{ scenario: UatScenario }>(req);
        const target = body.scenario ?? body;
        const validation = validateScenario(target);
        const report = formatValidationReport(validation, target?.name);
        this.sendJson(res, 200, {
          ...validation,
          formattedReport: report
        });
        return;
      }

      // 6. Live Zero-Config DOM Auto-Discovery
      if (req.method === 'POST' && pathname === '/api/discover') {
        const body = await this.readJsonBody<{
          targetUrl: string;
          name?: string;
          viewports?: string[];
          includeForms?: boolean;
          includeNavigation?: boolean;
          includeHudChecks?: boolean;
          includeInvariants?: boolean;
          saveAsFile?: string;
        }>(req);

        if (!body.targetUrl) {
          this.sendJson(res, 400, { error: 'Missing "targetUrl".' });
          return;
        }

        const runId = `discover_${Date.now()}`;
        this.broadcastEvent('run:log', {
          runId,
          message: `🔍 Inspecting live DOM at ${body.targetUrl} to synthesize UAT workflow...`,
          timestamp: new Date().toISOString()
        });

        let outputFilePath: string | undefined;
        if (body.saveAsFile) {
          const safe = body.saveAsFile.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-');
          outputFilePath = path.join(this.scenariosDir, `${safe}.json`);
        }

        const scenario = await generateUatScenario(
          body.targetUrl,
          {
            name: body.name,
            viewports: body.viewports,
            includeForms: body.includeForms,
            includeNavigation: body.includeNavigation,
            includeHudChecks: body.includeHudChecks,
            includeInvariants: body.includeInvariants,
            outputFilePath
          },
          this.sharedPool
        );

        const validation = validateScenario(scenario);
        this.broadcastEvent('run:log', {
          runId,
          message: `✅ Auto-discovered ${scenario.steps.length} UAT steps for "${scenario.name}"!`,
          timestamp: new Date().toISOString()
        });

        this.sendJson(res, 200, {
          scenario,
          validation,
          savedPath: outputFilePath
        });
        return;
      }

      // 7. Execute UAT Scenario or Template
      if (req.method === 'POST' && pathname === '/api/run/uat') {
        const body = await this.readJsonBody<{
          scenarioOrInput: UatScenario | string;
          targetUrl?: string;
          variables?: Record<string, string>;
          viewports?: string[];
          viewport?: string;
          anomalyChecks?: Partial<AnomalyToggles>;
          headless?: boolean;
          slowMo?: number;
          recordVideo?: boolean;
          recordTrace?: boolean;
        }>(req);

        if (!body.scenarioOrInput) {
          this.sendJson(res, 400, { error: 'Missing "scenarioOrInput".' });
          return;
        }

        const runId = `uat_${Date.now()}`;
        const label =
          typeof body.scenarioOrInput === 'string'
            ? body.scenarioOrInput
            : body.scenarioOrInput.name || 'Custom UAT Workflow';

        this.broadcastEvent('run:started', {
          runId,
          type: 'uat',
          name: label,
          targetUrl:
            body.targetUrl ||
            (typeof body.scenarioOrInput === 'object' ? body.scenarioOrInput.startUrl : ''),
          timestamp: new Date().toISOString()
        });

        let inputToRun: UatScenario | string = body.scenarioOrInput;
        if (typeof inputToRun === 'string' && !inputToRun.startsWith('http')) {
          const maybeScenarioPath = path.resolve(this.scenariosDir, inputToRun);
          if (fs.existsSync(maybeScenarioPath) && fs.statSync(maybeScenarioPath).isFile()) {
            inputToRun = JSON.parse(fs.readFileSync(maybeScenarioPath, 'utf8')) as UatScenario;
          }
        }

        if (typeof inputToRun === 'object' && body.anomalyChecks) {
          inputToRun = {
            ...inputToRun,
            anomalyChecks: {
              ...(inputToRun.anomalyChecks || {}),
              ...body.anomalyChecks
            }
          };
        }

        const origLog = console.log;
        console.log = (...args: any[]) => {
          origLog(...args);
          const text = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
          this.broadcastEvent('run:log', {
            runId,
            message: text,
            timestamp: new Date().toISOString()
          });
        };

        try {
          const isHeadless = body.headless !== false;
          const rawResult = await runUat(inputToRun, {
            targetUrl: body.targetUrl,
            variables: body.variables,
            viewport: body.viewport,
            viewports: body.viewports,
            browserPool: isHeadless && !body.slowMo ? this.sharedPool : undefined,
            headless: isHeadless,
            slowMo: body.slowMo || 0,
            recordVideo: body.recordVideo,
            recordTrace: body.recordTrace,
            artifactsDir: this.artifactsDir,
            outputHtml: path.join(this.artifactsDir, 'latest-uat-report.html'),
            outputJson: path.join(this.artifactsDir, 'latest-uat-summary.json')
          });

          const normalizedResult = this.normalizeArtifactPathsForWeb(rawResult);
          const record: StudioRunRecord = {
            runId,
            type: 'uat',
            name: normalizedResult.scenarioName || label,
            targetUrl:
              body.targetUrl ||
              (typeof inputToRun === 'object' ? inputToRun.startUrl : String(inputToRun)),
            timestamp: new Date().toISOString(),
            passed: normalizedResult.passed,
            durationMs: normalizedResult.durationMs,
            summaryData: normalizedResult
          };
          this.recentRuns.unshift(record);

          this.broadcastEvent('run:completed', {
            runId,
            type: 'uat',
            passed: normalizedResult.passed,
            result: normalizedResult
          });

          this.sendJson(res, 200, { runId, result: normalizedResult });
        } finally {
          console.log = origLog;
        }
        return;
      }

      // 8. Execute Multi-Scenario UAT Suite
      if (req.method === 'POST' && pathname === '/api/run/suite') {
        const body = await this.readJsonBody<{
          scenarios: Array<UatScenario | string>;
          suiteName?: string;
          targetUrl?: string;
          viewport?: string;
          variables?: Record<string, string>;
        }>(req);

        const runId = `suite_${Date.now()}`;
        this.broadcastEvent('run:started', {
          runId,
          type: 'suite',
          name: body.suiteName || 'UAT Workflow Suite',
          targetUrl: body.targetUrl || '',
          timestamp: new Date().toISOString()
        });

        const suiteResult = await runUatSuite(body.scenarios || this.scenariosDir, {
          suiteName: body.suiteName,
          targetUrl: body.targetUrl,
          viewport: body.viewport,
          variables: body.variables,
          browserPool: this.sharedPool,
          headless: true,
          artifactsDir: this.artifactsDir
        });

        const record: StudioRunRecord = {
          runId,
          type: 'suite',
          name: suiteResult.suiteName,
          targetUrl: body.targetUrl || 'Multiple Workflows',
          timestamp: new Date().toISOString(),
          passed: suiteResult.passed,
          durationMs: suiteResult.durationMs,
          summaryData: suiteResult
        };
        this.recentRuns.unshift(record);

        this.broadcastEvent('run:completed', {
          runId,
          type: 'suite',
          passed: suiteResult.passed,
          result: suiteResult
        });

        this.sendJson(res, 200, { runId, result: suiteResult });
        return;
      }

      // 9. Execute Full Frontend Audit (with Required + Optional Web Checks)
      if (req.method === 'POST' && pathname === '/api/run/audit') {
        const body = await this.readJsonBody<{
          targetUrl: string;
          preset?: 'production-gate' | 'fast-smoke' | 'comprehensive-deep';
          viewports?: string[];
          anomalyChecks?: Partial<AnomalyToggles>;
          enableHumanAgent?: boolean;
          persona?: 'power-user' | 'impatient-mobile' | 'cautious-first-timer' | 'keyboard-only';
          recordVideo?: boolean;
          recordTrace?: boolean;
        }>(req);

        if (!body.targetUrl) {
          this.sendJson(res, 400, { error: 'Missing "targetUrl".' });
          return;
        }

        const runId = `audit_${Date.now()}`;
        this.broadcastEvent('run:started', {
          runId,
          type: 'audit',
          name: `Audit: ${body.targetUrl}`,
          targetUrl: body.targetUrl,
          timestamp: new Date().toISOString()
        });

        const selectedViewports =
          body.viewports && body.viewports.length > 0
            ? body.viewports.map((v) => STANDARD_VIEWPORTS[v]).filter(Boolean)
            : undefined;

        const origLog = console.log;
        console.log = (...args: any[]) => {
          origLog(...args);
          const text = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
          this.broadcastEvent('run:log', {
            runId,
            message: text,
            timestamp: new Date().toISOString()
          });
        };

        try {
          const summary = await audit(body.targetUrl, {
            preset: body.preset || 'production-gate',
            viewports: selectedViewports,
            anomalyChecks: body.anomalyChecks,
            humanAgent: {
              enabled: body.enableHumanAgent ?? false,
              persona: body.persona || 'impatient-mobile',
              simulateMouseTrails: true,
              simulateTypingCadence: true,
              simulateScrollMomentum: true,
              maxInteractionsPerPage: 8
            },
            recording: {
              recordVideo: body.recordVideo ?? false,
              recordTrace: body.recordTrace ?? false,
              captureScreenshots: true,
              highlightAnomalies: true,
              artifactsDir: this.artifactsDir
            },
            reporting: {
              outputHtml: path.join(this.artifactsDir, 'latest-audit-report.html'),
              outputJson: path.join(this.artifactsDir, 'latest-audit-summary.json')
            }
          });
          (summary as any).htmlReportUrl = '/artifacts/latest-audit-report.html';

          const record: StudioRunRecord = {
            runId,
            type: 'audit',
            name: `Audit: ${body.targetUrl} (${summary.score.total}/100)`,
            targetUrl: body.targetUrl,
            timestamp: summary.timestamp,
            passed: summary.passed,
            durationMs: summary.durationMs,
            summaryData: summary
          };
          this.recentRuns.unshift(record);

          this.broadcastEvent('run:completed', {
            runId,
            type: 'audit',
            passed: summary.passed,
            result: summary
          });

          this.sendJson(res, 200, { runId, summary });
        } finally {
          console.log = origLog;
        }
        return;
      }

      // 10. Recent Runs History
      if (req.method === 'GET' && pathname === '/api/runs') {
        this.sendJson(res, 200, { runs: this.recentRuns.slice(0, 30) });
        return;
      }

      // 11. Serve Forensic Artifacts (/artifacts/*)
      if (req.method === 'GET' && pathname.startsWith('/artifacts/')) {
        const rel = decodeURIComponent(pathname.slice('/artifacts/'.length));
        const targetFile = path.resolve(this.artifactsDir, rel);
        if (!targetFile.startsWith(this.artifactsDir) || !fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
          res.writeHead(404);
          res.end('Artifact not found');
          return;
        }
        const ext = path.extname(targetFile).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': mime,
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(targetFile).pipe(res);
        return;
      }

      // 12. Serve Compiled shadcn/ui Studio SPA from dist/studio-ui/
      if (req.method === 'GET') {
        const cleanRel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        let staticPath = path.resolve(this.uiDistDir, cleanRel);
        if (!staticPath.startsWith(this.uiDistDir) || !fs.existsSync(staticPath) || !fs.statSync(staticPath).isFile()) {
          staticPath = path.resolve(this.uiDistDir, 'index.html');
        }
        if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
          const ext = path.extname(staticPath).toLowerCase();
          const mime = MIME_TYPES[ext] || 'text/html; charset=utf-8';
          res.writeHead(200, { 'Content-Type': mime });
          fs.createReadStream(staticPath).pipe(res);
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#090d16;color:#f9fafb;padding:40px;">
          <h1>🛡️ BetterFront Studio API Server Running</h1>
          <p>UI bundle not found at <code>${this.uiDistDir}</code>. Run <code>npm run build</code> to compile the shadcn/ui Studio.</p>
        </body></html>`);
        return;
      }

      this.sendJson(res, 404, { error: `Route not found: ${req.method} ${pathname}` });
    } catch (err) {
      this.sendJson(res, 500, {
        error: (err as Error).message || 'Internal Studio Server Error'
      });
    }
  }

  public async start(): Promise<{ url: string; port: number; server: http.Server }> {
    return new Promise((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        void this.handleRequest(req, res);
      });
      srv.on('error', reject);
      srv.listen(this.port, this.host, () => {
        this.server = srv;
        const address = srv.address();
        const actualPort = typeof address === 'object' && address ? address.port : this.port;
        this.port = actualPort;
        const url = `http://${this.host}:${actualPort}`;
        resolve({ url, port: actualPort, server: srv });
      });
    });
  }

  public async stop(): Promise<void> {
    await this.sharedPool.closeAll().catch(() => {});
    for (const client of this.sseClients) {
      try {
        client.end();
      } catch {}
    }
    this.sseClients.clear();
    if (!this.server) return;
    return new Promise((resolve) => {
      this.server!.closeAllConnections?.();
      this.server!.close(() => resolve());
    });
  }
}

export async function startStudioServer(options?: StudioServerOptions) {
  const studio = new BetterFrontStudioServer(options);
  const info = await studio.start();
  return {
    studio,
    ...info,
    getUrl: () => info.url,
    stop: () => studio.stop()
  };
}
