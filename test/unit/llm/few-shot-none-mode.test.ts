import { buildOpeningPrompt } from '../../../src/llm/prompts/opening-prompt';
import { buildContinuationPrompt } from '../../../src/llm/prompts/continuation-prompt';
import type { OpeningContext, ContinuationContext, PromptOptions } from '../../../src/llm/types';
import {
  OPENING_EXAMPLE_USER,
  OPENING_EXAMPLE_RESPONSE,
  CONTINUATION_EXAMPLE_USER,
  CONTINUATION_EXAMPLE_RESPONSE,
} from '../../../src/llm/examples';

describe('fewShotMode: none', () => {
  const openingContext: OpeningContext = {
    characterConcept: 'A wandering bard seeking lost songs',
    worldbuilding: 'A realm where music holds magical power',
    tone: 'Epic fantasy with lyrical undertones',
  };

  const continuationContext: ContinuationContext = {
    characterConcept: 'A wandering bard seeking lost songs',
    worldbuilding: 'A realm where music holds magical power',
    tone: 'Epic fantasy with lyrical undertones',
    previousNarrative: 'The bard strummed a chord that echoed through the ancient hall.',
    selectedChoice: 'Play the forbidden melody',
    globalCanon: [],
    globalCharacterCanon: {},
    accumulatedState: [],
    accumulatedCharacterState: {},
    accumulatedInventory: [],
    accumulatedHealth: [],
    parentProtagonistAffect: undefined,
  };

  const noneOptions: PromptOptions = {
    fewShotMode: 'none',
    enableChainOfThought: true,
    choiceGuidance: 'strict',
  };

  describe('opening prompts', () => {
    it('should return exactly 2 messages (system + user) when fewShotMode is none', () => {
      const messages = buildOpeningPrompt(openingContext, noneOptions);

      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });

    it('should not include any few-shot example content', () => {
      const messages = buildOpeningPrompt(openingContext, noneOptions);
      const allContent = messages.map(m => m.content).join('\n');

      expect(allContent).not.toContain(OPENING_EXAMPLE_USER);
      expect(allContent).not.toContain(OPENING_EXAMPLE_RESPONSE);
    });

    it('should include the actual user prompt content', () => {
      const messages = buildOpeningPrompt(openingContext, noneOptions);
      const userMessage = messages.find(m => m.role === 'user');

      expect(userMessage?.content).toContain('Create the opening scene');
      expect(userMessage?.content).toContain('A wandering bard seeking lost songs');
    });
  });

  describe('continuation prompts', () => {
    it('should return exactly 2 messages (system + user) when fewShotMode is none', () => {
      const messages = buildContinuationPrompt(continuationContext, noneOptions);

      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });

    it('should not include any few-shot example content', () => {
      const messages = buildContinuationPrompt(continuationContext, noneOptions);
      const allContent = messages.map(m => m.content).join('\n');

      expect(allContent).not.toContain(CONTINUATION_EXAMPLE_USER);
      expect(allContent).not.toContain(CONTINUATION_EXAMPLE_RESPONSE);
    });

    it('should include the actual user prompt content', () => {
      const messages = buildContinuationPrompt(continuationContext, noneOptions);
      const userMessage = messages.find(m => m.role === 'user');

      expect(userMessage?.content).toContain('Continue the interactive story');
      expect(userMessage?.content).toContain('Play the forbidden melody');
    });
  });

  describe('comparison with minimal mode', () => {
    const minimalOptions: PromptOptions = {
      fewShotMode: 'minimal',
      enableChainOfThought: true,
      choiceGuidance: 'strict',
    };

    it('opening: none mode should have fewer messages than minimal mode', () => {
      const noneMessages = buildOpeningPrompt(openingContext, noneOptions);
      const minimalMessages = buildOpeningPrompt(openingContext, minimalOptions);

      expect(noneMessages.length).toBe(2);
      expect(minimalMessages.length).toBe(4); // system + example user + example assistant + user
      expect(noneMessages.length).toBeLessThan(minimalMessages.length);
    });

    it('continuation: none mode should have fewer messages than minimal mode', () => {
      const noneMessages = buildContinuationPrompt(continuationContext, noneOptions);
      const minimalMessages = buildContinuationPrompt(continuationContext, minimalOptions);

      expect(noneMessages.length).toBe(2);
      expect(minimalMessages.length).toBe(4); // system + example user + example assistant + user
      expect(noneMessages.length).toBeLessThan(minimalMessages.length);
    });
  });
});
