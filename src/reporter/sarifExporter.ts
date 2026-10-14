import * as fs from 'fs';
import * as path from 'path';
import { AuditRunSummary } from '../types/index.js';

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(path.resolve(filePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generates a SARIF 2.1.0 compliant static/dynamic analysis report for GitHub Security / Code Scanning.
 */
export function generateSarifReport(summary: AuditRunSummary): Record<string, any> {
  const rulesMap = new Map<string, any>();
  const results: any[] = [];

  for (const vr of summary.viewportResults) {
    for (const d of vr.defects) {
      if (d.aiTriage && !d.aiTriage.isBug) continue;

      if (!rulesMap.has(d.type)) {
        rulesMap.set(d.type, {
          id: d.type,
          name: d.type,
          shortDescription: {
            text: `BetterFront ${d.type.replace(/_/g, ' ')} Inspector`
          },
          helpUri: 'https://github.com/madacoda/betterfront'
        });
      }

      const level =
        d.severity === 'CRITICAL' ? 'error' : d.severity === 'MAJOR' ? 'warning' : 'note';

      results.push({
        ruleId: d.type,
        level,
        message: {
          text: `[${vr.viewport.name}] ${d.aiTriage?.description || d.type} on <${d.elementA.selector}>. Fix: ${d.aiTriage?.suggestedCssFix || 'Inspect layout.'}`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: summary.targetUrl
              }
            },
            logicalLocations: [
              {
                name: d.elementA.selector,
                kind: 'element'
              }
            ]
          }
        ]
      });
    }
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'BetterFront',
            informationUri: 'https://github.com/madacoda/betterfront',
            version: '1.0.0',
            rules: Array.from(rulesMap.values())
          }
        },
        results
      }
    ]
  };
}

export function saveSarifReport(summary: AuditRunSummary, outputPath: string): void {
  ensureParentDir(outputPath);
  const sarif = generateSarifReport(summary);
  fs.writeFileSync(outputPath, JSON.stringify(sarif, null, 2), 'utf8');
}
