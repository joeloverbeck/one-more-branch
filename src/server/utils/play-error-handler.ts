import { StateReconciliationError } from '../../engine/index.js';
import { LLMError } from '../../llm/llm-client-types.js';
import { logger } from '../../logging/index.js';
import { formatLLMError } from './llm-error-formatter.js';

function extractReconciliationIssueCodes(error: StateReconciliationError): string[] {
  return [
    ...new Set(
      error.diagnostics
        .map((diagnostic) => diagnostic.code)
        .filter((code): code is string => typeof code === 'string' && code.length > 0)
    ),
  ];
}

export interface ErrorResponsePayload {
  readonly statusCode: number;
  readonly body: Record<string, unknown>;
}

export function buildBeginErrorResponse(
  error: unknown,
  progressFail: (msg: string) => void
): ErrorResponsePayload {
  if (error instanceof LLMError) {
    const formattedError = formatLLMError(error);
    progressFail(formattedError);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: formattedError,
        code: error.code,
        retryable: error.retryable,
      },
    };
  }

  const err = error instanceof Error ? error : new Error(String(error));
  progressFail(err.message);
  logger.error('Error beginning story from briefing:', { error: err.message, stack: err.stack });
  return {
    statusCode: 500,
    body: {
      success: false,
      error: err.message,
    },
  };
}

export function buildChoiceErrorResponse(
  error: unknown,
  progressFail: (msg: string) => void
): ErrorResponsePayload {
  const err = error instanceof Error ? error : new Error(String(error));

  if (error instanceof LLMError) {
    logger.error('LLM error making choice:', {
      message: error.message,
      code: error.code,
      retryable: error.retryable,
      httpStatus: error.context?.['httpStatus'],
      model: error.context?.['model'],
      parsedError: error.context?.['parsedError'],
      rawErrorBody: error.context?.['rawErrorBody'],
    });
  } else {
    logger.error('Error making choice:', { error: err.message, stack: err.stack });
  }

  let errorMessage = err.message;
  if (error instanceof LLMError) {
    errorMessage = formatLLMError(error);
  }

  if (error instanceof StateReconciliationError && error.code === 'RECONCILIATION_FAILED') {
    progressFail('Generation failed due to reconciliation issues.');
    return {
      statusCode: 500,
      body: {
        error: 'Generation failed due to reconciliation issues.',
        code: 'GENERATION_RECONCILIATION_FAILED',
        retryAttempted: true,
        reconciliationIssueCodes: extractReconciliationIssueCodes(error),
      },
    };
  }

  progressFail(errorMessage);

  const errorResponse: {
    error: string;
    code?: string;
    retryable?: boolean;
    debug?: {
      httpStatus?: number;
      model?: string;
      rawError?: string;
    };
  } = {
    error: errorMessage,
  };

  if (error instanceof LLMError) {
    errorResponse.code = error.code;
    errorResponse.retryable = error.retryable;

    if (process.env['NODE_ENV'] !== 'production') {
      errorResponse.debug = {
        httpStatus: error.context?.['httpStatus'] as number | undefined,
        model: error.context?.['model'] as string | undefined,
        rawError: error.context?.['rawErrorBody'] as string | undefined,
      };
    }
  }

  return {
    statusCode: 500,
    body: errorResponse,
  };
}
