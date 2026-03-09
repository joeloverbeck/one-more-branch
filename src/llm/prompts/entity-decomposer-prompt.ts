import { formatNpcsForPrompt } from '../../models/npc.js';
import type { StorySpine } from '../../models/story-spine.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { AGENCY_PRINCIPLES, SPEECH_EXTRACTION_BULLETS } from '../entity-decomposition-contract.js';
import {
  ENTITY_DECOMPOSER_CORE_PRINCIPLES,
  ENTITY_DECOMPOSER_USER_INSTRUCTIONS,
} from '../entity-decomposer-prompt-contract.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { EntityDecomposerContext } from '../entity-decomposer-types.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

function formatBullets(lines: readonly string[], indent = '   - '): string {
  return lines.map((line) => `${indent}${line}`).join('\n');
}

function formatNumbered(start: number, lines: readonly string[]): string {
  return lines.map((line, index) => `${start + index}. ${line}`).join('\n\n');
}

const ENTITY_DECOMPOSER_SYSTEM_PROMPT = `You are an Entity Decomposer for an interactive branching story engine. Your job is to convert raw character descriptions and worldbuilding prose into structured, machine-friendly attribute objects.

${CONTENT_POLICY}

DECOMPOSITION PRINCIPLES:

1. SPEECH FINGERPRINT EXTRACTION: This is the MOST IMPORTANT output. Each character must be identifiable by voice alone without dialogue attribution. Extract or infer:
${formatBullets(SPEECH_EXTRACTION_BULLETS)}

${formatNumbered(2, ENTITY_DECOMPOSER_CORE_PRINCIPLES.slice(0, 6))}

7. WORLDBUILDING ATOMIZATION: Break worldbuilding prose into atomic facts with domain tags, scope annotations, and epistemic status (factType). Each fact should be a single, self-contained proposition.
   Available domains: geography (terrain, locations, climate), ecology (flora, fauna, agriculture), history (past events, eras), society (social structure, class, family), culture (customs, traditions, arts, daily life, education), religion (faiths, mythology, cosmology), governance (government, law, politics, military), economy (commerce, professions, labor, wealth), faction (organizations, guilds, alliances), technology (inventions, infrastructure, medicine), magic (supernatural systems, spells), language (languages, dialects, scripts).
   Epistemic status (factType) for each fact:
   - LAW: Fundamental world truths that simply ARE (magic rules, physics, cosmology). E.g. "Iron disrupts magical fields."
   - NORM: Cultural or regional standard practices. E.g. "Merchants bow before entering the Exchange."
   - BELIEF: Held as true by specific groups but may or may not be objectively true. Embed the holder in the fact text. E.g. "The northern clans believe the old gods sleep beneath the ice."
   - DISPUTED: Multiple contradictory versions exist. E.g. "Historians disagree whether the Sundering was caused by divine wrath or arcane experimentation."
   - RUMOR: Unverified hearsay circulating in the world. E.g. "Tavern talk claims the duke poisoned his brother."
   - MYSTERY: Intentionally unresolved unknowns. Preserve the unknown quality. E.g. "No one knows what lies beyond the Veil."

${formatNumbered(8, ENTITY_DECOMPOSER_CORE_PRINCIPLES.slice(6))}

${formatNumbered(11, AGENCY_PRINCIPLES)}`;

function buildSpineContextSection(spine?: StorySpine): string {
  if (!spine) {
    return '';
  }

  const lines: string[] = [
    'STORY SPINE (the narrative backbone — decompose characters in light of this):',
    `Central dramatic question: ${spine.centralDramaticQuestion}`,
    `Protagonist need: ${spine.protagonistNeedVsWant.need}`,
    `Protagonist want: ${spine.protagonistNeedVsWant.want}`,
    `Need-want dynamic: ${spine.protagonistNeedVsWant.dynamic}`,
    `Antagonistic force: ${spine.primaryAntagonisticForce.description}`,
    `Pressure mechanism: ${spine.primaryAntagonisticForce.pressureMechanism}`,
    `Character arc type: ${spine.characterArcType}`,
    '',
    'CONSTRAINT: Decompose characters so that the protagonist\'s core beliefs, decision patterns, and speech reflect the need-want tension. NPC traits should create friction with or support for the antagonistic force.',
  ];

  return '\n\n' + lines.join('\n');
}

function buildEntityDecomposerConceptSection(context: EntityDecomposerContext): string {
  const baseSection = buildConceptAnalysisSection(context.conceptSpec);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    "CONSTRAINT: Use genre frame to calibrate character vocabulary and world fact tone. Use conflict engine to inform NPC motivations and relationships. Use inciting disruption to define protagonist's initial knowledge boundaries and emotional state. Use escape valve to embed alternative engagement hooks in NPCs and world facts. Use protagonist fields to shape speech fingerprint and decision patterns. Use world architecture to scope worldbuilding atomization — facts should align with the setting axioms, constraints, and scale. Use protagonistGhost to inform the protagonist's deepest speech patterns and defensive behaviors. Use protagonistLie to shape the protagonist's core false beliefs and decision biases."
  );
}

function buildEntityDecomposerKernelSection(context: EntityDecomposerContext): string {
  const baseSection = buildKernelGroundingSection(context.storyKernel);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Protagonist core beliefs should reflect the value at stake. NPC false beliefs and secrets should tension with the thematic question. Use the value spectrum to calibrate NPC moral positions — different NPCs should embody different points on the spectrum.'
  );
}

function buildStartingSituationSection(startingSituation?: string): string {
  if (!startingSituation) {
    return '';
  }

  const lines: string[] = [
    'STARTING SITUATION:',
    startingSituation,
    '',
    'CONSTRAINT: Ground the protagonist\'s initial knowledge boundaries and NPC relationship immediacy based on this opening scene context.',
  ];

  return '\n\n' + lines.join('\n');
}

export function buildEntityDecomposerPrompt(context: EntityDecomposerContext): ChatMessage[] {
  const npcsSection =
    context.npcs && context.npcs.length > 0
      ? `\n\nNPC DEFINITIONS:\n${formatNpcsForPrompt(context.npcs)}`
      : '';

  const worldSection = context.worldbuilding
    ? `\n\nWORLDBUILDING:\n${context.worldbuilding}`
    : '';

  const toneSection = context.tone
    ? `\n\n${buildToneDirective(context.tone, context.toneFeel, context.toneAvoid)}`
    : '';

  const spineSection = buildSpineContextSection(context.spine);
  const conceptSection = buildEntityDecomposerConceptSection(context);
  const kernelSection = buildEntityDecomposerKernelSection(context);
  const situationSection = buildStartingSituationSection(context.startingSituation);

  const userPrompt = `Decompose the following character descriptions and worldbuilding into structured attribute objects.

CHARACTER CONCEPT (protagonist):
${context.characterConcept}${npcsSection}${worldSection}${toneSection}${spineSection}${conceptSection}${kernelSection}${situationSection}

INSTRUCTIONS:
${formatNumbered(1, ENTITY_DECOMPOSER_USER_INSTRUCTIONS)}`;

  return [
    { role: 'system', content: ENTITY_DECOMPOSER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
