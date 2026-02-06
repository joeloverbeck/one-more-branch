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

    it('should have valid JSON in assistant response', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      expect(() => parseJsonSafely(assistantContent)).not.toThrow();

      interface OpeningExample {
        narrative: string;
        choices: string[];
        isEnding: boolean;
        storyArc: string;
      }

      const parsed: OpeningExample = JSON.parse(assistantContent) as OpeningExample;

      expect(parsed.narrative).toBeDefined();
      expect(parsed.choices).toBeInstanceOf(Array);
      expect(parsed.choices.length).toBeGreaterThanOrEqual(2);
      expect(parsed.isEnding).toBe(false);
      expect(parsed.storyArc).toBeDefined();
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

    it('should have valid JSON in assistant response', () => {
      const messages = buildFewShotMessages('continuation', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      expect(() => parseJsonSafely(assistantContent)).not.toThrow();

      interface ContinuationExample {
        narrative: string;
        choices: string[];
        stateChanges: string[];
        canonFacts: string[];
        isEnding: boolean;
      }

      const parsed: ContinuationExample = JSON.parse(assistantContent) as ContinuationExample;

      expect(parsed.narrative).toBeDefined();
      expect(parsed.choices).toBeInstanceOf(Array);
      expect(parsed.stateChanges).toBeInstanceOf(Array);
      expect(parsed.canonFacts).toBeInstanceOf(Array);
      expect(parsed.isEnding).toBe(false);
    });

    it('should include ending example in standard mode with isEnding: true', () => {
      const messages = buildFewShotMessages('continuation', 'standard');
      const endingAssistantContent = messages[3]?.content ?? '';

      interface EndingExample {
        choices: string[];
        isEnding: boolean;
      }

      const parsed: EndingExample = JSON.parse(endingAssistantContent) as EndingExample;

      expect(parsed.isEnding).toBe(true);
      expect(parsed.choices).toHaveLength(0);
    });
  });
});
