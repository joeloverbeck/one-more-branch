import type { AccumulatedStructureState, StoryStructure } from '../../../models/story-arc.js';
import type { ActiveState } from '../../../models/state/index.js';

export const DEVIATION_DETECTION_SECTION = `=== BEAT DEVIATION EVALUATION ===
After evaluating beat completion, also evaluate whether the story has DEVIATED from remaining beats.

A deviation occurs when future beats are now impossible or nonsensical because:
- Story direction fundamentally changed
- Core assumptions of upcoming beats are invalid
- Required story elements/goals no longer exist

Evaluate ONLY beats that are not concluded. Never re-evaluate concluded beats.

Always provide narrativeSummary: a 1-2 sentence summary of the current narrative state (used for planner context and rewrite context).

If deviation is detected, mark:
- deviationDetected: true
- deviationReason: concise reason
- invalidatedBeatIds: invalid beat IDs only

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
  const threatTexts = activeState.activeThreats.map(threat => threat.text.trim()).filter(Boolean);
  const constraintTexts = activeState.activeConstraints
    .map(constraint => constraint.text.trim())
    .filter(Boolean);
  const threadTexts = activeState.openThreads.map(thread => thread.text.trim()).filter(Boolean);

  if (activeState.currentLocation) {
    parts.push(`Location: ${activeState.currentLocation}`);
  }

  if (threatTexts.length > 0) {
    parts.push(`Active threats: ${threatTexts.join(', ')}`);
  }

  if (constraintTexts.length > 0) {
    parts.push(`Constraints: ${constraintTexts.join(', ')}`);
  }

  if (threadTexts.length > 0) {
    parts.push(`Open threads: ${threadTexts.join(', ')}`);
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
PROGRESSION CHECK: Compare the narrative against PENDING beat descriptions when classifying structuralPositionSignal. If the narrative is truly in next-beat territory, use CLEARLY_IN_NEXT_BEAT and apply the completion gate.
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

=== SCENE SIGNAL CLASSIFICATION ===
Classify the narrative before deciding beatConcluded:
- sceneMomentum: STASIS | INCREMENTAL_PROGRESS | MAJOR_PROGRESS | REVERSAL_OR_SETBACK | SCOPE_SHIFT
- objectiveEvidenceStrength: NONE | WEAK_IMPLICIT | CLEAR_EXPLICIT
- commitmentStrength: NONE | TENTATIVE | EXPLICIT_REVERSIBLE | EXPLICIT_IRREVERSIBLE
- structuralPositionSignal: WITHIN_ACTIVE_BEAT | BRIDGING_TO_NEXT_BEAT | CLEARLY_IN_NEXT_BEAT
- entryConditionReadiness: NOT_READY | PARTIAL | READY

=== COMPLETION GATE ===
Set beatConcluded: true only when the gate is satisfied.

Base gate for all beat roles (must satisfy at least one):
1. objectiveEvidenceStrength is CLEAR_EXPLICIT for the active beat objective
2. structuralPositionSignal is CLEARLY_IN_NEXT_BEAT AND there is explicit evidence that the active beat objective is no longer the primary unresolved objective

Additional gate for turning_point:
- commitmentStrength must be EXPLICIT_REVERSIBLE or EXPLICIT_IRREVERSIBLE
- If commitmentStrength is EXPLICIT_REVERSIBLE, require an explicit forward consequence that materially changes available next actions

Negative guards:
- Intensity/action escalation alone is insufficient without CLEAR_EXPLICIT objective evidence
- SCOPE_SHIFT alone cannot conclude a beat without objective resolution or explicit structural supersession evidence

If the completion gate is not satisfied, set beatConcluded: false.

${beatComparisonHint}${DEVIATION_DETECTION_SECTION}
${remainingBeatsSection}

${pacingEvaluationSection}`;
}
