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
        currentLocation: string;
        threatsAdded: string[];
        threatsRemoved: string[];
        constraintsAdded: string[];
        constraintsRemoved: string[];
        threadsAdded: string[];
        threadsResolved: string[];
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
      // Active state fields
      expect(parsed.currentLocation).toBeDefined();
      expect(parsed.threatsAdded).toBeInstanceOf(Array);
      expect(parsed.threatsRemoved).toBeInstanceOf(Array);
      expect(parsed.constraintsAdded).toBeInstanceOf(Array);
      expect(parsed.constraintsRemoved).toBeInstanceOf(Array);
      expect(parsed.threadsAdded).toBeInstanceOf(Array);
      expect(parsed.threadsResolved).toBeInstanceOf(Array);
      // Other fields
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
        currentLocation: string;
        threatsAdded: string[];
        threatsRemoved: string[];
        constraintsAdded: string[];
        constraintsRemoved: string[];
        threadsAdded: string[];
        threadsResolved: string[];
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
      // Active state fields
      expect(parsed.currentLocation).toBeDefined();
      expect(parsed.threatsAdded).toBeInstanceOf(Array);
      expect(parsed.threatsRemoved).toBeInstanceOf(Array);
      expect(parsed.constraintsAdded).toBeInstanceOf(Array);
      expect(parsed.constraintsRemoved).toBeInstanceOf(Array);
      expect(parsed.threadsAdded).toBeInstanceOf(Array);
      expect(parsed.threadsResolved).toBeInstanceOf(Array);
      // Other fields
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

  describe('active state format', () => {
    it('should not include legacy storyArc field in any assistant example', () => {
      const opening = buildFewShotMessages('opening', 'standard');
      const continuation = buildFewShotMessages('continuation', 'standard');
      const assistantMessages = [...opening, ...continuation].filter(message => message.role === 'assistant');

      for (const message of assistantMessages) {
        const parsed = JSON.parse(message.content) as Record<string, unknown>;
        expect(parsed['storyArc']).toBeUndefined();
      }
    });

    it('should not include legacy stateChangesAdded/Removed in any example', () => {
      const opening = buildFewShotMessages('opening', 'standard');
      const continuation = buildFewShotMessages('continuation', 'standard');
      const assistantMessages = [...opening, ...continuation].filter(message => message.role === 'assistant');

      for (const message of assistantMessages) {
        const parsed = JSON.parse(message.content) as Record<string, unknown>;
        expect(parsed['stateChangesAdded']).toBeUndefined();
        expect(parsed['stateChangesRemoved']).toBeUndefined();
      }
    });

    it('should use THREAT_ prefix format for threat additions', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      interface ExampleResponse {
        threatsAdded: string[];
      }

      const parsed: ExampleResponse = JSON.parse(assistantContent) as ExampleResponse;

      expect(parsed.threatsAdded.length).toBeGreaterThan(0);
      for (const threat of parsed.threatsAdded) {
        expect(threat).toMatch(/^THREAT_\w+:/);
      }
    });

    it('should use CONSTRAINT_ prefix format for constraint additions', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      interface ExampleResponse {
        constraintsAdded: string[];
      }

      const parsed: ExampleResponse = JSON.parse(assistantContent) as ExampleResponse;

      expect(parsed.constraintsAdded.length).toBeGreaterThan(0);
      for (const constraint of parsed.constraintsAdded) {
        expect(constraint).toMatch(/^CONSTRAINT_\w+:/);
      }
    });

    it('should use THREAD_ prefix format for thread additions', () => {
      const messages = buildFewShotMessages('opening', 'minimal');
      const assistantContent = messages[1]?.content ?? '';

      interface ExampleResponse {
        threadsAdded: string[];
      }

      const parsed: ExampleResponse = JSON.parse(assistantContent) as ExampleResponse;

      expect(parsed.threadsAdded.length).toBeGreaterThan(0);
      for (const thread of parsed.threadsAdded) {
        expect(thread).toMatch(/^THREAD_\w+:/);
      }
    });

    it('should use prefix-only format for removals (no colon)', () => {
      const messages = buildFewShotMessages('continuation', 'standard');
      const endingAssistantContent = messages[3]?.content ?? '';

      interface ExampleResponse {
        threatsRemoved: string[];
        constraintsRemoved: string[];
        threadsResolved: string[];
      }

      const parsed: ExampleResponse = JSON.parse(endingAssistantContent) as ExampleResponse;

      // Ending example should have removals
      expect(parsed.threatsRemoved.length).toBeGreaterThan(0);
      for (const removal of parsed.threatsRemoved) {
        expect(removal).toMatch(/^THREAT_\w+$/);
        expect(removal).not.toContain(':');
      }

      expect(parsed.constraintsRemoved.length).toBeGreaterThan(0);
      for (const removal of parsed.constraintsRemoved) {
        expect(removal).toMatch(/^CONSTRAINT_\w+$/);
        expect(removal).not.toContain(':');
      }

      expect(parsed.threadsResolved.length).toBeGreaterThan(0);
      for (const resolution of parsed.threadsResolved) {
        expect(resolution).toMatch(/^THREAD_\w+$/);
        expect(resolution).not.toContain(':');
      }
    });

    it('should include currentLocation in all examples', () => {
      const opening = buildFewShotMessages('opening', 'minimal');
      const continuation = buildFewShotMessages('continuation', 'standard');
      const assistantMessages = [...opening, ...continuation].filter(message => message.role === 'assistant');

      for (const message of assistantMessages) {
        const parsed = JSON.parse(message.content) as { currentLocation: string };
        expect(parsed.currentLocation).toBeDefined();
        expect(typeof parsed.currentLocation).toBe('string');
        expect(parsed.currentLocation.length).toBeGreaterThan(0);
      }
    });
  });
});
