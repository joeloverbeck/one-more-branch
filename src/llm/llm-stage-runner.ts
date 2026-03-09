import { getStageModel, getStageMaxTokens, type LlmStage } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt, logResponse, type PromptType } from '../logging/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { LLMError, type ChatMessage, type JsonSchema } from './llm-client-types.js';
import { withModelFallback } from './model-fallback.js';
import { withRetry } from './retry.js';

export interface LlmStageRunnerParams<TParsed> {
  readonly stageModel: LlmStage;
  readonly promptType: PromptType;
  readonly apiKey: string;
  readonly options?: Partial<GenerationOptions>;
  readonly schema: JsonSchema;
  readonly messages: ChatMessage[];
  readonly parseResponse: (parsed: unknown) => TParsed;
  readonly allowJsonRepair?: boolean;
}

export interface LlmStageRunnerResult<TParsed> {
  readonly parsed: TParsed;
  readonly rawResponse: string;
}

interface RunTwoPhaseLlmStageParams<TFirstParsed, TSecondParsed, TResult> {
  readonly firstStage: LlmStageRunnerParams<TFirstParsed>;
  readonly secondStage: (firstStageParsed: TFirstParsed) => LlmStageRunnerParams<TSecondParsed>;
  readonly combineResult: (result: {
    firstStageParsed: TFirstParsed;
    firstStageRawResponse: string;
    secondStageParsed: TSecondParsed;
    secondStageRawResponse: string;
  }) => TResult;
}

async function fetchAndParseLlmStage<TParsed>(
  params: LlmStageRunnerParams<TParsed>,
  model: string,
  temperature: number,
  maxTokens: number,
): Promise<LlmStageRunnerResult<TParsed>> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'One More Branch',
    },
    body: JSON.stringify({
      model,
      messages: params.messages,
      temperature,
      max_tokens: maxTokens,
      response_format: params.schema,
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
  const content = extractResponseContent(data, params.stageModel, model, maxTokens);

  const parsedMessage = parseMessageJsonContent(content, {
    allowRepair: params.allowJsonRepair ?? true,
  });
  const responseText = parsedMessage.rawText;
  try {
    return {
      parsed: params.parseResponse(parsedMessage.parsed),
      rawResponse: responseText,
    };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function runLlmStage<TParsed>(
  params: LlmStageRunnerParams<TParsed>,
): Promise<LlmStageRunnerResult<TParsed>> {
  const config = getConfig().llm;
  const primaryModel = params.options?.model ?? getStageModel(params.stageModel);
  const temperature = params.options?.temperature ?? config.temperature;
  const maxTokens = params.options?.maxTokens ?? getStageMaxTokens(params.stageModel);

  logPrompt(logger, params.promptType, params.messages);

  const result = await withRetry(() =>
    withModelFallback(
      (m) => fetchAndParseLlmStage(params, m, temperature, maxTokens),
      primaryModel,
      params.stageModel,
    )
  );
  logResponse(logger, params.promptType, result.rawResponse);
  return result;
}

export async function runTwoPhaseLlmStage<TFirstParsed, TSecondParsed, TResult>(
  params: RunTwoPhaseLlmStageParams<TFirstParsed, TSecondParsed, TResult>,
): Promise<TResult> {
  const firstStageResult = await runLlmStage(params.firstStage);
  const secondStageResult = await runLlmStage(params.secondStage(firstStageResult.parsed));

  return params.combineResult({
    firstStageParsed: firstStageResult.parsed,
    firstStageRawResponse: firstStageResult.rawResponse,
    secondStageParsed: secondStageResult.parsed,
    secondStageRawResponse: secondStageResult.rawResponse,
  });
}
