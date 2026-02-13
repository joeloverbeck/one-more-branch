/**
 * Determines if an error indicates that the model does not support structured outputs.
 * This function is intentionally conservative - it only triggers the fallback for errors
 * that specifically indicate the model/provider cannot handle response_format or json_schema.
 *
 * Validation errors (e.g., schema violations) should NOT trigger the fallback, as they
 * indicate the model supports structured output but the response failed validation.
 */
export function isStructuredOutputNotSupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();

  // Specific patterns that indicate lack of structured output support
  const unsupportedPatterns = [
    // Model explicitly doesn't support the feature
    'response_format is not supported',
    'json_schema is not supported',
    'structured output is not supported',
    'does not support response_format',
    'does not support json_schema',
    'does not support structured',
    // Provider-specific errors indicating feature unavailability
    'unsupported parameter: response_format',
    'unsupported parameter: json_schema',
    'invalid parameter: response_format',
    // OpenRouter specific
    'model does not support',
    'provider does not support',
  ];

  return unsupportedPatterns.some((pattern) => normalized.includes(pattern));
}
