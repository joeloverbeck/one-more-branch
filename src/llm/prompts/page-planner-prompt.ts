import { CONTENT_POLICY } from '../content-policy.js';
import type { PagePlanContext } from '../context-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { PAGE_PLANNER_PROMPT_RULES, PAGE_PLANNER_TONE_RULE } from '../page-planner-contract.js';
import type { SelectedSceneDirection } from '../../models/scene-direction.js';
import {
  SCENE_PURPOSE_LABELS,
  VALUE_POLARITY_SHIFT_LABELS,
  PACING_MODE_LABELS,
} from '../../models/scene-direction-taxonomy.js';
import {
  buildPlannerContinuationContextSection,
  buildPlannerOpeningContextSection,
} from './sections/planner/index.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

function buildSceneDirectionSection(direction: SelectedSceneDirection): string {
  return `\n\n=== SCENE DIRECTION (selected by player) ===
The player has chosen the following scene direction. You MUST honour these constraints:
- Scene Purpose: ${SCENE_PURPOSE_LABELS[direction.scenePurpose]} (${direction.scenePurpose})
- Value Polarity Shift: ${VALUE_POLARITY_SHIFT_LABELS[direction.valuePolarityShift]} (${direction.valuePolarityShift})
- Pacing Mode: ${PACING_MODE_LABELS[direction.pacingMode]} (${direction.pacingMode})
- Direction: ${direction.sceneDirection}
- Dramatic Justification: ${direction.dramaticJustification}

Your page plan MUST align with the above direction. The scene purpose, value shift, and pacing mode are binding constraints. The direction text and dramatic justification provide creative intent you should follow faithfully.`;
}

const PLANNER_ROLE_INTRO = `You are an interactive fiction page planner.`;

const PLANNER_RULES = `Plan the next page before prose generation.
${PAGE_PLANNER_PROMPT_RULES.map((rule) => `- ${rule}`).join('\n')}`;

function buildPagePlannerSystemPrompt(
  tone?: string,
  toneFeel?: readonly string[],
  toneAvoid?: readonly string[]
): string {
  const sections: string[] = [PLANNER_ROLE_INTRO];

  if (tone) {
    sections.push(buildToneDirective(tone, toneFeel, toneAvoid));
  }

  sections.push(CONTENT_POLICY, PLANNER_RULES, PAGE_PLANNER_TONE_RULE);
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

  const toneReminderLine = '';

  const spineSection = buildSpineSection(context.spine);
  const sceneDirectionSection = context.selectedSceneDirection
    ? buildSceneDirectionSection(context.selectedSceneDirection)
    : '';

  const userPrompt = `Create a page plan for the writer model.

${spineSection}${contextSection}
${sceneDirectionSection}${reconciliationRetrySection}

${toneReminderLine}

Return JSON only.`;

  const systemPrompt = buildPagePlannerSystemPrompt(
    context.tone,
    context.toneFeel,
    context.toneAvoid
  );

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
