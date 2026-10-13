import * as fs from 'fs';
import { AuditRunSummary } from '../types/index.js';

export function saveJsonSummary(summary: AuditRunSummary, outputPath: string): void {
  const jsonContent = JSON.stringify(summary, null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf8');
}
