import type {
  ConceptEngineFields,
  ConceptEngineerContext,
  ConceptEngineerResult,
} from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { parseConceptEngine } from './concept-spec-parser.js';
import { buildConceptEngineerPrompt } from './prompts/concept-engineer-prompt.js';
import { CONCEPT_ENGINEER_SCHEMA } from './schemas/concept-engineer-schema.js';

export function parseConceptEngineerResponse(
  parsed: unknown,
  expectedCount: number,
): readonly ConceptEngineFields[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Concept engineer response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['concepts'])) {
    throw new LLMError(
      'Concept engineer response missing concepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['concepts'].length !== expectedCount) {
    throw new LLMError(
      `Concept engineer response must include exactly ${expectedCount} items (received: ${data['concepts'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['concepts'].map((concept, index) => parseConceptEngine(concept, index));
}

export async function generateConceptEngines(
  context: ConceptEngineerContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptEngineerResult> {
  const expectedCount = context.seeds.length;
  const messages = buildConceptEngineerPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptEngineer',
    promptType: 'conceptEngineer',
    apiKey,
    options,
    schema: CONCEPT_ENGINEER_SCHEMA,
    messages,
    parseResponse: (parsed) => parseConceptEngineerResponse(parsed, expectedCount),
  });

  return {
    engines: result.parsed,
    rawResponse: result.rawResponse,
  };
}
