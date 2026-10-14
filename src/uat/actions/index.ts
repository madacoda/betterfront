/**
 * BetterFront UAT - Unified Action Dispatcher (Command / Strategy Pattern)
 */

import { UatActionExecutionContext } from './context.js';
import { handleNavigationAndStateAction } from './navigationAndStateActions.js';
import { handleInteractionAction } from './interactionActions.js';
import { handleAssertionAction } from './assertionActions.js';

export * from './context.js';
export * from './navigationAndStateActions.js';
export * from './interactionActions.js';
export * from './assertionActions.js';

/**
 * Dispatches a UAT step action to its dedicated domain action handler.
 */
export async function dispatchUatStepAction(
  action: string,
  ctx: UatActionExecutionContext
): Promise<void> {
  if (await handleNavigationAndStateAction(action, ctx)) return;
  if (await handleInteractionAction(action, ctx)) return;
  if (await handleAssertionAction(action, ctx)) return;

  throw new Error(
    `Unknown or unsupported UAT action: "${ctx.step.action}". Refer to UAT Action Document for valid actions.`
  );
}
