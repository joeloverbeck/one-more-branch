import { getStageModel } from '../config/stage-model.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import {
  buildAgendaResolverPrompt,
  type AgendaResolverPromptContext,
} from './prompts/agenda-resolver-prompt.js';
import { AGENDA_RESOLVER_SCHEMA } from './schemas/agenda-resolver-schema.js';
import { validateAgendaResolverResponse } from './schemas/agenda-resolver-response-transformer.js';
import { LLMError } from './llm-client-types.js';
import type { AgendaResolverResult } from './lorekeeper-types.js';

const DEFAULT_AGENDA_RESOLVER_TEMPERATURE = 0.4;
const DEFAULT_AGENDA_RESOLVER_MAX_TOKENS = 4096;

export interface GenerateAgendaResolverOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly maxTokens?: number;
}

export async function generateAgendaResolver(
  context: AgendaResolverPromptContext,
  storyNpcs: readonly { readonly name: string }[],
  options: GenerateAgendaResolverOptions
): Promise<AgendaResolverResult> {
  const model = options.model ?? getStageModel('agendaResolver');
  const maxTokens = options.maxTokens ?? DEFAULT_AGENDA_RESOLVER_MAX_TOKENS;
  const messages = buildAgendaResolverPrompt(context);

  logPrompt(logger, 'agenda-resolver', messages);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'One More Branch',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: DEFAULT_AGENDA_RESOLVER_TEMPERATURE,
      max_tokens: maxTokens,
      response_format: AGENDA_RESOLVER_SCHEMA,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    logger.error(`Agenda resolver API error [${response.status}]: ${errorDetails.message}`);
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
    const finishReason = data.choices[0]?.finish_reason ?? 'unknown';
    const usage = data.usage;
    logger.warn('Agenda resolver received empty content from OpenRouter', {
      finishReason,
      usage,
      model,
      choicesLength: data.choices?.length ?? 0,
    });
    throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true, {
      finishReason,
      usage,
      model,
    });
  }

  const parsedMessage = parseMessageJsonContent(content);
  const validated = validateAgendaResolverResponse(
    parsedMessage.parsed,
    parsedMessage.rawText,
    storyNpcs
  );

  return {
    updatedAgendas: validated.updatedAgendas,
    updatedRelationships: validated.updatedRelationships,
    rawResponse: validated.rawResponse,
  };
}
