import type { AnalystContext } from '../analyst-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildAnalystStructureEvaluation } from './continuation/story-structure-section.js';
import { buildToneBlock, buildToneReminder } from './sections/shared/tone-block.js';

const ANALYST_ROLE_INTRO = `You are a story structure analyst for interactive fiction. Your role is to evaluate a narrative passage against a planned story structure and determine:
1. Whether the current story beat has been concluded
2. Whether the narrative has deviated from the planned beats
3. Whether the narrative adheres to the target tone`;

const ANALYST_RULES = `You analyze structure progression, deviation, and tone adherence. You do NOT write narrative or make creative decisions.

Use this strict sequence:
Step A: Classify scene signals using the provided enums.
Step B: Apply the completion gate against the active beat objective before deciding beatConcluded.
Step C: Evaluate whether the narrative prose matches the target TONE/GENRE.

Before setting beatConcluded, extract 1-3 objective anchors from activeBeat.objective and map each anchor to concrete evidence.
Evidence is cumulative across the current narrative and active state.
If no anchor has explicit evidence, beatConcluded must be false.

TONE EVALUATION:
- Set toneAdherent to true if the narrative's mood, vocabulary, and emotional register match the target tone.
- Set toneAdherent to false if the narrative drifts toward a different genre feel (e.g., grimdark when tone should be comedic).
- When toneAdherent is false, write a brief toneDriftDescription explaining what feels off and what the tone should be instead.
- When toneAdherent is true, set toneDriftDescription to an empty string.

Be analytical and precise. Evaluate cumulative progress, not just single scenes.
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.`;

function buildAnalystSystemPrompt(
  tone?: string,
  toneKeywords?: readonly string[],
  toneAntiKeywords?: readonly string[]
): string {
  const sections: string[] = [ANALYST_ROLE_INTRO];

  if (tone) {
    sections.push(buildToneBlock(tone, toneKeywords, toneAntiKeywords));
  }

  sections.push(ANALYST_RULES);
  return sections.join('\n\n');
}

function buildActivePromisesSection(context: AnalystContext): string {
  const activeTrackedPromises = context.activeTrackedPromises ?? [];
  if (activeTrackedPromises.length === 0) {
    return '';
  }

  const lines = [
    'ACTIVE TRACKED PROMISES:',
    ...activeTrackedPromises.map(
      (promise) =>
        `- [${promise.id}] (${promise.promiseType}/${promise.suggestedUrgency}, ${promise.age} pages old) ${promise.description}`
    ),
    '',
    'Use these IDs for promisesResolved when a promise is explicitly paid off in this scene.',
  ];

  return `${lines.join('\n')}\n`;
}

/**
 * Builds the analyst prompt messages for the analyst LLM call.
 * Returns a system message with analyst instructions and a user message
 * containing the structure evaluation section and the narrative to evaluate.
 *
 * @param context - The analyst context containing narrative, structure, and state
 * @returns Array of ChatMessage with system and user messages
 */
export function buildAnalystPrompt(context: AnalystContext): ChatMessage[] {
  const structureEvaluation = buildAnalystStructureEvaluation(
    context.structure,
    context.accumulatedStructureState,
    context.activeState,
    context.threadsResolved,
    context.threadAges
  );

  const toneReminder = context.tone
    ? `\n${buildToneReminder(context.tone, context.toneKeywords, context.toneAntiKeywords)}\n`
    : '';
  const activePromisesSection = buildActivePromisesSection(context);

  const userContent = `${structureEvaluation}${toneReminder}${activePromisesSection}\nNARRATIVE TO EVALUATE:\n${context.narrative}`;

  const systemPrompt = buildAnalystSystemPrompt(
    context.tone,
    context.toneKeywords,
    context.toneAntiKeywords
  );

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
