import {
  formatDecomposedCharacterForPrompt,
} from '../../../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../../../models/decomposed-world.js';
import { formatNpcsForPrompt } from '../../../../models/npc.js';
import type { OpeningPagePlanContext } from '../../../context-types.js';

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
${context.decomposedCharacters!.map((c) => formatDecomposedCharacterForPrompt(c)).join('\n\n')}

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

  const toneKeywordsLine =
    context.toneKeywords && context.toneKeywords.length > 0
      ? `\nTone target feel: ${context.toneKeywords.join(', ')}`
      : '';
  const toneAntiKeywordsLine =
    context.toneAntiKeywords && context.toneAntiKeywords.length > 0
      ? `\nTone avoid: ${context.toneAntiKeywords.join(', ')}`
      : '';

  return `=== PLANNER CONTEXT: OPENING ===
CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}${agendasSection}${startingSituationSection}TONE/GENRE: ${context.tone}${toneKeywordsLine}${toneAntiKeywordsLine}

${structureSection}Plan the first page intent and state intents using this opening setup.`;
}
