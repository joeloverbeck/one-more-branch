import { LLMError } from '@/llm/types';
import { logger } from '@/logging';
import { logLLMError, validateStoryInput } from '@/server/services/story-creation-service';

describe('story-creation-service', () => {
  describe('validateStoryInput', () => {
    it('returns valid result with trimmed values for valid input', () => {
      const result = validateStoryInput({
        title: '  My Story  ',
        characterConcept: '  A brave adventurer seeking fortune  ',
        worldbuilding: '  A medieval fantasy world  ',
        tone: '  Epic  ',
        apiKey: '  sk-valid-api-key-12345  ',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed).toEqual({
          title: 'My Story',
          characterConcept: 'A brave adventurer seeking fortune',
          worldbuilding: 'A medieval fantasy world',
          tone: 'Epic',
          apiKey: 'sk-valid-api-key-12345',
        });
      }
    });

    it('returns error for missing title', () => {
      const result = validateStoryInput({
        characterConcept: 'A brave adventurer',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Story title is required');
      }
    });

    it('returns error for empty title after trim', () => {
      const result = validateStoryInput({
        title: '   ',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Story title is required');
      }
    });

    it('returns error for missing character concept', () => {
      const result = validateStoryInput({
        title: 'My Story',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Character concept must be at least 10 characters');
      }
    });

    it('returns error for short character concept after trim', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: '   short   ',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Character concept must be at least 10 characters');
      }
    });

    it('returns error for missing API key', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('OpenRouter API key is required');
      }
    });

    it('returns error for short API key after trim', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: '   short   ',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('OpenRouter API key is required');
      }
    });

    it('accepts optional worldbuilding and tone as undefined', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.worldbuilding).toBeUndefined();
        expect(result.trimmed.tone).toBeUndefined();
      }
    });

    it('trims optional worldbuilding and tone when provided', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        worldbuilding: '  Fantasy realm  ',
        tone: '  Dark  ',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.worldbuilding).toBe('Fantasy realm');
        expect(result.trimmed.tone).toBe('Dark');
      }
    });

    it('accepts optional npcs and startingSituation as undefined', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.npcs).toBeUndefined();
        expect(result.trimmed.startingSituation).toBeUndefined();
      }
    });

    it('trims npcs and startingSituation when provided', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        npcs: '  Gandalf the wizard  ',
        startingSituation: '  In a dark tavern  ',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.npcs).toBe('Gandalf the wizard');
        expect(result.trimmed.startingSituation).toBe('In a dark tavern');
      }
    });

    it('validates in correct priority order: title, characterConcept, apiKey', () => {
      // All invalid - should fail on title first
      let result = validateStoryInput({});
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Story title is required');
      }

      // Title valid, rest invalid - should fail on characterConcept
      result = validateStoryInput({ title: 'Valid' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Character concept must be at least 10 characters');
      }

      // Title and characterConcept valid - should fail on apiKey
      result = validateStoryInput({
        title: 'Valid',
        characterConcept: 'Long enough concept',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('OpenRouter API key is required');
      }
    });
  });

  describe('logLLMError', () => {
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('logs error with all context fields', () => {
      const error = new LLMError('API failed', 'HTTP_500', true, {
        httpStatus: 500,
        model: 'anthropic/claude-sonnet-4.5',
        parsedError: { message: 'Internal error' },
        rawErrorBody: '{"error":"Internal error"}',
      });

      logLLMError(error, 'creating story');

      expect(loggerErrorSpy).toHaveBeenCalledWith('LLM error creating story:', {
        message: 'API failed',
        code: 'HTTP_500',
        retryable: true,
        httpStatus: 500,
        model: 'anthropic/claude-sonnet-4.5',
        parsedError: { message: 'Internal error' },
        rawErrorBody: '{"error":"Internal error"}',
      });
    });

    it('logs error with undefined context fields when not provided', () => {
      const error = new LLMError('Parse failed', 'PARSE_ERROR', false);

      logLLMError(error, 'parsing response');

      expect(loggerErrorSpy).toHaveBeenCalledWith('LLM error parsing response:', {
        message: 'Parse failed',
        code: 'PARSE_ERROR',
        retryable: false,
        httpStatus: undefined,
        model: undefined,
        parsedError: undefined,
        rawErrorBody: undefined,
      });
    });
  });
});
