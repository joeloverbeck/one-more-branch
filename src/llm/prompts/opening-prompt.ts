import { formatSpeechFingerprintForWriter } from '../../models/decomposed-character.js';
import { formatNpcsForPrompt } from '../../models/npc.js';
import { buildFewShotMessages } from '../examples.js';
import type { OpeningContext } from '../context-types.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildOpeningSystemPrompt, composeOpeningDataRules } from './system-prompt.js';
import { buildToneReminder, formatStoryBibleSection } from './sections/shared/index.js';

export function buildOpeningPrompt(
  context: OpeningContext,
  options?: PromptOptions
): ChatMessage[] {
  const hasBible = !!context.storyBible;
  const dataRules = composeOpeningDataRules(options);

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

These characters are available for use in the story. Introduce them when narratively appropriate - you don't need to include all of them, and you don't need to introduce them all in the opening.

`
      : '';

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:
${context.startingSituation}

Begin the story with this situation. This takes precedence over your creative decisions about how to open the narrative. Incorporate the specified scene, circumstances, or events exactly as described.

`
    : '';

  const plannerSection = context.pagePlan
    ? `=== PLANNER GUIDANCE ===
Scene Intent: ${context.pagePlan.sceneIntent}
Continuity Anchors:
${context.pagePlan.continuityAnchors.map((anchor) => `- ${anchor}`).join('\n') || '- (none)'}

Writer Brief:
- Opening line directive: ${context.pagePlan.writerBrief.openingLineDirective}
- Must include beats:
${context.pagePlan.writerBrief.mustIncludeBeats.map((beat) => `  - ${beat}`).join('\n') || '  - (none)'}
- Forbidden recaps:
${context.pagePlan.writerBrief.forbiddenRecaps.map((item) => `  - ${item}`).join('\n') || '  - (none)'}

Use this plan as guidance while still returning the required writer schema output.

`
    : '';
  const choiceIntentSection = context.pagePlan?.choiceIntents?.length
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
  .map(
    (reason) => `- [${reason.code}]${reason.field ? ` (${reason.field})` : ''} ${reason.message}`
  )
  .join('\n')}

`
      : '';

  const storyBibleSection = context.storyBible
    ? formatStoryBibleSection(context.storyBible)
    : '';

  const protagonistSpeech =
    context.decomposedCharacters && context.decomposedCharacters.length > 0
      ? context.decomposedCharacters[0]!
      : null;
  const protagonistSpeechSection = protagonistSpeech
    ? `
PROTAGONIST SPEECH FINGERPRINT (use this to write their voice):
${formatSpeechFingerprintForWriter(protagonistSpeech.speechFingerprint)}

`
    : '';

  const userPrompt = `Create the opening scene for a new interactive story.

=== DATA & STATE RULES ===
${dataRules}

CHARACTER CONCEPT:
${context.characterConcept}
${protagonistSpeechSection}

${worldSection}${npcsSection}${startingSituationSection}TONE/GENRE: ${context.tone}

${storyBibleSection}${plannerSection}${choiceIntentSection}${reconciliationRetrySection}REQUIREMENTS (follow all):
1. Introduce the protagonist in a compelling scene that reveals their personality through action
2. Establish the world and atmosphere matching the specified tone
3. Present an initial situation with immediate tension or intrigue that draws the player in
4. Provide 3 meaningful structured choice objects with text, choiceType, and primaryDelta - each choice MUST have a different choiceType OR primaryDelta (add a 4th only when the situation truly warrants another distinct path)
5. Capture the protagonist's emotional state at the END of this scene in protagonistAffect (what they feel, why, and what they want)
6. Write a sceneSummary: 2-3 sentences summarizing the key events, character introductions, and situation established in this opening scene (for future context)

REMINDER: Each choice must be something this specific character would genuinely consider. protagonistAffect should reflect how the scene leaves the protagonist feeling - this is a snapshot, not accumulated state.

${buildToneReminder(context.tone, context.toneKeywords, context.toneAntiKeywords)}

WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. Ground the protagonist in the starting situation with immediate tension
2. Maintain consistency with established worldbuilding, tone, and character concept
3. Choices answer the scene's dramatic question with divergent tags
4. Prose quality: character-filtered, emotionally resonant, forward-moving
5. sceneSummary and protagonistAffect accuracy`;

  const toneParams = {
    tone: context.tone,
    toneKeywords: context.toneKeywords,
    toneAntiKeywords: context.toneAntiKeywords,
  };
  const messages: ChatMessage[] = [{ role: 'system', content: buildOpeningSystemPrompt(toneParams) }];

  // Add few-shot examples if requested
  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(...buildFewShotMessages('opening', options.fewShotMode));
  }

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}
