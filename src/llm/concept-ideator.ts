import type {
  ConceptIdeationResult,
  ConceptIdeatorContext,
  ConceptSpec,
  ConceptSeedFields,
  ConceptCharacterWorldFields,
  ConceptEngineFields,
} from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { generateConceptSeeds } from './concept-seeder.js';
import { generateConceptCharacterWorlds } from './concept-architect.js';
import { generateConceptEngines } from './concept-engineer.js';

export function mergeConceptStages(
  seeds: readonly ConceptSeedFields[],
  characterWorlds: readonly ConceptCharacterWorldFields[],
  engines: readonly ConceptEngineFields[],
): readonly ConceptSpec[] {
  return seeds.map((seed, index): ConceptSpec => {
    const cw = characterWorlds[index] as ConceptCharacterWorldFields;
    const eng = engines[index] as ConceptEngineFields;
    return {
      ...seed,
      ...cw,
      ...eng,
    };
  });
}

export async function generateConceptIdeas(
  context: ConceptIdeatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptIdeationResult> {
  const seedResult = await generateConceptSeeds(context, apiKey, options);

  const architectResult = await generateConceptCharacterWorlds(
    { seeds: seedResult.seeds, kernel: context.kernel },
    apiKey,
    options,
  );

  const engineResult = await generateConceptEngines(
    {
      seeds: seedResult.seeds,
      characterWorlds: architectResult.characterWorlds,
      kernel: context.kernel,
    },
    apiKey,
    options,
  );

  const concepts = mergeConceptStages(
    seedResult.seeds,
    architectResult.characterWorlds,
    engineResult.engines,
  );

  return {
    concepts,
    rawResponse: engineResult.rawResponse,
  };
}
