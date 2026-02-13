import { CONTENT_POLICY } from '../content-policy.js';
import type { PagePlanContext } from '../context-types.js';
import type { ChatMessage } from '../llm-client-types.js';
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
- You propose a dramaticQuestion that the scene raises and choiceIntents as a blueprint for the writer's choices.
- choiceIntents are suggestions, not final text. The writer may adjust wording and tags if the narrative warrants it.
- You do not assign server IDs.
- Keep output deterministic and concise.
- Consider NPC agendas when planning scenes. NPCs with active goals may initiate encounters, block the protagonist, or create complications based on their off-screen behavior.`;

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
  .map(
    (reason) => `- [${reason.code}]${reason.field ? ` (${reason.field})` : ''} ${reason.message}`
  )
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
