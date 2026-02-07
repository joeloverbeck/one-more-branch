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
        healthAdded: string[];
        healthRemoved: string[];
        characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
        characterStateChangesRemoved: Array<{ characterName: string; states: string[] }>;
        isEnding: boolean;
        beatConcluded: boolean;
        beatResolution: string;
        storyArc?: string;
      }

      const parsed: OpeningExample = JSON.parse(assistantContent) as OpeningExample;

      expect(parsed.narrative).toBeDefined();
      expect(parsed.choices).toBeInstanceOf(Array);
      expect(parsed.choices.length).toBeGreaterThanOrEqual(2);
      expect(parsed.healthAdded).toBeInstanceOf(Array);
      expect(parsed.healthRemoved).toBeInstanceOf(Array);
      expect(parsed.characterStateChangesAdded).toBeInstanceOf(Array);
      expect(parsed.characterStateChangesRemoved).toBeInstanceOf(Array);
      expect(parsed.isEnding).toBe(false);
      expect(parsed.beatConcluded).toBe(false);
      expect(parsed.beatResolution).toBe('');
      expect(parsed.storyArc).toBeUndefined();
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
        stateChangesAdded: string[];
        stateChangesRemoved: string[];
        newCanonFacts: string[];
        healthAdded: string[];
        healthRemoved: string[];
        characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
        characterStateChangesRemoved: Array<{ characterName: string; states: string[] }>;
        isEnding: boolean;
        beatConcluded: boolean;
        beatResolution: string;
        storyArc?: string;
      }

      const parsed: ContinuationExample = JSON.parse(assistantContent) as ContinuationExample;

      expect(parsed.narrative).toBeDefined();
      expect(parsed.choices).toBeInstanceOf(Array);
      expect(parsed.stateChangesAdded).toBeInstanceOf(Array);
      expect(parsed.stateChangesRemoved).toBeInstanceOf(Array);
      expect(parsed.newCanonFacts).toBeInstanceOf(Array);
      expect(parsed.healthAdded).toBeInstanceOf(Array);
      expect(parsed.healthRemoved).toBeInstanceOf(Array);
      expect(parsed.characterStateChangesAdded).toBeInstanceOf(Array);
      expect(parsed.characterStateChangesRemoved).toBeInstanceOf(Array);
      expect(parsed.isEnding).toBe(false);
      expect(parsed.beatConcluded).toBe(false);
      expect(parsed.beatResolution).toBe('');
      expect(parsed.storyArc).toBeUndefined();
    });

    it('should include ending example in standard mode with isEnding: true', () => {
      const messages = buildFewShotMessages('continuation', 'standard');
      const endingAssistantContent = messages[3]?.content ?? '';

      interface EndingExample {
        choices: string[];
        isEnding: boolean;
        beatConcluded: boolean;
        beatResolution: string;
      }

      const parsed: EndingExample = JSON.parse(endingAssistantContent) as EndingExample;

      expect(parsed.isEnding).toBe(true);
      expect(parsed.choices).toHaveLength(0);
      expect(parsed.beatConcluded).toBe(true);
      expect(parsed.beatResolution.length).toBeGreaterThan(0);
    });
  });

  describe('state change format', () => {
    it('should not include legacy storyArc field in any assistant example', () => {
      const opening = buildFewShotMessages('opening', 'standard');
      const continuation = buildFewShotMessages('continuation', 'standard');
      const assistantMessages = [...opening, ...continuation].filter(message => message.role === 'assistant');

      for (const message of assistantMessages) {
        const parsed = JSON.parse(message.content) as Record<string, unknown>;
        expect(parsed['storyArc']).toBeUndefined();
      }
    });

    it('should use second person "You" in opening example state changes', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      interface ExampleResponse {
        stateChangesAdded: string[];
      }

      const parsed: ExampleResponse = JSON.parse(assistantContent) as ExampleResponse;

      expect(parsed.stateChangesAdded.length).toBeGreaterThan(0);
      for (const stateChange of parsed.stateChangesAdded) {
        expect(stateChange).toMatch(/^You /);
      }
    });

    it('should use second person "You" in continuation example state changes', () => {
      const messages = buildFewShotMessages('continuation', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      interface ExampleResponse {
        stateChangesAdded: string[];
      }

      const parsed: ExampleResponse = JSON.parse(assistantContent) as ExampleResponse;

      expect(parsed.stateChangesAdded.length).toBeGreaterThan(0);
      for (const stateChange of parsed.stateChangesAdded) {
        expect(stateChange).toMatch(/^You /);
      }
    });

    it('should use second person "You" in ending example state changes', () => {
      const messages = buildFewShotMessages('continuation', 'standard');
      const endingAssistantContent = messages[3]?.content ?? '';

      interface ExampleResponse {
        stateChangesAdded: string[];
      }

      const parsed: ExampleResponse = JSON.parse(endingAssistantContent) as ExampleResponse;

      expect(parsed.stateChangesAdded.length).toBeGreaterThan(0);
      for (const stateChange of parsed.stateChangesAdded) {
        expect(stateChange).toMatch(/^You /);
      }
    });
  });
});
