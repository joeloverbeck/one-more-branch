import type { ConceptSeedFields, ConceptSeederContext, ConceptSeederResult } from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { parseConceptSeed } from './concept-spec-parser.js';
import { buildConceptSeederPrompt } from './prompts/concept-seeder-prompt.js';
import { buildConceptSeederSchema } from './schemas/concept-seeder-schema.js';

export function parseConceptSeederResponse(parsed: unknown): readonly ConceptSeedFields[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Concept seeder response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['concepts'])) {
    throw new LLMError(
      'Concept seeder response missing concepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['concepts'].length < 6 || data['concepts'].length > 8) {
    throw new LLMError(
      `Concept seeder response must include 6-8 seeds (received: ${data['concepts'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['concepts'].map((concept, index) => parseConceptSeed(concept, index));
}

export async function generateConceptSeeds(
  context: ConceptSeederContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptSeederResult> {
  const messages = buildConceptSeederPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptSeeder',
    promptType: 'conceptSeeder',
    apiKey,
    options,
    schema: buildConceptSeederSchema(context.excludedGenres),
    messages,
    parseResponse: parseConceptSeederResponse,
  });

  return {
    seeds: result.parsed,
    rawResponse: result.rawResponse,
  };
}
