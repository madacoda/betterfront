#!/usr/bin/env bun
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isBun = typeof globalThis.Bun !== 'undefined';
const srcCli = path.resolve(__dirname, '../src/cli.ts');

if (isBun && fs.existsSync(srcCli)) {
  await import('../src/cli.ts');
} else {
  await import('../dist/cli.js');
}
