import { isStructuredOutputNotSupported } from '../../../../src/llm/schemas/error-detection';

describe('isStructuredOutputNotSupported', () => {
  describe('should return true for explicit unsupported feature errors', () => {
    it('response_format is not supported', () => {
      expect(
        isStructuredOutputNotSupported(new Error('response_format is not supported by this model'))
      ).toBe(true);
    });

    it('json_schema is not supported', () => {
      expect(isStructuredOutputNotSupported(new Error('json_schema is not supported'))).toBe(true);
    });

    it('structured output is not supported', () => {
      expect(isStructuredOutputNotSupported(new Error('structured output is not supported'))).toBe(
        true
      );
    });

    it('does not support response_format', () => {
      expect(
        isStructuredOutputNotSupported(new Error('This model does not support response_format'))
      ).toBe(true);
    });

    it('does not support json_schema', () => {
      expect(
        isStructuredOutputNotSupported(new Error('Provider does not support json_schema'))
      ).toBe(true);
    });

    it('does not support structured', () => {
      expect(
        isStructuredOutputNotSupported(new Error('This model does not support structured outputs'))
      ).toBe(true);
    });

    it('unsupported parameter: response_format', () => {
      expect(
        isStructuredOutputNotSupported(new Error('unsupported parameter: response_format'))
      ).toBe(true);
    });

    it('unsupported parameter: json_schema', () => {
      expect(isStructuredOutputNotSupported(new Error('unsupported parameter: json_schema'))).toBe(
        true
      );
    });

    it('invalid parameter: response_format', () => {
      expect(isStructuredOutputNotSupported(new Error('invalid parameter: response_format'))).toBe(
        true
      );
    });

    it('model does not support', () => {
      expect(isStructuredOutputNotSupported(new Error('model does not support this feature'))).toBe(
        true
      );
    });

    it('provider does not support', () => {
      expect(
        isStructuredOutputNotSupported(new Error('provider does not support this operation'))
      ).toBe(true);
    });
  });

  describe('should return false for validation errors (model supports feature)', () => {
    it('generic invalid schema error', () => {
      expect(isStructuredOutputNotSupported(new Error('Invalid schema format'))).toBe(false);
    });

    it('strict mode validation failed', () => {
      expect(isStructuredOutputNotSupported(new Error('Strict mode validation failed'))).toBe(
        false
      );
    });

    it('additionalProperties violation', () => {
      expect(isStructuredOutputNotSupported(new Error('additionalProperties not allowed'))).toBe(
        false
      );
    });

    it('provider returned error (generic)', () => {
      expect(
        isStructuredOutputNotSupported(new Error('Provider returned error: validation failed'))
      ).toBe(false);
    });
  });

  describe('should return false for unrelated errors', () => {
    it('network timeout', () => {
      expect(isStructuredOutputNotSupported(new Error('Network timeout while connecting'))).toBe(
        false
      );
    });

    it('rate limiting', () => {
      expect(isStructuredOutputNotSupported(new Error('Rate limit exceeded'))).toBe(false);
    });

    it('empty response', () => {
      expect(isStructuredOutputNotSupported(new Error('Empty response from API'))).toBe(false);
    });
  });

  describe('should handle edge cases', () => {
    it('null error', () => {
      expect(isStructuredOutputNotSupported(null)).toBe(false);
    });

    it('undefined error', () => {
      expect(isStructuredOutputNotSupported(undefined)).toBe(false);
    });

    it('empty string', () => {
      expect(isStructuredOutputNotSupported('')).toBe(false);
    });

    it('string errors with supported patterns', () => {
      expect(isStructuredOutputNotSupported('response_format is not supported')).toBe(true);
    });

    it('string errors without supported patterns', () => {
      expect(isStructuredOutputNotSupported('some unrelated error')).toBe(false);
    });

    it('case insensitive matching', () => {
      expect(isStructuredOutputNotSupported(new Error('RESPONSE_FORMAT IS NOT SUPPORTED'))).toBe(
        true
      );
    });
  });
});
