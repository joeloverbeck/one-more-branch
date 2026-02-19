import type { ConceptIdeationResult, ConceptIdeatorContext, ConceptSpec } from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { parseConceptSpec } from './concept-spec-parser.js';
import { buildConceptIdeatorPrompt } from './prompts/concept-ideator-prompt.js';
import { CONCEPT_IDEATION_SCHEMA } from './schemas/concept-ideator-schema.js';

export function parseConceptIdeationResponse(parsed: unknown): readonly ConceptSpec[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Concept ideation response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['concepts'])) {
    throw new LLMError(
      'Concept ideation response missing concepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['concepts'].length < 6 || data['concepts'].length > 8) {
    throw new LLMError(
      `Concept ideation response must include 6-8 concepts (received: ${data['concepts'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['concepts'].map((concept, index) => parseConceptSpec(concept, index));
}

export async function generateConceptIdeas(
  context: ConceptIdeatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptIdeationResult> {
  const messages = buildConceptIdeatorPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptIdeator',
    promptType: 'conceptIdeator',
    apiKey,
    options,
    schema: CONCEPT_IDEATION_SCHEMA,
    messages,
    parseResponse: parseConceptIdeationResponse,
  });

  return {
    concepts: result.parsed,
    rawResponse: result.rawResponse,
  };
}
