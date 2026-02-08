import { buildFewShotMessages } from '../examples.js';
import type { ChatMessage, ContinuationContext, PromptOptions } from '../types.js';
import type { AccumulatedStructureState, StoryStructure } from '../../models/story-arc.js';
import { formatProtagonistAffect, type ProtagonistAffect } from '../../models/protagonist-affect.js';
import type { ActiveState } from '../../models/state/index.js';
import { buildSystemPrompt } from './system-prompt.js';
import { truncateText } from './utils.js';

/**
 * Builds the protagonist's current emotional state section for continuation prompts.
 * This shows the LLM how the protagonist is feeling at the start of this scene
 * (carried over from the previous page's protagonistAffect).
 */
function buildProtagonistAffectSection(affect: ProtagonistAffect | undefined): string {
  if (!affect) {
    return '';
  }
  return `PROTAGONIST'S CURRENT EMOTIONAL STATE:
${formatProtagonistAffect(affect)}

`;
}

/**
 * Builds the CURRENT LOCATION section for the prompt.
 * Only included when a location is set.
 */
function buildLocationSection(activeState: ActiveState): string {
  if (!activeState.currentLocation) {
    return '';
  }
  return `CURRENT LOCATION:
${activeState.currentLocation}

`;
}

/**
 * Builds the ACTIVE THREATS section for the prompt.
 * Only included when there are active threats.
 */
function buildThreatsSection(activeState: ActiveState): string {
  if (activeState.activeThreats.length === 0) {
    return '';
  }
  return `ACTIVE THREATS (dangers that exist NOW):
${activeState.activeThreats.map(t => `- ${t.raw}`).join('\n')}

`;
}

/**
 * Builds the ACTIVE CONSTRAINTS section for the prompt.
 * Only included when there are active constraints.
 */
function buildConstraintsSection(activeState: ActiveState): string {
  if (activeState.activeConstraints.length === 0) {
    return '';
  }
  return `ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):
${activeState.activeConstraints.map(c => `- ${c.raw}`).join('\n')}

`;
}

/**
 * Builds the OPEN NARRATIVE THREADS section for the prompt.
 * Only included when there are open threads.
 */
function buildThreadsSection(activeState: ActiveState): string {
  if (activeState.openThreads.length === 0) {
    return '';
  }
  return `OPEN NARRATIVE THREADS (unresolved hooks):
${activeState.openThreads.map(t => `- ${t.raw}`).join('\n')}

`;
}

/**
 * Builds extended scene context with both previous and grandparent narratives.
 * Grandparent narrative is truncated to 1000 chars, previous to 2000 chars.
 */
function buildSceneContextSection(
  previousNarrative: string,
  grandparentNarrative: string | null,
): string {
  let result = '';

  if (grandparentNarrative) {
    result += `SCENE BEFORE LAST:
${truncateText(grandparentNarrative, 1000)}

`;
  }

  result += `PREVIOUS SCENE:
${truncateText(previousNarrative, 2000)}

`;

  return result;
}

/**
 * Builds active state summary for beat evaluation context.
 * Replaces the old accumulated state summary.
 */
function buildActiveStateForBeatEvaluation(activeState: ActiveState): string {
  const parts: string[] = [];

  if (activeState.currentLocation) {
    parts.push(`Location: ${activeState.currentLocation}`);
  }

  if (activeState.activeThreats.length > 0) {
    parts.push(`Active threats: ${activeState.activeThreats.map(t => t.prefix).join(', ')}`);
  }

  if (activeState.activeConstraints.length > 0) {
    parts.push(`Constraints: ${activeState.activeConstraints.map(c => c.prefix).join(', ')}`);
  }

  if (activeState.openThreads.length > 0) {
    parts.push(`Open threads: ${activeState.openThreads.map(t => t.prefix).join(', ')}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `CURRENT STATE (for beat evaluation):
${parts.map(p => `- ${p}`).join('\n')}
(Consider these when evaluating beat completion)

`;
}

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

          // Build active state summary for beat evaluation context
          const activeStateSummary = buildActiveStateForBeatEvaluation(context.activeState);

          // Build beat comparison hint for progression check
          const hasPendingBeats =
            state.currentBeatIndex < currentAct.beats.length - 1 ||
            state.currentActIndex < structure.acts.length - 1;
          const beatComparisonHint = hasPendingBeats
            ? `
PROGRESSION CHECK: If the current narrative situation more closely matches a PENDING beat's description than the ACTIVE beat's description, the ACTIVE beat should be marked concluded.
`
            : '';

          return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of 3)
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${beatLines}

REMAINING ACTS:
${remainingActs || '  - None'}

${activeStateSummary}=== BEAT EVALUATION ===
After writing the narrative, evaluate whether the ACTIVE beat should be concluded.

CONCLUDE THE BEAT (beatConcluded: true) when ANY of these apply:
1. The beat's objective has been substantively achieved (even if not perfectly)
2. The narrative has moved beyond this beat's scope into territory that matches a PENDING beat
3. Key events from later beats have already occurred (compare against PENDING beats below)
4. The current state shows the beat's goal has been reached

DO NOT CONCLUDE only if:
- This scene is still squarely within the active beat's scope AND
- The objective hasn't been meaningfully advanced

CRITICAL: Evaluate CUMULATIVE progress across all scenes, not just this single page.
Look at the CURRENT STATE above - if the situation has moved past the active beat's description, it should be concluded.

If concluding, provide beatResolution: a brief summary of how the beat was resolved.

${remainingBeatsSection}
${beatComparisonHint}
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

  // Build active state sections (replaces old stateSection)
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

  // Build scene context with optional grandparent narrative
  const sceneContextSection = buildSceneContextSection(
    context.previousNarrative,
    context.grandparentNarrative,
  );

  const userPrompt = `Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}TONE/GENRE: ${context.tone}

${structureSection}${canonSection}${characterCanonSection}${characterStateSection}${locationSection}${threatsSection}${constraintsSection}${threadsSection}${inventorySection}${healthSection}${protagonistAffectSection}${sceneContextSection}PLAYER'S CHOICE: "${context.selectedChoice}"

REQUIREMENTS (follow ALL):
1. Start exactly where the previous scene ended—do NOT recap or summarize what happened
   - Do NOT repeat or rephrase the last sentence of the previous scene
   - Begin with an action, dialogue, or reaction within the next 1-2 beats
2. Show the direct, immediate consequences of the player's choice - the story must react
3. Advance the narrative naturally - time passes, situations evolve, new elements emerge
4. Maintain STRICT consistency with all established facts and the current state
5. Present 3 new meaningful choices unless this naturally leads to an ending (add a 4th only when the situation truly warrants another distinct path)
6. Ensure choices are divergent - each must lead to a genuinely different story path
7. Update protagonistAffect to reflect how the protagonist feels at the END of this scene (this is a fresh snapshot, not inherited from previous scenes)

REMINDER: If the player's choice naturally leads to a story conclusion, make it an ending (empty choices array, isEnding: true). protagonistAffect should capture the protagonist's emotional state at the end of this scene - consider how the events of this scene have affected them.`;

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
