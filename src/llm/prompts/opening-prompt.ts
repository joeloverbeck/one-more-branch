import { buildFewShotMessages } from '../examples.js';
import type { ChatMessage, OpeningContext, PromptOptions } from '../types.js';
import { buildSystemPrompt } from './system-prompt.js';

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
6. Establish starting inventory based on the character concept (use inventoryAdded for items they would logically possess)
7. If the character concept implies any starting physical conditions (old injuries, chronic ailments, exhaustion), use healthAdded to establish them

REMINDER: Each choice must be something this specific character would genuinely consider. Starting inventory should reflect the character's background and profession. Starting health conditions should only be added if the character concept explicitly mentions them.`;

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
