import { LLMError } from '@/llm/llm-client-types';
import { buildLlmRouteErrorResult } from '@/server/utils/llm-route-error';

describe('buildLlmRouteErrorResult', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  it('builds formatted response and debug payload in non-production mode', () => {
    process.env['NODE_ENV'] = 'test';
    const error = new LLMError('rate limited', 'HTTP_429', true, {
      httpStatus: 429,
      model: 'test-model',
      rawErrorBody: 'raw body',
      parseStage: 'message_content',
      contentShape: 'string',
      contentPreview: '{"x":1}',
      rawContent: '{"x":"bad"}',
    });

    const result = buildLlmRouteErrorResult(error);

    expect(result.publicMessage).toBe('Rate limit exceeded. Please wait a moment and try again.');
    expect(result.response).toEqual({
      success: false,
      error: 'Rate limit exceeded. Please wait a moment and try again.',
      code: 'HTTP_429',
      retryable: true,
      debug: {
        httpStatus: 429,
        model: 'test-model',
        rawError: 'raw body',
        parseStage: 'message_content',
        contentShape: 'string',
        contentPreview: '{"x":1}',
        rawContent: '{"x":"bad"}',
      },
    });
  });

  it('omits debug in production mode by default', () => {
    process.env['NODE_ENV'] = 'production';
    const error = new LLMError('rate limited', 'HTTP_429', true);

    const result = buildLlmRouteErrorResult(error);

    expect(result.response).toEqual({
      success: false,
      error: 'API error: rate limited',
      code: 'HTTP_429',
      retryable: true,
    });
  });

  it('supports explicit debug opt-out', () => {
    process.env['NODE_ENV'] = 'test';
    const error = new LLMError('rate limited', 'HTTP_429', true, { httpStatus: 429 });

    const result = buildLlmRouteErrorResult(error, { includeDebug: false });

    expect(result.response).toEqual({
      success: false,
      error: 'Rate limit exceeded. Please wait a moment and try again.',
      code: 'HTTP_429',
      retryable: true,
    });
  });
});
