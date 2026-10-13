import { BetterFrontConfig } from '../types/index.js';
import { ConfigSchema } from './schema.js';
import { getPresetConfig, STANDARD_VIEWPORTS } from './presets.js';

export function resolveConfig(options: Partial<BetterFrontConfig> & { targetUrl: string }): BetterFrontConfig {
  const basePreset = getPresetConfig(options.preset || 'production-gate', options.targetUrl);
  
  const merged = {
    ...basePreset,
    ...options,
    viewports: (options.viewports && options.viewports.length > 0) ? options.viewports : basePreset.viewports,
    humanAgent: { ...basePreset.humanAgent, ...options.humanAgent },
    layoutEngine: { ...basePreset.layoutEngine, ...options.layoutEngine },
    recording: { ...basePreset.recording, ...options.recording },
    performance: { ...basePreset.performance, ...options.performance },
    accessibility: { ...basePreset.accessibility, ...options.accessibility },
    qualityGate: { ...basePreset.qualityGate, ...options.qualityGate },
    reporting: { ...basePreset.reporting, ...options.reporting }
  };

  const parsed = ConfigSchema.parse(merged);
  return parsed as BetterFrontConfig;
}

export { STANDARD_VIEWPORTS, getPresetConfig };
