import { getStageModel, type LlmStage } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt, type PromptType } from '../logging/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { LLMError, type ChatMessage, type JsonSchema } from './llm-client-types.js';
import { withRetry } from './retry.js';

interface ConceptStageRunnerParams<TParsed> {
  readonly stageModel: LlmStage;
  readonly promptType: PromptType;
  readonly apiKey: string;
  readonly options?: Partial<GenerationOptions>;
  readonly schema: JsonSchema;
  readonly messages: ChatMessage[];
  readonly parseResponse: (parsed: unknown) => TParsed;
}

interface ConceptStageRunnerResult<TParsed> {
  readonly parsed: TParsed;
  readonly rawResponse: string;
}

export async function runConceptStage<TParsed>(
  params: ConceptStageRunnerParams<TParsed>,
): Promise<ConceptStageRunnerResult<TParsed>> {
  const config = getConfig().llm;
  const model = params.options?.model ?? getStageModel(params.stageModel);
  const temperature = params.options?.temperature ?? config.temperature;
  const maxTokens = params.options?.maxTokens ?? config.maxTokens;

  logPrompt(logger, params.promptType, params.messages);

  return withRetry(async () => {
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
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true);
    }

    const parsedMessage = parseMessageJsonContent(content);
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
  });
}
