import {
  formatDecomposedCharacterForPrompt,
} from '../../../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../../../models/decomposed-world.js';
import { isProtagonistGuidanceEmpty } from '../../../../models/protagonist-guidance.js';
import type { ProtagonistGuidance } from '../../../../models/protagonist-guidance.js';
import type { AccumulatedStructureState, StoryStructure } from '../../../../models/story-arc.js';
import type { StoryKernel } from '../../../../models/story-kernel.js';
import { formatCanonForPrompt } from '../../../../engine/canon-manager.js';
import type { ContinuationPagePlanContext } from '../../../context-types.js';
import type {
  MomentumTrajectory,
  NarrativeFocusTrajectory,
  ThematicValenceTrajectory,
} from '../../../generation-pipeline-types.js';
import { buildProtagonistAffectSection } from '../../continuation/context-sections.js';
import { buildWriterStructureContext } from '../../continuation/story-structure-section.js';
import {
  buildThreadAgingSection,
  buildTrackedPromisesSection,
  buildPayoffFeedbackSection,
} from './thread-pacing-directive.js';
import {
  buildNpcAgendasSection,
  buildNpcRelationshipsSection,
} from '../shared/npc-state-sections.js';

function formatCharacterCanon(characterCanon: Readonly<Record<string, readonly string[]>>): string {
  const entries = Object.entries(characterCanon);
  if (entries.length === 0) {
    return '(none)';
  }

  return entries
    .map(([name, facts]) => `[${name}]\n${facts.map((fact) => `- ${fact}`).join('\n')}`)
    .join('\n\n');
}

function formatCharacterState(
  characterState: Readonly<Record<string, readonly { id: string; text: string }[]>>
): string {
  const entries = Object.entries(characterState);
  if (entries.length === 0) {
    return '(none)';
  }

  return entries
    .map(
      ([name, states]) =>
        `[${name}]\n${states.map((state) => `- [${state.id}] ${state.text}`).join('\n')}`
    )
    .join('\n\n');
}

/**
 * Counts how many consecutive entries from the end of an array match a predicate.
 */
export function countConsecutiveFromEnd<T>(
  items: readonly T[],
  predicate: (item: T) => boolean
): number {
  let count = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i]!)) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function buildTrajectoryWarnings(trajectory: MomentumTrajectory): string {
  if (trajectory.length < 2) {
    return '';
  }

  const lines: string[] = [];

  const consecutiveStasis = countConsecutiveFromEnd(
    trajectory,
    (p) => p.sceneMomentum === 'STASIS'
  );
  if (consecutiveStasis >= 2) {
    lines.push(
      `WARNING: The last ${consecutiveStasis} scenes showed no meaningful narrative progress. ` +
        'Plan MUST include a major advancement — reveal, confrontation, or irreversible change.'
    );
  }

  const consecutiveWeakEvidence = countConsecutiveFromEnd(
    trajectory,
    (p) => p.objectiveEvidenceStrength === 'NONE' || p.objectiveEvidenceStrength === 'WEAK_IMPLICIT'
  );
  if (consecutiveWeakEvidence >= 3) {
    lines.push(
      `WARNING: The last ${consecutiveWeakEvidence} scenes produced no clear evidence of milestone objective progress. ` +
        'Plan MUST make direct progress toward the current milestone objective.'
    );
  }

  return lines.join('\n');
}

