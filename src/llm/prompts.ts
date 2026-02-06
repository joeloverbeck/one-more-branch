import { CONTENT_POLICY } from './content-policy.js';
import { buildFewShotMessages } from './examples.js';
import type { ChatMessage, ContinuationContext, OpeningContext, PromptOptions } from './types.js';

const SYSTEM_PROMPT = `You are an expert interactive fiction storyteller and Dungeon Master. Your role is to craft immersive, engaging narratives that respond to player choices while maintaining consistency with established world facts and character traits.

${CONTENT_POLICY}

STORYTELLING GUIDELINES:
- Write vivid, evocative prose that brings the world to life.
- Use second person perspective ("you").
- Show character through action, not exposition—let behavior reveal personality.
- Keep scenes focused and forward-moving; avoid sprawling recaps.
- Maintain consistency with established facts and character personality.
- Present meaningful choices that have genuine consequences.
- Honor player agency while maintaining narrative coherence.
- Build tension and dramatic stakes naturally.
- React believably to player choices.
- Each choice should represent a genuinely different path.

CONTINUITY RULES:
- Do NOT contradict Established World Facts or Current State.
- Do NOT retcon names, roles, species, or relationships already established.
- Any new permanent facts introduced MUST appear in newCanonFacts or newCharacterCanonFacts.

STATE CHANGE FORMAT:
- Use second person ("You") for events affecting the player character (e.g., "You discovered...", "You were wounded...").
- Identify other characters by their full name when available (e.g., "Captain Mira was wounded", not "The captain was wounded").
- Keep state changes concise but specific.

When writing endings (character death, victory, conclusion):
- Make the ending feel earned and meaningful.
- Provide closure appropriate to the story.
- Leave no choices when the story concludes.`;

const STRICT_CHOICE_GUIDELINES = `

CHOICE REQUIREMENTS (CRITICAL):
Each choice MUST satisfy ALL of the following:

1. IN-CHARACTER: The protagonist would genuinely consider this action given their personality and situation
2. CONSEQUENTIAL: The choice meaningfully changes the story direction
3. DIVERGENT: Each choice leads to a DIFFERENT storyline - not variations of the same outcome
4. ACTIONABLE: Describes a concrete action with active verbs (not "think about" or "consider")
5. BALANCED: Mix of cautious, bold, and creative options when appropriate

FORBIDDEN CHOICE PATTERNS:
- "Do nothing" / "Wait and see" (unless dramatically appropriate)
- Choices that contradict established character traits without justification
- Choices so similar they effectively lead to the same path
- Meta-choices like "See what happens" or "Continue exploring"

DIVERGENCE ENFORCEMENT:
Each choice MUST change at least ONE of the following:
(1) Location, (2) Immediate goal, (3) NPC relationship or stance,
(4) Time pressure or urgency, (5) Control of a key item,
(6) Heat/attention level, (7) Injury or condition.
If you cannot produce 2-3 choices that each change a different element, consider making this an ENDING.`;

const COT_SYSTEM_ADDITION = `

REASONING PROCESS:
Before generating your response, think through your approach inside <thinking> tags:
1. Consider character motivations and current emotional state
2. Plan how this scene advances toward the story arc
3. Brainstorm 3-4 potential choices, then select the best 3 (add a 4th only if the situation truly warrants another distinct, meaningful path)
4. Verify each choice is in-character, consequential, and divergent

Format your response as:
<thinking>[your reasoning]</thinking>
<output>{JSON response}</output>

IMPORTANT: Your final JSON must be inside <output> tags.`;

/**
 * Builds the complete system prompt with optional enhancements.
 */
function buildSystemPrompt(options?: PromptOptions): string {
  let prompt = SYSTEM_PROMPT;

  // Add strict choice guidelines if requested
  if (options?.choiceGuidance === 'strict') {
    prompt += STRICT_CHOICE_GUIDELINES;
  }

  // Add CoT instructions if enabled
  if (options?.enableChainOfThought) {
    prompt += COT_SYSTEM_ADDITION;
  }

  return prompt;
}

export function buildOpeningPrompt(
  context: OpeningContext,
  options?: PromptOptions,
): ChatMessage[] {
  const worldSection = context.worldbuilding
    ? `WORLDBUILDING:
${context.worldbuilding}

`
    : '';

  const userPrompt = `Create the opening scene for a new interactive story.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}TONE/GENRE: ${context.tone}

REQUIREMENTS (follow ALL):
1. Introduce the protagonist in a compelling scene that reveals their personality through action
2. Establish the world and atmosphere matching the specified tone
3. Present an initial situation with immediate tension or intrigue that draws the player in
4. Provide 3 meaningful choices leading to genuinely DIFFERENT story directions (add a 4th only when the situation truly warrants another distinct path)
5. Determine the overarching goal or conflict for this story (the story arc)

REMINDER: Each choice must be something this specific character would genuinely consider.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(options) },
  ];

  // Add few-shot examples if requested
  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(...buildFewShotMessages('opening', options.fewShotMode));
  }

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}

export function buildContinuationPrompt(
  context: ContinuationContext,
  options?: PromptOptions,
): ChatMessage[] {
  const worldSection = context.worldbuilding
    ? `WORLDBUILDING:
${context.worldbuilding}

`
    : '';
  const storyArcSection = context.storyArc
    ? `STORY ARC:
${context.storyArc}

`
    : '';
  const canonSection =
    context.globalCanon.length > 0
      ? `ESTABLISHED WORLD FACTS:
${context.globalCanon.map(fact => `- ${fact}`).join('\n')}

`
      : '';
  const characterCanonEntries = Object.entries(context.globalCharacterCanon);
  const characterCanonSection =
    characterCanonEntries.length > 0
      ? `CHARACTER INFORMATION:
${characterCanonEntries
  .map(([name, facts]) => `[${name}]\n${facts.map(fact => `- ${fact}`).join('\n')}`)
  .join('\n\n')}

`
      : '';
  const stateSection =
    context.accumulatedState.length > 0
      ? `CURRENT STATE:
${context.accumulatedState.map(change => `- ${change}`).join('\n')}

`
      : '';

  const userPrompt = `Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}TONE/GENRE: ${context.tone}

${storyArcSection}${canonSection}${characterCanonSection}${stateSection}PREVIOUS SCENE:
${truncateText(context.previousNarrative, 2000)}

PLAYER'S CHOICE: "${context.selectedChoice}"

REQUIREMENTS (follow ALL):
1. Start exactly where the previous scene ended—do NOT recap or summarize what happened
2. Show the direct, immediate consequences of the player's choice - the story must react
3. Advance the narrative naturally - time passes, situations evolve, new elements emerge
4. Maintain STRICT consistency with all established facts and the current state
5. Present 3 new meaningful choices unless this naturally leads to an ending (add a 4th only when the situation truly warrants another distinct path)
6. Ensure choices are divergent - each must lead to a genuinely different story path

REMINDER: If the player's choice naturally leads to a story conclusion, make it an ending (empty choices array, isEnding: true).`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(options) },
  ];

  // Add few-shot examples if requested
  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(...buildFewShotMessages('continuation', options.fewShotMode));
  }

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('!'),
  );

  if (lastSentenceEnd > maxLength * 0.5) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  return `${truncated}...`;
}
