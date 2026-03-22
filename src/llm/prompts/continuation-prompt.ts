import { formatSpeechFingerprintForWriter } from '../../models/decomposed-character.js';
import { formatCanonForPrompt } from '../../engine/canon-manager.js';
import type { ContinuationContext } from '../context-types.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildContinuationSystemPrompt, composeContinuationDataRules } from './system-prompt.js';
import {
  formatStoryBibleSection,
  buildSceneCharacterVoicesSection,
  buildSpineSection,
  formatBlueprintSection,
} from './sections/shared/index.js';
import {
  buildProtagonistAffectSection,
  buildSceneContextSection,
  buildLocationSection,
  buildThreatsSection,
  buildConstraintsSection,
  buildThreadsSection,
} from './continuation/index.js';

/**
 * Builds the scene context section for writer prompts when a Story Bible is present.
 * Replaces ancestor summaries with the bible's relevantHistory, but keeps
 * grandparent and parent full narrative for voice continuity.
 */
function buildSceneContextWithBible(
  previousNarrative: string,
  grandparentNarrative: string | null
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
  _options?: PromptOptions
): ChatMessage[] {
  const hasBible = !!context.storyBible;
  const dataRules = composeContinuationDataRules({
    hasStoryBible: hasBible,
  });

  const plannerSection = context.pagePlan
    ? `=== PLANNER GUIDANCE ===
Scene Intent: ${context.pagePlan.sceneIntent}
Continuity Anchors:
${context.pagePlan.continuityAnchors.map((anchor) => `- ${anchor}`).join('\n') || '- (none)'}

Scene Mandates:
${context.pagePlan.sceneMandates.map((mandate) => `  - ${mandate}`).join('\n') || '  - (none)'}
Forbidden Recaps:
${context.pagePlan.forbiddenRecaps.map((item) => `  - ${item}`).join('\n') || '  - (none)'}

Use this guidance to shape this scene while still following all writer schema requirements.

`
    : '';
  const reconciliationRetrySection =
    context.reconciliationFailureReasons && context.reconciliationFailureReasons.length > 0
      ? `=== RECONCILIATION FAILURE REASONS (RETRY) ===
The prior attempt failed deterministic reconciliation. Correct these failures in this new scene:
${context.reconciliationFailureReasons
  .map(
    (reason) => `- [${reason.code}]${reason.field ? ` (${reason.field})` : ''} ${reason.message}`
  )
  .join('\n')}

`
      : '';

  // When bible is present, canon/characterCanon/characterState are subsumed
  const canonSection = hasBible
    ? ''
    : context.globalCanon.length > 0
      ? `ESTABLISHED WORLD FACTS:
${formatCanonForPrompt(context.globalCanon)}

`
      : '';

  const characterCanonSection = hasBible
    ? ''
    : ((): string => {
        const entries = Object.entries(context.globalCharacterCanon);
        return entries.length > 0
          ? `CHARACTER INFORMATION (permanent traits):
${entries
  .map(([name, facts]) => `[${name}]\n${facts.map((fact) => `- ${fact}`).join('\n')}`)
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
  .map(
    ([name, states]) =>
      `[${name}]\n${states.map((state) => `- [${state.id}] ${state.text}`).join('\n')}`
  )
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
${context.accumulatedInventory.map((item) => `- [${item.id}] ${item.text}`).join('\n')}

`
      : '';

  const healthSection =
    context.accumulatedHealth.length > 0
      ? `YOUR HEALTH:
${context.accumulatedHealth.map((entry) => `- [${entry.id}] ${entry.text}`).join('\n')}

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
        context.ancestorSummaries
      );

  const storyBibleSection = context.storyBible ? formatStoryBibleSection(context.storyBible) : '';

  const protagonistDecomposed = context.decomposedCharacters[0] ?? null;
  const protagonistSpeechSection = protagonistDecomposed
    ? `
PROTAGONIST: ${protagonistDecomposed.name}
PROTAGONIST SPEECH FINGERPRINT (use this to write their voice):
${formatSpeechFingerprintForWriter(protagonistDecomposed.speechFingerprint)}

VOICE APPLICATION:
- The protagonist speech fingerprint governs narration as well as dialogue.
- Use the protagonist's conceptual vocabulary, favorite abstractions, and recurring metaphors selectively.
- Reuse recurring inner-language only when it sharpens conflict or shows change; do not use it as filler.
- If a phrase, abstraction, or comparison would not plausibly occur in this protagonist's mind, do not use it.

`
    : '';

  const sceneCharacterVoicesSection =
    context.storyBible && protagonistDecomposed
      ? buildSceneCharacterVoicesSection(
          context.storyBible,
          protagonistDecomposed.name,
          context.decomposedCharacters
        )
      : '';

  const blueprintSection = context.sceneBlueprint
    ? formatBlueprintSection(context.sceneBlueprint)
    : '';

  const sceneStructureSection = context.sceneBlueprint
    ? `REQUIREMENTS (follow all):
1. Follow the Scene Blueprint unit-by-unit. Each unit maps to its specified paragraph count.
   Trust the blueprint's emotional arc — do not flatten or skip the designed tension curve.
   You may adjust paragraph boundaries by ±1 paragraph where prose flow demands it,
   or merge two tightly coupled adjacent units, but never skip or reorder units.
2. Maintain consistency with all established facts and the current state
3. Update protagonistAffect to reflect how the protagonist feels at the END of this scene (this is a fresh snapshot, not inherited from previous scenes)
4. Write a sceneSummary: 2-3 sentences summarizing the key events and consequences of this scene (for future context)
5. Each scene should advance or complicate the protagonist's relationship to their Need and Want.

WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. React to the player's choice immediately and visibly (unit 1)
2. Follow the blueprint's structural intent and emotional arc
3. Maintain consistency with established state, canon, and continuity
4. Prose quality: character-filtered, emotionally resonant, forward-moving, and legible
5. sceneSummary and protagonistAffect accuracy`
    : `=== SCENE PROGRESSION DISCIPLINE ===
- Inherited mood or physical state from the previous scene may be refreshed briefly, but do not spend multiple paragraphs re-describing it.
- Make the planned material changes clear and player-legible in the prose — the reader should be able to identify what has concretely changed by scene's end.
- Each major escalation must be tied to a concrete observable change in the environment, the body, or the available decisions — not atmospheric intensification alone.
- If you repeat a motif or image from the prior scene, the repeat must deepen, invert, or complicate it.
- Use prior full-scene text to preserve continuity of events, tone, and character voice, but do not mechanically imitate repeated phrasings, syntactic tics, or signature images unless their recurrence is intentional and meaningfully transformed. Continue the voice at its best, not its surface habits.

REQUIREMENTS (follow all):
1. Follow the planner's opening line directive. Do NOT recap or summarize what happened, and do NOT repeat or rephrase the last sentence of the previous scene. If a time cut is indicated, signal it with a brief time cue ("Minutes later...", "That night..."), then jump straight into action or dialogue.
2. Show the direct, immediate consequences of the player's choice - the story must react
2a. Re-establish inherited mood, sensation, or fear only briefly; do not spend multiple paragraphs paraphrasing what the previous scene already made clear.
3. Advance the narrative materially — make the planned changes clear and player-legible so the reader can identify what has concretely changed by scene's end.
4. Maintain consistency with all established facts and the current state
5. Update protagonistAffect to reflect how the protagonist feels at the END of this scene (this is a fresh snapshot, not inherited from previous scenes)
6. Write a sceneSummary: 2-3 sentences summarizing the key events and consequences of this scene (for future context)
6a. Ensure the prose clearly conveys what is now urgent, tempting, dangerous, and possible, so the scene reads as a choiceable situation.
7. Each scene should advance or complicate the protagonist's relationship to their Need and Want. Show how consequences of their choices move them toward or away from their true Need, even as they pursue their Want.

WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. React to the player's choice immediately and visibly
2. Maintain consistency with established state, canon, and continuity
3. Prose quality: character-filtered, emotionally resonant, forward-moving, and legible
4. sceneSummary and protagonistAffect accuracy`;

  const userPrompt = `Continue the interactive story based on the player's choice.

=== DATA & STATE RULES ===
${dataRules}

${protagonistSpeechSection}${sceneCharacterVoicesSection}TONE/GENRE: ${context.tone}

${buildSpineSection(context.spine)}${plannerSection}${reconciliationRetrySection}${storyBibleSection}${blueprintSection}${canonSection}${characterCanonSection}${characterStateSection}${locationSection}${threatsSection}${constraintsSection}${threadsSection}${inventorySection}${healthSection}${protagonistAffectSection}${sceneContextSection}PLAYER'S CHOICE: "${context.selectedChoice}"
${
  context.pagePlan?.isEnding
    ? `
=== ENDING DIRECTIVE ===
The planner has determined this is the story's conclusion. Write this scene as a satisfying ending:
- Make the ending feel earned and meaningful
- Provide narrative closure for the protagonist's journey
- Do NOT leave major narrative threads unresolved
- protagonistAffect should capture the protagonist's final emotional state

`
    : ''
}${sceneStructureSection}`;

  const toneParams = {
    tone: context.tone,
    toneFeel: context.toneFeel,
    toneAvoid: context.toneAvoid,
    genreFrame: context.genreFrame,
  };
  const messages: ChatMessage[] = [
    { role: 'system', content: buildContinuationSystemPrompt(toneParams) },
  ];

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}
