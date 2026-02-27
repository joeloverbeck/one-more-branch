import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import { getGenreObligationTags } from '../models/genre-obligations.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import type { StructureGenerationResult } from '../models/structure-generation.js';
import { resolvePromptOptions } from './options.js';
import { buildStructurePrompt, type StructureContext } from './prompts/structure-prompt.js';
import { withModelFallback } from './model-fallback.js';
import { withRetry } from './retry.js';
import { STRUCTURE_GENERATION_SCHEMA } from './schemas/structure-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { parseStructureResponseObject } from './structure-response-parser.js';

const MIN_UNIQUE_TRACED_SETPIECES = 4;

function countUniqueSetpieceIndices(
  result: Omit<StructureGenerationResult, 'rawResponse'>
): number {
  const unique = new Set<number>();
  for (const act of result.acts) {
    for (const beat of act.beats) {
      if (typeof beat.setpieceSourceIndex === 'number') {
        unique.add(beat.setpieceSourceIndex);
      }
    }
  }
  return unique.size;
}

function collectTaggedObligations(
  result: Omit<StructureGenerationResult, 'rawResponse'>
): Set<string> {
  const tagged = new Set<string>();
  for (const act of result.acts) {
    for (const beat of act.beats) {
      if (typeof beat.obligatorySceneTag === 'string') {
        tagged.add(beat.obligatorySceneTag);
      }
    }
  }
  return tagged;
}

async function fetchStructure(
  apiKey: string,
  model: string,
  messages: ReturnType<typeof buildStructurePrompt>,
  temperature: number,
  maxTokens: number,
  hasConceptVerification: boolean,
  expectedGenreObligations: readonly string[] | null
): Promise<StructureGenerationResult> {
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
      response_format: STRUCTURE_GENERATION_SCHEMA,
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
    const parsed = parseStructureResponseObject(parsedMessage.parsed);
    if (hasConceptVerification) {
      const uniqueSetpiecesUsed = countUniqueSetpieceIndices(parsed);
      if (uniqueSetpiecesUsed < MIN_UNIQUE_TRACED_SETPIECES) {
        logger.warn(
          `Structure setpiece tracing below target: ${uniqueSetpiecesUsed}/${MIN_UNIQUE_TRACED_SETPIECES} unique setpieces mapped`
        );
      }
    }
    if (expectedGenreObligations && expectedGenreObligations.length > 0) {
      const tagged = collectTaggedObligations(parsed);
      const missing = expectedGenreObligations.filter((tag) => !tagged.has(tag));
      if (missing.length > 0) {
        logger.warn(`Structure missing genre obligation tags: ${missing.join(', ')}`);
      }
    }
    return { ...parsed, rawResponse: responseText };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function generateStoryStructure(
  context: StructureContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<StructureGenerationResult> {
  const resolvedOptions: GenerationOptions = {
    apiKey,
    ...options,
  };
  const promptOptions = resolvePromptOptions(resolvedOptions);
  const config = getConfig().llm;
  const primaryModel = options?.model ?? getStageModel('structure');
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildStructurePrompt(context, promptOptions);
  logPrompt(logger, 'structure', messages);
  const hasConceptVerification = (context.conceptVerification?.escalatingSetpieces.length ?? 0) > 0;
  const expectedGenreObligationEntries = context.conceptSpec
    ? getGenreObligationTags(context.conceptSpec.genreFrame)
    : null;
  const expectedGenreObligations = expectedGenreObligationEntries
    ? expectedGenreObligationEntries.map((e) => e.tag)
    : null;

  return withRetry(() =>
    withModelFallback(
      (m) =>
        fetchStructure(
          apiKey,
          m,
          messages,
          temperature,
          maxTokens,
          hasConceptVerification,
          expectedGenreObligations
        ),
      primaryModel,
      'structure'
    )
  );
}
