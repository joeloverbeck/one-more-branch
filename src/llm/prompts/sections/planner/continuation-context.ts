import {
  formatDecomposedCharacterForPrompt,
} from '../../../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../../../models/decomposed-world.js';
import { formatNpcsForPrompt } from '../../../../models/npc.js';
import { isProtagonistGuidanceEmpty } from '../../../../models/protagonist-guidance.js';
import type { ProtagonistGuidance } from '../../../../models/protagonist-guidance.js';
import type { AccumulatedNpcAgendas } from '../../../../models/state/npc-agenda.js';
import type { AccumulatedNpcRelationships } from '../../../../models/state/npc-relationship.js';
import type { AccumulatedStructureState, StoryStructure } from '../../../../models/story-arc.js';
import { formatCanonForPrompt } from '../../../../engine/canon-manager.js';
import type { ContinuationPagePlanContext } from '../../../context-types.js';
import type { MomentumTrajectory } from '../../../generation-pipeline-types.js';
import { buildProtagonistAffectSection } from '../../continuation/context-sections.js';
import { buildWriterStructureContext } from '../../continuation/story-structure-section.js';
import {
  buildThreadAgingSection,
  buildTrackedPromisesSection,
  buildPayoffFeedbackSection,
} from './thread-pacing-directive.js';

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

function buildTrajectorySection(trajectory: MomentumTrajectory): string {
  if (trajectory.length < 2) {
    return '';
  }

  const lines: string[] = [];

  const momentumTrend = trajectory.map((p) => p.sceneMomentum).join(' -> ');
  const evidenceTrend = trajectory.map((p) => p.objectiveEvidenceStrength).join(' -> ');
  lines.push(`Momentum trend (last ${trajectory.length} pages): ${momentumTrend}`);
  lines.push(`Objective evidence trend: ${evidenceTrend}`);

  const consecutiveStasis = countConsecutiveFromEnd(
    trajectory,
    (p) => p.sceneMomentum === 'STASIS'
  );
  if (consecutiveStasis >= 2) {
    lines.push(
      `WARNING: ${consecutiveStasis} consecutive pages with STASIS momentum. ` +
        'Plan MUST include a major narrative advancement — reveal, confrontation, or irreversible change.'
    );
  }

  const consecutiveWeakEvidence = countConsecutiveFromEnd(
    trajectory,
    (p) => p.objectiveEvidenceStrength === 'NONE' || p.objectiveEvidenceStrength === 'WEAK_IMPLICIT'
  );
  if (consecutiveWeakEvidence >= 3) {
    lines.push(
      `WARNING: ${consecutiveWeakEvidence} consecutive pages with weak/no objective evidence. ` +
        'Plan MUST make direct progress toward the current beat objective.'
    );
  }

  return lines.join('\n');
}

