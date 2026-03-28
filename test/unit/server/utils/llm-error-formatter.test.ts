import { LLMError } from '../../../../src/llm/llm-client-types';
import { formatLLMError } from '../../../../src/server/utils/llm-error-formatter';

describe('formatLLMError', () => {
  it('formats OUTPUT_TRUNCATED with stage name', () => {
    const error = new LLMError(
      'Model output truncated before completion',
      'OUTPUT_TRUNCATED',
      false,
      {
        stage: 'conceptSeeder',
        model: 'qwen/qwen3.5-397b-a17b',
      }
    );

    expect(formatLLMError(error)).toBe(
      'Model output was too large to complete during conceptSeeder. Try a different model or reduce input complexity.'
    );
  });

  it('formats OUTPUT_TRUNCATED without stage name', () => {
    const error = new LLMError(
      'Model output truncated before completion',
      'OUTPUT_TRUNCATED',
      false,
      {
        model: 'qwen/qwen3.5-397b-a17b',
      }
    );

    expect(formatLLMError(error)).toBe(
      'Model output was too large to complete. Try a different model or reduce input complexity.'
    );
  });

  it('formats INVALID_JSON from response body with a specific message', () => {
    const error = new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
      parseStage: 'response_body',
    });

    expect(formatLLMError(error)).toBe(
      'API error: OpenRouter returned a non-JSON HTTP response. Please try again.'
    );
  });

  it('formats INVALID_JSON from message content with shape hint', () => {
    const error = new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
      parseStage: 'message_content',
      contentShape: 'array',
    });

    expect(formatLLMError(error)).toBe(
      'API error: Model returned malformed JSON content (array). Please retry.'
    );
  });

  it('formats 400 with vague provider message by including model and raw body detail', () => {
    const error = new LLMError('Provider returned error', 'HTTP_400', false, {
      httpStatus: 400,
      model: 'anthropic/claude-sonnet-4.5',
      rawErrorBody: JSON.stringify({
        error: {
          message: 'Provider returned error',
          metadata: { raw: 'Input too long for model context window' },
        },
      }),
      parsedError: { message: 'Provider returned error' },
    });

    const result = formatLLMError(error);
    expect(result).toContain('anthropic/claude-sonnet-4.5');
    expect(result).not.toBe('API request error: Provider returned error');
  });

  it('formats 400 with vague provider message and no raw body detail by including model', () => {
    const error = new LLMError('Provider returned error', 'HTTP_400', false, {
      httpStatus: 400,
      model: 'anthropic/claude-sonnet-4.5',
      rawErrorBody: JSON.stringify({ error: { message: 'Provider returned error' } }),
      parsedError: { message: 'Provider returned error' },
    });

    const result = formatLLMError(error);
    expect(result).toContain('anthropic/claude-sonnet-4.5');
    expect(result).toContain('Provider returned error');
  });

  it('formats 400 with distinct provider message as before', () => {
    const error = new LLMError('Provider returned error', 'HTTP_400', false, {
      httpStatus: 400,
      model: 'anthropic/claude-sonnet-4.5',
      parsedError: { message: 'Input exceeds context length of 200000 tokens' },
    });

    expect(formatLLMError(error)).toBe(
      'API request error: Input exceeds context length of 200000 tokens'
    );
  });

  it('formats 400 with raw body metadata when provider message is vague', () => {
    const rawBody = JSON.stringify({
      error: {
        message: 'Provider returned error',
        metadata: { raw: 'context_length_exceeded: max 200000 tokens' },
      },
    });
    const error = new LLMError('Provider returned error', 'HTTP_400', false, {
      httpStatus: 400,
      model: 'openai/gpt-4o',
      rawErrorBody: rawBody,
      parsedError: { message: 'Provider returned error' },
    });

    const result = formatLLMError(error);
    expect(result).toContain('context_length_exceeded');
  });
});
