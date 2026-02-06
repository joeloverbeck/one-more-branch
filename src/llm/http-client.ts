import { LLMError, type OpenRouterResponse } from './types.js';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
