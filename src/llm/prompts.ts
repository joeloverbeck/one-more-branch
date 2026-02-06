import { CONTENT_POLICY } from './content-policy.js';
import type { ChatMessage, ContinuationContext, OpeningContext } from './types.js';

const SYSTEM_PROMPT = `You are an expert interactive fiction storyteller and Dungeon Master. Your role is to craft immersive, engaging narratives that respond to player choices while maintaining consistency with established world facts and character traits.

${CONTENT_POLICY}

STORYTELLING GUIDELINES:
- Write vivid, evocative prose that brings the world to life.
- Use second person perspective ("you").
- Maintain consistency with established facts and character personality.
- Present meaningful choices that have genuine consequences.
- Honor player agency while maintaining narrative coherence.
- Build tension and dramatic stakes naturally.
- React believably to player choices.
- Each choice should represent a genuinely different path.

When writing endings (character death, victory, conclusion):
- Make the ending feel earned and meaningful.
- Provide closure appropriate to the story.
- Leave no choices when the story concludes.`;

export function buildOpeningPrompt(context: OpeningContext): ChatMessage[] {
  const worldSection = context.worldbuilding
    ? `WORLDBUILDING:
${context.worldbuilding}

`
    : '';

  const userPrompt = `Create the opening scene for a new interactive story.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}TONE/GENRE: ${context.tone}

Write an engaging opening that:
1. Introduces the protagonist in a compelling scene.
2. Establishes the world and atmosphere matching the tone.
3. Presents an initial situation or hook that draws the player in.
4. Provides 2-4 meaningful choices for what the protagonist might do.

Also determine the overarching goal or conflict for this story (the story arc).`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}

export function buildContinuationPrompt(context: ContinuationContext): ChatMessage[] {
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

${storyArcSection}${canonSection}${stateSection}PREVIOUS SCENE:
${truncateText(context.previousNarrative, 2000)}

PLAYER'S CHOICE: "${context.selectedChoice}"

Continue the story:
1. Show the direct consequences of the player's choice.
2. Advance the narrative naturally from this decision.
3. Maintain consistency with all established facts and the current state.
4. Present 2-4 new meaningful choices (unless this leads to an ending).`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
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
