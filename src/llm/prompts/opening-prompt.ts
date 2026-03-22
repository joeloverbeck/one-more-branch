import { formatSpeechFingerprintForWriter } from '../../models/decomposed-character.js';
import type { OpeningContext } from '../context-types.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildOpeningSystemPrompt, composeOpeningDataRules } from './system-prompt.js';
import {
  formatStoryBibleSection,
  buildSceneCharacterVoicesSection,
  buildSpineSection,
  formatBlueprintSection,
} from './sections/shared/index.js';

export function buildOpeningPrompt(
  context: OpeningContext,
  _options?: PromptOptions
): ChatMessage[] {
  const dataRules = composeOpeningDataRules();

  const plannerSection = context.pagePlan
    ? `=== PLANNER GUIDANCE ===
Scene Intent: ${context.pagePlan.sceneIntent}
Continuity Anchors:
${context.pagePlan.continuityAnchors.map((anchor) => `- ${anchor}`).join('\n') || '- (none)'}

Scene Mandates:
${context.pagePlan.sceneMandates.map((mandate) => `  - ${mandate}`).join('\n') || '  - (none)'}
Forbidden Recaps:
${context.pagePlan.forbiddenRecaps.map((item) => `  - ${item}`).join('\n') || '  - (none)'}

Use this plan as guidance while still returning the required writer schema output.

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

  const storyBibleSection = context.storyBible ? formatStoryBibleSection(context.storyBible) : '';
  const openingImageSection =
    context.structure && context.structure.openingImage.trim().length > 0
      ? `OPENING IMAGE CONTRACT:
Anchor this opening scene to this concrete image: ${context.structure.openingImage}
Use this as a visual spine for setting, action framing, or emotional atmosphere.
Treat it as an anchor, not a collage prompt: choose a small number of telling details and turn them into immediate action, tension, or decision pressure.
Do not linger in decorative description before the scene is clear.

`
      : '';

  const protagonistSpeech = context.decomposedCharacters[0] ?? null;
  const protagonistSpeechSection = protagonistSpeech
    ? `
PROTAGONIST: ${protagonistSpeech.name}
PROTAGONIST SPEECH FINGERPRINT (use this to write their voice):
${formatSpeechFingerprintForWriter(protagonistSpeech.speechFingerprint)}

VOICE APPLICATION:
- The protagonist speech fingerprint governs narration as well as dialogue.
- Use the protagonist's conceptual vocabulary, favorite abstractions, and recurring metaphors selectively.
- Reuse recurring inner-language only when it sharpens conflict or shows change; do not use it as filler.
- If a phrase, abstraction, or comparison would not plausibly occur in this protagonist's mind, do not use it.

`
    : '';

  const sceneCharacterVoicesSection =
    context.storyBible && protagonistSpeech
      ? buildSceneCharacterVoicesSection(
          context.storyBible,
          protagonistSpeech.name,
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
2. Maintain consistency with established worldbuilding, tone, and scene context
3. Capture the protagonist's emotional state at the END of this scene in protagonistAffect (what they feel, why, and what they want)
4. Write a sceneSummary: 2-3 sentences summarizing the key events, character introductions, and situation established in this opening scene (for future context)
5. Subtly establish the tension between conscious Want and deeper Need through behavior, never stated explicitly.
6. If an OPENING IMAGE CONTRACT is provided, honour it (the blueprint has placed it in a unit).

REMINDER: protagonistAffect should reflect how the scene leaves the protagonist feeling - this is a snapshot, not accumulated state.

WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. Open with immediate, scene-level tension tied to the current dramatic setup
2. Follow the blueprint's structural intent and emotional arc
3. Maintain consistency with established worldbuilding, tone, and scene context
4. Prose quality: character-filtered, emotionally resonant, forward-moving, and legible
5. sceneSummary and protagonistAffect accuracy`
    : `=== OPENING SCENE DISCIPLINE ===
- Within the first 2 paragraphs, make clear where the protagonist is, what is happening right now, and what immediate pressure, desire, or disturbance is active.
- If you begin with a fragment, aphoristic line, or highly stylized sentence, ground it immediately in concrete action or observation.
- Let intrigue come from a legible situation, not from withholding basic orientation.
- Use one dominant opening image and a small number of telling details; do not flood the opening with multiple equally loaded metaphors before the scene is clear.
- By the end of the scene, the reader should understand what the protagonist wants next and what presently obstructs them.

REQUIREMENTS (follow all):
1. Introduce the protagonist through action, reaction, or choice so personality emerges from behavior rather than descriptive performance
2. Establish the world and atmosphere matching the specified tone, but ground the concrete situation within the first 2 paragraphs
3. Present an initial situation with immediate tension or intrigue that also gives the protagonist a clear next pressure, problem, or desire
3a. Ensure the prose clearly conveys the protagonist's immediate options so the opening reads as a choiceable situation
4. Capture the protagonist's emotional state at the END of this scene in protagonistAffect (what they feel, why, and what they want)
5. Write a sceneSummary: 2-3 sentences summarizing the key events, character introductions, and situation established in this opening scene (for future context)
6. In portraying the protagonist, subtly establish the tension between their conscious Want (what they pursue) and their deeper Need (what they must learn or become). This should be shown through action and behavior, never stated explicitly.
7. If an OPENING IMAGE CONTRACT is provided, ensure the scene's visual composition clearly reflects it.

REMINDER: protagonistAffect should reflect how the scene leaves the protagonist feeling - this is a snapshot, not accumulated state.

WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. Open with immediate, scene-level tension tied to the current dramatic setup
2. Maintain consistency with established worldbuilding, tone, and scene context
3. Prose quality: character-filtered, emotionally resonant, forward-moving, and legible
4. sceneSummary and protagonistAffect accuracy`;

  const userPrompt = `Create the opening scene for a new interactive story.

=== DATA & STATE RULES ===
${dataRules}

${protagonistSpeechSection}${sceneCharacterVoicesSection}
TONE/GENRE: ${context.tone}

${buildSpineSection(context.spine)}${storyBibleSection}${openingImageSection}${plannerSection}${reconciliationRetrySection}${blueprintSection}${sceneStructureSection}`;

  const toneParams = {
    tone: context.tone,
    toneFeel: context.toneFeel,
    toneAvoid: context.toneAvoid,
    genreFrame: context.genreFrame,
  };
  const messages: ChatMessage[] = [
    { role: 'system', content: buildOpeningSystemPrompt(toneParams) },
  ];

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}
