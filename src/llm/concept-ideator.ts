import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import type { ConceptIdeationResult, ConceptIdeatorContext, ConceptSpec } from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { LLMError } from './llm-client-types.js';
import { parseConceptSpec } from './concept-spec-parser.js';
import { buildConceptIdeatorPrompt } from './prompts/concept-ideator-prompt.js';
import { withRetry } from './retry.js';
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
