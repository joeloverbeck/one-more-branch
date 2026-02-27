import type { ConceptArchitectContext, ConceptSeedFields } from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildArchitectTaxonomyGuidance, ARCHITECT_QUALITY_ANCHORS } from './concept-prompt-shared.js';

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
- thematicQuestion: ${kernel.thematicQuestion}`;
}

function serializeSeeds(seeds: readonly ConceptSeedFields[]): string {
  return JSON.stringify(seeds, null, 2);
}

export function buildConceptArchitectPrompt(context: ConceptArchitectContext): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    CONTENT_POLICY,
    buildArchitectTaxonomyGuidance(),
    ARCHITECT_QUALITY_ANCHORS,
  ];

  const userSections: string[] = [
    `Design character and world for each of the ${context.seeds.length} concept seeds below.`,
    `CONCEPT SEEDS:\n${serializeSeeds(context.seeds)}`,
  ];

  const kernelBlock = buildKernelBlock(context.kernel);
  if (kernelBlock) {
    userSections.push(kernelBlock);
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
