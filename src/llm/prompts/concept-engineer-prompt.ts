import type {
  ConceptEngineerContext,
  ConceptSeedFields,
  ConceptCharacterWorldFields,
} from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { ENGINEER_QUALITY_ANCHORS } from './concept-prompt-shared.js';

const ROLE_INTRO =
  'You are a story conflict engineer for branching interactive fiction. Given concept identity, character, and world, design the mechanical forces that drive the story — pressure, stakes, deadlines, irony, disruption, escape mechanisms — and write a compelling elevator paragraph that synthesizes the full concept.';

function buildKernelBlock(kernel: ConceptEngineerContext['kernel']): string | null {
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

function serializeCombinedContext(
  seeds: readonly ConceptSeedFields[],
  characterWorlds: readonly ConceptCharacterWorldFields[],
): string {
  const combined = seeds.map((seed, index) => ({
    ...seed,
    ...characterWorlds[index],
  }));
  return JSON.stringify(combined, null, 2);
}

export function buildConceptEngineerPrompt(context: ConceptEngineerContext): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, ENGINEER_QUALITY_ANCHORS];

  const userSections: string[] = [
    `Engineer conflict forces and write elevator paragraphs for each of the ${context.seeds.length} concepts below.`,
    `CONCEPT IDENTITY + CHARACTER + WORLD:\n${serializeCombinedContext(context.seeds, context.characterWorlds)}`,
  ];

  const kernelBlock = buildKernelBlock(context.kernel);
  if (kernelBlock) {
    userSections.push(kernelBlock);
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptEngine, ...] }.
- concepts array must contain exactly ${context.seeds.length} items, one per concept in order.
- elevatorParagraph must synthesize the full concept — hook, character, world, and conflict engine — into a compelling pitch.
- pressureSource, stakesPersonal, stakesSystemic, deadlineMechanism, ironicTwist, incitingDisruption, and escapeValve must all be non-empty and specific to the concept.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
