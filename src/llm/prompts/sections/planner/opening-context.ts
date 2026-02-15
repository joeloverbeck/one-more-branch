import {
  formatDecomposedCharacterForPrompt,
} from '../../../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../../../models/decomposed-world.js';
import { formatNpcsForPrompt } from '../../../../models/npc.js';
import { createInitialStructureState } from '../../../../models/story-arc.js';
import type { OpeningPagePlanContext } from '../../../context-types.js';
import { buildWriterStructureContext } from '../../continuation/story-structure-section.js';

export function buildPlannerOpeningContextSection(context: OpeningPagePlanContext): string {
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

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:
${context.startingSituation}

`
    : '';

  const structureSection = context.structure
    ? buildWriterStructureContext(context.structure, createInitialStructureState(context.structure))
    : '';

  const initialAgendas = context.initialNpcAgendas ?? [];
  const agendasSection =
    initialAgendas.length > 0
      ? `NPC INITIAL AGENDAS (what each NPC wants at story start):
${initialAgendas
  .map(
    (a) =>
      `[${a.npcName}]
  Goal: ${a.currentGoal}
  Leverage: ${a.leverage}
  Fear: ${a.fear}
  Off-screen: ${a.offScreenBehavior}`
  )
  .join('\n\n')}

`
      : '';

  const toneFeelLine =
    context.toneFeel && context.toneFeel.length > 0
      ? `\nTone target feel: ${context.toneFeel.join(', ')}`
      : '';
  const toneAvoidLine =
    context.toneAvoid && context.toneAvoid.length > 0
      ? `\nTone avoid: ${context.toneAvoid.join(', ')}`
      : '';

  const characterConceptSection = hasDecomposed
    ? ''
    : `CHARACTER CONCEPT:
${context.characterConcept}

`;

  return `=== PLANNER CONTEXT: OPENING ===
${characterConceptSection}${worldSection}${npcsSection}${agendasSection}${startingSituationSection}TONE/GENRE: ${context.tone}${toneFeelLine}${toneAvoidLine}

${structureSection}Plan the first page scene intent, continuity anchors, writer brief, dramatic question, and choice intents using this opening setup.`;
}
