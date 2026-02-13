import { LLMError } from '../../../../src/llm/llm-client-types';
import { formatLLMError } from '../../../../src/server/utils/llm-error-formatter';

describe('formatLLMError', () => {
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
});
