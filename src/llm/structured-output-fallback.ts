import { LLMError, type JsonSchema } from './llm-client-types.js';

const GRAMMAR_TOO_LARGE_SIGNAL_PHRASES = [
  'compiled grammar is too large',
  'reduce the number of strict tools',
] as const;

export function isGrammarTooLargeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const rawErrorBody =
    error instanceof LLMError && typeof error.context?.['rawErrorBody'] === 'string'
      ? error.context['rawErrorBody']
      : '';

  const combined = `${message}\n${rawErrorBody}`.toLowerCase();
  return GRAMMAR_TOO_LARGE_SIGNAL_PHRASES.some((phrase) => combined.includes(phrase));
}

export function buildLenientSchema(schema: JsonSchema): JsonSchema {
  return {
    ...schema,
    json_schema: {
      ...schema.json_schema,
      strict: false,
    },
  };
}

export async function withGrammarFallback<T>(
  attempt: () => Promise<T>,
  retryWithLenient: () => Promise<T>
): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (isGrammarTooLargeError(error)) {
      return retryWithLenient();
    }

    throw error;
  }
}
