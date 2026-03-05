import type { ConceptEngineFields } from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { parseConceptEngine } from './concept-spec-parser.js';
import {
  buildSingleConceptEngineerPrompt,
  type SingleEngineerPromptContext,
} from './prompts/concept-single-engineer-prompt.js';
import { CONCEPT_SINGLE_ENGINEER_SCHEMA } from './schemas/concept-single-engineer-schema.js';

export function parseSingleConceptEngineerResponse(parsed: unknown): ConceptEngineFields {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Single concept engineer response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!data['concept'] || typeof data['concept'] !== 'object') {
    throw new LLMError(
      'Single concept engineer response missing concept object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return parseConceptEngine(data['concept'], 0);
}

export async function generateSingleConceptEngine(
  context: SingleEngineerPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<{ engine: ConceptEngineFields; rawResponse: string }> {
  const messages = buildSingleConceptEngineerPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptEngineer',
    promptType: 'conceptEngineer',
    apiKey,
    options,
    schema: CONCEPT_SINGLE_ENGINEER_SCHEMA,
    messages,
    parseResponse: parseSingleConceptEngineerResponse,
  });

  return {
    engine: result.parsed,
    rawResponse: result.rawResponse,
  };
}
