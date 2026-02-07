import { buildFewShotMessages } from '../examples.js';
import type { ChatMessage, ContinuationContext, PromptOptions } from '../types.js';
import type { AccumulatedStructureState, StoryStructure } from '../../models/story-arc.js';
import { buildSystemPrompt } from './system-prompt.js';
import { truncateText } from './utils.js';

const DEVIATION_DETECTION_SECTION = `=== BEAT DEVIATION EVALUATION ===
After evaluating beat completion, also evaluate whether the story has DEVIATED from remaining beats.

A deviation occurs when future beats are now impossible or nonsensical because:
- Story direction fundamentally changed
- Core assumptions of upcoming beats are invalid
- Required story elements/goals no longer exist

Evaluate ONLY beats that are not concluded. Never re-evaluate concluded beats.

If deviation is detected, mark:
- deviationDetected: true
- deviationReason: concise reason
- invalidatedBeatIds: invalid beat IDs only
- narrativeSummary: 1-2 sentence current-state summary for rewrite context

If no deviation is detected, mark deviationDetected: false.
Be conservative. Minor variations are acceptable; only mark true deviation for genuine invalidation.
`;

function getRemainingBeats(
  structure: StoryStructure,
  state: AccumulatedStructureState,
): Array<{ id: string; description: string }> {
  const concludedBeatIds = new Set(
    state.beatProgressions
      .filter(progression => progression.status === 'concluded')
      .map(progression => progression.beatId),
  );

  return structure.acts.flatMap(act =>
    act.beats
      .filter(beat => !concludedBeatIds.has(beat.id))
      .map(beat => ({ id: beat.id, description: beat.description })),
  );
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
  const structureSection =
    context.structure && context.accumulatedStructureState
      ? ((): string => {
          const structure = context.structure;
          const state = context.accumulatedStructureState;
          const currentAct = structure.acts[state.currentActIndex];

          if (!currentAct) {
            return '';
          }

          const beatLines = currentAct.beats
            .map(beat => {
              const progression = state.beatProgressions.find(item => item.beatId === beat.id);
              if (progression?.status === 'concluded') {
                const resolution =
                  progression.resolution && progression.resolution.trim().length > 0
                    ? progression.resolution
                    : 'No resolution recorded.';
                return `  [x] CONCLUDED: ${beat.description}
    Resolution: ${resolution}`;
              }
              if (progression?.status === 'active') {
                return `  [>] ACTIVE: ${beat.description}
    Objective: ${beat.objective}`;
              }
              return `  [ ] PENDING: ${beat.description}`;
            })
            .join('\n');

          const remainingActs = structure.acts
            .slice(state.currentActIndex + 1)
            .map((act, index) => `  - Act ${state.currentActIndex + 2 + index}: ${act.name} - ${act.objective}`)
            .join('\n');
          const remainingBeats = getRemainingBeats(structure, state);
          const remainingBeatsSection =
            remainingBeats.length > 0
              ? `REMAINING BEATS TO EVALUATE FOR DEVIATION:\n${remainingBeats
                  .map(beat => `  - ${beat.id}: ${beat.description}`)
                  .join('\n')}`
              : 'REMAINING BEATS TO EVALUATE FOR DEVIATION:\n  - None';

          return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of 3)
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${beatLines}

REMAINING ACTS:
${remainingActs || '  - None'}

=== BEAT EVALUATION ===
After writing the narrative, evaluate:
1. Has the current beat's objective been achieved in this scene?
2. If yes, set beatConcluded: true and describe how it was resolved.
3. If no, set beatConcluded: false and leave beatResolution empty.

Do not force beat completion - only conclude if naturally achieved.

${remainingBeatsSection}

${DEVIATION_DETECTION_SECTION}

`;
        })()
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

${structureSection}${canonSection}${characterCanonSection}${characterStateSection}${stateSection}${inventorySection}${healthSection}PREVIOUS SCENE:
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
