import type { ConceptEvolutionResult, ConceptEvolverContext, ConceptSpec } from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { parseConceptSpec } from './concept-spec-parser.js';
import { buildConceptEvolverPrompt } from './prompts/concept-evolver-prompt.js';
import { CONCEPT_EVOLUTION_SCHEMA } from './schemas/concept-evolver-schema.js';

function buildDiversityKey(concept: ConceptSpec): string {
  return `${concept.genreFrame}::${concept.conflictAxis}`;
}

export function parseConceptEvolutionResponse(parsed: unknown): readonly ConceptSpec[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Concept evolution response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['concepts'])) {
    throw new LLMError(
      'Concept evolution response missing concepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['concepts'].length !== 6) {
    throw new LLMError(
      `Concept evolution response must include exactly 6 concepts (received: ${data['concepts'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const concepts = data['concepts'].map((concept, index) => parseConceptSpec(concept, index));
  const diversityKeys = new Set<string>();
  for (const concept of concepts) {
    const key = buildDiversityKey(concept);
    if (diversityKeys.has(key)) {
      throw new LLMError(
        `Concept evolution response contains duplicate genreFrame+conflictAxis pair: ${key}`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }
    diversityKeys.add(key);
  }

  return concepts;
}

export async function evolveConceptIdeas(
  context: ConceptEvolverContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptEvolutionResult> {
  const messages = buildConceptEvolverPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptEvolver',
    promptType: 'conceptEvolver',
    apiKey,
    options,
    schema: CONCEPT_EVOLUTION_SCHEMA,
    messages,
    parseResponse: parseConceptEvolutionResponse,
  });

  return {
    concepts: result.parsed,
    rawResponse: result.rawResponse,
  };
}
