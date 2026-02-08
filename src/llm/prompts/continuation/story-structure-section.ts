import type { AccumulatedStructureState, StoryStructure } from '../../../models/story-arc.js';
import type { ActiveState } from '../../../models/state/index.js';

/**
 * Deviation detection instructions for the LLM.
 * Included in structured story prompts to evaluate whether remaining beats are still valid.
 */
export const DEVIATION_DETECTION_SECTION = `=== BEAT DEVIATION EVALUATION ===
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

/**
 * Gets the remaining (non-concluded) beats from the story structure.
 * Used to build the deviation evaluation section.
 */
export function getRemainingBeats(
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

/**
 * Builds active state summary for beat evaluation context.
 * Uses compact prefix format for threats/constraints/threads.
 */
export function buildActiveStateForBeatEvaluation(activeState: ActiveState): string {
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

/**
 * Builds story structure context for the writer LLM call.
 * Provides act/beat status for creative context only — no evaluation or deviation instructions.
 *
 * @param structure - The story structure (or undefined if not using structured stories)
 * @param accumulatedStructureState - The accumulated structure state (or undefined)
 * @returns The structure context string, or empty string if structure is missing
 */
export function buildWriterStructureContext(
  structure: StoryStructure | undefined,
  accumulatedStructureState: AccumulatedStructureState | undefined,
): string {
  if (!structure || !accumulatedStructureState) {
    return '';
  }

  const state = accumulatedStructureState;
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

  return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of 3)
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${beatLines}

REMAINING ACTS:
${remainingActs || '  - None'}

`;
}

/**
 * Builds the complete story structure section for continuation prompts.
 * Includes act/beat status, beat evaluation instructions, and deviation detection.
 *
 * @param structure - The story structure (or undefined if not using structured stories)
 * @param accumulatedStructureState - The accumulated structure state (or undefined)
 * @param activeState - The current active state for beat evaluation context
 * @returns The complete structure section string, or empty string if structure is missing
 */
export function buildStoryStructureSection(
  structure: StoryStructure | undefined,
  accumulatedStructureState: AccumulatedStructureState | undefined,
  activeState: ActiveState,
): string {
  if (!structure || !accumulatedStructureState) {
    return '';
  }

  const state = accumulatedStructureState;
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
  const activeStateSummary = buildActiveStateForBeatEvaluation(activeState);

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
}
