import { readErrorDetails } from '../../../src/llm/http-client';

describe('http-client', () => {
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
});
