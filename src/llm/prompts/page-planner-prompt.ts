import { CONTENT_POLICY } from '../content-policy.js';
import type { PagePlanContext } from '../context-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { PAGE_PLANNER_PROMPT_RULES, PAGE_PLANNER_TONE_RULE } from '../page-planner-contract.js';
import {
  buildPlannerContinuationContextSection,
  buildPlannerOpeningContextSection,
} from './sections/planner/index.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildToneBlock, buildToneReminder } from './sections/shared/tone-block.js';

const PLANNER_ROLE_INTRO = `You are an interactive fiction page planner.`;

const PLANNER_RULES = `Plan the next page before prose generation.
${PAGE_PLANNER_PROMPT_RULES.map((rule) => `- ${rule}`).join('\n')}`;

function buildPagePlannerSystemPrompt(
  tone?: string,
  toneKeywords?: readonly string[],
  toneAntiKeywords?: readonly string[]
): string {
  const sections: string[] = [PLANNER_ROLE_INTRO];

  if (tone) {
    sections.push(buildToneBlock(tone, toneKeywords, toneAntiKeywords));
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

  const toneReminderLine = buildToneReminder(
    context.tone,
    context.toneKeywords,
    context.toneAntiKeywords
  );

  const spineSection = buildSpineSection(context.spine);

  const userPrompt = `Create a page plan for the writer model.

${spineSection}${contextSection}
${reconciliationRetrySection}

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
