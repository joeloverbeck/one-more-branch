import type { LLMError } from '../../llm/llm-client-types.js';
import { formatLLMError } from './llm-error-formatter.js';

export interface LlmRouteErrorDebug {
  readonly httpStatus?: number;
  readonly model?: string;
  readonly rawError?: string;
  readonly parseStage?: string;
  readonly contentShape?: string;
  readonly contentPreview?: string;
  readonly rawContent?: string;
}

export interface LlmRouteErrorJson {
  readonly success: false;
  readonly error: string;
  readonly code: string;
  readonly retryable: boolean;
  readonly debug?: LlmRouteErrorDebug;
}

interface BuildLlmRouteErrorOptions {
  readonly includeDebug?: boolean;
}

export interface LlmRouteErrorResult {
  readonly publicMessage: string;
  readonly response: LlmRouteErrorJson;
}

export function buildLlmRouteErrorResult(
  error: LLMError,
  options: BuildLlmRouteErrorOptions = {},
): LlmRouteErrorResult {
  const publicMessage = formatLLMError(error);
  const includeDebug = options.includeDebug ?? process.env['NODE_ENV'] !== 'production';
  const debugPayload: LlmRouteErrorDebug | undefined = includeDebug
    ? {
        httpStatus: error.context?.['httpStatus'] as number | undefined,
        model: error.context?.['model'] as string | undefined,
        rawError: error.context?.['rawErrorBody'] as string | undefined,
        parseStage: error.context?.['parseStage'] as string | undefined,
        contentShape: error.context?.['contentShape'] as string | undefined,
        contentPreview: error.context?.['contentPreview'] as string | undefined,
        rawContent: error.context?.['rawContent'] as string | undefined,
      }
    : undefined;

  const response: LlmRouteErrorJson = {
    success: false,
    error: publicMessage,
    code: error.code,
    retryable: error.retryable,
    ...(debugPayload ? { debug: debugPayload } : {}),
  };

  return {
    publicMessage,
    response,
  };
}
