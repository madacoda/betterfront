import { UatScenario, UatStep, UatActionType } from '../types/index.js';
import { STANDARD_VIEWPORTS } from '../config/presets.js';

export interface ValidationErrorItem {
  stepIndex?: number;
  field?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
}

export const SUPPORTED_UAT_ACTIONS: UatActionType[] = [
  // Navigation & Page Lifecycle
  'GOTO',
  'RELOAD',
  'WAIT',
  'WAIT_FOR',
  'WAIT_FOR_NAV',
  // User Interactions
  'CLICK',
  'DOUBLE_CLICK',
  'HOVER',
  'TYPE',
  'CLEAR',
  'PRESS_KEY',
  'SELECT',
  'CHECK',
  'UNCHECK',
  'SCROLL',
  'SCROLL_TO',
  'FILL_FORM',
  'EXECUTE_SCRIPT',
  // Assertions & Quality Checks
  'ASSERT_TEXT',
  'ASSERT_VISIBLE',
  'ASSERT_HIDDEN',
  'ASSERT_NOT_VISIBLE',
  'ASSERT_VALUE',
  'ASSERT_COUNT',
  'ASSERT_URL',
  'ASSERT_TITLE',
  'ASSERT_NO_OVERLAP',
  'ASSERT_NO_BLEED',
  'ASSERT_NO_CONSOLE_ERRORS',
  'ASSERT_UNOCCLUDED',
  'ASSERT_NO_CLIPPING',
  'ASSERT_TOUCH_TARGET',
  'ASSERT_CONTRAST',
  // Forensics
  'SCREENSHOT'
];

/**
 * Calculates Levenshtein distance between two strings to provide "Did you mean?" suggestions.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  return dp[m][n];
}

/**
 * Finds the closest matching action for a misspelled action name.
 */
export function findClosestAction(unknownAction: string): string | undefined {
  const normalized = unknownAction.toUpperCase().trim();
  let closest: string | undefined;
  let minDistance = 4; // Max threshold for suggestion

  for (const valid of SUPPORTED_UAT_ACTIONS) {
    const dist = levenshteinDistance(normalized, valid);
    if (dist < minDistance) {
      minDistance = dist;
      closest = valid;
    }
  }

  return closest;
}

/**
 * Comprehensive pre-flight validator for UAT scenario definitions.
 */