function buildPacingBriefingSection(context: ContinuationPagePlanContext): string {
  const hasNudge = context.parentPacingNudge != null && context.parentPacingNudge.length > 0;
  const hasMomentum = context.parentSceneMomentum != null;
  const hasEvidence = context.parentObjectiveEvidenceStrength != null;
  const hasIssueReason =
    context.parentPacingIssueReason != null && context.parentPacingIssueReason.length > 0;
  const hasTrajectory = (context.momentumTrajectory?.length ?? 0) >= 2;

  if (!hasNudge && !hasMomentum && !hasEvidence && !hasIssueReason && !hasTrajectory) {
    return '';
  }

  const lines: string[] = ['=== PACING BRIEFING (from story analyst) ==='];

  if (hasNudge) {
    lines.push(`Pacing nudge: ${context.parentPacingNudge}`);
  }
  if (hasIssueReason) {
    lines.push(`Pacing issue reason: ${context.parentPacingIssueReason}`);
  }
  if (hasMomentum) {
    lines.push(`Scene momentum: ${context.parentSceneMomentum}`);
  }
  if (hasEvidence) {
    lines.push(`Objective evidence strength: ${context.parentObjectiveEvidenceStrength}`);
  }

  if (hasTrajectory && context.momentumTrajectory) {
    lines.push('');
    const trajectoryText = buildTrajectorySection(context.momentumTrajectory);
    if (trajectoryText) {
      lines.push(trajectoryText);
    }
  }

  lines.push('');
  lines.push('Pacing response rules:');

  if (
    context.parentSceneMomentum === 'STASIS' &&
    (context.parentObjectiveEvidenceStrength === 'NONE' ||
      context.parentObjectiveEvidenceStrength === 'WEAK_IMPLICIT')
  ) {
    lines.push(
      '- CRITICAL: Previous scene showed STASIS with weak/no evidence of progress. ' +
        'Plan MUST advance beat objective directly. No exploratory or setup scenes.'
    );
  }

  if (hasIssueReason) {
    lines.push(
      '- Pacing issue flagged: plan should push forward with action, revelation, or consequence. ' +
        'No exploratory or setup scenes.'
    );
  }

  if (
    context.parentSceneMomentum === 'MAJOR_PROGRESS' ||
    context.parentSceneMomentum === 'SCOPE_SHIFT'
  ) {
    lines.push(
      '- Previous scene had major progress. A breathing scene is acceptable if dramatically appropriate.'
    );
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

function buildNpcAgendasSection(agendas?: AccumulatedNpcAgendas): string {
  if (!agendas) {
    return '';
  }

  const entries = Object.values(agendas);
  if (entries.length === 0) {
    return '';
  }

  const lines = entries.map(
    (a) =>
      `[${a.npcName}]
  Goal: ${a.currentGoal}
  Leverage: ${a.leverage}
  Fear: ${a.fear}
  Off-screen: ${a.offScreenBehavior}`
  );

  return `NPC AGENDAS (what each NPC wants and will do):
${lines.join('\n\n')}

`;
}

function buildNpcRelationshipsSection(
  relationships?: AccumulatedNpcRelationships
): string {
  if (!relationships) {
    return '';
  }

  const entries = Object.values(relationships);
  if (entries.length === 0) {
    return '';
  }

  const lines = entries.map(
    (r) =>
      `[${r.npcName}]
  Dynamic: ${r.dynamic} | Valence: ${r.valence}
  Tension: ${r.currentTension}`
  );

  return `NPC-PROTAGONIST RELATIONSHIPS (current dynamics):
${lines.join('\n\n')}

`;
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
    lines.push("- Let the emotion color the protagonist's decision-making in the choiceIntents.");
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
      '- Surface via internal monologue: include a must-include beat in writerBrief for the protagonist reflecting along these lines.'
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
      '- Include a must-include beat in writerBrief that reflects the protagonist voicing this intent.'
    );
    lines.push('- Consider how NPCs and the situation would react to this kind of statement.');
    lines.push("- Let the speech intent influence at least one choiceIntent's consequences.");
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

  const activeBeat = currentAct.beats[accumulatedStructureState.currentBeatIndex];
  if (!activeBeat) {
    return '';
  }

  if (activeBeat.role !== 'escalation' && activeBeat.role !== 'turning_point') {
    return '';
  }

  const previousResolution = findPreviousBeatResolution(
    currentAct.beats,
    accumulatedStructureState
  );

  const lines: string[] = [];

  if (activeBeat.role === 'escalation') {
    lines.push('=== ESCALATION DIRECTIVE ===');
    lines.push(
      'The active beat role is "escalation". This scene MUST raise stakes beyond the previous beat.'
    );
    if (previousResolution) {
      lines.push(`Previous beat resolved: "${previousResolution}"`);
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
  } else {
    lines.push('=== TURNING POINT DIRECTIVE ===');
    lines.push(
      'The active beat role is "turning_point". This scene MUST deliver an irreversible shift.'
    );
    if (previousResolution) {
      lines.push(`Previous beat resolved: "${previousResolution}"`);
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
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

function findPreviousBeatResolution(
  beats: readonly { readonly id: string }[],
  state: AccumulatedStructureState
): string | null {
  const currentBeatIndex = state.currentBeatIndex;

  for (let i = currentBeatIndex - 1; i >= 0; i--) {
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

export function buildPlannerContinuationContextSection(
  context: ContinuationPagePlanContext
): string {
  const hasDecomposed =
    context.decomposedCharacters && context.decomposedCharacters.length > 0;
  const hasDecomposedWorld =
    context.decomposedWorld && context.decomposedWorld.facts.length > 0;

  const worldSection = hasDecomposedWorld
    ? `${formatDecomposedWorldForPrompt(context.decomposedWorld!)}

`
    : context.worldbuilding
      ? `WORLDBUILDING:
${context.worldbuilding}

`
      : '';

  const npcsSection = hasDecomposed
    ? `CHARACTERS (structured profiles):
${context.decomposedCharacters!.map((c, i) => formatDecomposedCharacterForPrompt(c, i === 0)).join('\n\n')}

`
    : context.npcs && context.npcs.length > 0
      ? `NPCS (Available Characters):
${formatNpcsForPrompt(context.npcs)}

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

  const grandparentSection = context.grandparentNarrative
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

  const pacingSection = buildPacingBriefingSection(context);

  const escalationDirective = buildEscalationDirective(
    context.structure,
    context.accumulatedStructureState
  );

  const threadAgingSection = buildThreadAgingSection(context.activeState.openThreads, threadAges);

  const trackedPromisesSection = buildTrackedPromisesSection(
    context.accumulatedPromises ?? []
  );

  const payoffFeedbackSection = buildPayoffFeedbackSection(
    context.parentThreadPayoffAssessments ?? []
  );

  const toneFeelLine =
    context.toneFeel && context.toneFeel.length > 0
      ? `\nTone target feel: ${context.toneFeel.join(', ')}`
      : '';
  const toneAvoidLine =
    context.toneAvoid && context.toneAvoid.length > 0
      ? `\nTone avoid: ${context.toneAvoid.join(', ')}`
      : '';
  const toneDriftLine =
    context.parentToneDriftDescription && context.parentToneDriftDescription.length > 0
      ? `\nTONE DRIFT WARNING (from analyst): ${context.parentToneDriftDescription}. Correct course in this plan.`
      : '';

  const characterConceptSection = hasDecomposed
    ? ''
    : `CHARACTER CONCEPT:
${context.characterConcept}

`;

  return `=== PLANNER CONTEXT: CONTINUATION ===
${characterConceptSection}${worldSection}${npcsSection}TONE/GENRE: ${context.tone}${toneFeelLine}${toneAvoidLine}${toneDriftLine}

${structureSection}${pacingSection}${escalationDirective}${threadAgingSection}${payoffFeedbackSection}ESTABLISHED WORLD FACTS:
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

${buildProtagonistAffectSection(context.parentProtagonistAffect)}${trackedPromisesSection}${summariesSection}${grandparentSection}PREVIOUS SCENE (full text for style continuity):
${context.previousNarrative}

${buildProtagonistGuidanceSection(context.protagonistGuidance)}PLAYER'S CHOICE:
${context.selectedChoice}`;
}
