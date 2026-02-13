import { buildFewShotMessages } from '../../../src/llm/examples';

function parseJsonSafely(content: string): void {
  JSON.parse(content);
}

describe('buildFewShotMessages', () => {
  describe('opening context', () => {
    it('should return 2 messages (user + assistant) for minimal mode', () => {
      const messages = buildFewShotMessages('opening', 'minimal');

      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('user');
      expect(messages[1]?.role).toBe('assistant');
    });

    it('should return 2 messages for standard mode (opening only has one example)', () => {
      const messages = buildFewShotMessages('opening', 'standard');

      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('user');
      expect(messages[1]?.role).toBe('assistant');
    });

    it('should include opening context keywords in user message', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const userContent = messages[0]?.content ?? '';

      expect(userContent).toContain('Create the opening scene');
      expect(userContent).toContain('CHARACTER CONCEPT');
    });

    it('should have valid creative-only JSON in assistant response', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      expect(() => parseJsonSafely(assistantContent)).not.toThrow();

      const parsed = JSON.parse(assistantContent) as Record<string, unknown>;
      expect(parsed['narrative']).toBeDefined();
      expect(parsed['choices']).toBeInstanceOf(Array);
      expect(parsed['protagonistAffect']).toBeDefined();
      expect(parsed['sceneSummary']).toBeDefined();
      expect(parsed['isEnding']).toBe(false);
    });
  });

  describe('continuation context', () => {
    it('should return 2 messages for minimal mode', () => {
      const messages = buildFewShotMessages('continuation', 'minimal');

      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('user');
      expect(messages[1]?.role).toBe('assistant');
    });

    it('should return 4 messages for standard mode (continuation + ending)', () => {
      const messages = buildFewShotMessages('continuation', 'standard');

      expect(messages).toHaveLength(4);
      expect(messages[0]?.role).toBe('user');
      expect(messages[1]?.role).toBe('assistant');
      expect(messages[2]?.role).toBe('user');
      expect(messages[3]?.role).toBe('assistant');
    });

    it('should include continuation context keywords in user message', () => {
      const messages = buildFewShotMessages('continuation', 'minimal');
      const userContent = messages[0]?.content ?? '';

      expect(userContent).toContain('Continue the interactive story');
      expect(userContent).toContain("PLAYER'S CHOICE");
    });

    it('should have valid creative-only JSON in assistant response', () => {
      const messages = buildFewShotMessages('continuation', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      expect(() => parseJsonSafely(assistantContent)).not.toThrow();

      const parsed = JSON.parse(assistantContent) as Record<string, unknown>;
      expect(parsed['narrative']).toBeDefined();
      expect(parsed['choices']).toBeInstanceOf(Array);
      expect(parsed['protagonistAffect']).toBeDefined();
      expect(parsed['sceneSummary']).toBeDefined();
      expect(parsed['isEnding']).toBe(false);
    });

    it('should include ending example in standard mode with isEnding: true', () => {
      const messages = buildFewShotMessages('continuation', 'standard');
      const endingAssistantContent = messages[3]?.content ?? '';

      const parsed = JSON.parse(endingAssistantContent) as {
        choices: Array<{ text: string; choiceType: string; primaryDelta: string }>;
        isEnding: boolean;
      };

      expect(parsed.isEnding).toBe(true);
      expect(parsed.choices).toHaveLength(0);
    });
  });

  describe('creative-only contract', () => {
    it('should not include deprecated storyArc field in any assistant example', () => {
      const opening = buildFewShotMessages('opening', 'standard');
      const continuation = buildFewShotMessages('continuation', 'standard');
      const assistantMessages = [...opening, ...continuation].filter(
        (message) => message.role === 'assistant'
      );

      for (const message of assistantMessages) {
        const parsed = JSON.parse(message.content) as Record<string, unknown>;
        expect(parsed['storyArc']).toBeUndefined();
      }
    });

    it('should not include deterministic state/canon fields in any assistant example', () => {
      const opening = buildFewShotMessages('opening', 'standard');
      const continuation = buildFewShotMessages('continuation', 'standard');
      const assistantMessages = [...opening, ...continuation].filter(
        (message) => message.role === 'assistant'
      );

      for (const message of assistantMessages) {
        const parsed = JSON.parse(message.content) as Record<string, unknown>;
        expect(parsed['currentLocation']).toBeUndefined();
        expect(parsed['threatsAdded']).toBeUndefined();
        expect(parsed['constraintsAdded']).toBeUndefined();
        expect(parsed['threadsAdded']).toBeUndefined();
        expect(parsed['newCanonFacts']).toBeUndefined();
        expect(parsed['newCharacterCanonFacts']).toBeUndefined();
        expect(parsed['stateChangesAdded']).toBeUndefined();
        expect(parsed['stateChangesRemoved']).toBeUndefined();
      }
    });
  });
});
