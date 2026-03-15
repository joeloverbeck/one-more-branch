import { LLMError } from '@/llm/llm-client-types';
import { logger } from '@/logging';
import { StoryKernel } from '@/models/story-kernel';
import { logLLMError, validateStoryInput } from '@/server/services/story-creation-service';
import { createConceptSpecFixture } from '../../../fixtures/concept-generator';

const VALID_KERNEL: StoryKernel = {
  dramaticThesis: 'Power corrupts',
  antithesis: 'Power enables justice',
  valueAtStake: 'Moral integrity',
  opposingForce: 'Ambition',
  directionOfChange: 'NEGATIVE',
  conflictAxis: 'POWER_VS_MORALITY',
  dramaticStance: 'TRAGIC',
  thematicQuestion: 'Can one wield power without losing oneself?',
  valueSpectrum: {
    positive: 'Integrity',
    contrary: 'Pragmatism',
    contradictory: 'Corruption',
    negationOfNegation: 'Tyranny',
  },
  moralArgument: 'Absolute power corrupts absolutely',
};

describe('story-creation-service', () => {
  describe('validateStoryInput', () => {
    it('returns valid result with trimmed values for valid input', () => {
      const result = validateStoryInput({
        title: '  My Story  ',
        characterConcept: '  A brave adventurer seeking fortune  ',
        worldbuilding: '  A medieval fantasy world  ',
        tone: '  Epic  ',
        apiKey: '  sk-valid-api-key-12345  ',
        storyKernel: VALID_KERNEL,
        protagonistCharacterId: 'char-1',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed).toEqual({
          title: 'My Story',
          characterConcept: 'A brave adventurer seeking fortune',
          worldbuilding: 'A medieval fantasy world',
          tone: 'Epic',
          apiKey: 'sk-valid-api-key-12345',
          storyKernel: VALID_KERNEL,
          protagonistCharacterId: 'char-1',
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

    it('returns error for missing protagonistCharacterId', () => {
      const result = validateStoryInput({
        title: 'My Story',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Protagonist character selection is required');
      }
    });

    it('returns error for empty protagonistCharacterId after trim', () => {
      const result = validateStoryInput({
        title: 'My Story',
        protagonistCharacterId: '   ',
        apiKey: 'sk-valid-api-key-12345',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Protagonist character selection is required');
      }
    });

    it('returns error for missing API key', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        protagonistCharacterId: 'char-1',
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
        protagonistCharacterId: 'char-1',
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
        storyKernel: VALID_KERNEL,
        protagonistCharacterId: 'char-1',
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
        storyKernel: VALID_KERNEL,
        protagonistCharacterId: 'char-1',
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
        storyKernel: VALID_KERNEL,
        protagonistCharacterId: 'char-1',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.npcs).toBeUndefined();
        expect(result.trimmed.startingSituation).toBeUndefined();
      }
    });

    it('trims and filters npcs when provided', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        startingSituation: '  In a dark tavern  ',
        apiKey: 'sk-valid-api-key-12345',
        storyKernel: VALID_KERNEL,
        protagonistCharacterId: 'char-1',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.startingSituation).toBe('In a dark tavern');
      }
    });

    it('accepts valid conceptSpec payload', () => {
      const conceptSpec = createConceptSpecFixture(1);

      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: 'sk-valid-api-key-12345',
        storyKernel: VALID_KERNEL,
        protagonistCharacterId: 'char-1',
        conceptSpec,
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.conceptSpec).toEqual(conceptSpec);
      }
    });

    it('gracefully drops invalid conceptSpec payload instead of rejecting', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: 'sk-valid-api-key-12345',
        storyKernel: VALID_KERNEL,
        protagonistCharacterId: 'char-1',
        conceptSpec: {
          oneLineHook: 'Only one field',
        },
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.conceptSpec).toBeUndefined();
      }
    });

    it('gracefully drops partial conceptSpec with empty string fields', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: 'sk-valid-api-key-12345',
        storyKernel: VALID_KERNEL,
        protagonistCharacterId: 'char-1',
        conceptSpec: {
          oneLineHook: 'A hook',
          coreConflictLoop: '',
          conflictAxis: '',
        },
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.trimmed.conceptSpec).toBeUndefined();
      }
    });

    it('returns error when storyKernel is missing', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: 'sk-valid-api-key-12345',
        protagonistCharacterId: 'char-1',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('A story kernel is required');
      }
    });

    it('returns error when storyKernel is invalid', () => {
      const result = validateStoryInput({
        title: 'My Story',
        characterConcept: 'A brave adventurer seeking fortune',
        apiKey: 'sk-valid-api-key-12345',
        protagonistCharacterId: 'char-1',
        storyKernel: { dramaticThesis: 'incomplete' },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('A story kernel is required');
      }
    });

    it('validates in correct priority order: title, protagonistCharacterId, apiKey, storyKernel', () => {
      // All invalid - should fail on title first
      let result = validateStoryInput({});
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Story title is required');
      }

      // Title valid, rest invalid - should fail on protagonistCharacterId
      result = validateStoryInput({ title: 'Valid' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Protagonist character selection is required');
      }

      // Title and protagonistCharacterId valid - should fail on apiKey
      result = validateStoryInput({
        title: 'Valid',
        protagonistCharacterId: 'char-1',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('OpenRouter API key is required');
      }

      // Title, protagonistCharacterId, apiKey valid - should fail on storyKernel
      result = validateStoryInput({
        title: 'Valid',
        protagonistCharacterId: 'char-1',
        apiKey: 'sk-valid-api-key-12345',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('A story kernel is required');
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
