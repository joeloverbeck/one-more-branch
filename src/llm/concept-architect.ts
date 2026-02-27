import type {
  ConceptCharacterWorldFields,
  ConceptArchitectContext,
  ConceptArchitectResult,
} from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { parseConceptCharacterWorld } from './concept-spec-parser.js';
import { buildConceptArchitectPrompt } from './prompts/concept-architect-prompt.js';
import { CONCEPT_ARCHITECT_SCHEMA } from './schemas/concept-architect-schema.js';

export function parseConceptArchitectResponse(
  parsed: unknown,
  expectedCount: number,
): readonly ConceptCharacterWorldFields[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Concept architect response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['concepts'])) {
    throw new LLMError(
      'Concept architect response missing concepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['concepts'].length !== expectedCount) {
    throw new LLMError(
      `Concept architect response must include exactly ${expectedCount} items (received: ${data['concepts'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['concepts'].map((concept, index) => parseConceptCharacterWorld(concept, index));
}

export async function generateConceptCharacterWorlds(
  context: ConceptArchitectContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptArchitectResult> {
  const expectedCount = context.seeds.length;
  const messages = buildConceptArchitectPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptArchitect',
    promptType: 'conceptArchitect',
    apiKey,
    options,
    schema: CONCEPT_ARCHITECT_SCHEMA,
    messages,
    parseResponse: (parsed) => parseConceptArchitectResponse(parsed, expectedCount),
  });

  return {
    characterWorlds: result.parsed,
    rawResponse: result.rawResponse,
  };
}
