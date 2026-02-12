import type { AnalystContext, ChatMessage } from '../types.js';
import { buildAnalystStructureEvaluation } from './continuation/story-structure-section.js';

const ANALYST_SYSTEM_PROMPT = `You are a story structure analyst for interactive fiction. Your role is to evaluate a narrative passage against a planned story structure and determine:
1. Whether the current story beat has been concluded
2. Whether the narrative has deviated from the planned beats

You analyze ONLY structure progression and deviation. You do NOT write narrative or make creative decisions.

Use this strict sequence:
Step A: Classify scene signals using the provided enums.
Step B: Apply the completion gate against the active beat objective before deciding beatConcluded.

Before setting beatConcluded, extract 1-3 objective anchors from activeBeat.objective and map each anchor to concrete evidence.
Evidence is cumulative across the current narrative and active state.
If no anchor has explicit evidence, beatConcluded must be false.

Be analytical and precise. Evaluate cumulative progress, not just single scenes.
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.`;

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
    context.threadAges,
  );

  const userContent = `${structureEvaluation}\nNARRATIVE TO EVALUATE:\n${context.narrative}`;

  return [
    { role: 'system', content: ANALYST_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}
