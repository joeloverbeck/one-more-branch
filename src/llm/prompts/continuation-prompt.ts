import { buildFewShotMessages } from '../examples.js';
import type { ChatMessage, ContinuationContext, PromptOptions } from '../types.js';
import { buildSystemPrompt } from './system-prompt.js';
import { truncateText } from './utils.js';

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

  const inventorySection =
    context.accumulatedInventory.length > 0
      ? `YOUR INVENTORY:
${context.accumulatedInventory.map(item => `- ${item}`).join('\n')}

`
      : '';

  const healthSection =
    context.accumulatedHealth.length > 0
      ? `YOUR HEALTH:
${context.accumulatedHealth.map(entry => `- ${entry}`).join('\n')}

`
      : `YOUR HEALTH:
- You feel fine.

`;

  const userPrompt = `Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}TONE/GENRE: ${context.tone}

${storyArcSection}${canonSection}${characterCanonSection}${stateSection}${inventorySection}${healthSection}PREVIOUS SCENE:
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
