/**
 * Integration tests for few-shot examples in prompt building.
 * These tests verify that:
 * 1. Opening and continuation prompts correctly include few-shot examples
 * 2. Example data is valid and compatible with schema validation
 * 3. All modes ('none', 'minimal', 'standard') work correctly
 */

import { buildOpeningPrompt } from '../../../src/llm/prompts/opening-prompt';
import { buildContinuationPrompt } from '../../../src/llm/prompts/continuation-prompt';
import { validateWriterResponse } from '../../../src/llm/schemas/writer-response-transformer';
import { buildFewShotMessages } from '../../../src/llm/examples';
import type { OpeningContext, ContinuationContext } from '../../../src/llm/context-types';

describe('Few-Shot Examples Integration', () => {
  const openingContext: OpeningContext = {
    characterConcept: 'A wandering merchant with a mysterious past',
    worldbuilding: 'A steampunk world where magic and technology coexist',
    tone: 'adventure with mystery undertones',
  };

  const continuationContext: ContinuationContext = {
    characterConcept: 'A wandering merchant with a mysterious past',
    worldbuilding: 'A steampunk world where magic and technology coexist',
    tone: 'adventure with mystery undertones',
    globalCanon: ['The city of Ironhaven is a major trading hub'],
    globalCharacterCanon: {},
    previousNarrative: 'You stand at the crossroads, considering your next move.',
    selectedChoice: 'Head toward the marketplace',
    accumulatedInventory: ['Worn leather satchel'],
    accumulatedHealth: [],
    accumulatedCharacterState: {},
    activeState: {
      currentLocation: '',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    grandparentNarrative: null,
    ancestorSummaries: [],
    accumulatedPromises: [],
  };

  describe('Opening prompt integration with few-shot examples', () => {
    it('should include examples when fewShotMode is minimal', () => {
      const messages = buildOpeningPrompt(openingContext, { fewShotMode: 'minimal' });

      // Message count: system + example_user + example_assistant + user = 4
      expect(messages).toHaveLength(4);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
      expect(messages[2]?.role).toBe('assistant');
      expect(messages[3]?.role).toBe('user');
    });

    it('should have example user containing "Create the opening scene"', () => {
      const messages = buildOpeningPrompt(openingContext, { fewShotMode: 'minimal' });

      const exampleUser = messages[1];
      expect(exampleUser?.content).toContain('Create the opening scene');
    });

    it('should have example assistant with valid JSON containing isEnding: false', () => {
      const messages = buildOpeningPrompt(openingContext, { fewShotMode: 'minimal' });

      const exampleAssistant = messages[2];
      expect(exampleAssistant?.role).toBe('assistant');

      const parsed = JSON.parse(exampleAssistant?.content ?? '{}') as { isEnding: boolean };
      expect(parsed.isEnding).toBe(false);
    });
  });

  describe('Continuation prompt integration with standard mode', () => {
    it('should include both continuation and ending examples', () => {
      const messages = buildContinuationPrompt(continuationContext, { fewShotMode: 'standard' });

      // Message count: system + 2 pairs (continuation + ending) + user = 6
      expect(messages).toHaveLength(6);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user'); // continuation example user
      expect(messages[2]?.role).toBe('assistant'); // continuation example assistant
      expect(messages[3]?.role).toBe('user'); // ending example user
      expect(messages[4]?.role).toBe('assistant'); // ending example assistant
      expect(messages[5]?.role).toBe('user'); // actual user prompt
    });

    it('should have ending example with isEnding: true and empty choices', () => {
      const messages = buildContinuationPrompt(continuationContext, { fewShotMode: 'standard' });

      const endingAssistant = messages[4];
      expect(endingAssistant?.role).toBe('assistant');

      const parsed = JSON.parse(endingAssistant?.content ?? '{}') as {
        sceneSummary: 'Test summary of the scene events and consequences.';
        isEnding: boolean;
        choices: Array<{ text: string; choiceType: string; primaryDelta: string }>;
      };
      expect(parsed.isEnding).toBe(true);
      expect(parsed.choices).toHaveLength(0);
    });
  });

  describe('No examples when mode is none', () => {
    it('should only have system + user messages for opening prompt', () => {
      const messages = buildOpeningPrompt(openingContext, { fewShotMode: 'none' });

      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });

    it('should only have system + user messages for continuation prompt', () => {
      const messages = buildContinuationPrompt(continuationContext, { fewShotMode: 'none' });

      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });

    it('should default to no examples when fewShotMode is undefined', () => {
      const messages = buildOpeningPrompt(openingContext);

      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });
  });

  describe('Example data integrity', () => {
    it('should have all required fields in opening example', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const assistantContent = messages[1]?.content ?? '{}';

      const parsed = JSON.parse(assistantContent) as Record<string, unknown>;

      // Required fields for creative-only writer output
      expect(parsed).toHaveProperty('narrative');
      expect(parsed).toHaveProperty('choices');
      expect(parsed).toHaveProperty('sceneSummary');
      expect(parsed).toHaveProperty('isEnding');
    });

    it('should have all required fields in continuation example', () => {
      const messages = buildFewShotMessages('continuation', 'minimal');
      const assistantContent = messages[1]?.content ?? '{}';

      const parsed = JSON.parse(assistantContent) as Record<string, unknown>;

      // Required fields for creative-only writer output
      expect(parsed).toHaveProperty('narrative');
      expect(parsed).toHaveProperty('choices');
      expect(parsed).toHaveProperty('sceneSummary');
      expect(parsed).toHaveProperty('isEnding');
    });

    it('should have all required fields in ending example', () => {
      const messages = buildFewShotMessages('continuation', 'standard');
      const endingAssistantContent = messages[3]?.content ?? '{}';

      const parsed = JSON.parse(endingAssistantContent) as Record<string, unknown>;

      // Required fields for creative-only writer output
      expect(parsed).toHaveProperty('narrative');
      expect(parsed).toHaveProperty('choices');
      expect(parsed).toHaveProperty('sceneSummary');
      expect(parsed).toHaveProperty('isEnding');
    });
  });

  describe('Schema validation compatibility', () => {
    it('should pass validateWriterResponse for opening example', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const assistantContent = messages[1]?.content ?? '{}';
      const parsed = JSON.parse(assistantContent) as unknown;

      // validateWriterResponse should not throw
      expect(() => validateWriterResponse(parsed, assistantContent)).not.toThrow();

      const result = validateWriterResponse(parsed, assistantContent);
      expect(result.narrative).toBeDefined();
      expect(result.choices.length).toBeGreaterThan(0);
      expect(result.isEnding).toBe(false);
    });

    it('should pass validateWriterResponse for continuation example', () => {
      const messages = buildFewShotMessages('continuation', 'minimal');
      const assistantContent = messages[1]?.content ?? '{}';
      const parsed = JSON.parse(assistantContent) as unknown;

      // validateWriterResponse should not throw
      expect(() => validateWriterResponse(parsed, assistantContent)).not.toThrow();

      const result = validateWriterResponse(parsed, assistantContent);
      expect(result.narrative).toBeDefined();
      expect(result.choices.length).toBeGreaterThan(0);
      expect(result.isEnding).toBe(false);
    });

    it('should pass validateWriterResponse for ending example', () => {
      const messages = buildFewShotMessages('continuation', 'standard');
      const endingAssistantContent = messages[3]?.content ?? '{}';
      const parsed = JSON.parse(endingAssistantContent) as unknown;

      // validateWriterResponse should not throw
      expect(() => validateWriterResponse(parsed, endingAssistantContent)).not.toThrow();

      const result = validateWriterResponse(parsed, endingAssistantContent);
      expect(result.narrative).toBeDefined();
      expect(result.choices).toHaveLength(0);
      expect(result.isEnding).toBe(true);
    });

    it('should preserve all example data through validation without data loss', () => {
      // Test all three examples
      const openingMessages = buildFewShotMessages('opening', 'minimal');
      const continuationMessages = buildFewShotMessages('continuation', 'standard');

      const examples = [
        { name: 'opening', content: openingMessages[1]?.content ?? '{}' },
        { name: 'continuation', content: continuationMessages[1]?.content ?? '{}' },
        { name: 'ending', content: continuationMessages[3]?.content ?? '{}' },
      ];

      for (const example of examples) {
        const parsed = JSON.parse(example.content) as Record<string, unknown>;
        const validated = validateWriterResponse(parsed, example.content);

        // Ensure key creative fields are preserved
        expect(validated.narrative.length).toBeGreaterThan(0);
        expect(validated.sceneSummary.length).toBeGreaterThan(0);
        expect(validated.protagonistAffect.primaryEmotion.length).toBeGreaterThan(0);
        expect('currentLocation' in (validated as Record<string, unknown>)).toBe(false);
      }
    });
  });
});
