import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { BetterFrontConfig } from '../types/index.js';
import { ConfigSchema } from './schema.js';
import { getPresetConfig, STANDARD_VIEWPORTS } from './presets.js';

export type UserConfigInput = Partial<Omit<BetterFrontConfig, 'anomalyChecks' | 'humanAgent' | 'layoutEngine' | 'recording' | 'performance' | 'accessibility' | 'qualityGate' | 'reporting'>> & {
  targetUrl?: string;
  anomalyChecks?: Partial<BetterFrontConfig['anomalyChecks']>;
  humanAgent?: Partial<BetterFrontConfig['humanAgent']>;
  layoutEngine?: Partial<BetterFrontConfig['layoutEngine']>;
  recording?: Partial<BetterFrontConfig['recording']>;
  performance?: Partial<BetterFrontConfig['performance']>;
  accessibility?: Partial<BetterFrontConfig['accessibility']>;
  qualityGate?: Partial<BetterFrontConfig['qualityGate']>;
  reporting?: Partial<BetterFrontConfig['reporting']>;
};

/**
 * Strongly typed helper for authoring `betterfront.config.ts` / `betterfront.config.mjs`.
 */
export function defineConfig(config: UserConfigInput): UserConfigInput {
  return config;
}

const DEFAULT_CONFIG_FILENAMES = [
  'betterfront.config.json',
  'betterfront.config.mjs',
  'betterfront.config.js',
  'betterfront.config.ts'
];

/**
 * Synchronously loads JSON config if present in cwd or specified path.
 */
export function loadSyncConfigFile(customPath?: string, cwd: string = process.cwd()): UserConfigInput | undefined {
  const candidates = customPath
    ? [path.resolve(cwd, customPath)]
    : DEFAULT_CONFIG_FILENAMES.map((f) => path.resolve(cwd, f));

  for (const filePath of candidates) {
    if (fs.existsSync(filePath) && filePath.endsWith('.json')) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as UserConfigInput;
      } catch (err) {
        console.warn(`[Config] Warning: Could not parse JSON config at ${filePath}: ${(err as Error).message}`);
      }
    }
  }
  return undefined;
}

/**
 * Asynchronously discovers and loads `betterfront.config.{json,mjs,js,ts}` from disk.
 */
export async function loadConfigFile(customPath?: string, cwd: string = process.cwd()): Promise<UserConfigInput | undefined> {
  const candidates = customPath
    ? [path.resolve(cwd, customPath)]
    : DEFAULT_CONFIG_FILENAMES.map((f) => path.resolve(cwd, f));

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;

    if (filePath.endsWith('.json')) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as UserConfigInput;
      } catch (err) {
        throw new Error(`Invalid JSON in BetterFront config file (${filePath}): ${(err as Error).message}`);
      }
    }

    if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.ts')) {
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const imported = await import(fileUrl);
        return (imported.default || imported) as UserConfigInput;
      } catch (err) {
        // Fallback for simple defineConfig({...}) in .ts when running without a TS loader
        if (filePath.endsWith('.ts')) {
          try {
            const src = fs.readFileSync(filePath, 'utf8');
            const match = src.match(/defineConfig\s*\(\s*(\{[\s\S]*\})\s*\)/);
            if (match?.[1]) {
              const fn = new Function(`return (${match[1]});`);
              return fn() as UserConfigInput;
            }
          } catch {
            // Fall through to warning
          }
        }
        console.warn(`[Config] Warning: Could not dynamically import ${filePath}: ${(err as Error).message}`);
      }
    }
  }

  return undefined;
}

export function mergeWithPreset(
  options: UserConfigInput & { targetUrl: string },
  fileConfig?: UserConfigInput
): BetterFrontConfig {
  const effectiveTargetUrl = options.targetUrl || fileConfig?.targetUrl || 'http://localhost:3000';
  const effectivePreset = options.preset || fileConfig?.preset || 'production-gate';
  const basePreset = getPresetConfig(effectivePreset, effectiveTargetUrl);

  const viewports =
    options.viewports && options.viewports.length > 0
      ? options.viewports
      : fileConfig?.viewports && fileConfig.viewports.length > 0
        ? fileConfig.viewports
        : basePreset.viewports;

  const merged = {
    ...basePreset,
    ...fileConfig,
    ...options,
    targetUrl: effectiveTargetUrl,
    preset: effectivePreset,
    viewports,
    anomalyChecks: {
      ...basePreset.anomalyChecks,
      ...(fileConfig?.anomalyChecks || {}),
      ...(options.anomalyChecks || {})
    },
    humanAgent: {
      ...basePreset.humanAgent,
      ...(fileConfig?.humanAgent || {}),
      ...(options.humanAgent || {})
    },
    layoutEngine: {
      ...basePreset.layoutEngine,
      ...(fileConfig?.layoutEngine || {}),
      ...(options.layoutEngine || {})
    },
    recording: {
      ...basePreset.recording,
      ...(fileConfig?.recording || {}),
      ...(options.recording || {})
    },
    performance: {
      ...basePreset.performance,
      ...(fileConfig?.performance || {}),
      ...(options.performance || {})
    },
    accessibility: {
      ...basePreset.accessibility,
      ...(fileConfig?.accessibility || {}),
      ...(options.accessibility || {})
    },
    qualityGate: {
      ...basePreset.qualityGate,
      ...(fileConfig?.qualityGate || {}),
      ...(options.qualityGate || {})
    },
    reporting: {
      ...basePreset.reporting,
      ...(fileConfig?.reporting || {}),
      ...(options.reporting || {})
    }
  };

  const parsed = ConfigSchema.parse(merged);
  return parsed as BetterFrontConfig;
}

export function resolveConfig(options: UserConfigInput & { targetUrl: string }, configFilePath?: string): BetterFrontConfig {
  const syncFileConfig = loadSyncConfigFile(configFilePath);
  return mergeWithPreset(options, syncFileConfig);
}

export async function resolveConfigAsync(
  options: UserConfigInput & { targetUrl?: string },
  configFilePath?: string
): Promise<BetterFrontConfig> {
  const fileConfig = await loadConfigFile(configFilePath);
  const targetUrl = options.targetUrl || fileConfig?.targetUrl;
  if (!targetUrl) {
    throw new Error('Target URL is required via CLI argument, options.targetUrl, or betterfront.config.*');
  }
  return mergeWithPreset({ ...options, targetUrl }, fileConfig);
}

export { STANDARD_VIEWPORTS, getPresetConfig };
export { FRONTEND_WEB_CHECKS_CATALOG } from './webChecksCatalog.js';