export function validateScenario(rawScenario: any): ValidationResult {
  const errors: ValidationErrorItem[] = [];
  const warnings: ValidationErrorItem[] = [];

  if (!rawScenario || typeof rawScenario !== 'object') {
    errors.push({
      message: 'Scenario definition must be a valid JSON object.'
    });
    return { valid: false, errors, warnings };
  }

  // 1. Top-level metadata validation
  if (!rawScenario.name || typeof rawScenario.name !== 'string' || !rawScenario.name.trim()) {
    errors.push({
      field: 'name',
      message: 'Missing or empty required property "name". Example: "name": "Homepage Checkout Flow"'
    });
  }

  if (!rawScenario.startUrl || typeof rawScenario.startUrl !== 'string' || !rawScenario.startUrl.trim()) {
    errors.push({
      field: 'startUrl',
      message: 'Missing or empty required property "startUrl". Example: "startUrl": "http://localhost:7777"'
    });
  } else if (!rawScenario.startUrl.startsWith('http://') && !rawScenario.startUrl.startsWith('https://')) {
    warnings.push({
      field: 'startUrl',
      message: `startUrl "${rawScenario.startUrl}" does not start with http:// or https://. Ensure it is a valid reachable target.`
    });
  }

  // 2. Viewports validation
  if (rawScenario.viewports) {
    if (!Array.isArray(rawScenario.viewports)) {
      errors.push({
        field: 'viewports',
        message: '"viewports" must be an array of viewport strings (e.g. ["mobile_standard", "desktop_fhd"]).'
      });
    } else {
      const knownViewports = Object.keys(STANDARD_VIEWPORTS);
      for (const vp of rawScenario.viewports) {
        if (typeof vp !== 'string' || !knownViewports.includes(vp)) {
          warnings.push({
            field: 'viewports',
            message: `Unknown viewport "${vp}". Available standard viewports: ${knownViewports.join(', ')}`
          });
        }
      }
    }
  }

  // 3. Recording configuration validation
  if (rawScenario.recording) {
    if (typeof rawScenario.recording !== 'object' || rawScenario.recording === null) {
      errors.push({
        field: 'recording',
        message: '"recording" must be an object (e.g. { "video": true, "trace": true, "screenshotOnFailure": true }).'
      });
    } else {
      if (rawScenario.recording.video !== undefined && typeof rawScenario.recording.video !== 'boolean') {
        errors.push({ field: 'recording.video', message: '"recording.video" must be a boolean.' });
      }
      if (rawScenario.recording.trace !== undefined && typeof rawScenario.recording.trace !== 'boolean') {
        errors.push({ field: 'recording.trace', message: '"recording.trace" must be a boolean.' });
      }
      if (rawScenario.recording.screenshotOnFailure !== undefined && typeof rawScenario.recording.screenshotOnFailure !== 'boolean') {
        errors.push({ field: 'recording.screenshotOnFailure', message: '"recording.screenshotOnFailure" must be a boolean.' });
      }
      if (rawScenario.recording.artifactsDir !== undefined && typeof rawScenario.recording.artifactsDir !== 'string') {
        errors.push({ field: 'recording.artifactsDir', message: '"recording.artifactsDir" must be a string path.' });
      }
    }
  }

  // 4. Steps list validation
  if (!rawScenario.steps || !Array.isArray(rawScenario.steps)) {
    errors.push({
      field: 'steps',
      message: 'Missing or invalid required property "steps". Must be an array of UAT step objects.'
    });
    return { valid: false, errors, warnings };
  }

  if (rawScenario.steps.length === 0) {
    errors.push({
      field: 'steps',
      message: 'Scenario must contain at least one step in the "steps" array.'
    });
    return { valid: false, errors, warnings };
  }

  // 4. Per-step validation
  rawScenario.steps.forEach((step: any, idx: number) => {
    const stepNum = idx + 1;

    if (!step || typeof step !== 'object') {
      errors.push({
        stepIndex: stepNum,
        message: `Step [${stepNum}] is not a valid object.`
      });
      return;
    }

    if (!step.description) {
      warnings.push({
        stepIndex: stepNum,
        message: `Step [${stepNum}] has no "description". Adding a human-readable description makes test reports easy to follow.`
      });
    }

    if (!step.action || typeof step.action !== 'string') {
      errors.push({
        stepIndex: stepNum,
        field: 'action',
        message: `Step [${stepNum}] is missing required "action" property.`
      });
      return;
    }

    const action = step.action.toUpperCase().trim() as UatActionType;
    if (!SUPPORTED_UAT_ACTIONS.includes(action)) {
      const suggestion = findClosestAction(step.action);
      errors.push({
        stepIndex: stepNum,
        field: 'action',
        message: `Step [${stepNum}] specifies unknown action "${step.action}".`,
        suggestion: suggestion ? `Did you mean "${suggestion}"?` : `Available actions: ${SUPPORTED_UAT_ACTIONS.slice(0, 10).join(', ')}...`
      });
      return;
    }

    // Per-action required argument verification
    switch (action) {
      case 'GOTO':
        if (!step.url || typeof step.url !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'url',
            message: `Step [${stepNum}] (${action}): Missing required string property "url". Example: "url": "/login" or "url": "https://example.com"`
          });
        }
        break;

      case 'CLICK':
      case 'DOUBLE_CLICK':
      case 'HOVER':
      case 'CLEAR':
      case 'CHECK':
      case 'UNCHECK':
      case 'SCROLL_TO':
      case 'ASSERT_VISIBLE':
      case 'ASSERT_HIDDEN':
      case 'ASSERT_NOT_VISIBLE':
      case 'ASSERT_UNOCCLUDED':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector". Example: "selector": "#my-button"`
          });
        }
        break;

      case 'ASSERT_TOUCH_TARGET':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector". Example: "selector": "#cta-button"`
          });
        }
        if (step.minPx !== undefined && (typeof step.minPx !== 'number' || step.minPx <= 0)) {
          errors.push({
            stepIndex: stepNum,
            field: 'minPx',
            message: `Step [${stepNum}] (${action}): "minPx" must be a positive number. Default: 44.`
          });
        }
        break;

      case 'ASSERT_CONTRAST':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector". Example: "selector": ".card-title"`
          });
        }
        if (step.minRatio !== undefined && (typeof step.minRatio !== 'number' || step.minRatio <= 0)) {
          errors.push({
            stepIndex: stepNum,
            field: 'minRatio',
            message: `Step [${stepNum}] (${action}): "minRatio" must be a positive number. Default: 4.5.`
          });
        }
        break;

      case 'ASSERT_NO_CLIPPING':
        if (step.selector !== undefined && typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): "selector" if specified must be a string.`
          });
        }
        break;

      case 'TYPE':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector".`
          });
        }
        if (step.text === undefined || typeof step.text !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'text',
            message: `Step [${stepNum}] (${action}): Missing required string property "text". Example: "text": "hello@example.com"`
          });
        }
        break;

      case 'SELECT':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector".`
          });
        }
        if (step.value === undefined && step.text === undefined) {
          errors.push({
            stepIndex: stepNum,
            field: 'value',
            message: `Step [${stepNum}] (${action}): Must specify either "value" or "text" for the option to select.`
          });
        }
        break;

      case 'PRESS_KEY':
        if (!step.key || typeof step.key !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'key',
            message: `Step [${stepNum}] (${action}): Missing required string property "key". Examples: "key": "Enter", "key": "Escape", "key": "Tab"`
          });
        }
        break;

      case 'WAIT_FOR':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector".`
          });
        }
        if (step.state && !['visible', 'hidden', 'attached', 'detached'].includes(step.state)) {
          errors.push({
            stepIndex: stepNum,
            field: 'state',
            message: `Step [${stepNum}] (${action}): Invalid state "${step.state}". Must be one of: "visible", "hidden", "attached", "detached".`
          });
        }
        break;

      case 'ASSERT_TEXT':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector".`
          });
        }
        if (step.text === undefined || typeof step.text !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'text',
            message: `Step [${stepNum}] (${action}): Missing required string property "text".`
          });
        }
        break;

      case 'ASSERT_VALUE':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector".`
          });
        }
        if (step.value === undefined && step.text === undefined) {
          errors.push({
            stepIndex: stepNum,
            field: 'value',
            message: `Step [${stepNum}] (${action}): Missing required "value" or "text" to assert.`
          });
        }
        break;

      case 'ASSERT_COUNT':
        if (!step.selector || typeof step.selector !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'selector',
            message: `Step [${stepNum}] (${action}): Missing required string property "selector".`
          });
        }
        if (typeof step.count !== 'number') {
          errors.push({
            stepIndex: stepNum,
            field: 'count',
            message: `Step [${stepNum}] (${action}): Missing or non-numeric required property "count". Example: "count": 3`
          });
        }
        if (step.operator && !['equals', 'greaterThan', 'lessThan'].includes(step.operator)) {
          errors.push({
            stepIndex: stepNum,
            field: 'operator',
            message: `Step [${stepNum}] (${action}): Invalid operator "${step.operator}". Must be "equals", "greaterThan", or "lessThan".`
          });
        }
        break;

      case 'ASSERT_URL':
        if (!step.url || typeof step.url !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'url',
            message: `Step [${stepNum}] (${action}): Missing required string property "url" to match against current URL.`
          });
        }
        break;

      case 'ASSERT_TITLE':
        if (!step.text || typeof step.text !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'text',
            message: `Step [${stepNum}] (${action}): Missing required string property "text" to match against document title.`
          });
        }
        break;

      case 'EXECUTE_SCRIPT':
        if (!step.script || typeof step.script !== 'string') {
          errors.push({
            stepIndex: stepNum,
            field: 'script',
            message: `Step [${stepNum}] (${action}): Missing required string property "script". Example: "script": "window.scrollTo(0, 0);"`
          });
        }
        break;

      case 'SCROLL':
        if (step.scrollPx !== undefined && typeof step.scrollPx !== 'number') {
          errors.push({
            stepIndex: stepNum,
            field: 'scrollPx',
            message: `Step [${stepNum}] (${action}): "scrollPx" must be a number.`
          });
        }
        break;

      case 'WAIT':
        if (step.waitMs !== undefined && typeof step.waitMs !== 'number') {
          errors.push({
            stepIndex: stepNum,
            field: 'waitMs',
            message: `Step [${stepNum}] (${action}): "waitMs" must be a number.`
          });
        }
        break;
    }

    // Universal type checks
    if (step.timeoutMs !== undefined && typeof step.timeoutMs !== 'number') {
      errors.push({
        stepIndex: stepNum,
        field: 'timeoutMs',
        message: `Step [${stepNum}]: "timeoutMs" must be a number.`
      });
    }

    if (step.optional !== undefined && typeof step.optional !== 'boolean') {
      errors.push({
        stepIndex: stepNum,
        field: 'optional',
        message: `Step [${stepNum}]: "optional" must be a boolean (true or false).`
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Formats validation output for clean CLI terminal printing.
 */
export function formatValidationReport(result: ValidationResult, scenarioName?: string): string {
  const lines: string[] = [];
  lines.push('\n📋 Scenario Validation Report' + (scenarioName ? ` for "${scenarioName}"` : ''));
  lines.push('───────────────────────────────────────────────────────');

  if (result.valid) {
    lines.push('✅ Scenario syntax and action parameters are 100% valid.');
  } else {
    lines.push(`🚨 Found ${result.errors.length} validation error(s):`);
    result.errors.forEach((err) => {
      lines.push(`   ❌ ${err.message}`);
      if (err.suggestion) {
        lines.push(`      💡 Suggestion: ${err.suggestion}`);
      }
    });
  }

  if (result.warnings.length > 0) {
    lines.push(`\n⚠️  ${result.warnings.length} advisory warning(s):`);
    result.warnings.forEach((warn) => {
      lines.push(`   🔸 ${warn.message}`);
    });
  }

  lines.push('───────────────────────────────────────────────────────\n');
  return lines.join('\n');
}
