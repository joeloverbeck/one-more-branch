import type { ConceptEvolutionResult, ConceptEvolverContext } from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { generateEvolvedConceptSeeds } from './concept-evolver-seeder.js';
import { generateConceptCharacterWorlds } from './concept-architect.js';
import { generateConceptEngines } from './concept-engineer.js';
import { mergeConceptStages } from './concept-ideator.js';

export async function evolveConceptIdeas(
  context: ConceptEvolverContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptEvolutionResult> {
  const seedResult = await generateEvolvedConceptSeeds(context, apiKey, options);

  const architectResult = await generateConceptCharacterWorlds(
    {
      seeds: seedResult.seeds,
      kernel: context.kernel,
      protagonistDetails: context.protagonistDetails,
      genreVibes: context.genreVibes,
      moodKeywords: context.moodKeywords,
      contentPreferences: context.contentPreferences,
      contentPackets: context.contentPackets,
    },
    apiKey,
    options,
  );

  const engineResult = await generateConceptEngines(
    {
      seeds: seedResult.seeds,
      characterWorlds: architectResult.characterWorlds,
      kernel: context.kernel,
      protagonistDetails: context.protagonistDetails,
      genreVibes: context.genreVibes,
      moodKeywords: context.moodKeywords,
      contentPreferences: context.contentPreferences,
      contentPackets: context.contentPackets,
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
