import type { ConceptArchitectContext, ConceptSeedFields } from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildArchitectTaxonomyGuidance, ARCHITECT_QUALITY_ANCHORS } from './concept-prompt-shared.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const ROLE_INTRO =
  'You are a character and world architect for branching interactive fiction. Given concept seeds, design protagonists with capabilities and flaws that create player agency, and worlds with enforceable rules that produce meaningful constraints.';

function buildKernelBlock(kernel: ConceptArchitectContext['kernel']): string | null {
  if (!kernel) {
    return null;
  }

  return `STORY KERNEL:
- dramaticThesis: ${kernel.dramaticThesis}
- antithesis: ${kernel.antithesis}
- valueAtStake: ${kernel.valueAtStake}
- opposingForce: ${kernel.opposingForce}
- directionOfChange: ${kernel.directionOfChange}
- conflictAxis: ${kernel.conflictAxis}
- dramaticStance: ${kernel.dramaticStance}
- thematicQuestion: ${kernel.thematicQuestion}
- valueSpectrum.positive: ${kernel.valueSpectrum.positive}
- valueSpectrum.contrary: ${kernel.valueSpectrum.contrary}
- valueSpectrum.contradictory: ${kernel.valueSpectrum.contradictory}
- valueSpectrum.negationOfNegation: ${kernel.valueSpectrum.negationOfNegation}

CHARACTER GROUNDING (Weiland):
- The protagonist's coreFlaw should connect to a Lie they believe.
- The protagonist's motivations should be driven by the Ghost (backstory wound).
- The Lie/Truth/Ghost fields will be generated in the engineer stage; architect should design the character so these fields emerge naturally.`;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function serializeSeeds(seeds: readonly ConceptSeedFields[]): string {
  return JSON.stringify(seeds, null, 2);
}

export function buildConceptArchitectPrompt(context: ConceptArchitectContext): ChatMessage[] {
  const genreVibes = normalize(context.genreVibes);
  const moodKeywords = normalize(context.moodKeywords);
  const contentPreferences = normalize(context.contentPreferences);

  const systemSections: string[] = [ROLE_INTRO];

  const toneParts: string[] = [];
  if (genreVibes) toneParts.push(`genre vibes: ${genreVibes}`);
  if (moodKeywords) toneParts.push(`mood keywords: ${moodKeywords}`);
  if (toneParts.length > 0) {
    systemSections.push(buildToneDirective(toneParts.join(' | ')));
  }

  systemSections.push(CONTENT_POLICY, buildArchitectTaxonomyGuidance(), ARCHITECT_QUALITY_ANCHORS);

  const userSections: string[] = [
    `Design character and world for each of the ${context.seeds.length} concept seeds below.`,
    `CONCEPT SEEDS:\n${serializeSeeds(context.seeds)}`,
  ];

  const kernelBlock = buildKernelBlock(context.kernel);
  if (kernelBlock) {
    userSections.push(kernelBlock);
  }

  const protagonistDetails = normalize(context.protagonistDetails);
  if (protagonistDetails) {
    userSections.push(
      `MANDATORY PROTAGONIST (NON-NEGOTIABLE — CHARACTER DESIGN MUST MATCH):\n${protagonistDetails}\nThe protagonistRole, coreCompetence, coreFlaw, and actionVerbs MUST be consistent with this protagonist. Do not redesign the protagonist into a different character. Adapt the world and constraints to serve this protagonist, not the other way around.`,
    );
  }

  const mandateParts: string[] = [];
  if (protagonistDetails) mandateParts.push(`Protagonist Details: ${protagonistDetails}`);
  if (genreVibes) mandateParts.push(`Genre Vibes: ${genreVibes}`);
  if (moodKeywords) mandateParts.push(`Mood Keywords: ${moodKeywords}`);
  if (contentPreferences) mandateParts.push(`Content Preferences: ${contentPreferences}`);

  if (mandateParts.length > 0) {
    userSections.push(
      `USER CREATIVE MANDATE (character and world designs MUST embody ALL of the following):\n${mandateParts.join('\n')}\nDesign characters and worlds that centrally express these qualities.`,
    );
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptCharacterWorld, ...] }.
- concepts array must contain exactly ${context.seeds.length} items, one per seed in order.
- actionVerbs must contain at least 6 concise, distinct verbs.
- settingAxioms must contain 2-5 enforceable rules.
- constraintSet must contain 2-5 meaningful limits.
- keyInstitutions must contain 2-4 pressure-producing institutions.
- Each character/world design must be specifically tailored to its seed's genreFrame, conflictAxis, and oneLineHook.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
