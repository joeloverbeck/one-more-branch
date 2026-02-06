import {
  CONTENT_POLICY,
  GenerationResultSchema,
  LLMError,
  STORY_GENERATION_SCHEMA,
  buildContinuationPrompt,
  buildOpeningPrompt,
  generateContinuationPage,
  generateOpeningPage,
  isStructuredOutputNotSupported,
  parseTextResponse,
  validateApiKey,
  validateGenerationResponse,
} from '../../../src/llm/index';
import * as llm from '../../../src/llm/index';
import type {
  ChatMessage,
  ContinuationContext,
  GenerationOptions,
  GenerationResult,
  JsonSchema,
  OpeningContext,
} from '../../../src/llm/index';

describe('llm barrel exports', () => {
  it('should export runtime symbols', () => {
    expect(typeof LLMError).toBe('function');
    expect(typeof CONTENT_POLICY).toBe('string');
    expect(STORY_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(typeof GenerationResultSchema.safeParse).toBe('function');
    expect(typeof validateGenerationResponse).toBe('function');
    expect(typeof isStructuredOutputNotSupported).toBe('function');
    expect(typeof buildOpeningPrompt).toBe('function');
    expect(typeof buildContinuationPrompt).toBe('function');
    expect(typeof parseTextResponse).toBe('function');
    expect(typeof generateOpeningPage).toBe('function');
    expect(typeof generateContinuationPage).toBe('function');
    expect(typeof validateApiKey).toBe('function');
  });

  it('should support type usage through barrel exports', () => {
    const result: GenerationResult = {
      narrative: 'The bridge shakes as thunder rolls over the ravine.',
      choices: ['Cross quickly', 'Retreat to camp'],
      stateChanges: ['Reached the old bridge'],
      canonFacts: ['The ravine bridge is unstable'],
      isEnding: false,
      rawResponse: '{"narrative":"..."}',
    };
    const options: GenerationOptions = { apiKey: 'test-key' };
    const opening: OpeningContext = {
      characterConcept: 'A storm-chaser scout',
      worldbuilding: 'Mountain passes split the frontier.',
      tone: 'tense adventure',
    };
    const continuation: ContinuationContext = {
      characterConcept: 'A storm-chaser scout',
      worldbuilding: 'Mountain passes split the frontier.',
      tone: 'tense adventure',
      globalCanon: ['The bridge tolls in gale-force winds'],
      storyArc: 'Deliver the warning before the pass collapses',
      previousNarrative: 'You stand before the swaying bridge as lightning forks overhead.',
      selectedChoice: 'Step onto the bridge and run',
      accumulatedState: ['Recovered the signal flare'],
    };
    const message: ChatMessage = { role: 'user', content: 'Continue the story' };
    const schema: JsonSchema = STORY_GENERATION_SCHEMA;

    expect(result.choices).toHaveLength(2);
    expect(options.apiKey).toBe('test-key');
    expect(opening.tone).toBe('tense adventure');
    expect(continuation.selectedChoice).toContain('bridge');
    expect(message.role).toBe('user');
    expect(schema.type).toBe('json_schema');
  });

  it('should not export internal fallback helper via barrel', () => {
    expect('buildFallbackSystemPromptAddition' in llm).toBe(false);
  });
});
