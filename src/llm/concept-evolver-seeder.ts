import type {
  ConceptSeedFields,
  ConceptEvolverSeederContext,
  ConceptEvolverSeederResult,
} from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { parseConceptSeed } from './concept-spec-parser.js';
import { buildConceptEvolverSeederPrompt } from './prompts/concept-evolver-seeder-prompt.js';
import { buildConceptSeederSchema } from './schemas/concept-seeder-schema.js';

function buildDiversityKey(seed: ConceptSeedFields): string {
  return `${seed.genreFrame}::${seed.conflictAxis}`;
}

export function parseConceptEvolverSeederResponse(
  parsed: unknown,
): readonly ConceptSeedFields[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Concept evolver seeder response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['concepts'])) {
    throw new LLMError(
      'Concept evolver seeder response missing concepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['concepts'].length !== 6) {
    throw new LLMError(
      `Concept evolver seeder response must include exactly 6 seeds (received: ${data['concepts'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const seeds = data['concepts'].map((concept, index) => parseConceptSeed(concept, index));
  const diversityKeys = new Set<string>();
  for (const seed of seeds) {
    const key = buildDiversityKey(seed);
    if (diversityKeys.has(key)) {
      throw new LLMError(
        `Concept evolver seeder response contains duplicate genreFrame+conflictAxis pair: ${key}`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }
    diversityKeys.add(key);
  }

  return seeds;
}

export async function generateEvolvedConceptSeeds(
  context: ConceptEvolverSeederContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptEvolverSeederResult> {
  const messages = buildConceptEvolverSeederPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptEvolverSeeder',
    promptType: 'conceptEvolverSeeder',
    apiKey,
    options,
    schema: buildConceptSeederSchema(context.excludedGenres),
    messages,
    parseResponse: parseConceptEvolverSeederResponse,
  });

  return {
    seeds: result.parsed,
    rawResponse: result.rawResponse,
  };
}
