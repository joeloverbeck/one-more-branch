import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import type { ConceptIdeationResult, ConceptIdeatorContext, ConceptSpec } from '../models/index.js';
import {
  isBranchingPosture,
  isConflictAxis,
  isGenreFrame,
  isSettingScale,
  isStateComplexity,
} from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { LLMError } from './llm-client-types.js';
import { buildConceptIdeatorPrompt } from './prompts/concept-ideator-prompt.js';
import { withRetry } from './retry.js';
import { CONCEPT_IDEATION_SCHEMA } from './schemas/concept-ideator-schema.js';

function requireNonEmptyString(
  value: unknown,
  fieldName: string,
  conceptIndex: number,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(
      `Concept ${conceptIndex + 1} has invalid ${fieldName}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return value.trim();
}

function requireStringArray(
  value: unknown,
  fieldName: string,
  conceptIndex: number,
  minItems: number,
  maxItems?: number,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(
      `Concept ${conceptIndex + 1} has invalid ${fieldName}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length < minItems || (typeof maxItems === 'number' && items.length > maxItems)) {
    const rangeLabel = typeof maxItems === 'number' ? `${minItems}-${maxItems}` : `${minItems}+`;
    throw new LLMError(
      `Concept ${conceptIndex + 1} ${fieldName} must contain ${rangeLabel} items`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return items;
}

function parseConcept(raw: unknown, index: number): ConceptSpec {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(`Concept ${index + 1} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = raw as Record<string, unknown>;

  if (!isGenreFrame(data['genreFrame'])) {
    throw new LLMError(
      `Concept ${index + 1} has invalid genreFrame: ${String(data['genreFrame'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isConflictAxis(data['conflictAxis'])) {
    throw new LLMError(
      `Concept ${index + 1} has invalid conflictAxis: ${String(data['conflictAxis'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isSettingScale(data['settingScale'])) {
    throw new LLMError(
      `Concept ${index + 1} has invalid settingScale: ${String(data['settingScale'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isBranchingPosture(data['branchingPosture'])) {
    throw new LLMError(
      `Concept ${index + 1} has invalid branchingPosture: ${String(data['branchingPosture'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isStateComplexity(data['stateComplexity'])) {
    throw new LLMError(
      `Concept ${index + 1} has invalid stateComplexity: ${String(data['stateComplexity'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    oneLineHook: requireNonEmptyString(data['oneLineHook'], 'oneLineHook', index),
    elevatorParagraph: requireNonEmptyString(data['elevatorParagraph'], 'elevatorParagraph', index),
    genreFrame: data['genreFrame'],
    genreSubversion: requireNonEmptyString(data['genreSubversion'], 'genreSubversion', index),
    protagonistRole: requireNonEmptyString(data['protagonistRole'], 'protagonistRole', index),
    coreCompetence: requireNonEmptyString(data['coreCompetence'], 'coreCompetence', index),
    coreFlaw: requireNonEmptyString(data['coreFlaw'], 'coreFlaw', index),
    actionVerbs: requireStringArray(data['actionVerbs'], 'actionVerbs', index, 6),
    coreConflictLoop: requireNonEmptyString(data['coreConflictLoop'], 'coreConflictLoop', index),
    conflictAxis: data['conflictAxis'],
    pressureSource: requireNonEmptyString(data['pressureSource'], 'pressureSource', index),
    stakesPersonal: requireNonEmptyString(data['stakesPersonal'], 'stakesPersonal', index),
    stakesSystemic: requireNonEmptyString(data['stakesSystemic'], 'stakesSystemic', index),
    deadlineMechanism: requireNonEmptyString(data['deadlineMechanism'], 'deadlineMechanism', index),
    settingAxioms: requireStringArray(data['settingAxioms'], 'settingAxioms', index, 2, 5),
    constraintSet: requireStringArray(data['constraintSet'], 'constraintSet', index, 3, 5),
    keyInstitutions: requireStringArray(data['keyInstitutions'], 'keyInstitutions', index, 2, 4),
    settingScale: data['settingScale'],
    branchingPosture: data['branchingPosture'],
    stateComplexity: data['stateComplexity'],
  };
}

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

  return data['concepts'].map((concept, index) => parseConcept(concept, index));
}

export async function generateConceptIdeas(
  context: ConceptIdeatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptIdeationResult> {
  const config = getConfig().llm;
  const model = options?.model ?? getStageModel('conceptIdeator');
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildConceptIdeatorPrompt(context);
  logPrompt(logger, 'conceptIdeator', messages);

  return withRetry(async () => {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'One More Branch',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: CONCEPT_IDEATION_SCHEMA,
      }),
    });

    if (!response.ok) {
      const errorDetails = await readErrorDetails(response);
      const retryable = response.status === 429 || response.status >= 500;
      throw new LLMError(errorDetails.message, `HTTP_${response.status}`, retryable, {
        httpStatus: response.status,
        model,
        rawErrorBody: errorDetails.rawBody,
        parsedError: errorDetails.parsedError,
      });
    }

    const data = await readJsonResponse(response);
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true);
    }

    const parsedMessage = parseMessageJsonContent(content);
    const responseText = parsedMessage.rawText;
    try {
      const concepts = parseConceptIdeationResponse(parsedMessage.parsed);
      return { concepts, rawResponse: responseText };
    } catch (error) {
      if (error instanceof LLMError) {
        throw new LLMError(error.message, error.code, error.retryable, {
          rawContent: responseText,
        });
      }
      throw error;
    }
  });
}
