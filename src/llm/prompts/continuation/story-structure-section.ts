import type { AccumulatedStructureState, StoryStructure } from '../../../models/story-arc.js';
import type { ActiveState } from '../../../models/state/index.js';

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

export function buildActiveStateForBeatEvaluation(activeState: ActiveState): string {
  const parts: string[] = [];

  if (activeState.currentLocation) {
    parts.push(`Location: ${activeState.currentLocation}`);
  }

  if (activeState.activeThreats.length > 0) {
    parts.push(`Active threats: ${activeState.activeThreats.map(t => t.id).join(', ')}`);
  }

  if (activeState.activeConstraints.length > 0) {
    parts.push(`Constraints: ${activeState.activeConstraints.map(c => c.id).join(', ')}`);
  }

  if (activeState.openThreads.length > 0) {
    parts.push(`Open threads: ${activeState.openThreads.map(t => t.id).join(', ')}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `CURRENT STATE (for beat evaluation):
${parts.map(p => `- ${p}`).join('\n')}
(Consider these when evaluating beat completion)

`;
}

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
        return `  [x] CONCLUDED (${beat.role}): ${beat.description}
    Resolution: ${resolution}`;
      }
      if (progression?.status === 'active') {
        return `  [>] ACTIVE (${beat.role}): ${beat.description}
    Objective: ${beat.objective}`;
      }
      return `  [ ] PENDING (${beat.role}): ${beat.description}`;
    })
    .join('\n');

  const remainingActs = structure.acts
    .slice(state.currentActIndex + 1)
    .map((act, index) => `  - Act ${state.currentActIndex + 2 + index}: ${act.name} - ${act.objective}`)
    .join('\n');

  return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}
Premise: ${structure.premise}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of 3)
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${beatLines}

REMAINING ACTS:
${remainingActs || '  - None'}

`;
}

export function buildAnalystStructureEvaluation(
  structure: StoryStructure,
  accumulatedStructureState: AccumulatedStructureState,
  activeState: ActiveState,
): string {
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
        return `  [x] CONCLUDED (${beat.role}): ${beat.description}
    Resolution: ${resolution}`;
      }
      if (progression?.status === 'active') {
        return `  [>] ACTIVE (${beat.role}): ${beat.description}
    Objective: ${beat.objective}`;
      }
      return `  [ ] PENDING (${beat.role}): ${beat.description}`;
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

  const activeStateSummary = buildActiveStateForBeatEvaluation(activeState);

  const hasPendingBeats =
    state.currentBeatIndex < currentAct.beats.length - 1 ||
    state.currentActIndex < structure.acts.length - 1;
  const beatComparisonHint = hasPendingBeats
    ? `
PROGRESSION CHECK: If the current narrative situation more closely matches a PENDING beat's description than the ACTIVE beat's description, the ACTIVE beat should be marked concluded.
`
    : '';

  const totalBeats = structure.acts.reduce((sum, act) => sum + act.beats.length, 0);
  const avgPagesPerBeat = Math.round(structure.pacingBudget.targetPagesMax / totalBeats);
  const maxPagesPerBeat = Math.ceil(structure.pacingBudget.targetPagesMax / totalBeats) + 2;

  const pacingEvaluationSection = `=== PACING EVALUATION ===
Pages spent on current beat: ${state.pagesInCurrentBeat}
Story pacing budget: ${structure.pacingBudget.targetPagesMin}-${structure.pacingBudget.targetPagesMax} total pages
Total beats in structure: ${totalBeats}
Average pages per beat (budget-based): ~${avgPagesPerBeat}

DETECT A PACING ISSUE (pacingIssueDetected: true) when EITHER applies:
1. BEAT STALL: pagesInCurrentBeat exceeds ${maxPagesPerBeat} (roughly targetPagesMax / totalBeats, rounded up + 2) AND the beat objective has not been meaningfully advanced
2. MISSING MIDPOINT: The story has consumed more than 50% of its page budget (estimated from beat progression and pagesInCurrentBeat) without any turning_point beat being concluded

If pacingIssueDetected is true:
- pacingIssueReason: Explain what's stalling or missing
- recommendedAction:
  - "nudge" if a stronger directive in the next page could fix it (e.g., "this scene must deliver a reveal")
  - "rewrite" if the remaining structure needs to be pulled closer (e.g., turning points are too far away)

If no pacing issue: pacingIssueDetected: false, pacingIssueReason: "", recommendedAction: "none"

`;

  return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}
Premise: ${structure.premise}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of 3)
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${beatLines}

REMAINING ACTS:
${remainingActs || '  - None'}

${activeStateSummary}=== BEAT EVALUATION ===
Evaluate the following narrative against this structure to determine beat completion.

CONCLUDE THE BEAT (beatConcluded: true) when ANY of these apply:
1. The beat's objective has been substantively achieved (even if not perfectly)
2. The narrative has moved beyond this beat's scope into territory that matches a PENDING beat
3. Key events from later beats have already occurred (compare against PENDING beats below)
4. The current state shows the beat's goal has been reached

DO NOT CONCLUDE only if:
- This scene is still squarely within the active beat's scope AND
- The beat objective remains genuinely unresolved

${beatComparisonHint}${DEVIATION_DETECTION_SECTION}
${remainingBeatsSection}

${pacingEvaluationSection}`;
}
