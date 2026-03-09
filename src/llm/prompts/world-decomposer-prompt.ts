import type { ConceptSpec } from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { StorySpine } from '../../models/story-spine.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { WorldDecompositionContext } from '../entity-decomposer-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const WORLD_DECOMPOSER_SYSTEM_PROMPT = `You are a World Decomposer for an interactive branching story engine. Your job is to convert raw worldbuilding prose into structured, machine-friendly atomic facts.

${CONTENT_POLICY}

DECOMPOSITION PRINCIPLES:

1. WORLDBUILDING ATOMIZATION: Break worldbuilding prose into atomic facts with domain tags, scope annotations, and epistemic status (factType). Each fact should be a single, self-contained proposition.
   Available domains: geography (terrain, locations, climate), ecology (flora, fauna, agriculture), history (past events, eras), society (social structure, class, family), culture (customs, traditions, arts, daily life, education), religion (faiths, mythology, cosmology), governance (government, law, politics, military), economy (commerce, professions, labor, wealth), faction (organizations, guilds, alliances), technology (inventions, infrastructure, medicine), magic (supernatural systems, spells), language (languages, dialects, scripts).
   Epistemic status (factType) for each fact:
   - LAW: Fundamental world truths that simply ARE (magic rules, physics, cosmology). E.g. "Iron disrupts magical fields."
   - NORM: Cultural or regional standard practices. E.g. "Merchants bow before entering the Exchange."
   - BELIEF: Held as true by specific groups but may or may not be objectively true. Embed the holder in the fact text. E.g. "The northern clans believe the old gods sleep beneath the ice."
   - DISPUTED: Multiple contradictory versions exist. E.g. "Historians disagree whether the Sundering was caused by divine wrath or arcane experimentation."
   - RUMOR: Unverified hearsay circulating in the world. E.g. "Tavern talk claims the duke poisoned his brother."
   - MYSTERY: Intentionally unresolved unknowns. Preserve the unknown quality. E.g. "No one knows what lies beyond the Veil."

2. PRESERVE NUANCE: Do not flatten the setting into generic fantasy/sci-fi placeholders. Preserve contradictions, uncertainty, and scope.

3. USE PROVIDED STORY CONTEXT: Use tone, spine, concept, kernel, and starting situation only to interpret the worldbuilding correctly. Do not invent characters or character relationships from that context.

4. CHARACTER DATA IS EXTERNAL: Character data is provided separately. Do NOT generate character profiles, dialogue fingerprints, motivations, or relationship objects.

5. EMPTY INPUT HANDLING: If no worldbuilding is provided, return an empty worldFacts array.`;

function buildSpineContextSection(spine?: StorySpine): string {
  if (!spine) {
    return '';
  }

  const lines: string[] = [
    'STORY SPINE (use only to interpret what parts of the worldbuilding matter most):',
    `Central dramatic question: ${spine.centralDramaticQuestion}`,
    `Antagonistic force: ${spine.primaryAntagonisticForce.description}`,
    `Pressure mechanism: ${spine.primaryAntagonisticForce.pressureMechanism}`,
    `Character arc type: ${spine.characterArcType}`,
    '',
    'CONSTRAINT: Use the spine to prioritize stakes, institutions, and pressure systems in the world facts. Do not infer character profiles from it.',
  ];

  return '\n\n' + lines.join('\n');
}

function buildConceptAnalysisSection(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) {
    return '';
  }

  const lines: string[] = [
    'CONCEPT ANALYSIS (use only for world framing):',
    `One-line hook: ${conceptSpec.oneLineHook}`,
    `Elevator pitch: ${conceptSpec.elevatorParagraph}`,
    `Genre: ${conceptSpec.genreFrame} (Subversion: ${conceptSpec.genreSubversion})`,
    `Core conflict loop: ${conceptSpec.coreConflictLoop}`,
    `Pressure source: ${conceptSpec.pressureSource}`,
    `Systemic stakes: ${conceptSpec.stakesSystemic}`,
    `Inciting disruption: ${conceptSpec.incitingDisruption}`,
    '',
    'WORLD ARCHITECTURE:',
    `Setting axioms: ${conceptSpec.settingAxioms.join('; ')}`,
    `Constraints: ${conceptSpec.constraintSet.join('; ')}`,
    `Key institutions: ${conceptSpec.keyInstitutions.join('; ')}`,
    `Setting scale: ${conceptSpec.settingScale}`,
    '',
    'CONSTRAINT: Use this context to scope world facts, institutions, constraints, and cultural norms only.',
  ];

  return '\n\n' + lines.join('\n');
}

function buildKernelGroundingSection(storyKernel?: StoryKernel): string {
  if (!storyKernel) {
    return '';
  }

  const lines: string[] = [
    'THEMATIC KERNEL (use to calibrate world pressures and moral texture):',
    `Dramatic thesis: ${storyKernel.dramaticThesis}`,
    `Value at stake: ${storyKernel.valueAtStake}`,
    `Opposing force: ${storyKernel.opposingForce}`,
    `Direction of change: ${storyKernel.directionOfChange}`,
    `Conflict axis: ${storyKernel.conflictAxis}`,
    `Dramatic stance: ${storyKernel.dramaticStance}`,
    `Thematic question: ${storyKernel.thematicQuestion}`,
    `Moral argument: ${storyKernel.moralArgument}`,
    '',
    'CONSTRAINT: Let the kernel sharpen what sort of institutions, customs, and world rules the worldbuilding implies. Do not emit character psychology.',
  ];

  return '\n\n' + lines.join('\n');
}

function buildStartingSituationSection(startingSituation?: string): string {
  if (!startingSituation) {
    return '';
  }

  const lines: string[] = [
    'STARTING SITUATION:',
    startingSituation,
    '',
    'CONSTRAINT: Use this only to clarify which world facts are immediately relevant or active at the opening.',
  ];

  return '\n\n' + lines.join('\n');
}

export function buildWorldDecomposerPrompt(context: WorldDecompositionContext): ChatMessage[] {
  const worldSection = context.worldbuilding
    ? `\n\nWORLDBUILDING:\n${context.worldbuilding}`
    : '';

  const toneSection = context.tone
    ? `\n\n${buildToneDirective(context.tone, context.toneFeel, context.toneAvoid)}`
    : '';

  const spineSection = buildSpineContextSection(context.spine);
  const conceptSection = buildConceptAnalysisSection(context.conceptSpec);
  const kernelSection = buildKernelGroundingSection(context.storyKernel);
  const situationSection = buildStartingSituationSection(context.startingSituation);

  const userPrompt = `Decompose the following worldbuilding into structured world facts only.

Character data is provided separately. Do NOT generate character profiles, protagonist relationships, or speech fingerprints.${worldSection}${toneSection}${spineSection}${conceptSection}${kernelSection}${situationSection}

INSTRUCTIONS:
1. Return ONLY a top-level object with a \`worldFacts\` array
2. Decompose worldbuilding into atomic propositions
3. Preserve domain, scope, and epistemic status (factType) for each fact
4. If no worldbuilding is provided, return an empty \`worldFacts\` array
5. Do not include character-oriented fields of any kind`;

  return [
    { role: 'system', content: WORLD_DECOMPOSER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
