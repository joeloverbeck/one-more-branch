import { CONTENT_POLICY } from '../content-policy.js';
import type { PagePlanContext } from '../context-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import {
  buildPlannerContinuationContextSection,
  buildPlannerOpeningContextSection,
  PLANNER_STATE_INTENT_RULES,
} from './sections/planner/index.js';
import { buildToneBlock, buildToneReminder } from './sections/shared/tone-block.js';

const PLANNER_ROLE_INTRO = `You are an interactive fiction page planner.`;

const PLANNER_RULES = `Plan the next page before prose generation.
- You output machine-readable planning intents only.
- You do not narrate the scene.
- You propose a dramaticQuestion that the scene raises and choiceIntents as a blueprint for the writer's choices.
- choiceIntents are suggestions, not final text. The writer may adjust wording and tags if the narrative warrants it.
- You do not assign server IDs.
- Keep output deterministic and concise.
- Consider NPC agendas when planning scenes. NPCs with active goals may initiate encounters, block the protagonist, or create complications based on their off-screen behavior.`;

const PLANNER_TONE_RULE = `TONE RULE: Write your sceneIntent, writerBrief.openingLineDirective, mustIncludeBeats, and dramaticQuestion in a voice that reflects the TONE/GENRE. If the tone is comedic, your plan should read as witty and playful. If noir, terse and cynical. The writer will absorb your voice.`;

function buildPagePlannerSystemPrompt(
  tone?: string,
  toneKeywords?: readonly string[],
  toneAntiKeywords?: readonly string[]
): string {
  const sections: string[] = [PLANNER_ROLE_INTRO];

  if (tone) {
    sections.push(buildToneBlock(tone, toneKeywords, toneAntiKeywords));
  }

  sections.push(CONTENT_POLICY, PLANNER_RULES, PLANNER_TONE_RULE);
  return sections.join('\n\n');
}

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

  const toneReminderLine = buildToneReminder(
    context.tone,
    context.toneKeywords,
    context.toneAntiKeywords
  );

  const userPrompt = `Create a page plan for the writer model.

${contextSection}
${reconciliationRetrySection}

${PLANNER_STATE_INTENT_RULES}

${toneReminderLine}

Return JSON only.`;

  const systemPrompt = buildPagePlannerSystemPrompt(
    context.tone,
    context.toneKeywords,
    context.toneAntiKeywords
  );

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
