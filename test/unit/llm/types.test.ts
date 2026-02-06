import type {
  ContinuationContext,
  GenerationOptions,
  GenerationResult,
  OpeningContext,
} from '../../../src/llm/types';
import { LLMError } from '../../../src/llm/types';

describe('LLM types', () => {
  describe('LLMError', () => {
    it('should create LLMError with message, code, and retryable flag', () => {
      const error = new LLMError('rate limited', 'RATE_LIMITED', true);

      expect(error.message).toBe('rate limited');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.retryable).toBe(true);
    });

    it('should default retryable to false', () => {
      const error = new LLMError('invalid response', 'INVALID_RESPONSE');

      expect(error.retryable).toBe(false);
    });

    it('should have name property set to LLMError', () => {
      const error = new LLMError('failure', 'UNKNOWN');

      expect(error.name).toBe('LLMError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should accept optional context parameter', () => {
      const context = { rawResponse: 'some LLM response', tokenCount: 500 };
      const error = new LLMError('parsing failed', 'PARSE_ERROR', true, context);

      expect(error.context).toEqual(context);
    });

    it('should default context to undefined when not provided', () => {
      const error = new LLMError('parsing failed', 'PARSE_ERROR', true);

      expect(error.context).toBeUndefined();
    });
  });

  describe('type compatibility (compile-time)', () => {
    it('should allow creating GenerationResult with all required fields', () => {
      const result: GenerationResult = {
        narrative: 'You arrive at a crossroads.',
        choices: ['Take the left path', 'Take the right path'],
        stateChangesAdded: ['learned-map'],
        stateChangesRemoved: [],
        newCanonFacts: ['The forest has two exits.'],
        isEnding: false,
        rawResponse: '{"narrative":"You arrive at a crossroads."}',
      };

      expect(result.isEnding).toBe(false);
      expect(result.choices).toHaveLength(2);
    });

    it('should allow creating GenerationOptions with only apiKey', () => {
      const options: GenerationOptions = {
        apiKey: 'test-key',
      };

      expect(options.apiKey).toBe('test-key');
      expect(options.model).toBeUndefined();
    });

    it('should allow creating OpeningContext with all fields', () => {
      const context: OpeningContext = {
        characterConcept: 'A disgraced knight seeking redemption',
        worldbuilding: 'A storm-battered frontier kingdom',
        tone: 'grim but hopeful',
      };

      expect(context.characterConcept).toContain('knight');
    });

    it('should allow creating ContinuationContext with all fields', () => {
      const context: ContinuationContext = {
        characterConcept: 'A disgraced knight seeking redemption',
        worldbuilding: 'A storm-battered frontier kingdom',
        tone: 'grim but hopeful',
        globalCanon: ['The kingdom is under siege.'],
        storyArc: 'Recover the shattered crown',
        previousNarrative: 'You survived the ambush at dusk.',
        selectedChoice: 'Track the raiders into the marsh',
        accumulatedState: ['wounded-shoulder'],
      };

      expect(context.globalCanon[0]).toContain('siege');
      expect(context.accumulatedState[0]).toBe('wounded-shoulder');
    });
  });
});
