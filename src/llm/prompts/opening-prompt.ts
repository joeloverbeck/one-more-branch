import { formatSpeechFingerprintForWriter } from '../../models/decomposed-character.js';
import type { OpeningContext } from '../context-types.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildOpeningSystemPrompt, composeOpeningDataRules } from './system-prompt.js';
import {
  formatStoryBibleSection,
  buildSceneCharacterVoicesSection,
  buildSpineSection,
} from './sections/shared/index.js';

export function buildOpeningPrompt(
  context: OpeningContext,
  options?: PromptOptions
): ChatMessage[] {
  const dataRules = composeOpeningDataRules(options);

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

  const protagonistSpeech = context.decomposedCharacters[0] ?? null;
  const protagonistSpeechSection = protagonistSpeech
    ? `
PROTAGONIST: ${protagonistSpeech.name}
PROTAGONIST SPEECH FINGERPRINT (use this to write their voice):
${formatSpeechFingerprintForWriter(protagonistSpeech.speechFingerprint)}

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

  const userPrompt = `Create the opening scene for a new interactive story.

=== DATA & STATE RULES ===
${dataRules}

${protagonistSpeechSection}${sceneCharacterVoicesSection}
TONE/GENRE: ${context.tone}

${buildSpineSection(context.spine)}${storyBibleSection}${plannerSection}${choiceIntentSection}${reconciliationRetrySection}REQUIREMENTS (follow all):
1. Introduce the protagonist in a compelling scene that reveals their personality through action
2. Establish the world and atmosphere matching the specified tone
3. Present an initial situation with immediate tension or intrigue that draws the player in
4. Provide 3 meaningful structured choice objects with text, choiceType, and primaryDelta - each choice MUST have a different choiceType OR primaryDelta (add a 4th only when the situation truly warrants another distinct path)
5. Capture the protagonist's emotional state at the END of this scene in protagonistAffect (what they feel, why, and what they want)
6. Write a sceneSummary: 2-3 sentences summarizing the key events, character introductions, and situation established in this opening scene (for future context)
7. In portraying the protagonist, subtly establish the tension between their conscious Want (what they pursue) and their deeper Need (what they must learn or become). This should be shown through action and behavior, never stated explicitly.

REMINDER: Each choice must be something this specific character would genuinely consider. protagonistAffect should reflect how the scene leaves the protagonist feeling - this is a snapshot, not accumulated state.

WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. Open with immediate, scene-level tension tied to the current dramatic setup
2. Maintain consistency with established worldbuilding, tone, and scene context
3. Choices answer the scene's dramatic question with divergent tags
4. Prose quality: character-filtered, emotionally resonant, forward-moving
5. sceneSummary and protagonistAffect accuracy`;

  const toneParams = {
    tone: context.tone,
    toneFeel: context.toneFeel,
    toneAvoid: context.toneAvoid,
  };
  const messages: ChatMessage[] = [{ role: 'system', content: buildOpeningSystemPrompt(toneParams) }];

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}
