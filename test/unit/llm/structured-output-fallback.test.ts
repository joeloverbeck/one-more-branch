import {
  buildLenientSchema,
  isGrammarTooLargeError,
  withGrammarFallback,
} from '../../../src/llm/structured-output-fallback';
import { LLMError, type JsonSchema } from '../../../src/llm/llm-client-types';

const STRICT_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'example_schema',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        foo: { type: 'string' },
      },
      required: ['foo'],
    },
  },
};

describe('structured-output-fallback', () => {
  it('detects compiled grammar too large errors from the error message', () => {
    expect(
      isGrammarTooLargeError(
        new Error(
          'The compiled grammar is too large, which would cause performance issues.'
        )
      )
    ).toBe(true);
  });

  it('detects reduce-the-number-of-strict-tools errors from LLMError rawErrorBody', () => {
    expect(
      isGrammarTooLargeError(
        new LLMError('Provider returned error', 'HTTP_400', false, {
          rawErrorBody:
            'Simplify your tool schemas or reduce the number of strict tools before retrying.',
        })
      )
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isGrammarTooLargeError(new Error('socket hang up'))).toBe(false);
  });

  it('builds a lenient schema without changing the rest of the schema', () => {
    expect(buildLenientSchema(STRICT_SCHEMA)).toEqual({
      ...STRICT_SCHEMA,
      json_schema: {
        ...STRICT_SCHEMA.json_schema,
        strict: false,
      },
    });
  });

  it('retries once when the grammar is too large', async () => {
    const attempt = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('The compiled grammar is too large'))
      .mockResolvedValueOnce('strict');
    const retryWithLenient = jest.fn<Promise<string>, []>().mockResolvedValue('lenient');

    const result = await withGrammarFallback(attempt, retryWithLenient);

    expect(result).toBe('lenient');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(retryWithLenient).toHaveBeenCalledTimes(1);
  });

  it('rethrows unrelated errors without retrying', async () => {
    const error = new Error('timeout');
    const attempt = jest.fn<Promise<string>, []>().mockRejectedValue(error);
    const retryWithLenient = jest.fn<Promise<string>, []>().mockResolvedValue('lenient');

    await expect(withGrammarFallback(attempt, retryWithLenient)).rejects.toBe(error);
    expect(retryWithLenient).not.toHaveBeenCalled();
  });
});
