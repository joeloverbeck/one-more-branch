import { formatNpcsForPrompt } from '../../../../models/npc.js';
import type { ContinuationPagePlanContext } from '../../../types.js';

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

  return `=== PLANNER CONTEXT: CONTINUATION ===
CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}TONE/GENRE: ${context.tone}

${structureSection}ESTABLISHED WORLD FACTS:
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
