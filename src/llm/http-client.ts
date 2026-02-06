import { LLMError, type OpenRouterResponse } from './types.js';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ErrorDetails {
  message: string;
  rawBody: string;
  parsedError?: { code?: string; message?: string };
}

export async function readJsonResponse(response: Response): Promise<OpenRouterResponse> {
  try {
    return (await response.json()) as OpenRouterResponse;
  } catch {
    throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true);
  }
}

export async function readErrorMessage(response: Response): Promise<string> {
  let errorText = '';

  try {
    errorText = await response.text();
  } catch {
    return `OpenRouter request failed with status ${response.status}`;
  }

  if (!errorText) {
    return `OpenRouter request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(errorText) as { error?: { message?: string } };
    return parsed.error?.message ?? errorText;
  } catch {
    return errorText;
  }
}

export async function readErrorDetails(response: Response): Promise<ErrorDetails> {
  let rawBody = '';

  try {
    rawBody = await response.text();
  } catch {
    return {
      message: `OpenRouter request failed with status ${response.status}`,
      rawBody: '',
    };
  }

  if (!rawBody) {
    return {
      message: `OpenRouter request failed with status ${response.status}`,
      rawBody: '',
    };
  }

  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string; code?: string } };
    const parsedError = parsed.error
      ? { message: parsed.error.message, code: parsed.error.code }
      : undefined;

    return {
      message: parsed.error?.message ?? rawBody,
      rawBody,
      parsedError,
    };
  } catch {
    return {
      message: rawBody,
      rawBody,
    };
  }
}
