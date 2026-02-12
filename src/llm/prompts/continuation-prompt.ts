import { formatNpcsForPrompt } from '../../models/npc.js';
import { buildFewShotMessages } from '../examples.js';
import type { ChatMessage, ContinuationContext, PromptOptions, StoryBible } from '../types.js';
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

function formatStoryBibleSection(bible: StoryBible): string {
  let result = '=== STORY BIBLE (curated for this scene) ===\n\n';

  if (bible.sceneWorldContext) {
    result += `SCENE WORLD CONTEXT:\n${bible.sceneWorldContext}\n\n`;
  }

  if (bible.relevantCharacters.length > 0) {
    result += 'SCENE CHARACTERS:\n';
    for (const char of bible.relevantCharacters) {
      result += `[${char.name}] (${char.role})\n`;
      result += `  Profile: ${char.relevantProfile}\n`;
      result += `  Speech: ${char.speechPatterns}\n`;
      result += `  Relationship to protagonist: ${char.protagonistRelationship}\n`;
      if (char.interCharacterDynamics) {
        result += `  Inter-character dynamics: ${char.interCharacterDynamics}\n`;
      }
      result += `  Current state: ${char.currentState}\n\n`;
    }
  }

  if (bible.relevantCanonFacts.length > 0) {
    result += `RELEVANT CANON FACTS:\n${bible.relevantCanonFacts.map(f => `- ${f}`).join('\n')}\n\n`;
  }

  if (bible.relevantHistory) {
    result += `RELEVANT HISTORY:\n${bible.relevantHistory}\n\n`;
  }

  return result;
}

/**
 * Builds the scene context section for writer prompts when a Story Bible is present.
 * Replaces ancestor summaries with the bible's relevantHistory, but keeps
 * grandparent and parent full narrative for voice continuity.
 */
function buildSceneContextWithBible(
  previousNarrative: string,
  grandparentNarrative: string | null,
): string {
  let result = '';

  if (grandparentNarrative) {
    result += `SCENE BEFORE LAST (full text for style continuity):
${grandparentNarrative}

`;
  }

  result += `PREVIOUS SCENE (full text for style continuity):
${previousNarrative}

`;

  return result;
}

