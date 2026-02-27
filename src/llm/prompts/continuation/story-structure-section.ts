import type {
  AccumulatedStructureState,
  BeatRole,
  StoryBeat,
  StoryStructure,
} from '../../../models/story-arc.js';
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
  state: AccumulatedStructureState
): Array<{ id: string; description: string; objective: string }> {
  const concludedBeatIds = new Set(
    state.beatProgressions
      .filter((progression) => progression.status === 'concluded')
      .map((progression) => progression.beatId)
  );

  return structure.acts.flatMap((act) =>
    act.beats
      .filter((beat) => !concludedBeatIds.has(beat.id))
      .map((beat) => ({ id: beat.id, description: beat.description, objective: beat.objective }))
  );
}

export function buildActiveStateForBeatEvaluation(
  activeState: ActiveState,
  threadsResolved?: readonly string[],
  threadAges?: Readonly<Record<string, number>>
): string {
  const parts: string[] = [];
  const threatTexts = activeState.activeThreats.map((threat) => threat.text.trim()).filter(Boolean);
  const constraintTexts = activeState.activeConstraints
    .map((constraint) => constraint.text.trim())
    .filter(Boolean);

  if (activeState.currentLocation) {
    parts.push(`Location: ${activeState.currentLocation}`);
  }

  if (threatTexts.length > 0) {
    parts.push(`Active threats: ${threatTexts.join(', ')}`);
  }

  if (constraintTexts.length > 0) {
    parts.push(`Constraints: ${constraintTexts.join(', ')}`);
  }

  if (activeState.openThreads.length > 0) {
    const threadLines = activeState.openThreads.map((thread) => {
      const age = threadAges?.[thread.id];
      const ageStr = age !== undefined ? `, ${age} pages old` : '';
      return `  [${thread.id}] (${thread.threadType}/${thread.urgency}${ageStr}) ${thread.text.trim()}`;
    });
    parts.push(`Open threads:\n${threadLines.join('\n')}`);
  }

  if (threadsResolved && threadsResolved.length > 0) {
    parts.push(`Threads resolved this scene: ${threadsResolved.join(', ')}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `CURRENT STATE (for beat evaluation):
${parts.map((p) => `- ${p}`).join('\n')}
(Consider these when evaluating beat completion)

`;
}

export function buildWriterStructureContext(
  structure: StoryStructure | undefined,
  accumulatedStructureState: AccumulatedStructureState | undefined
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
    .map((beat) => {
      const progression = state.beatProgressions.find((item) => item.beatId === beat.id);
      if (progression?.status === 'concluded') {
        const resolution =
          progression.resolution && progression.resolution.trim().length > 0
            ? progression.resolution
            : 'No resolution recorded.';
        return `  [x] CONCLUDED (${beat.role}): ${beat.description}
    Resolution: ${resolution}`;
      }
      if (progression?.status === 'active') {
        const escalationLine = beat.escalationType
          ? `\n    Escalation mechanism: ${beat.escalationType}`
          : '';
        const crisisLine = beat.crisisType
          ? `\n    Crisis type: ${beat.crisisType}`
          : '';
        const hookLine = beat.uniqueScenarioHook
          ? `\n    Scenario hook: ${beat.uniqueScenarioHook}`
          : '';
        const approachLine =
          beat.approachVectors && beat.approachVectors.length > 0
            ? `\n    Approach vectors: ${beat.approachVectors.join(', ')}`
            : '';
        return `  [>] ACTIVE (${beat.role}): ${beat.description}
    Objective: ${beat.objective}${escalationLine}${crisisLine}${hookLine}${approachLine}`;
      }
      return `  [ ] PENDING (${beat.role}): ${beat.description}`;
    })
    .join('\n');

  const remainingActs = structure.acts
    .slice(state.currentActIndex + 1)
    .map(
      (act, index) => `  - Act ${state.currentActIndex + 2 + index}: ${act.name} - ${act.objective}`
    )
    .join('\n');

  return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}
Premise: ${structure.premise}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of ${structure.acts.length})
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${beatLines}

REMAINING ACTS:
${remainingActs || '  - None'}

`;
}

export function buildEscalationCheckSection(
  activeBeatRole: BeatRole | undefined,
  beats: readonly StoryBeat[],
  state: AccumulatedStructureState
): string {
  if (
    !activeBeatRole ||
    (activeBeatRole !== 'escalation' &&
      activeBeatRole !== 'turning_point' &&
      activeBeatRole !== 'reflection')
  ) {
    return '';
  }

  const previousResolution = findPreviousConcludedResolution(beats, state);
  const activeBeat = beats[state.currentBeatIndex];

  const lines: string[] = [];

  if (activeBeatRole === 'escalation') {
    lines.push('=== ESCALATION QUALITY CHECK ===');
    lines.push(
      'The active beat role is "escalation". When evaluating this beat:'
    );
    if (previousResolution) {
      lines.push(`Previous beat resolved: "${previousResolution}"`);
    }
    if (activeBeat?.escalationType) {
      lines.push(
        `The expected escalation mechanism is ${activeBeat.escalationType}. Assess whether the narrative delivered this specific type of escalation — not just any stakes increase.`
      );
    }
    if (activeBeat?.crisisType) {
      lines.push(
        `The expected crisis type is ${activeBeat.crisisType}. Assess whether choices created this dilemma shape.`
      );
    }
    if (activeBeat?.uniqueScenarioHook) {
      lines.push(
        `The scene should reflect this unique scenario hook: "${activeBeat.uniqueScenarioHook}". Assess whether the scene leveraged this story's specific elements.`
      );
    }
    lines.push(
      '- Assess whether the narrative actually raised stakes beyond the previous beat'
    );
    lines.push(
      '- Stakes are raised when new consequences, threats, or costs were introduced that did not exist before'
    );
    lines.push(
      '- Stakes are NOT raised if the scene only added complexity without raising the cost of failure'
    );
    lines.push(
      '- If beatConcluded is true but stakes were not genuinely raised, set pacingIssueDetected: true with pacingIssueReason: "Beat concluded without genuine escalation — scene added complexity but did not raise the cost of failure"'
    );
    if (activeBeat?.escalationType) {
      lines.push(
        `- If the escalation type does not match what actually happened (e.g., expected ${activeBeat.escalationType} but got generic tension), note the mismatch in pacingIssueReason`
      );
    }
    if (activeBeat?.crisisType) {
      lines.push(
        `- If choice pressure does not match crisis type ${activeBeat.crisisType}, note the mismatch in pacingIssueReason`
      );
    }
  } else if (activeBeatRole === 'turning_point') {
    lines.push('=== TURNING POINT QUALITY CHECK ===');
    lines.push(
      'The active beat role is "turning_point". When evaluating this beat:'
    );
    if (previousResolution) {
      lines.push(`Previous beat resolved: "${previousResolution}"`);
    }
    if (activeBeat?.escalationType) {
      lines.push(
        `The expected turning point mechanism is ${activeBeat.escalationType}. Assess whether the narrative delivered this specific type of shift — not just any irreversible change.`
      );
    }
    if (activeBeat?.crisisType) {
      lines.push(
        `The expected crisis type is ${activeBeat.crisisType}. Assess whether the turning-point decision pressure matched this dilemma shape.`
      );
    }
    if (activeBeat?.uniqueScenarioHook) {
      lines.push(
        `The scene should reflect this unique scenario hook: "${activeBeat.uniqueScenarioHook}". Assess whether the scene leveraged this story's specific elements.`
      );
    }
    lines.push(
      '- Assess whether the narrative delivered an irreversible shift'
    );
    lines.push(
      '- An irreversible shift means a decision, revelation, or consequence that permanently changes available options'
    );
    lines.push(
      '- A scene that only adds complications without destroying the status quo is NOT a turning point'
    );
    lines.push(
      '- If beatConcluded is true but no irreversible shift occurred, set pacingIssueDetected: true with pacingIssueReason: "Beat concluded without irreversible shift — status quo was not permanently altered"'
    );
    if (activeBeat?.escalationType) {
      lines.push(
        `- If the turning point type does not match what actually happened (e.g., expected ${activeBeat.escalationType} but got generic change), note the mismatch in pacingIssueReason`
      );
    }
    if (activeBeat?.crisisType) {
      lines.push(
        `- If turning-point choices do not reflect crisis type ${activeBeat.crisisType}, note the mismatch in pacingIssueReason`
      );
    }
  } else {
    lines.push('=== REFLECTION QUALITY CHECK ===');
    lines.push(
      'The active beat role is "reflection". When evaluating this beat:'
    );
    if (previousResolution) {
      lines.push(`Previous beat resolved: "${previousResolution}"`);
    }
    lines.push(
      '- Assess whether the narrative delivered thematic or internal deepening tied to the protagonist\'s current dilemma'
    );
    lines.push(
      '- Reflection should produce a meaningful shift in interpretation, emotional commitment, or relational stance'
    );
    lines.push(
      '- Reflection is NOT recap: repeating known facts or mood without new meaning does not satisfy this beat role'
    );
    lines.push(
      '- If beatConcluded is true but no meaningful thematic/internal movement occurred, set pacingIssueDetected: true with pacingIssueReason: "Beat concluded without thematic/internal deepening — scene recapped prior material without changing interpretation or commitment"'
    );
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

function findPreviousConcludedResolution(
  beats: readonly StoryBeat[],
  state: AccumulatedStructureState
): string | null {
  for (let i = state.currentBeatIndex - 1; i >= 0; i--) {
    const beat = beats[i];
    if (!beat) {
      continue;
    }
    const progression = state.beatProgressions.find((p) => p.beatId === beat.id);
    if (
      progression?.status === 'concluded' &&
      progression.resolution &&
      progression.resolution.trim().length > 0
    ) {
      return progression.resolution;
    }
  }
  return null;
}

export function buildAnalystStructureEvaluation(
  structure: StoryStructure,
  accumulatedStructureState: AccumulatedStructureState,
  activeState: ActiveState,
  threadsResolved?: readonly string[],
  threadAges?: Readonly<Record<string, number>>
): string {
  const state = accumulatedStructureState;
  const currentAct = structure.acts[state.currentActIndex];

  if (!currentAct) {
    return '';
  }

  const beatLines = currentAct.beats
    .map((beat) => {
      const progression = state.beatProgressions.find((item) => item.beatId === beat.id);
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
      return `  [ ] PENDING (${beat.role}): ${beat.description}
    Objective: ${beat.objective}`;
    })
    .join('\n');

  const remainingActs = structure.acts
    .slice(state.currentActIndex + 1)
    .map(
      (act, index) => `  - Act ${state.currentActIndex + 2 + index}: ${act.name} - ${act.objective}`
    )
    .join('\n');

  const remainingBeats = getRemainingBeats(structure, state);
  const remainingBeatsSection =
    remainingBeats.length > 0
      ? `REMAINING BEATS TO EVALUATE FOR DEVIATION:\n${remainingBeats
          .map((beat) => `  - ${beat.id}: ${beat.description}\n    Objective: ${beat.objective}`)
          .join('\n')}`
      : 'REMAINING BEATS TO EVALUATE FOR DEVIATION:\n  - None';

  const activeStateSummary = buildActiveStateForBeatEvaluation(
    activeState,
    threadsResolved,
    threadAges
  );

  const hasPendingBeats =
    state.currentBeatIndex < currentAct.beats.length - 1 ||
    state.currentActIndex < structure.acts.length - 1;
  const beatComparisonHint = hasPendingBeats
    ? `
PROGRESSION CHECK: Compare the narrative against PENDING beat descriptions and objectives when classifying structuralPositionSignal and alignedBeatId. If the narrative is truly in next-beat territory, use CLEARLY_IN_NEXT_BEAT and apply the completion gate. Also identify which specific pending beat the narrative aligns with via alignedBeatId.
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

  const foreshadowingSection = `=== FORESHADOWING DETECTION ===
Scan the narrative for implicit promises planted with deliberate narrative emphasis.
Only flag items that a reader would reasonably expect to pay off later:
- Objects, locations, or abilities introduced with unusual descriptive weight (CHEKHOV_GUN)
- Hints at future events or outcomes (FORESHADOWING)
- Information the reader knows but characters don't (DRAMATIC_IRONY)
- Unresolved emotional beats that demand future closure (UNRESOLVED_EMOTION)

Do NOT flag incidental scene-setting details. Max 3 per page. Empty array if none detected.
`;

  const hasResolvedThreads = threadsResolved && threadsResolved.length > 0;
  const payoffSection = hasResolvedThreads
    ? `=== THREAD PAYOFF QUALITY ===
Threads were resolved this scene: ${threadsResolved.join(', ')}
For each resolved thread, assess payoff quality:
- RUSHED: Resolved via exposition, off-screen action, or a single sentence without buildup
- ADEQUATE: Resolved through action but without significant dramatic development
- WELL_EARNED: Resolution developed through action, consequence, and emotional payoff

Populate threadPayoffAssessments for each resolved thread.
`
    : '';

  const activeBeat = currentAct.beats[state.currentBeatIndex];
  const escalationCheckSection = buildEscalationCheckSection(
    activeBeat?.role,
    currentAct.beats,
    state
  );

  return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}
Premise: ${structure.premise}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of ${structure.acts.length})
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${beatLines}

REMAINING ACTS:
${remainingActs || '  - None'}

${activeStateSummary}${foreshadowingSection}
${payoffSection}=== BEAT EVALUATION ===
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

${beatComparisonHint}=== BEAT ALIGNMENT DETECTION ===
After classifying structuralPositionSignal, if the signal is NOT WITHIN_ACTIVE_BEAT, identify which PENDING beat the narrative most closely aligns with.

Compare the current narrative state against ALL pending beat objectives (shown above). Select the beat whose objective best describes what the narrative is currently delivering or has just delivered.

- alignedBeatId: The beat ID (e.g., "1.4", "2.1") that best matches the current narrative territory. null if WITHIN_ACTIVE_BEAT or no clear match.
- beatAlignmentConfidence:
  - HIGH: The narrative clearly satisfies or is actively delivering most conditions of the target beat's objective. Multiple objective elements are present.
  - MEDIUM: The narrative has elements that overlap with the target beat but also fits nearby beats. Ambiguous.
  - LOW: Weak or uncertain alignment. The narrative may have moved past the active beat but the target is unclear.
- beatAlignmentReason: One sentence explaining the alignment judgment.

If the aligned beat is the NEXT sequential beat (i.e., the one immediately after the active beat), this is normal progression — still report it but confidence assessment remains standard.

If the aligned beat is 2+ beats ahead of the active beat, this indicates a narrative leap. Be especially careful with HIGH confidence — only assign it when the evidence is unambiguous.

${escalationCheckSection}${DEVIATION_DETECTION_SECTION}
${remainingBeatsSection}

${pacingEvaluationSection}`;
}
