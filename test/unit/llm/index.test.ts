import {
  CONTENT_POLICY,
  LLMError,
  WRITER_GENERATION_SCHEMA,
  buildContinuationPrompt,
  buildOpeningPrompt,
  generateOpeningPage,
  isStructuredOutputNotSupported,
  validateApiKey,
  validateWriterResponse,
} from '../../../src/llm/index';
import * as llm from '../../../src/llm/index';
import type {
  ChatMessage,
  ContinuationContext,
  GenerationOptions,
  JsonSchema,
  OpeningContext,
  WriterResult,
} from '../../../src/llm/index';

describe('llm barrel exports', () => {
  it('should export runtime symbols', () => {
    expect(typeof LLMError).toBe('function');
    expect(typeof CONTENT_POLICY).toBe('string');
    expect(WRITER_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(typeof validateWriterResponse).toBe('function');
    expect(typeof isStructuredOutputNotSupported).toBe('function');
    expect(typeof buildOpeningPrompt).toBe('function');
    expect(typeof buildContinuationPrompt).toBe('function');
    expect(typeof generateOpeningPage).toBe('function');
    expect(typeof validateApiKey).toBe('function');
  });

  it('should support type usage through barrel exports', () => {
    const result: WriterResult = {
      narrative: 'The bridge shakes as thunder rolls over the ravine.',
      choices: [
        { text: 'Cross quickly', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
        { text: 'Retreat to camp', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'GOAL_SHIFT' },
      ],
      currentLocation: 'The Old Bridge',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: ['The ravine bridge is unstable'],
      newCharacterCanonFacts: {},
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'fear',
        primaryIntensity: 'moderate',
        primaryCause: 'The bridge is swaying dangerously',
        secondaryEmotions: [],
        dominantMotivation: 'Survive the crossing',
      },
      isEnding: false,
      sceneSummary: 'Thunder and wind threaten to collapse the old bridge.',
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
      globalCharacterCanon: {},
      previousNarrative: 'You stand before the swaying bridge as lightning forks overhead.',
      selectedChoice: 'Step onto the bridge and run',
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      activeState: {
        currentLocation: 'The Old Bridge',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
      grandparentNarrative: null,
      ancestorSummaries: [],
    };
    const message: ChatMessage = { role: 'user', content: 'Continue the story' };
    const schema: JsonSchema = WRITER_GENERATION_SCHEMA;

    expect(result.choices).toHaveLength(2);
    expect(options.apiKey).toBe('test-key');
    expect(opening.tone).toBe('tense adventure');
    expect(continuation.selectedChoice).toContain('bridge');
    expect(message.role).toBe('user');
    expect(schema.type).toBe('json_schema');
  });

  it('should not export removed fallback helpers via barrel', () => {
    expect('buildFallbackSystemPromptAddition' in llm).toBe(false);
    expect('parseTextResponse' in llm).toBe(false);
  });
});