export function buildContinuationPrompt(
  context: ContinuationContext,
  options?: PromptOptions,
): ChatMessage[] {
  const dataRules = composeContinuationDataRules(options);
  const hasBible = !!context.storyBible;

  // When bible is present, these sections are replaced by the Story Bible
  const worldSection = hasBible
    ? ''
    : context.worldbuilding
      ? `WORLDBUILDING:
${context.worldbuilding}

`
      : '';

  const npcsSection = hasBible
    ? ''
    : context.npcs && context.npcs.length > 0
      ? `NPCS (Available Characters):
${formatNpcsForPrompt(context.npcs)}

These characters are available for use in the story. Introduce or involve them when narratively appropriate.

`
      : '';

  const structureSection = buildWriterStructureContext(
    context.structure,
    context.accumulatedStructureState,
  );

  const plannerSection = context.pagePlan
    ? `=== PLANNER GUIDANCE ===
Scene Intent: ${context.pagePlan.sceneIntent}
Continuity Anchors:
${context.pagePlan.continuityAnchors.map(anchor => `- ${anchor}`).join('\n') || '- (none)'}

Writer Brief:
- Opening line directive: ${context.pagePlan.writerBrief.openingLineDirective}
- Must include beats:
${context.pagePlan.writerBrief.mustIncludeBeats.map(beat => `  - ${beat}`).join('\n') || '  - (none)'}
- Forbidden recaps:
${context.pagePlan.writerBrief.forbiddenRecaps.map(item => `  - ${item}`).join('\n') || '  - (none)'}

Use this guidance to shape this scene while still following all writer schema requirements.

`
    : '';
  const choiceIntentSection =
    context.pagePlan?.choiceIntents?.length
      ? `=== CHOICE INTENT GUIDANCE (from planner) ===
Dramatic Question: ${context.pagePlan.dramaticQuestion}

Proposed Choice Intents:
${context.pagePlan.choiceIntents.map((intent, i) => `${i + 1}. [${intent.choiceType} / ${intent.primaryDelta}] ${intent.hook}`).join('\n')}

Use these choice intents as a starting blueprint. You may adjust if the narrative takes an unexpected turn, but aim to preserve the dramatic question framing and tag divergence.

`
      : '';
  const reconciliationRetrySection =
    context.reconciliationFailureReasons && context.reconciliationFailureReasons.length > 0
      ? `=== RECONCILIATION FAILURE REASONS (RETRY) ===
The prior attempt failed deterministic reconciliation. Correct these failures in this new scene:
${context.reconciliationFailureReasons
  .map(reason => `- [${reason.code}]${reason.field ? ` (${reason.field})` : ''} ${reason.message}`)
  .join('\n')}

`
      : '';

  // When bible is present, canon/characterCanon/characterState are subsumed
  const canonSection = hasBible
    ? ''
    : context.globalCanon.length > 0
      ? `ESTABLISHED WORLD FACTS:
${context.globalCanon.map(fact => `- ${fact}`).join('\n')}

`
      : '';

  const characterCanonSection = hasBible
    ? ''
    : ((): string => {
        const entries = Object.entries(context.globalCharacterCanon);
        return entries.length > 0
          ? `CHARACTER INFORMATION (permanent traits):
${entries
  .map(([name, facts]) => `[${name}]\n${facts.map(fact => `- ${fact}`).join('\n')}`)
  .join('\n\n')}

`
          : '';
      })();

  const characterStateSection = hasBible
    ? ''
    : ((): string => {
        const entries = Object.entries(context.accumulatedCharacterState);
        return entries.length > 0
          ? `NPC CURRENT STATE (branch-specific events):
${entries
  .map(([name, states]) => `[${name}]\n${states.map(state => `- [${state.id}] ${state.text}`).join('\n')}`)
  .join('\n\n')}

`
          : '';
      })();

  // Active state is always included (small, always relevant)
  const locationSection = buildLocationSection(context.activeState);
  const threatsSection = buildThreatsSection(context.activeState);
  const constraintsSection = buildConstraintsSection(context.activeState);
  const threadsSection = buildThreadsSection(context.activeState);

  const inventorySection =
    context.accumulatedInventory.length > 0
      ? `YOUR INVENTORY:
${context.accumulatedInventory.map(item => `- [${item.id}] ${item.text}`).join('\n')}

`
      : '';

  const healthSection =
    context.accumulatedHealth.length > 0
      ? `YOUR HEALTH:
${context.accumulatedHealth.map(entry => `- [${entry.id}] ${entry.text}`).join('\n')}

`
      : `YOUR HEALTH:
- You feel fine.

`;

  const protagonistAffectSection = buildProtagonistAffectSection(context.parentProtagonistAffect);

  // When bible is present, use bible's relevantHistory instead of ancestor summaries
  const sceneContextSection = hasBible
    ? buildSceneContextWithBible(context.previousNarrative, context.grandparentNarrative)
    : buildSceneContextSection(
        context.previousNarrative,
        context.grandparentNarrative,
        context.ancestorSummaries,
      );

  const storyBibleSection = context.storyBible
    ? formatStoryBibleSection(context.storyBible)
    : '';

  const suggestedProtagonistSpeech = context.suggestedProtagonistSpeech?.trim();
  const suggestedProtagonistSpeechSection =
    suggestedProtagonistSpeech && suggestedProtagonistSpeech.length > 0
      ? `=== SUGGESTED PROTAGONIST SPEECH (OPTIONAL GUIDANCE) ===
The protagonist has considered saying:
"${suggestedProtagonistSpeech}"

Treat this as optional intent, not mandatory dialogue.
Use it only when the current circumstances make it natural.
Adapt wording, tone, and timing naturally to fit the scene.
If circumstances do not support it, omit it.

`
      : '';

  const userPrompt = `Continue the interactive story based on the player's choice.

=== DATA & STATE RULES ===
${dataRules}

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}TONE/GENRE: ${context.tone}

${structureSection}${plannerSection}${choiceIntentSection}${reconciliationRetrySection}${storyBibleSection}${canonSection}${characterCanonSection}${characterStateSection}${locationSection}${threatsSection}${constraintsSection}${threadsSection}${inventorySection}${healthSection}${protagonistAffectSection}${sceneContextSection}${suggestedProtagonistSpeechSection}PLAYER'S CHOICE: "${context.selectedChoice}"

REQUIREMENTS (follow all):
1. Choose the scene opening based on what matters next
   - Option A (immediate continuation): Start exactly where the previous scene ended with an action, dialogue, or reaction in the next 1-2 beats
   - Option B (time cut): If nothing meaningful happens for a while (travel, waiting, resting, routine), SKIP time and open at the next scene where the choice's consequences matter
   - In both options: do NOT recap or summarize what happened, and do NOT repeat or rephrase the last sentence of the previous scene
   - For Option B, signal the skip with a brief time cue ("Minutes later...", "That night...", "Two days later..."), then jump straight into action or dialogue
2. Show the direct, immediate consequences of the player's choice - the story must react
3. Advance the narrative naturally - time passes, situations evolve, new elements emerge
4. Maintain consistency with all established facts and the current state
5. Present 3 new meaningful structured choice objects with text, choiceType, and primaryDelta - each choice MUST have a different choiceType OR primaryDelta (add a 4th only when the situation truly warrants another distinct path)
6. Ensure choices are divergent via their enum tags - each must change a different dimension of the story
7. Update protagonistAffect to reflect how the protagonist feels at the END of this scene (this is a fresh snapshot, not inherited from previous scenes)
8. Write a sceneSummary: 2-3 sentences summarizing the key events and consequences of this scene (for future context)

REMINDER: If the player's choice naturally leads to a story conclusion, make it an ending (empty choices array, isEnding: true). protagonistAffect should capture the protagonist's emotional state at the end of this scene - consider how the events of this scene have affected them.

WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. React to the player's choice immediately and visibly
2. Maintain consistency with established state, canon, and continuity
3. Choices answer the scene's dramatic question with divergent tags
4. Prose quality: character-filtered, emotionally resonant, forward-moving
5. sceneSummary and protagonistAffect accuracy`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildContinuationSystemPrompt() },
  ];

  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(...buildFewShotMessages('continuation', options.fewShotMode));
  }

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}
