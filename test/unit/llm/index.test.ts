import {
  CONTENT_POLICY,
  LLMError,
  WRITER_GENERATION_SCHEMA,
  buildContinuationPrompt,
  buildOpeningPrompt,
  generatePagePlan,
  generatePageWriterOutput,
  generateOpeningPage,
  isStructuredOutputNotSupported,
  mergePageWriterAndReconciledStateWithAnalystResults,
  validateApiKey,
  validateWriterResponse,
} from '../../../src/llm/index';
import * as llm from '../../../src/llm/index';
import type {
  ChatMessage,
  ContinuationPagePlanContext,
  ContinuationContext,
  GenerationOptions,
  JsonSchema,
  OpeningPagePlanContext,
  OpeningContext,
  PagePlan,
  PagePlanGenerationResult,
  PageWriterResult,
  FinalPageGenerationResult,
  PageWriterResult,
} from '../../../src/llm/index';
import { ChoiceType, PrimaryDelta } from '../../../src/models/choice-enums';
import { ThreadType, Urgency } from '../../../src/models/state/index';

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
    expect(typeof generatePageWriterOutput).toBe('function');
    expect(typeof generatePagePlan).toBe('function');
    expect(typeof mergePageWriterAndReconciledStateWithAnalystResults).toBe('function');
    expect(typeof validateApiKey).toBe('function');
  });

  it('should support type usage through barrel exports', () => {
    const pageWriterResult: PageWriterResult = {
      narrative: 'The bridge shakes as thunder rolls over the ravine.',
      choices: [
        { text: 'Cross quickly', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
        { text: 'Retreat to camp', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'GOAL_SHIFT' },
      ],
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
    const result: PageWriterResult = {
      ...pageWriterResult,
      currentLocation: 'The Old Bridge',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [{ text: 'The ravine bridge is unstable', factType: 'LAW' }],
      newCharacterCanonFacts: {},
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
    };
    const finalResult: FinalPageGenerationResult = {
      ...pageWriterResult,
      currentLocation: 'The Old Bridge',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      newCanonFacts: [{ text: 'The ravine bridge is unstable', factType: 'LAW' }],
      newCharacterCanonFacts: {},
      reconciliationDiagnostics: [],
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
    accumulatedPromises: [],
    };
    const message: ChatMessage = { role: 'user', content: 'Continue the story' };
    const schema: JsonSchema = WRITER_GENERATION_SCHEMA;
    const pagePlan: PagePlan = {
      sceneIntent: 'Escalate the bridge crossing into a commitment.',
      continuityAnchors: ['Storm worsens', 'Bridge remains unstable'],
      stateIntents: {
        threats: { add: [], removeIds: [] },
        constraints: { add: [], removeIds: [] },
        threads: {
          add: [
            {
              text: 'Reach the far side before collapse',
              threadType: ThreadType.DANGER,
              urgency: Urgency.HIGH,
            },
          ],
          resolveIds: [],
        },
        inventory: { add: [], removeIds: [] },
        health: { add: [], removeIds: [] },
        characterState: { add: [], removeIds: [] },
        canon: { worldAdd: [], characterAdd: [] },
      },
      writerBrief: {
        openingLineDirective: 'Open with immediate instability.',
        mustIncludeBeats: ['Wood snaps underfoot'],
        forbiddenRecaps: [],
      },
      dramaticQuestion: 'Will you cross the bridge before it collapses?',
      choiceIntents: [
        {
          hook: 'Sprint across the swaying bridge',
          choiceType: ChoiceType.CONFRONTATION,
          primaryDelta: PrimaryDelta.THREAT_SHIFT,
        },
        {
          hook: 'Search for a safer crossing',
          choiceType: ChoiceType.TACTICAL_APPROACH,
          primaryDelta: PrimaryDelta.LOCATION_CHANGE,
        },
      ],
    };
    const plannerOpeningContext: OpeningPagePlanContext = {
      mode: 'opening',
      characterConcept: 'A storm-chaser scout',
      worldbuilding: 'Mountain passes split the frontier.',
      tone: 'tense adventure',
    };
    const plannerContinuationContext: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A storm-chaser scout',
      worldbuilding: 'Mountain passes split the frontier.',
      tone: 'tense adventure',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'You are halfway across the swaying bridge.',
      selectedChoice: 'Sprint to the far support tower',
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      activeState: {
        currentLocation: 'Old bridge',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
      grandparentNarrative: null,
      ancestorSummaries: [],
    accumulatedPromises: [],
    };
    const plannerResult: PagePlanGenerationResult = {
      ...pagePlan,
      rawResponse: '{"sceneIntent":"Escalate the bridge crossing into a commitment."}',
    };

    expect(result.choices).toHaveLength(2);
    expect(finalResult.reconciliationDiagnostics).toHaveLength(0);
    expect(pageWriterResult.choices).toHaveLength(2);
    expect(options.apiKey).toBe('test-key');
    expect(opening.tone).toBe('tense adventure');
    expect(continuation.selectedChoice).toContain('bridge');
    expect(message.role).toBe('user');
    expect(schema.type).toBe('json_schema');
    expect(pagePlan.stateIntents.threads.add[0].urgency).toBe(Urgency.HIGH);
    expect(plannerOpeningContext.mode).toBe('opening');
    expect(plannerContinuationContext.mode).toBe('continuation');
    expect(plannerResult.rawResponse).toContain('sceneIntent');
  });

  it('should not export removed fallback helpers via barrel', () => {
    expect('buildFallbackSystemPromptAddition' in llm).toBe(false);
    expect('parseTextResponse' in llm).toBe(false);
  });
});
