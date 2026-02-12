import { formatNpcsForPrompt } from '../../../../models/npc.js';
import type { ContinuationPagePlanContext, MomentumTrajectory } from '../../../types.js';

function formatCharacterCanon(characterCanon: Readonly<Record<string, readonly string[]>>): string {
  const entries = Object.entries(characterCanon);
  if (entries.length === 0) {
    return '(none)';
  }

  return entries.map(([name, facts]) => `[${name}]\n${facts.map(fact => `- ${fact}`).join('\n')}`).join('\n\n');
}

function formatCharacterState(
  characterState: Readonly<Record<string, readonly { id: string; text: string }[]>>,
): string {
  const entries = Object.entries(characterState);
  if (entries.length === 0) {
    return '(none)';
  }

  return entries
    .map(
      ([name, states]) =>
        `[${name}]\n${states.map(state => `- [${state.id}] ${state.text}`).join('\n')}`,
    )
    .join('\n\n');
}

/**
 * Counts how many consecutive entries from the end of an array match a predicate.
 */
export function countConsecutiveFromEnd<T>(items: readonly T[], predicate: (item: T) => boolean): number {
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

  const momentumTrend = trajectory.map(p => p.sceneMomentum).join(' -> ');
  const evidenceTrend = trajectory.map(p => p.objectiveEvidenceStrength).join(' -> ');
  lines.push(`Momentum trend (last ${trajectory.length} pages): ${momentumTrend}`);
  lines.push(`Objective evidence trend: ${evidenceTrend}`);

  const consecutiveStasis = countConsecutiveFromEnd(
    trajectory,
    p => p.sceneMomentum === 'STASIS',
  );
  if (consecutiveStasis >= 2) {
    lines.push(
      `WARNING: ${consecutiveStasis} consecutive pages with STASIS momentum. ` +
        'Plan MUST include a major narrative advancement — reveal, confrontation, or irreversible change.',
    );
  }

  const consecutiveWeakEvidence = countConsecutiveFromEnd(
    trajectory,
    p => p.objectiveEvidenceStrength === 'NONE' || p.objectiveEvidenceStrength === 'WEAK_IMPLICIT',
  );
  if (consecutiveWeakEvidence >= 3) {
    lines.push(
      `WARNING: ${consecutiveWeakEvidence} consecutive pages with weak/no objective evidence. ` +
        'Plan MUST make direct progress toward the current beat objective.',
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
        'Plan MUST advance beat objective directly. No exploratory or setup scenes.',
    );
  }

  if (hasIssueReason) {
    lines.push(
      '- Pacing issue flagged: plan should push forward with action, revelation, or consequence. ' +
        'No exploratory or setup scenes.',
    );
  }

  if (
    context.parentSceneMomentum === 'MAJOR_PROGRESS' ||
    context.parentSceneMomentum === 'SCOPE_SHIFT'
  ) {
    lines.push(
      '- Previous scene had major progress. A breathing scene is acceptable if dramatically appropriate.',
    );
  }

  lines.push('');
  return lines.join('\n') + '\n';
}

export function buildPlannerContinuationContextSection(context: ContinuationPagePlanContext): string {
  const worldSection = context.worldbuilding
    ? `WORLDBUILDING:
${context.worldbuilding}

`
    : '';

  const npcsSection = context.npcs && context.npcs.length > 0
    ? `NPCS (Available Characters):
${formatNpcsForPrompt(context.npcs)}

`
    : '';

  const structureSection =
    context.structure && context.accumulatedStructureState
      ? `=== STORY STRUCTURE (if provided) ===
Overall Theme: ${context.structure.overallTheme}
Current Act Index: ${context.accumulatedStructureState.currentActIndex}
Current Beat Index: ${context.accumulatedStructureState.currentBeatIndex}

`
      : '';

  const globalCanonSection =
    context.globalCanon.length > 0
      ? context.globalCanon.map(fact => `- ${fact}`).join('\n')
      : '(none)';

  const inventorySection =
    context.accumulatedInventory.length > 0
      ? context.accumulatedInventory.map(entry => `- [${entry.id}] ${entry.text}`).join('\n')
      : '(none)';

  const healthSection =
    context.accumulatedHealth.length > 0
      ? context.accumulatedHealth.map(entry => `- [${entry.id}] ${entry.text}`).join('\n')
      : '(none)';

  const threatsSection =
    context.activeState.activeThreats.length > 0
      ? context.activeState.activeThreats.map(entry => `- [${entry.id}] ${entry.text}`).join('\n')
      : '(none)';

  const constraintsSection =
    context.activeState.activeConstraints.length > 0
      ? context.activeState.activeConstraints.map(entry => `- [${entry.id}] ${entry.text}`).join('\n')
      : '(none)';

  const threadsSection =
    context.activeState.openThreads.length > 0
      ? context.activeState.openThreads
        .map(entry => `- [${entry.id}] (${entry.threadType}/${entry.urgency}) ${entry.text}`)
        .join('\n')
      : '(none)';

  const grandparentSection = context.grandparentNarrative
    ? `SCENE BEFORE LAST (full text for style continuity):
${context.grandparentNarrative}

`
    : '';

  const summariesSection = context.ancestorSummaries.length > 0
    ? `EARLIER SCENE SUMMARIES:
${context.ancestorSummaries.map(summary => `- [${summary.pageId}] ${summary.summary}`).join('\n')}

`
    : '';

  const pacingSection = buildPacingBriefingSection(context);

  return `=== PLANNER CONTEXT: CONTINUATION ===
CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}TONE/GENRE: ${context.tone}

${structureSection}${pacingSection}ESTABLISHED WORLD FACTS:
${globalCanonSection}

CHARACTER INFORMATION (permanent traits):
${formatCharacterCanon(context.globalCharacterCanon)}

NPC CURRENT STATE (branch-specific events):
${formatCharacterState(context.accumulatedCharacterState)}

YOUR INVENTORY:
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

${summariesSection}${grandparentSection}PREVIOUS SCENE (full text for style continuity):
${context.previousNarrative}

PLAYER'S CHOICE:
${context.selectedChoice}`;
}
