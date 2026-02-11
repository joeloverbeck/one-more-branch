import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage, PagePlanContext } from '../types.js';
import {
  buildPlannerContinuationContextSection,
  buildPlannerOpeningContextSection,
  PLANNER_OUTPUT_SHAPE_INSTRUCTIONS,
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

  const userPrompt = `Create a page plan for the writer model.

${contextSection}

${PLANNER_STATE_INTENT_RULES}

${PLANNER_OUTPUT_SHAPE_INSTRUCTIONS}

Return JSON only.`;

  return [
    { role: 'system', content: PAGE_PLANNER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
