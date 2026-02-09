import { formatNpcsForPrompt } from '../../models/npc.js';
import { buildFewShotMessages } from '../examples.js';
import type { ChatMessage, ContinuationContext, PromptOptions } from '../types.js';
import { buildContinuationSystemPrompt, composeContinuationDataRules } from './system-prompt.js';
import {
  buildProtagonistAffectSection,
  buildSceneContextSection,
  buildLocationSection,
  buildThreatsSection,
  buildConstraintsSection,
  buildThreadsSection,
  buildWriterStructureContext,
} from './continuation/index.js';

export function buildContinuationPrompt(
  context: ContinuationContext,
  options?: PromptOptions,
): ChatMessage[] {
  const dataRules = composeContinuationDataRules(options);

  const worldSection = context.worldbuilding
    ? `WORLDBUILDING:
${context.worldbuilding}

`
    : '';

  const npcsSection = context.npcs && context.npcs.length > 0
    ? `NPCS (Available Characters):
${formatNpcsForPrompt(context.npcs)}

These characters are available for use in the story. Introduce or involve them when narratively appropriate.

`
    : '';

  const structureSection = buildWriterStructureContext(
    context.structure,
    context.accumulatedStructureState,
  );

  const pacingNudgeSection = context.accumulatedStructureState?.pacingNudge
    ? `=== PACING DIRECTIVE ===
The story analyst detected a pacing issue: ${context.accumulatedStructureState.pacingNudge}
This page should advance the narrative toward resolving the current beat or deliver a meaningful story event.
Do not repeat setup or exposition -- push the story forward with action, revelation, or irreversible change.

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
      ? `CHARACTER INFORMATION (permanent traits):
${characterCanonEntries
  .map(([name, facts]) => `[${name}]\n${facts.map(fact => `- ${fact}`).join('\n')}`)
  .join('\n\n')}

`
      : '';

  const characterStateEntries = Object.entries(context.accumulatedCharacterState);
  const characterStateSection =
    characterStateEntries.length > 0
      ? `NPC CURRENT STATE (branch-specific events):
${characterStateEntries
  .map(([name, states]) => `[${name}]\n${states.map(state => `- ${state}`).join('\n')}`)
  .join('\n\n')}

`
      : '';

  // Build active state sections
  const locationSection = buildLocationSection(context.activeState);
  const threatsSection = buildThreatsSection(context.activeState);
  const constraintsSection = buildConstraintsSection(context.activeState);
  const threadsSection = buildThreadsSection(context.activeState);

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

  const protagonistAffectSection = buildProtagonistAffectSection(context.parentProtagonistAffect);

  // Build scene context with hierarchical ancestor summaries
  const sceneContextSection = buildSceneContextSection(
    context.previousNarrative,
    context.grandparentNarrative,
    context.ancestorSummaries,
  );

  const userPrompt = `Continue the interactive story based on the player's choice.

=== DATA & STATE RULES ===
${dataRules}

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}TONE/GENRE: ${context.tone}

${structureSection}${pacingNudgeSection}${canonSection}${characterCanonSection}${characterStateSection}${locationSection}${threatsSection}${constraintsSection}${threadsSection}${inventorySection}${healthSection}${protagonistAffectSection}${sceneContextSection}PLAYER'S CHOICE: "${context.selectedChoice}"

REQUIREMENTS (follow all):
1. Start exactly where the previous scene ended—do NOT recap or summarize what happened
   - Do NOT repeat or rephrase the last sentence of the previous scene
   - Begin with an action, dialogue, or reaction within the next 1-2 beats
2. Show the direct, immediate consequences of the player's choice - the story must react
3. Advance the narrative naturally - time passes, situations evolve, new elements emerge
4. Maintain consistency with all established facts and the current state
5. Present 3 new meaningful structured choice objects with text, choiceType, and primaryDelta - each choice MUST have a different choiceType OR primaryDelta (add a 4th only when the situation truly warrants another distinct path)
6. Ensure choices are divergent via their enum tags - each must change a different dimension of the story
7. Update protagonistAffect to reflect how the protagonist feels at the END of this scene (this is a fresh snapshot, not inherited from previous scenes)
8. Write a sceneSummary: 2-3 sentences summarizing the key events and consequences of this scene (for future context)

REMINDER: If the player's choice naturally leads to a story conclusion, make it an ending (empty choices array, isEnding: true). protagonistAffect should capture the protagonist's emotional state at the end of this scene - consider how the events of this scene have affected them.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildContinuationSystemPrompt() },
  ];

  // Add few-shot examples if requested
  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(...buildFewShotMessages('continuation', options.fewShotMode));
  }

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}
