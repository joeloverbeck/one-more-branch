import type {
  AccumulatedStructureState,
  MilestoneRole,
  StoryMilestone,
  StoryStructure,
} from '../../../models/story-arc.js';
import type { ActiveState } from '../../../models/state/index.js';

export const DEVIATION_DETECTION_SECTION = `=== BEAT DEVIATION EVALUATION ===
After evaluating milestone completion, also evaluate whether the story has DEVIATED from remaining milestones.

A deviation occurs when future milestones are now impossible or nonsensical because:
- Story direction fundamentally changed
- Core assumptions of upcoming milestones are invalid
- Required story elements/goals no longer exist

Evaluate ONLY milestones that are not concluded. Never re-evaluate concluded milestones.

If deviation is detected, mark:
- deviationDetected: true
- deviationReason: concise reason
- invalidatedMilestoneIds: invalid milestone IDs only

If no deviation is detected, mark deviationDetected: false.
Be conservative. Minor variations are acceptable; only mark true deviation for genuine invalidation.
`;

export function getRemainingBeats(
  structure: StoryStructure,
  state: AccumulatedStructureState
): Array<{ id: string; description: string; objective: string }> {
  const concludedMilestoneIds = new Set(
    state.milestoneProgressions
      .filter((progression) => progression.status === 'concluded')
      .map((progression) => progression.milestoneId)
  );

  return structure.acts.flatMap((act) =>
    act.milestones
      .filter((milestone) => !concludedMilestoneIds.has(milestone.id))
      .map((milestone) => ({ id: milestone.id, description: milestone.description, objective: milestone.objective }))
  );
}

export function buildActiveStateForMilestoneEvaluation(
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

  return `CURRENT STATE (for milestone evaluation):
${parts.map((p) => `- ${p}`).join('\n')}
(Consider these when evaluating milestone completion)

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

  const milestoneLines = currentAct.milestones
    .map((milestone) => {
      const progression = state.milestoneProgressions.find((item) => item.milestoneId === milestone.id);
      if (progression?.status === 'concluded') {
        const resolution =
          progression.resolution && progression.resolution.trim().length > 0
            ? progression.resolution
            : 'No resolution recorded.';
        return `  [x] CONCLUDED (${milestone.role}): ${milestone.description}
    Resolution: ${resolution}`;
      }
      if (progression?.status === 'active') {
        const escalationLine = milestone.escalationType
          ? `\n    Escalation mechanism: ${milestone.escalationType}`
          : '';
        const crisisLine = milestone.crisisType
          ? `\n    Crisis type: ${milestone.crisisType}`
          : '';
        const gapLine = milestone.expectedGapMagnitude
          ? `\n    Expected gap magnitude: ${milestone.expectedGapMagnitude}`
          : '';
        const midpointLine = milestone.isMidpoint
          ? `\n    Midpoint: true (${milestone.midpointType ?? 'UNSPECIFIED'})`
          : '';
        const hookLine = milestone.uniqueScenarioHook
          ? `\n    Scenario hook: ${milestone.uniqueScenarioHook}`
          : '';
        const approachLine =
          milestone.approachVectors && milestone.approachVectors.length > 0
            ? `\n    Approach vectors: ${milestone.approachVectors.join(', ')}`
            : '';
        return `  [>] ACTIVE (${milestone.role}): ${milestone.description}
    Objective: ${milestone.objective}${escalationLine}${crisisLine}${gapLine}${midpointLine}${hookLine}${approachLine}`;
      }
      return `  [ ] PENDING (${milestone.role}): ${milestone.description}`;
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
Opening image: ${structure.openingImage}
Closing image: ${structure.closingImage}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of ${structure.acts.length})
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${milestoneLines}

REMAINING ACTS:
${remainingActs || '  - None'}

`;
}