function buildPacingBriefingSection(context: ContinuationPagePlanContext): string {
  const hasNudge = context.parentPacingNudge != null && context.parentPacingNudge.length > 0;
  const hasDirective =
    context.parentPacingDirective != null && context.parentPacingDirective.length > 0;
  const hasTrajectory = (context.momentumTrajectory?.length ?? 0) >= 2;

  const trajectoryWarnings = hasTrajectory && context.momentumTrajectory
    ? buildTrajectoryWarnings(context.momentumTrajectory)
    : '';

  if (!hasNudge && !hasDirective && !trajectoryWarnings) {
    return '';
  }

  const lines: string[] = ['=== PACING BRIEFING (from story analyst) ==='];

  if (hasDirective) {
    lines.push(context.parentPacingDirective!);
  }

  if (hasNudge) {
    lines.push(`URGENT: ${context.parentPacingNudge}`);
  }

  if (trajectoryWarnings) {
    lines.push('');
    lines.push(trajectoryWarnings);
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

interface TrajectoryPointWithPageId {
  readonly pageId: number;
}

function buildConsecutiveTrajectoryWarningSection<
  TPoint extends TrajectoryPointWithPageId,
  TValue extends string,
>(
  trajectory: readonly TPoint[] | undefined,
  options: {
    readonly minimumConsecutive: number;
    readonly sectionHeader: string;
    readonly historyLabel: string;
    readonly valueForPoint: (point: TPoint) => TValue;
    readonly detectValues: readonly TValue[];
    readonly warningLine: (dominantValue: TValue, count: number) => string;
  }
): string {
  if (!trajectory || trajectory.length < options.minimumConsecutive) {
    return '';
  }

  let dominantValue: TValue | null = null;
  let dominantCount = 0;

  for (const value of options.detectValues) {
    const count = countConsecutiveFromEnd(trajectory, (point) => options.valueForPoint(point) === value);
    if (count > dominantCount) {
      dominantCount = count;
      dominantValue = value;
    }
  }

  if (dominantValue === null || dominantCount < options.minimumConsecutive) {
    return '';
  }

  const lines: string[] = [options.sectionHeader];
  lines.push(options.historyLabel);
  lines.push(
    trajectory.map((point) => `- [${point.pageId}] ${options.valueForPoint(point)}`).join('\n')
  );
  lines.push('');
  lines.push(options.warningLine(dominantValue, dominantCount));
  lines.push('');
  return lines.join('\n') + '\n';
}

function buildThematicTrajectoryWarningSection(
  thematicValenceTrajectory: ThematicValenceTrajectory | undefined
): string {
  return buildConsecutiveTrajectoryWarningSection(thematicValenceTrajectory, {
    minimumConsecutive: 3,
    sectionHeader: '=== THEMATIC TRAJECTORY ===',
    historyLabel: 'Recent scene valence history:',
    valueForPoint: (point) => point.thematicValence,
    detectValues: ['THESIS_SUPPORTING', 'ANTITHESIS_SUPPORTING'] as const,
    warningLine: (dominantValence, count) => {
      const opposingValence =
        dominantValence === 'THESIS_SUPPORTING' ? 'ANTITHESIS_SUPPORTING' : 'THESIS_SUPPORTING';
      return (
        `WARNING: The last ${count} scenes all trend ${dominantValence}. ` +
        `Plan should pressure-test the opposing argument (${opposingValence}) through action and consequence to avoid thematic monotony.`
      );
    },
  });
}

function buildNarrativeFocusWarningSection(
  narrativeFocusTrajectory: NarrativeFocusTrajectory | undefined
): string {
  return buildConsecutiveTrajectoryWarningSection(narrativeFocusTrajectory, {
    minimumConsecutive: 3,
    sectionHeader: '=== DEPTH VS BREADTH TRAJECTORY ===',
    historyLabel: 'Recent scene focus history:',
    valueForPoint: (point) => point.narrativeFocus,
    detectValues: ['BROADENING'] as const,
    warningLine: (_dominantFocus, count) =>
      `WARNING: The last ${count} scenes trend BROADENING. ` +
      'Plan should prioritize DEEPENING: advance existing threads, intensify known relationships, or force consequence payoffs before introducing major new scope.',
  });
}

function isLateAct(
  accumulatedStructureState: AccumulatedStructureState | undefined,
  structure: StoryStructure | undefined
): boolean {
  if (!accumulatedStructureState || !structure || structure.acts.length === 0) {
    return false;
  }
  const lateActStart = Math.max(1, structure.acts.length - 2);
  return accumulatedStructureState.currentActIndex >= lateActStart;
}

function buildPremisePromiseWarningSection(context: ContinuationPagePlanContext): string {
  if (!isLateAct(context.accumulatedStructureState, context.structure)) {
    return '';
  }

  const premisePromises = context.premisePromises ?? [];
  if (premisePromises.length === 0) {
    return '';
  }

  const fulfilled = new Set((context.fulfilledPremisePromises ?? []).map((item) => item.trim()));
  const unfulfilled = premisePromises.filter((item) => !fulfilled.has(item.trim()));
  if (unfulfilled.length === 0) {
    return '';
  }

  const lines = ['=== PREMISE PROMISE WARNING (LATE ACT) ==='];
  lines.push(
    'The story is in a late act and these premise promises remain unfulfilled. This plan should advance or pay off at least one when narratively viable.'
  );
  lines.push(...unfulfilled.map((promise) => `- ${promise}`));
  lines.push('');
  return lines.join('\n') + '\n';
}

function buildPendingConsequencesSection(context: ContinuationPagePlanContext): string {
  const pending = (context.accumulatedDelayedConsequences ?? []).filter(
    (consequence) => !consequence.triggered
  );

  const lines = ['PENDING CONSEQUENCES:'];
  if (pending.length === 0) {
    lines.push('(none)');
  } else {
    lines.push(
      ...pending.map(
        (consequence) =>
          `- [${consequence.id}] ${consequence.description} ` +
          `(age ${consequence.currentAge}, trigger window ${consequence.minPagesDelay}-${consequence.maxPagesDelay})\n` +
          `  Trigger condition: ${consequence.triggerCondition}`
      )
    );
  }
  lines.push('');
  return lines.join('\n');
}

function buildDramaticIronyOpportunitiesSection(context: ContinuationPagePlanContext): string {
  const accumulatedKnowledgeState = context.accumulatedKnowledgeState ?? [];
  const opportunities = context.parentDramaticIronyOpportunities ?? [];
  if (accumulatedKnowledgeState.length === 0 && opportunities.length === 0) {
    return '';
  }

  const lines: string[] = ['=== DRAMATIC IRONY OPPORTUNITIES ==='];
  lines.push(
    'Exploit information asymmetry to create tension where the protagonist and other characters act on conflicting beliefs.'
  );
  for (const entry of accumulatedKnowledgeState) {
    lines.push(`- ${entry.characterName}`);
    if (entry.falseBeliefs.length > 0) {
      lines.push(`  False beliefs: ${entry.falseBeliefs.join(' | ')}`);
    }
    if (entry.secrets.length > 0) {
      lines.push(`  Secrets: ${entry.secrets.join(' | ')}`);
    }
    if (entry.knownFacts.length > 0) {
      lines.push(`  Known facts: ${entry.knownFacts.join(' | ')}`);
    }
  }
  if (opportunities.length > 0) {
    lines.push('Analyst-identified opportunities from previous scene:');
    lines.push(...opportunities.map((opp) => `- ${opp}`));
  }
  lines.push('');
  return lines.join('\n') + '\n';
}


function buildProtagonistGuidanceSection(guidance: ProtagonistGuidance | undefined): string {
  if (isProtagonistGuidanceEmpty(guidance)) {
    return '';
  }

  const lines: string[] = ['=== PROTAGONIST GUIDANCE (PLAYER INTENT) ==='];
  lines.push(
    'The player has provided guidance for the protagonist. This is meaningful player input - plan around it, do not treat it as optional.'
  );
  lines.push('');

  const suggestedEmotions = guidance?.suggestedEmotions?.trim();
  const suggestedThoughts = guidance?.suggestedThoughts?.trim();
  const suggestedSpeech = guidance?.suggestedSpeech?.trim();

  if (suggestedEmotions) {
    lines.push('EMOTIONAL STATE the player wants the protagonist to feel:');
    lines.push(`"${suggestedEmotions}"`);
    lines.push('');
    lines.push('Incorporate this emotion into your plan:');
    lines.push(
      "- Show, don't tell: plan scene elements that evoke this emotion through behavior, body language, and physical reactions rather than naming the emotion."
    );
    lines.push(
      '- Create circumstances that naturally trigger this emotional state - environment, NPC actions, or consequences of the previous choice.'
    );
    lines.push("- Let the emotion color the protagonist's decision-making in the scene plan.");
    lines.push('');
  }

  if (suggestedThoughts) {
    lines.push('INNER THOUGHTS the player wants the protagonist to have:');
    lines.push(`"${suggestedThoughts}"`);
    lines.push('');
    lines.push('Incorporate these thoughts into your plan:');
    lines.push(
      '- Use as motivational drivers: let these thoughts shape what the protagonist pursues or avoids in the scene.'
    );
    lines.push(
      "- Create dramatic irony opportunities: plan situations where the protagonist's inner thoughts contrast with what other characters perceive."
    );
    lines.push(
      '- Surface via internal monologue: include a must-include milestone in writerBrief for the protagonist reflecting along these lines.'
    );
    lines.push('');
  }

  if (suggestedSpeech) {
    lines.push('SPEECH the player wants the protagonist to say:');
    lines.push(`"${suggestedSpeech}"`);
    lines.push('');
    lines.push('Incorporate this speech into your plan:');
    lines.push('- Shape the sceneIntent so the scene creates a natural moment for this speech.');
    lines.push(
      '- Include a must-include milestone in writerBrief that reflects the protagonist voicing this intent.'
    );
    lines.push('- Consider how NPCs and the situation would react to this kind of statement.');
    lines.push("- Let the speech intent influence the scene's dramatic direction.");
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

export function buildEscalationDirective(
  structure: StoryStructure | undefined,
  accumulatedStructureState: AccumulatedStructureState | undefined
): string {
  if (!structure || !accumulatedStructureState) {
    return '';
  }

  const currentAct = structure.acts[accumulatedStructureState.currentActIndex];
  if (!currentAct) {
    return '';
  }

  const activeMilestone = currentAct.milestones[accumulatedStructureState.currentMilestoneIndex];
  if (!activeMilestone) {
    return '';
  }

  const isFinalResolutionBeat =
    activeMilestone.role === 'resolution' &&
    accumulatedStructureState.currentActIndex === structure.acts.length - 1 &&
    accumulatedStructureState.currentMilestoneIndex === currentAct.milestones.length - 1;

  const hasRoleDirective =
    activeMilestone.role === 'escalation' ||
    activeMilestone.role === 'turning_point' ||
    activeMilestone.role === 'reflection';
  if (!hasRoleDirective && !activeMilestone.isMidpoint && !isFinalResolutionBeat) {
    return '';
  }

  const previousResolution = findPreviousMilestoneResolution(
    currentAct.milestones,
    accumulatedStructureState
  );

  const lines: string[] = [];

  if (activeMilestone.role === 'escalation') {
    lines.push('=== ESCALATION DIRECTIVE ===');
    lines.push(
      'The active milestone role is "escalation". This scene MUST raise stakes beyond the previous milestone.'
    );
    if (previousResolution) {
      lines.push(`Previous milestone resolved: "${previousResolution}"`);
    }
    if (activeMilestone.escalationType) {
      lines.push(`Escalation mechanism: ${activeMilestone.escalationType} — plan a scene that delivers this specific type of escalation.`);
    }
    if (activeMilestone.secondaryEscalationType) {
      lines.push(`Secondary escalation mechanism: ${activeMilestone.secondaryEscalationType} — layer this as an additional pressure axis in the same scene.`);
    }
    if (activeMilestone.crisisType) {
      lines.push(`Crisis type: ${activeMilestone.crisisType} — shape the scene so the dilemma matches this crisis form.`);
    }
    if (activeMilestone.uniqueScenarioHook) {
      lines.push(`Unique scenario hook: ${activeMilestone.uniqueScenarioHook}`);
    }
    if (activeMilestone.approachVectors && activeMilestone.approachVectors.length > 0) {
      lines.push(`Approach vectors: ${activeMilestone.approachVectors.join(', ')} — consider these when designing the scene's dramatic question.`);
    }
    lines.push('Requirements:');
    lines.push(
      '- Introduce a new consequence, threat, or irreversible change not present before'
    );
    lines.push(
      '- The protagonist\'s situation must be measurably worse, more constrained, or more costly than before'
    );
    lines.push(
      '- "More complicated" is NOT escalation — escalation means "more costly to fail"'
    );
  } else if (activeMilestone.role === 'turning_point') {
    lines.push('=== TURNING POINT DIRECTIVE ===');
    lines.push(
      'The active milestone role is "turning_point". This scene MUST deliver an irreversible shift.'
    );
    if (previousResolution) {
      lines.push(`Previous milestone resolved: "${previousResolution}"`);
    }
    if (activeMilestone.escalationType) {
      lines.push(`Turning point mechanism: ${activeMilestone.escalationType} — plan a scene that delivers this specific type of shift.`);
    }
    if (activeMilestone.secondaryEscalationType) {
      lines.push(`Secondary turning point mechanism: ${activeMilestone.secondaryEscalationType} — ensure the irreversible shift lands across both escalation axes.`);
    }
    if (activeMilestone.crisisType) {
      lines.push(`Crisis type: ${activeMilestone.crisisType} — shape the scene so the pivotal decision matches this crisis form.`);
    }
    if (activeMilestone.uniqueScenarioHook) {
      lines.push(`Unique scenario hook: ${activeMilestone.uniqueScenarioHook}`);
    }
    if (activeMilestone.approachVectors && activeMilestone.approachVectors.length > 0) {
      lines.push(`Approach vectors: ${activeMilestone.approachVectors.join(', ')} — consider these when designing the scene's dramatic question.`);
    }
    lines.push('Requirements:');
    lines.push(
      '- Create a point of no return — a decision, revelation, or consequence that cannot be undone'
    );
    lines.push(
      '- The protagonist\'s available options must fundamentally change after this scene'
    );
    lines.push(
      '- "More complicated" is NOT a turning point — a turning point means the status quo is permanently destroyed'
    );
  } else if (activeMilestone.role === 'reflection') {
    lines.push('=== REFLECTION DIRECTIVE ===');
    lines.push(
      'The active milestone role is "reflection". This scene MUST deliver thematic or internal deepening without forced escalation.'
    );
    if (previousResolution) {
      lines.push(`Previous milestone resolved: "${previousResolution}"`);
    }
    lines.push('Requirements:');
    lines.push(
      '- Deepen the protagonist\'s understanding, conviction, fear, or value conflict tied to the current dramatic question'
    );
    lines.push(
      '- Produce a meaningful internal or relational shift that changes how the next conflict will be approached'
    );
    lines.push(
      '- Reflection is NOT recap: avoid merely restating known facts without new interpretation or commitment'
    );
  }

  if (activeMilestone.isMidpoint) {
    lines.push('=== MIDPOINT DIRECTIVE ===');
    lines.push(
      'This milestone is the structural midpoint. The scene should deliver a central reversal that reorients the trajectory of the story.'
    );
    lines.push(`Midpoint type: ${activeMilestone.midpointType ?? 'UNSPECIFIED'}`);
    lines.push(
      '- FALSE_VICTORY: apparent success that conceals cost, instability, or strategic error'
    );
    lines.push(
      '- FALSE_DEFEAT: apparent failure that plants leverage or insight for later recovery'
    );
    lines.push(
      '- The scene should force the protagonist to commit under the new understanding created by the midpoint turn'
    );
  }

  if (isFinalResolutionBeat) {
    lines.push('=== FINAL RESOLUTION IMAGE DIRECTIVE ===');
    lines.push(
      `This is the final resolution milestone. Plan the scene so its climactic visual lands on or clearly sets up this closing image: "${structure.closingImage}"`
    );
    lines.push(
      `Ensure the closing image meaningfully mirrors or contrasts the opening image: "${structure.openingImage}".`
    );
    lines.push(
      '- The scene should create pathways that can credibly converge to this ending visual.'
    );
    lines.push(
      'Consider setting isEnding to true if this resolution milestone completes the story arc and no further scenes are needed.'
    );
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

function findPreviousMilestoneResolution(
  milestones: readonly { readonly id: string }[],
  state: AccumulatedStructureState
): string | null {
  const currentMilestoneIndex = state.currentMilestoneIndex;

  for (let i = currentMilestoneIndex - 1; i >= 0; i--) {
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

function buildValueSpectrumGuidanceSection(storyKernel: StoryKernel | undefined): string {
  if (!storyKernel?.valueSpectrum) {
    return '';
  }

  const vs = storyKernel.valueSpectrum;
  return `=== VALUE SPECTRUM TRACKING (McKee) ===
The story's moral argument: ${storyKernel.moralArgument}
Value spectrum for this story:
- Positive: ${vs.positive}
- Contrary: ${vs.contrary}
- Contradictory: ${vs.contradictory}
- Negation of negation: ${vs.negationOfNegation}

Plan this scene so the protagonist's situation moves along the value spectrum. Each scene should test the moral argument through action and consequence — not exposition. The dramatic question should force the protagonist to confront different points on the spectrum.

`;
}

export interface PlannerContextOptions {
  readonly includeProtagonistDirective?: boolean;
}

interface ContinuationContextRenderOptions extends PlannerContextOptions {
  readonly includeToneSection: boolean;
  readonly includeToneDriftWarning: boolean;
  readonly includePlannerTrajectorySections: boolean;
  readonly includeEscalationDirective: boolean;
  readonly includePremisePromiseWarning: boolean;
  readonly includeValueSpectrumGuidance: boolean;
  readonly includeThreadPacingSections: boolean;
  readonly includeDramaticIrony: boolean;
  readonly includeGrandparentNarrative: boolean;
  readonly sectionTitle: string;
}

function buildContinuationContextSection(
  context: ContinuationPagePlanContext,
  options: ContinuationContextRenderOptions
): string {
  const worldSection = context.decomposedWorld.facts.length > 0
    ? `${formatDecomposedWorldForPrompt(context.decomposedWorld)}

`
    : '';

  const npcsSection = context.decomposedCharacters.length > 0
    ? `CHARACTERS (structured profiles):
${context.decomposedCharacters.map((c, i) => formatDecomposedCharacterForPrompt(c, i === 0)).join('\n\n')}

`
    : '';

  const structureSection = buildWriterStructureContext(
    context.structure,
    context.accumulatedStructureState
  );

  const globalCanonSection =
    context.globalCanon.length > 0
      ? formatCanonForPrompt(context.globalCanon)
      : '(none)';

  const inventorySection =
    context.accumulatedInventory.length > 0
      ? context.accumulatedInventory.map((entry) => `- [${entry.id}] ${entry.text}`).join('\n')
      : '(none)';

  const healthSection =
    context.accumulatedHealth.length > 0
      ? context.accumulatedHealth.map((entry) => `- [${entry.id}] ${entry.text}`).join('\n')
      : '(none)';

  const threatsSection =
    context.activeState.activeThreats.length > 0
      ? context.activeState.activeThreats
          .map((entry) => `- [${entry.id}] (${entry.threatType}) ${entry.text}`)
          .join('\n')
      : '(none)';

  const constraintsSection =
    context.activeState.activeConstraints.length > 0
      ? context.activeState.activeConstraints
          .map((entry) => `- [${entry.id}] (${entry.constraintType}) ${entry.text}`)
          .join('\n')
      : '(none)';

  const threadAges = context.threadAges ?? {};
  const threadsSection =
    context.activeState.openThreads.length > 0
      ? context.activeState.openThreads
          .map((entry) => {
            const age = threadAges[entry.id];
            const ageStr = age !== undefined ? `, ${age} pages old` : '';
            return `- [${entry.id}] (${entry.threadType}/${entry.urgency}${ageStr}) ${entry.text}`;
          })
          .join('\n')
      : '(none)';

  const grandparentSection = options.includeGrandparentNarrative && context.grandparentNarrative
    ? `SCENE BEFORE LAST (full text for style continuity):
${context.grandparentNarrative}

`
    : '';

  const summariesSection =
    context.ancestorSummaries.length > 0
      ? `EARLIER SCENE SUMMARIES:
${context.ancestorSummaries.map((summary) => `- [${summary.pageId}] ${summary.summary}`).join('\n')}

`
      : '';

  const pacingSection = options.includePlannerTrajectorySections
    ? buildPacingBriefingSection(context)
    : '';
  const thematicTrajectorySection = options.includePlannerTrajectorySections
    ? buildThematicTrajectoryWarningSection(context.thematicValenceTrajectory)
    : '';
  const narrativeFocusWarningSection = options.includePlannerTrajectorySections
    ? buildNarrativeFocusWarningSection(context.narrativeFocusTrajectory)
    : '';

  const escalationDirective = options.includeEscalationDirective
    ? buildEscalationDirective(context.structure, context.accumulatedStructureState)
    : '';
  const premisePromiseWarningSection = options.includePremisePromiseWarning
    ? buildPremisePromiseWarningSection(context)
    : '';

  const threadAgingSection = options.includeThreadPacingSections
    ? buildThreadAgingSection(context.activeState.openThreads, threadAges)
    : '';

  const trackedPromisesSection = options.includeThreadPacingSections
    ? buildTrackedPromisesSection(context.accumulatedPromises ?? [])
    : '';

  const payoffFeedbackSection = options.includeThreadPacingSections
    ? buildPayoffFeedbackSection(context.parentThreadPayoffAssessments ?? [])
    : '';
  const pendingConsequencesSection = buildPendingConsequencesSection(context);
  const dramaticIronyOpportunitiesSection = options.includeDramaticIrony
    ? buildDramaticIronyOpportunitiesSection(context)
    : '';

  const toneFeelLine =
    options.includeToneSection && context.toneFeel && context.toneFeel.length > 0
      ? `\nTone target feel: ${context.toneFeel.join(', ')}`
      : '';
  const toneAvoidLine =
    options.includeToneSection && context.toneAvoid && context.toneAvoid.length > 0
      ? `\nTone avoid: ${context.toneAvoid.join(', ')}`
      : '';
  const toneDriftLine =
    options.includeToneDriftWarning &&
    context.parentToneDriftDescription &&
    context.parentToneDriftDescription.length > 0
      ? `\nTONE DRIFT WARNING (from analyst): ${context.parentToneDriftDescription}. Correct course in this plan.`
      : '';
  const toneSection = options.includeToneSection
    ? `TONE/GENRE: ${context.tone}${toneFeelLine}${toneAvoidLine}${toneDriftLine}\n\n`
    : '';

  const includeProtagonist = options.includeProtagonistDirective ?? true;

  const protagonistName = context.decomposedCharacters.length > 0 ? context.decomposedCharacters[0]!.name : null;
  const protagonistDirective = includeProtagonist && protagonistName
    ? `PROTAGONIST IDENTITY: ${protagonistName} is the protagonist.\n\n`
    : '';

  const guidanceSection = includeProtagonist
    ? buildProtagonistGuidanceSection(context.protagonistGuidance)
    : '';

  return `=== ${options.sectionTitle} ===
${worldSection}${npcsSection}${toneSection}

${structureSection}${pacingSection}${thematicTrajectorySection}${narrativeFocusWarningSection}${escalationDirective}${premisePromiseWarningSection}${options.includeValueSpectrumGuidance ? buildValueSpectrumGuidanceSection(context.storyKernel) : ''}${threadAgingSection}${payoffFeedbackSection}ESTABLISHED WORLD FACTS:
${globalCanonSection}

CHARACTER INFORMATION (permanent traits):
${formatCharacterCanon(context.globalCharacterCanon)}

NPC CURRENT STATE (branch-specific events):
${formatCharacterState(context.accumulatedCharacterState)}

${buildNpcAgendasSection(context.accumulatedNpcAgendas)}${buildNpcRelationshipsSection(context.accumulatedNpcRelationships)}YOUR INVENTORY:
${inventorySection}

YOUR HEALTH:
${healthSection}

CURRENT LOCATION:
${context.activeState.currentLocation || '(empty)'}

ACTIVE THREATS:
${threatsSection}

ACTIVE CONSTRAINTS:
${constraintsSection}

OPEN NARRATIVE THREADS:
${threadsSection}

${buildProtagonistAffectSection(context.parentProtagonistAffect)}${trackedPromisesSection}${pendingConsequencesSection}${dramaticIronyOpportunitiesSection}${summariesSection}${grandparentSection}PREVIOUS SCENE (full text for style continuity):
${context.previousNarrative}

${protagonistDirective}${guidanceSection}PLAYER'S CHOICE:
${context.selectedChoice}`;
}

export function buildPlannerContinuationContextSection(
  context: ContinuationPagePlanContext,
  options?: PlannerContextOptions
): string {
  return buildContinuationContextSection(context, {
    includeProtagonistDirective: options?.includeProtagonistDirective,
    includeToneSection: true,
    includeToneDriftWarning: true,
    includePlannerTrajectorySections: true,
    includeEscalationDirective: true,
    includePremisePromiseWarning: true,
    includeValueSpectrumGuidance: true,
    includeThreadPacingSections: true,
    includeDramaticIrony: true,
    includeGrandparentNarrative: true,
    sectionTitle: 'PLANNER CONTEXT: CONTINUATION',
  });
}

export function buildAccountantContinuationContextSection(
  context: ContinuationPagePlanContext,
  options?: PlannerContextOptions
): string {
  return buildContinuationContextSection(context, {
    includeProtagonistDirective: options?.includeProtagonistDirective,
    includeToneSection: false,
    includeToneDriftWarning: false,
    includePlannerTrajectorySections: false,
    includeEscalationDirective: false,
    includePremisePromiseWarning: false,
    includeValueSpectrumGuidance: false,
    includeThreadPacingSections: false,
    includeDramaticIrony: false,
    includeGrandparentNarrative: false,
    sectionTitle: 'ACCOUNTANT CONTEXT: CONTINUATION',
  });
}
