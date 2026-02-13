import { CONTENT_POLICY } from '../content-policy.js';
import type { PagePlanContext } from '../context-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { ReducedPagePlanResult } from '../planner-types.js';
import { CONTINUATION_ACTIVE_STATE_QUALITY } from './sections/continuation/index.js';
import {
  buildPlannerContinuationContextSection,
  buildPlannerOpeningContextSection,
  PLANNER_STATE_INTENT_RULES,
  buildNarrativePromisesSection,
  buildPayoffFeedbackSection,
  buildThreadAgingSection,
} from './sections/planner/index.js';
import { buildToneBlock, buildToneReminder } from './sections/shared/tone-block.js';

function formatReducedPlanForAccountant(plan: ReducedPagePlanResult): string {
  const anchors =
    plan.continuityAnchors.length > 0
      ? plan.continuityAnchors.map((a) => `- ${a}`).join('\n')
      : '- (none)';

  const beats =
    plan.writerBrief.mustIncludeBeats.length > 0
      ? plan.writerBrief.mustIncludeBeats.map((b) => `  - ${b}`).join('\n')
      : '  - (none)';

  const recaps =
    plan.writerBrief.forbiddenRecaps.length > 0
      ? plan.writerBrief.forbiddenRecaps.map((r) => `  - ${r}`).join('\n')
      : '  - (none)';

  const choices = plan.choiceIntents
    .map((intent, i) => `${i + 1}. [${intent.choiceType} / ${intent.primaryDelta}] ${intent.hook}`)
    .join('\n');

  return `Scene Intent: ${plan.sceneIntent}

Continuity Anchors:
${anchors}

Writer Brief:
- Opening line directive: ${plan.writerBrief.openingLineDirective}
- Must include beats:
${beats}
- Forbidden recaps:
${recaps}

Dramatic Question: ${plan.dramaticQuestion}

Choice Intents:
${choices}`;
}

const ACCOUNTANT_ROLE_INTRO = `You are a state accountant for interactive fiction.`;

const ACCOUNTANT_RULES = `Generate stateIntents only.
- Output machine-readable planning intents only.
- Do not narrate the scene.
- Do not assign server IDs.
- Keep output deterministic and concise.
- Align all state intents with the provided reduced planner output.`;

function buildStateAccountantSystemPrompt(
  tone?: string,
  toneKeywords?: readonly string[],
  toneAntiKeywords?: readonly string[]
): string {
  const sections: string[] = [ACCOUNTANT_ROLE_INTRO];

  if (tone) {
    sections.push(buildToneBlock(tone, toneKeywords, toneAntiKeywords));
  }

  sections.push(CONTENT_POLICY, ACCOUNTANT_RULES);
  return sections.join('\n\n');
}

export function buildStateAccountantPrompt(
  context: PagePlanContext,
  reducedPlan: ReducedPagePlanResult
): ChatMessage[] {
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

  const qualityCriteriaSection =
    context.mode === 'continuation' ? `\n${CONTINUATION_ACTIVE_STATE_QUALITY}\n` : '';

  const threadAgingSection =
    context.mode === 'continuation'
      ? buildThreadAgingSection(context.activeState.openThreads, context.threadAges ?? {})
      : '';

  const narrativePromisesSection =
    context.mode === 'continuation'
      ? buildNarrativePromisesSection(
          context.inheritedNarrativePromises ?? [],
          context.parentAnalystNarrativePromises ?? []
        )
      : '';

  const payoffFeedbackSection =
    context.mode === 'continuation'
      ? buildPayoffFeedbackSection(context.parentThreadPayoffAssessments ?? [])
      : '';

  const userPrompt = `Create state intents for the next page.

${contextSection}
${reconciliationRetrySection}

=== REDUCED PLANNER OUTPUT ===
${formatReducedPlanForAccountant(reducedPlan)}

${PLANNER_STATE_INTENT_RULES}
${qualityCriteriaSection}${threadAgingSection}${narrativePromisesSection}${payoffFeedbackSection}${toneReminderLine}

Return JSON only.`;

  const systemPrompt = buildStateAccountantSystemPrompt(
    context.tone,
    context.toneKeywords,
    context.toneAntiKeywords
  );

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