export function buildEscalationCheckSection(
  activeMilestoneRole: MilestoneRole | undefined,
  milestones: readonly StoryMilestone[],
  state: AccumulatedStructureState
): string {
  if (!activeMilestoneRole) {
    return '';
  }

  const activeMilestone = milestones[state.currentMilestoneIndex];
  if (!activeMilestone) {
    return '';
  }

  const hasRoleQualityCheck =
    activeMilestoneRole === 'escalation' ||
    activeMilestoneRole === 'turning_point' ||
    activeMilestoneRole === 'reflection';
  if (!hasRoleQualityCheck && !activeMilestone.isMidpoint) {
    return '';
  }

  const previousResolution = findPreviousConcludedResolution(milestones, state);

  const lines: string[] = [];

  if (activeMilestoneRole === 'escalation') {
    lines.push('=== ESCALATION QUALITY CHECK ===');
    lines.push(
      'The active milestone role is "escalation". When evaluating this milestone:'
    );
    if (previousResolution) {
      lines.push(`Previous milestone resolved: "${previousResolution}"`);
    }
    if (activeMilestone?.escalationType) {
      lines.push(
        `The expected escalation mechanism is ${activeMilestone.escalationType}. Assess whether the narrative delivered this specific type of escalation — not just any stakes increase.`
      );
    }
    if (activeMilestone?.crisisType) {
      lines.push(
        `The expected crisis type is ${activeMilestone.crisisType}. Assess whether choices created this dilemma shape.`
      );
    }
    if (activeMilestone?.expectedGapMagnitude) {
      lines.push(
        `The expected gap magnitude is ${activeMilestone.expectedGapMagnitude}. Assess whether outcome divergence from protagonist expectations matches this scale.`
      );
    }
    if (activeMilestone?.uniqueScenarioHook) {
      lines.push(
        `The scene should reflect this unique scenario hook: "${activeMilestone.uniqueScenarioHook}". Assess whether the scene leveraged this story's specific elements.`
      );
    }
    lines.push(
      '- Assess whether the narrative actually raised stakes beyond the previous milestone'
    );
    lines.push(
      '- Stakes are raised when new consequences, threats, or costs were introduced that did not exist before'
    );
    lines.push(
      '- Stakes are NOT raised if the scene only added complexity without raising the cost of failure'
    );
    lines.push(
      '- If milestoneConcluded is true but stakes were not genuinely raised, set pacingIssueDetected: true with pacingIssueReason: "Milestone concluded without genuine escalation — scene added complexity but did not raise the cost of failure"'
    );
    if (activeMilestone?.escalationType) {
      lines.push(
        `- If the escalation type does not match what actually happened (e.g., expected ${activeMilestone.escalationType} but got generic tension), note the mismatch in pacingIssueReason`
      );
    }
    if (activeMilestone?.crisisType) {
      lines.push(
        `- If choice pressure does not match crisis type ${activeMilestone.crisisType}, note the mismatch in pacingIssueReason`
      );
    }
    if (activeMilestone?.expectedGapMagnitude) {
      lines.push(
        `- If delivered divergence does not match expected gap magnitude ${activeMilestone.expectedGapMagnitude}, note the mismatch in pacingIssueReason`
      );
    }
  } else if (activeMilestoneRole === 'turning_point') {
    lines.push('=== TURNING POINT QUALITY CHECK ===');
    lines.push(
      'The active milestone role is "turning_point". When evaluating this milestone:'
    );
    if (previousResolution) {
      lines.push(`Previous milestone resolved: "${previousResolution}"`);
    }
    if (activeMilestone?.escalationType) {
      lines.push(
        `The expected turning point mechanism is ${activeMilestone.escalationType}. Assess whether the narrative delivered this specific type of shift — not just any irreversible change.`
      );
    }
    if (activeMilestone?.crisisType) {
      lines.push(
        `The expected crisis type is ${activeMilestone.crisisType}. Assess whether the turning-point decision pressure matched this dilemma shape.`
      );
    }
    if (activeMilestone?.expectedGapMagnitude) {
      lines.push(
        `The expected gap magnitude is ${activeMilestone.expectedGapMagnitude}. Assess whether the turning-point outcome diverged from expectations at this scale.`
      );
    }
    if (activeMilestone?.uniqueScenarioHook) {
      lines.push(
        `The scene should reflect this unique scenario hook: "${activeMilestone.uniqueScenarioHook}". Assess whether the scene leveraged this story's specific elements.`
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
      '- If milestoneConcluded is true but no irreversible shift occurred, set pacingIssueDetected: true with pacingIssueReason: "Milestone concluded without irreversible shift — status quo was not permanently altered"'
    );
    if (activeMilestone?.escalationType) {
      lines.push(
        `- If the turning point type does not match what actually happened (e.g., expected ${activeMilestone.escalationType} but got generic change), note the mismatch in pacingIssueReason`
      );
    }
    if (activeMilestone?.crisisType) {
      lines.push(
        `- If turning-point choices do not reflect crisis type ${activeMilestone.crisisType}, note the mismatch in pacingIssueReason`
      );
    }
    if (activeMilestone?.expectedGapMagnitude) {
      lines.push(
        `- If turning-point divergence does not reflect expected gap magnitude ${activeMilestone.expectedGapMagnitude}, note the mismatch in pacingIssueReason`
      );
    }
  } else if (activeMilestoneRole === 'reflection') {
    lines.push('=== REFLECTION QUALITY CHECK ===');
    lines.push(
      'The active milestone role is "reflection". When evaluating this milestone:'
    );
    if (previousResolution) {
      lines.push(`Previous milestone resolved: "${previousResolution}"`);
    }
    lines.push(
      '- Assess whether the narrative delivered thematic or internal deepening tied to the protagonist\'s current dilemma'
    );
    lines.push(
      '- Reflection should produce a meaningful shift in interpretation, emotional commitment, or relational stance'
    );
    lines.push(
      '- Reflection is NOT recap: repeating known facts or mood without new meaning does not satisfy this milestone role'
    );
    lines.push(
      '- If milestoneConcluded is true but no meaningful thematic/internal movement occurred, set pacingIssueDetected: true with pacingIssueReason: "Milestone concluded without thematic/internal deepening — scene recapped prior material without changing interpretation or commitment"'
    );
  }

  if (activeMilestone.isMidpoint) {
    lines.push('=== MIDPOINT QUALITY CHECK ===');
    lines.push(
      'The active milestone is midpoint-tagged. Evaluate whether this scene delivers a true structural midpoint reversal.'
    );
    lines.push(`Expected midpoint type: ${activeMilestone.midpointType ?? 'UNSPECIFIED'}`);
    lines.push(
      '- FALSE_VICTORY: apparent win with hidden cost, instability, or misread consequence'
    );
    lines.push(
      '- FALSE_DEFEAT: apparent loss that plants a credible seed of future success'
    );
    lines.push(
      '- If milestoneConcluded is true but no midpoint-grade reversal occurs, set pacingIssueDetected: true and note midpoint underdelivery in pacingIssueReason'
    );
    lines.push(
      '- Tie midpoint evaluation to structural function, not just emotional intensity'
    );
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

function findPreviousConcludedResolution(
  milestones: readonly StoryMilestone[],
  state: AccumulatedStructureState
): string | null {
  for (let i = state.currentMilestoneIndex - 1; i >= 0; i--) {
    const milestone = milestones[i];
    if (!milestone) {
      continue;
    }
    const progression = state.milestoneProgressions.find((p) => p.milestoneId === milestone.id);
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

  const milestoneLines = currentAct.milestones
    .map((milestone) => {
      const progression = state.milestoneProgressions.find((item) => item.milestoneId === milestone.id);
      if (progression?.status === 'concluded') {
        const resolution =
          progression.resolution && progression.resolution.trim().length > 0
            ? progression.resolution
            : 'No resolution recorded.';
        return `  [x] CONCLUDED (${milestone.role}): ${milestone.description}
    Resolution: ${resolution}`;
      }
      if (progression?.status === 'active') {
        return `  [>] ACTIVE (${milestone.role}): ${milestone.description}
    Objective: ${milestone.objective}`;
      }
      return `  [ ] PENDING (${milestone.role}): ${milestone.description}
    Objective: ${milestone.objective}`;
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
          .map((milestone) => `  - ${milestone.id}: ${milestone.description}\n    Objective: ${milestone.objective}`)
          .join('\n')}`
      : 'REMAINING BEATS TO EVALUATE FOR DEVIATION:\n  - None';

  const activeStateSummary = buildActiveStateForMilestoneEvaluation(
    activeState,
    threadsResolved,
    threadAges
  );

  const hasPendingBeats =
    state.currentMilestoneIndex < currentAct.milestones.length - 1 ||
    state.currentActIndex < structure.acts.length - 1;
  const milestoneComparisonHint = hasPendingBeats
    ? `
PROGRESSION CHECK: Compare the narrative against PENDING milestone descriptions and objectives when classifying structuralPositionSignal and alignedMilestoneId. If the narrative is truly in next-milestone territory, use CLEARLY_IN_NEXT_BEAT and apply the completion gate. Also identify which specific pending milestone the narrative aligns with via alignedMilestoneId.
`
    : '';

  const totalBeats = structure.acts.reduce((sum, act) => sum + act.milestones.length, 0);
  const avgPagesPerBeat = Math.round(structure.pacingBudget.targetPagesMax / totalBeats);
  const maxPagesPerBeat = Math.ceil(structure.pacingBudget.targetPagesMax / totalBeats) + 2;

  const pacingEvaluationSection = `=== PACING EVALUATION ===
Pages spent on current milestone: ${state.pagesInCurrentMilestone}
Story pacing budget: ${structure.pacingBudget.targetPagesMin}-${structure.pacingBudget.targetPagesMax} total pages
Total milestones in structure: ${totalBeats}
Average pages per milestone (budget-based): ~${avgPagesPerBeat}

DETECT A PACING ISSUE (pacingIssueDetected: true) when EITHER applies:
1. BEAT STALL: pagesInCurrentMilestone exceeds ${maxPagesPerBeat} (roughly targetPagesMax / totalBeats, rounded up + 2) AND the milestone objective has not been meaningfully advanced
2. MISSING MIDPOINT: The story has consumed more than 50% of its page budget (estimated from milestone progression and pagesInCurrentMilestone) without any turning_point milestone being concluded

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
- Unresolved emotional milestones that demand future closure (UNRESOLVED_EMOTION)

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

  const activeMilestone = currentAct.milestones[state.currentMilestoneIndex];
  const escalationCheckSection = buildEscalationCheckSection(
    activeMilestone?.role,
    currentAct.milestones,
    state
  );

  return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}
Premise: ${structure.premise}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of ${structure.acts.length})
Objective: ${currentAct.objective}
Stakes: ${currentAct.stakes}

BEATS IN THIS ACT:
${milestoneLines}

REMAINING ACTS:
${remainingActs || '  - None'}

${activeStateSummary}${foreshadowingSection}
${payoffSection}=== BEAT EVALUATION ===
Evaluate the following narrative against this structure to determine milestone completion.

=== SCENE SIGNAL CLASSIFICATION ===
Classify the narrative before deciding milestoneConcluded:
- sceneMomentum: STASIS | INCREMENTAL_PROGRESS | MAJOR_PROGRESS | REVERSAL_OR_SETBACK | SCOPE_SHIFT
- objectiveEvidenceStrength: NONE | WEAK_IMPLICIT | CLEAR_EXPLICIT
- commitmentStrength: NONE | TENTATIVE | EXPLICIT_REVERSIBLE | EXPLICIT_IRREVERSIBLE
- structuralPositionSignal: WITHIN_ACTIVE_BEAT | BRIDGING_TO_NEXT_BEAT | CLEARLY_IN_NEXT_BEAT
- entryConditionReadiness: NOT_READY | PARTIAL | READY

=== COMPLETION GATE ===
Set milestoneConcluded: true only when the gate is satisfied.

Base gate for all milestone roles (must satisfy at least one):
1. objectiveEvidenceStrength is CLEAR_EXPLICIT for the active milestone objective
2. structuralPositionSignal is CLEARLY_IN_NEXT_BEAT AND there is explicit evidence that the active milestone objective is no longer the primary unresolved objective

Additional gate for turning_point:
- commitmentStrength must be EXPLICIT_REVERSIBLE or EXPLICIT_IRREVERSIBLE
- If commitmentStrength is EXPLICIT_REVERSIBLE, require an explicit forward consequence that materially changes available next actions

Negative guards:
- Intensity/action escalation alone is insufficient without CLEAR_EXPLICIT objective evidence
- SCOPE_SHIFT alone cannot conclude a milestone without objective resolution or explicit structural supersession evidence

If the completion gate is not satisfied, set milestoneConcluded: false.

${milestoneComparisonHint}=== BEAT ALIGNMENT DETECTION ===
After classifying structuralPositionSignal, if the signal is NOT WITHIN_ACTIVE_BEAT, identify which PENDING milestone the narrative most closely aligns with.

Compare the current narrative state against ALL pending milestone objectives (shown above). Select the milestone whose objective best describes what the narrative is currently delivering or has just delivered.

- alignedMilestoneId: The milestone ID (e.g., "1.4", "2.1") that best matches the current narrative territory. null if WITHIN_ACTIVE_BEAT or no clear match.
- milestoneAlignmentConfidence:
  - HIGH: The narrative clearly satisfies or is actively delivering most conditions of the target milestone's objective. Multiple objective elements are present.
  - MEDIUM: The narrative has elements that overlap with the target milestone but also fits nearby milestones. Ambiguous.
  - LOW: Weak or uncertain alignment. The narrative may have moved past the active milestone but the target is unclear.
- milestoneAlignmentReason: One sentence explaining the alignment judgment.

If the aligned milestone is the NEXT sequential milestone (i.e., the one immediately after the active milestone), this is normal progression — still report it but confidence assessment remains standard.

If the aligned milestone is 2+ milestones ahead of the active milestone, this indicates a narrative leap. Be especially careful with HIGH confidence — only assign it when the evidence is unambiguous.

${escalationCheckSection}${DEVIATION_DETECTION_SECTION}
${remainingBeatsSection}

${pacingEvaluationSection}`;
}
