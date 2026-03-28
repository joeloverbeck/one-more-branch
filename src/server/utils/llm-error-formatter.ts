import type { LLMError } from '../../llm/llm-client-types.js';

function extractRawBodyDetail(rawErrorBody: string | undefined): string | null {
  if (!rawErrorBody || rawErrorBody.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawErrorBody) as {
      error?: {
        message?: string;
        metadata?: { raw?: string; provider_error?: string };
      };
    };
    const metadata = parsed.error?.metadata;
    if (typeof metadata?.raw === 'string' && metadata.raw.length > 0) {
      return metadata.raw.length <= 300 ? metadata.raw : `${metadata.raw.slice(0, 300)}...`;
    }
    if (typeof metadata?.provider_error === 'string' && metadata.provider_error.length > 0) {
      return metadata.provider_error.length <= 300
        ? metadata.provider_error
        : `${metadata.provider_error.slice(0, 300)}...`;
    }
  } catch {
    // Not parseable JSON, ignore.
  }

  return null;
}

/**
 * Formats an LLMError into a user-friendly message based on HTTP status and context.
 * Handles common API errors like auth failures, rate limits, and service unavailability.
 */
export function formatLLMError(error: LLMError): string {
  const httpStatus = error.context?.['httpStatus'] as number | undefined;
  const parsedError = error.context?.['parsedError'] as
    | { message?: string; code?: string }
    | undefined;
  const rawErrorBody = error.context?.['rawErrorBody'] as string | undefined;
  const parseStage = error.context?.['parseStage'] as string | undefined;
  const contentShape = error.context?.['contentShape'] as string | undefined;
  const model = error.context?.['model'] as string | undefined;

  // Extract provider-specific error message if available
  const providerMessage = parsedError?.message ?? '';

  if (httpStatus === 401) {
    return 'Invalid API key. Please check your OpenRouter API key.';
  }
  if (httpStatus === 402) {
    return 'Insufficient credits. Please add credits to your OpenRouter account.';
  }
  if (httpStatus === 429) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }
  if (httpStatus === 400) {
    // Check for schema validation errors that indicate internal configuration issues
    if (
      error.message.includes('additionalProperties') ||
      error.message.includes('schema') ||
      error.message.includes('output_format')
    ) {
      return 'Story generation failed due to a configuration error. Please try again or report this issue.';
    }
    // Include provider message for 400 errors if available and distinct
    if (providerMessage && providerMessage !== error.message) {
      return `API request error: ${providerMessage}`;
    }
    // When providerMessage is vague (e.g. "Provider returned error"), try to extract
    // more detail from the raw error body (OpenRouter often includes metadata.raw)
    const rawDetail = extractRawBodyDetail(rawErrorBody);
    if (rawDetail) {
      const modelLabel = model ? ` (model: ${model})` : '';
      return `API request error${modelLabel}: ${rawDetail}`;
    }
    // Fall back to including model name for actionable context
    if (model) {
      return `API request error (model: ${model}): ${error.message}`;
    }
    return `API request error: ${error.message}`;
  }
  if (httpStatus === 403) {
    return `Access denied: ${providerMessage || error.message}`;
  }
  if (httpStatus === 404) {
    return `Model not found: ${providerMessage || error.message}`;
  }
  if (httpStatus && httpStatus >= 500) {
    return 'OpenRouter service is temporarily unavailable. Please try again later.';
  }

  if (error.code === 'OUTPUT_TRUNCATED') {
    const stage = error.context?.['stage'] as string | undefined;
    const stageLabel = stage ? ` during ${stage}` : '';
    return `Model output was too large to complete${stageLabel}. Try a different model or reduce input complexity.`;
  }

  if (error.code === 'INVALID_JSON') {
    if (parseStage === 'response_body') {
      return 'API error: OpenRouter returned a non-JSON HTTP response. Please try again.';
    }
    if (parseStage === 'message_content') {
      return `API error: Model returned malformed JSON content${contentShape ? ` (${contentShape})` : ''}. Please retry.`;
    }
  }

  // Handle network errors (no httpStatus) - timeouts, DNS failures, etc.
  if (httpStatus === undefined) {
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return 'Request timed out. The AI service may be overloaded. Please try again.';
    }
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return 'Could not connect to AI service. Please check your internet connection.';
    }
    // Include provider message if available for clearer context
    if (providerMessage) {
      return `AI service error: ${providerMessage}`;
    }
  }

  // Final fallback: include raw error body if it's short and informative
  if (rawErrorBody && rawErrorBody.length < 200 && rawErrorBody.length > 0) {
    // Try to extract a meaningful message from the raw body
    try {
      const parsed = JSON.parse(rawErrorBody) as { error?: { message?: string } };
      if (typeof parsed.error?.message === 'string') {
        return `API error: ${parsed.error.message}`;
      }
    } catch {
      // Not JSON, use as-is if it doesn't look like HTML
      if (!rawErrorBody.includes('<html') && !rawErrorBody.includes('<!DOCTYPE')) {
        return `API error: ${rawErrorBody}`;
      }
    }
  }

  // Last resort: use the error message but make it clearer it's from the provider
  if (providerMessage) {
    return `Provider error: ${providerMessage}`;
  }

  return `API error: ${error.message}`;
}
