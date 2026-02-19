import {
  formatDecomposedCharacterForPrompt,
} from '../../../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../../../models/decomposed-world.js';
import { createInitialStructureState } from '../../../../models/story-arc.js';
import type { OpeningPagePlanContext } from '../../../context-types.js';
import { buildWriterStructureContext } from '../../continuation/story-structure-section.js';

export function buildPlannerOpeningContextSection(context: OpeningPagePlanContext): string {
  const worldSection = context.decomposedWorld.facts.length > 0
    ? `${formatDecomposedWorldForPrompt(context.decomposedWorld)}

`
    : '';

  const npcsSection = context.decomposedCharacters.length > 0
    ? `CHARACTERS (structured profiles):
${context.decomposedCharacters.map((c, i) => formatDecomposedCharacterForPrompt(c, i === 0)).join('\n\n')}

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

  const protagonistName = context.decomposedCharacters.length > 0 ? context.decomposedCharacters[0]!.name : null;
  const protagonistDirective = protagonistName
    ? `PROTAGONIST IDENTITY: ${protagonistName} is the protagonist. All choiceIntents hooks must describe what ${protagonistName} can do or decide — never what other characters do.\n\n`
    : '';

  return `=== PLANNER CONTEXT: OPENING ===
${worldSection}${npcsSection}${agendasSection}${startingSituationSection}TONE/GENRE: ${context.tone}${toneFeelLine}${toneAvoidLine}

${structureSection}${protagonistDirective}Plan the first page scene intent, continuity anchors, writer brief, dramatic question, and choice intents using this opening setup.`;
}
