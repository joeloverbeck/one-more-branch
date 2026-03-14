import {
  formatDecomposedCharacterForPrompt,
} from '../../../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../../../models/decomposed-world.js';
import { createInitialStructureState } from '../../../../models/story-arc.js';
import type { StoryKernel } from '../../../../models/story-kernel.js';
import type { OpeningPagePlanContext } from '../../../context-types.js';
import { buildSharedStructureContext } from '../../continuation/story-structure-section.js';
import type { PlannerContextOptions } from './continuation-context.js';

function buildOpeningValueSpectrumSection(storyKernel: StoryKernel | undefined): string {
  if (!storyKernel?.valueSpectrum) {
    return '';
  }

  const vs = storyKernel.valueSpectrum;
  return `=== VALUE SPECTRUM (McKee) ===
Moral argument: ${storyKernel.moralArgument}
Value spectrum:
- Positive: ${vs.positive}
- Contrary: ${vs.contrary}
- Contradictory: ${vs.contradictory}
- Negation of negation: ${vs.negationOfNegation}

The opening scene should establish the protagonist near the "positive" end of the spectrum, seeding the moral argument through action and situation — not exposition.

`;
}

export function buildPlannerOpeningContextSection(
  context: OpeningPagePlanContext,
  options?: PlannerContextOptions
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

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:
${context.startingSituation}

`
    : '';

  const structureSection = context.structure
    ? buildSharedStructureContext(context.structure, createInitialStructureState(context.structure))
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

  const includeProtagonist = options?.includeProtagonistDirective ?? true;

  const protagonistName = context.decomposedCharacters.length > 0 ? context.decomposedCharacters[0]!.name : null;
  const protagonistDirective = includeProtagonist && protagonistName
    ? `PROTAGONIST IDENTITY: ${protagonistName} is the protagonist.\n\n`
    : '';

  const valueSpectrumSection = buildOpeningValueSpectrumSection(context.storyKernel);

  return `=== PLANNER CONTEXT: OPENING ===
${worldSection}${npcsSection}${agendasSection}${startingSituationSection}TONE/GENRE: ${context.tone}${toneFeelLine}${toneAvoidLine}

${structureSection}${valueSpectrumSection}${protagonistDirective}Plan the first page scene intent, continuity anchors, writer brief, and dramatic question using this opening setup.`;
}
