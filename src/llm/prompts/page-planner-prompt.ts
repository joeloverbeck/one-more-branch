import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage, PagePlanContext } from '../types.js';
import {
  buildPlannerContinuationContextSection,
  buildPlannerOpeningContextSection,
  PLANNER_STATE_INTENT_RULES,
} from './sections/planner/index.js';

const PAGE_PLANNER_SYSTEM_PROMPT = `You are an interactive fiction page planner.

${CONTENT_POLICY}

Plan the next page before prose generation.
- You output machine-readable planning intents only.
- You do not narrate the scene.
- You do not produce player choices.
- You do not assign server IDs.
- Keep output deterministic and concise.`;

export function buildPagePlannerPrompt(context: PagePlanContext): ChatMessage[] {
  const contextSection =
    context.mode === 'opening'
      ? buildPlannerOpeningContextSection(context)
      : buildPlannerContinuationContextSection(context);
  const reconciliationRetrySection =
    context.reconciliationFailureReasons && context.reconciliationFailureReasons.length > 0
      ? `\n\n=== RECONCILIATION FAILURE REASONS (RETRY) ===
Prior attempt failed deterministic reconciliation. You MUST correct these failures:
${context.reconciliationFailureReasons
  .map(reason => `- [${reason.code}]${reason.field ? ` (${reason.field})` : ''} ${reason.message}`)
  .join('\n')}`
      : '';

  const userPrompt = `Create a page plan for the writer model.

${contextSection}
${reconciliationRetrySection}

${PLANNER_STATE_INTENT_RULES}

Return JSON only.`;

  return [
    { role: 'system', content: PAGE_PLANNER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
