import type {
  ConceptIdeationResult,
  ConceptIdeatorContext,
  ConceptSpec,
  ConceptSeedFields,
  ConceptCharacterWorldFields,
  ConceptEngineFields,
} from '../models/index.js';
import type { StoryKernel } from '../models/story-kernel.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { generateConceptSeeds } from './concept-seeder.js';
import { generateConceptCharacterWorlds } from './concept-architect.js';
import { generateConceptEngines } from './concept-engineer.js';

export interface ConceptIdeationPhaseResult {
  readonly seeds: readonly ConceptSeedFields[];
  readonly characterWorlds: readonly ConceptCharacterWorldFields[];
}

export interface ConceptDevelopmentContext {
  readonly seeds: readonly ConceptSeedFields[];
  readonly characterWorlds: readonly ConceptCharacterWorldFields[];
  readonly kernel?: StoryKernel;
}

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

export async function generateConceptIdeation(
  context: ConceptIdeatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptIdeationPhaseResult> {
  const seedResult = await generateConceptSeeds(context, apiKey, options);
  const architectResult = await generateConceptCharacterWorlds(
    { seeds: seedResult.seeds, kernel: context.kernel },
    apiKey,
    options,
  );
  return { seeds: seedResult.seeds, characterWorlds: architectResult.characterWorlds };
}

export async function generateConceptDevelopment(
  context: ConceptDevelopmentContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptIdeationResult> {
  const engineResult = await generateConceptEngines(
    { seeds: context.seeds, characterWorlds: context.characterWorlds, kernel: context.kernel },
    apiKey,
    options,
  );
  const concepts = mergeConceptStages(context.seeds, context.characterWorlds, engineResult.engines);
  return { concepts, rawResponse: engineResult.rawResponse };
}

export async function generateConceptIdeas(
  context: ConceptIdeatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptIdeationResult> {
  const ideation = await generateConceptIdeation(context, apiKey, options);
  return generateConceptDevelopment(
    { seeds: ideation.seeds, characterWorlds: ideation.characterWorlds, kernel: context.kernel },
    apiKey,
    options,
  );
}
