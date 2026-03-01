import {
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from '../../../src/llm/http-client';
import { LLMError, type OpenRouterResponse } from '../../../src/llm/llm-client-types';

describe('http-client', () => {
  describe('parseMessageJsonContent', () => {
    it('parses JSON wrapped in markdown code fences', () => {
      const result = parseMessageJsonContent('```json\n{"ok":true}\n```');
      expect(result.parsed).toEqual({ ok: true });
    });

    it('parses content arrays with text parts', () => {
      const result = parseMessageJsonContent([{ type: 'text', text: '{"ok":true,"count":2}' }]);
      expect(result.parsed).toEqual({ ok: true, count: 2 });
    });

    it('throws INVALID_JSON with parse context for malformed content', () => {
      try {
        parseMessageJsonContent('not json at all');
        throw new Error('Expected parseMessageJsonContent to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.code).toBe('INVALID_JSON');
        expect(llmError.context?.['parseStage']).toBe('message_content');
      }
    });

    it('repairs JSON with trailing commas', () => {
      const result = parseMessageJsonContent('{"ok":true,"items":[1,2,],}');
      expect(result.parsed).toEqual({ ok: true, items: [1, 2] });
    });

    it('repairs JSON with missing closing delimiters', () => {
      const result = parseMessageJsonContent('{"ok":true,"nested":{"count":2}');
      expect(result.parsed).toEqual({ ok: true, nested: { count: 2 } });
    });

    it('does not repair malformed JSON when allowRepair is false', () => {
      expect(() =>
        parseMessageJsonContent('{"ok":true,"nested":{"count":2}', { allowRepair: false }),
      ).toThrow('Invalid JSON response from OpenRouter');
    });

    it('includes full raw content in INVALID_JSON context', () => {
      const rawContent = '{"ok": true, "narrative": "unterminated';

      try {
        parseMessageJsonContent(rawContent);
        throw new Error('Expected parseMessageJsonContent to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.context?.['rawContent']).toBe(rawContent);
      }
    });
  });

  describe('readJsonResponse', () => {
    it('throws INVALID_JSON with response-body parse context when body is not JSON', async () => {
      const response = new Response('not-json', { status: 200 });

      const error = await readJsonResponse(response).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(LLMError);
      const llmError = error as LLMError;
      expect(llmError.code).toBe('INVALID_JSON');
      expect(llmError.context?.['parseStage']).toBe('response_body');
    });
  });

  describe('readErrorDetails', () => {
    it('should parse JSON error response with error object', async () => {
      const body = JSON.stringify({
        error: { message: 'Invalid API key', code: 'invalid_api_key' },
      });
      const response = new Response(body, { status: 401 });

      const details = await readErrorDetails(response);

      expect(details.message).toBe('Invalid API key');
      expect(details.rawBody).toBe(body);
      expect(details.parsedError).toEqual({
        message: 'Invalid API key',
        code: 'invalid_api_key',
      });
    });

    it('should handle JSON response without error.message', async () => {
      const body = JSON.stringify({ error: { code: 'some_code' } });
      const response = new Response(body, { status: 400 });

      const details = await readErrorDetails(response);

      expect(details.message).toBe(body);
      expect(details.rawBody).toBe(body);
      expect(details.parsedError).toEqual({
        message: undefined,
        code: 'some_code',
      });
    });

    it('should handle JSON response without error object', async () => {
      const body = JSON.stringify({ status: 'error', reason: 'unknown' });
      const response = new Response(body, { status: 500 });

      const details = await readErrorDetails(response);

      expect(details.message).toBe(body);
      expect(details.rawBody).toBe(body);
      expect(details.parsedError).toBeUndefined();
    });

    it('should handle non-JSON error response', async () => {
      const body = 'Internal Server Error';
      const response = new Response(body, { status: 500 });

      const details = await readErrorDetails(response);

      expect(details.message).toBe(body);
      expect(details.rawBody).toBe(body);
      expect(details.parsedError).toBeUndefined();
    });

    it('should handle empty response body', async () => {
      const response = new Response('', { status: 502 });

      const details = await readErrorDetails(response);

      expect(details.message).toBe('OpenRouter request failed with status 502');
      expect(details.rawBody).toBe('');
      expect(details.parsedError).toBeUndefined();
    });

    it('should handle response.text() throwing', async () => {
      const response = {
        status: 503,
        text: jest.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as Response;

      const details = await readErrorDetails(response);

      expect(details.message).toBe('OpenRouter request failed with status 503');
      expect(details.rawBody).toBe('');
      expect(details.parsedError).toBeUndefined();
    });

    it('should extract message from OpenRouter error format', async () => {
      const body = JSON.stringify({
        error: {
          message: 'Rate limit exceeded. Please retry after 60 seconds.',
          code: 'rate_limit_exceeded',
        },
      });
      const response = new Response(body, { status: 429 });

      const details = await readErrorDetails(response);

      expect(details.message).toBe('Rate limit exceeded. Please retry after 60 seconds.');
      expect(details.parsedError?.code).toBe('rate_limit_exceeded');
    });

    it('should handle malformed JSON gracefully', async () => {
      const body = '{"error": {"message": "incomplete json';
      const response = new Response(body, { status: 400 });

      const details = await readErrorDetails(response);

      expect(details.message).toBe(body);
      expect(details.rawBody).toBe(body);
      expect(details.parsedError).toBeUndefined();
    });
  });

  describe('extractResponseContent', () => {
    function makeResponse(
      content: string | null,
      finishReason = 'stop',
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    ): OpenRouterResponse {
      return {
        id: 'test-id',
        choices: [
          {
            message: { content: content as unknown as string },
            finish_reason: finishReason,
          },
        ],
        usage,
      };
    }

    it('returns content when response is valid with stop finish_reason', () => {
      const data = makeResponse('{"ok":true}');
      const content = extractResponseContent(data, 'test-stage', 'test-model', 16384);
      expect(content).toBe('{"ok":true}');
    });

    it('throws EMPTY_RESPONSE when content is null', () => {
      const data = makeResponse(null);
      try {
        extractResponseContent(data, 'test-stage', 'test-model', 16384);
        throw new Error('Expected extractResponseContent to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.code).toBe('EMPTY_RESPONSE');
        expect(llmError.retryable).toBe(true);
        expect(llmError.context?.['stage']).toBe('test-stage');
        expect(llmError.context?.['model']).toBe('test-model');
      }
    });

    it('throws EMPTY_RESPONSE when choices array is empty', () => {
      const data: OpenRouterResponse = {
        id: 'test-id',
        choices: [],
      };
      try {
        extractResponseContent(data, 'test-stage', 'test-model', 16384);
        throw new Error('Expected extractResponseContent to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.code).toBe('EMPTY_RESPONSE');
        expect(llmError.retryable).toBe(true);
      }
    });

    it('throws non-retryable OUTPUT_TRUNCATED when finish_reason is length', () => {
      const data = makeResponse('{"partial":', 'length', {
        prompt_tokens: 3000,
        completion_tokens: 8192,
        total_tokens: 11192,
      });
      try {
        extractResponseContent(data, 'writer', 'test-model', 16384);
        throw new Error('Expected extractResponseContent to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.code).toBe('OUTPUT_TRUNCATED');
        expect(llmError.retryable).toBe(false);
        expect(llmError.context?.['stage']).toBe('writer');
        expect(llmError.context?.['model']).toBe('test-model');
        expect(llmError.context?.['maxTokens']).toBe(16384);
        expect(llmError.context?.['completionTokens']).toBe(8192);
        expect(llmError.context?.['promptTokens']).toBe(3000);
      }
    });

    it('does not throw for non-length finish_reason with valid content', () => {
      const data = makeResponse('{"ok":true}', 'error');
      const content = extractResponseContent(data, 'test-stage', 'test-model', 16384);
      expect(content).toBe('{"ok":true}');
    });

    it('throws REASONING_MODEL_ERROR when finish_reason is error with reasoning tokens and no content', () => {
      const data: OpenRouterResponse = {
        id: 'test-id',
        choices: [
          {
            message: { content: '' as unknown as string },
            finish_reason: 'error',
          },
        ],
        usage: {
          prompt_tokens: 5000,
          completion_tokens: 3433,
          total_tokens: 8433,
          completion_tokens_details: {
            reasoning_tokens: 3433,
          },
        },
      };
      try {
        extractResponseContent(data, 'promise-tracker', 'qwen/qwen3.5-397b-a17b', 16384);
        throw new Error('Expected extractResponseContent to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.code).toBe('REASONING_MODEL_ERROR');
        expect(llmError.retryable).toBe(true);
        expect(llmError.context?.['reasoningTokens']).toBe(3433);
        expect(llmError.context?.['completionTokens']).toBe(3433);
        expect(llmError.context?.['promptTokens']).toBe(5000);
        expect(llmError.context?.['model']).toBe('qwen/qwen3.5-397b-a17b');
        expect(llmError.context?.['stage']).toBe('promise-tracker');
      }
    });

    it('throws EMPTY_RESPONSE when finish_reason is error without reasoning tokens', () => {
      const data: OpenRouterResponse = {
        id: 'test-id',
        choices: [
          {
            message: { content: '' as unknown as string },
            finish_reason: 'error',
          },
        ],
        usage: {
          prompt_tokens: 5000,
          completion_tokens: 0,
          total_tokens: 5000,
        },
      };
      try {
        extractResponseContent(data, 'test-stage', 'test-model', 16384);
        throw new Error('Expected extractResponseContent to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        const llmError = error as LLMError;
        expect(llmError.code).toBe('EMPTY_RESPONSE');
      }
    });

    it('returns content normally when reasoning tokens present but content exists', () => {
      const data: OpenRouterResponse = {
        id: 'test-id',
        choices: [
          {
            message: { content: '{"ok":true}' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5000,
          completion_tokens: 3500,
          total_tokens: 8500,
          completion_tokens_details: {
            reasoning_tokens: 3000,
          },
        },
      };
      const content = extractResponseContent(data, 'test-stage', 'test-model', 16384);
      expect(content).toBe('{"ok":true}');
    });
  });
});
