import { formatNpcsForPrompt } from '../../../../models/npc.js';
import type { OpeningPagePlanContext } from '../../../types.js';

export function buildPlannerOpeningContextSection(context: OpeningPagePlanContext): string {
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

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:
${context.startingSituation}

`
    : '';

  const firstAct = context.structure?.acts[0];
  const firstBeat = firstAct?.beats[0];
  const structureSection =
    context.structure && firstAct && firstBeat
      ? `=== STORY STRUCTURE (if provided) ===
Overall Theme: ${context.structure.overallTheme}
Current Act: ${firstAct.name}
Act Objective: ${firstAct.objective}
Current Beat: ${firstBeat.description}
Beat Objective: ${firstBeat.objective}

`
      : '';

  const initialAgendas = context.initialNpcAgendas ?? [];
  const agendasSection =
    initialAgendas.length > 0
      ? `NPC INITIAL AGENDAS (what each NPC wants at story start):
${initialAgendas
  .map(
    a =>
      `[${a.npcName}]
  Goal: ${a.currentGoal}
  Leverage: ${a.leverage}
  Fear: ${a.fear}
  Off-screen: ${a.offScreenBehavior}`,
  )
  .join('\n\n')}

`
      : '';

  return `=== PLANNER CONTEXT: OPENING ===
CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}${agendasSection}${startingSituationSection}TONE/GENRE: ${context.tone}

${structureSection}OPENING STATE SNAPSHOT:
- globalCanon entries: ${context.globalCanon.length}
- globalCharacterCanon entries: ${Object.keys(context.globalCharacterCanon).length}
- accumulatedInventory entries: ${context.accumulatedInventory.length}
- accumulatedHealth entries: ${context.accumulatedHealth.length}
- accumulatedCharacterState characters: ${Object.keys(context.accumulatedCharacterState).length}
- activeState.currentLocation: ${context.activeState.currentLocation || '(empty)'}
- activeState.activeThreats entries: ${context.activeState.activeThreats.length}
- activeState.activeConstraints entries: ${context.activeState.activeConstraints.length}
- activeState.openThreads entries: ${context.activeState.openThreads.length}

Plan the first page intent and state intents using this opening setup.`;
}
