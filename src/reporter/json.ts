import * as fs from 'fs';
import * as path from 'path';
import { AuditRunSummary, UatRunResult } from '../types/index.js';

export { generateSarifReport, saveSarifReport } from './sarifExporter.js';
export {
  generateJunitXml,
  saveJunitReport,
  generateUatJunitXml,
  saveUatJunitReport
} from './junitExporter.js';
export { generatePrMarkdownSummary, saveMarkdownReport } from './markdownExporter.js';

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(path.resolve(filePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function saveJsonSummary(summary: AuditRunSummary, outputPath: string): void {
  ensureParentDir(outputPath);
  const jsonContent = JSON.stringify(summary, null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf8');
}

export function saveUatJsonSummary(result: UatRunResult, outputPath: string): void {
  ensureParentDir(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
}
