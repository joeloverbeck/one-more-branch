import type {
  AnalystContext,
  AnalystResult,
  CompletedBeat,
  ContinuationContext,
  ContinuationGenerationResult,
  GenerationOptions,
  OpeningContext,
  StructureRewriteContext,
  StructureRewriteResult,
  WriterResult,
} from '../../../src/llm/types';
import { LLMError } from '../../../src/llm/types';
import { createBeatDeviation, createNoDeviation, type StoryStructure } from '../../../src/models/story-arc';
import type { ActiveState, KeyedEntry } from '../../../src/models/state/index';

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
    it('should allow creating WriterResult with all required fields', () => {
      const result: WriterResult = {
        narrative: 'You arrive at a crossroads.',
        choices: [
          { text: 'Take the left path', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
          { text: 'Take the right path', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        ],
        currentLocation: 'Forest crossroads',
        threatsAdded: ['THREAT_WOLVES: Wolves spotted nearby'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: ['The forest has two exits.'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'cautious',
          primaryIntensity: 'moderate',
          primaryCause: 'Unfamiliar surroundings',
          secondaryEmotions: [],
          dominantMotivation: 'Find safe path forward',
        },
        isEnding: false,
        sceneSummary: 'The protagonist arrives at a fork in the forest path.',
        rawResponse: '{"narrative":"You arrive at a crossroads."}',
      };

      expect(result.isEnding).toBe(false);
      expect(result.choices).toHaveLength(2);
      expect(result.currentLocation).toBe('Forest crossroads');
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
        globalCharacterCanon: {},
        previousNarrative: 'You survived the ambush at dusk.',
        selectedChoice: 'Track the raiders into the marsh',

        accumulatedInventory: [],
        accumulatedHealth: [],
        accumulatedCharacterState: {},
        activeState: {
          currentLocation: 'Marsh edge',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        grandparentNarrative: null,
        ancestorSummaries: [],
      };

      expect(context.globalCanon[0]).toContain('siege');
      expect(context.activeState.currentLocation).toBe('Marsh edge');
    });
  });

  describe('ContinuationContext type', () => {
    it('allows context with active state', () => {
      const context: ContinuationContext = {
        characterConcept: 'A brave knight',
        worldbuilding: 'Medieval fantasy',
        tone: 'Epic adventure',
        globalCanon: [],
        globalCharacterCanon: {},
        previousNarrative: 'Previous scene...',
        selectedChoice: 'Go left',

        accumulatedInventory: [],
        accumulatedHealth: [],
        accumulatedCharacterState: {},
        activeState: {
          currentLocation: 'Castle gate',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        grandparentNarrative: null,
        ancestorSummaries: [],
      };

      // TypeScript compile-time check - if this compiles, the type is valid
      expect(context.activeState.currentLocation).toBe('Castle gate');
    });

    it('allows context with grandparent narrative', () => {
      const context: ContinuationContext = {
        characterConcept: 'A brave knight',
        worldbuilding: 'Medieval fantasy',
        tone: 'Epic adventure',
        globalCanon: [],
        globalCharacterCanon: {},
        previousNarrative: 'Previous scene...',
        selectedChoice: 'Go left',

        accumulatedInventory: [],
        accumulatedHealth: [],
        accumulatedCharacterState: {},
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        grandparentNarrative: 'Earlier scene...',
        ancestorSummaries: [],
      };

      expect(context.grandparentNarrative).toBe('Earlier scene...');
    });

    it('allows null grandparent narrative', () => {
      const context: ContinuationContext = {
        characterConcept: 'A brave knight',
        worldbuilding: 'Medieval fantasy',
        tone: 'Epic adventure',
        globalCanon: [],
        globalCharacterCanon: {},
        previousNarrative: 'Previous scene...',
        selectedChoice: 'Go left',

        accumulatedInventory: [],
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
      };

      expect(context.grandparentNarrative).toBeNull();
    });

    it('requires activeState field', () => {
      // This should cause TypeScript error if activeState is omitted
      // @ts-expect-error - Testing that activeState is required
      const invalidContext: ContinuationContext = {
        characterConcept: 'Test',
        worldbuilding: 'Test',
        tone: 'Test',
        globalCanon: [],
        globalCharacterCanon: {},
        previousNarrative: '',
        selectedChoice: '',

        accumulatedInventory: [],
        accumulatedHealth: [],
        accumulatedCharacterState: {},
        grandparentNarrative: null,
        ancestorSummaries: [],
        // Missing activeState!
      };

      // This line exists only to use the variable (test would fail at compile time)
      expect(invalidContext).toBeDefined();
    });

    it('requires grandparentNarrative field', () => {
      // @ts-expect-error - Testing that grandparentNarrative is required
      const invalidContext: ContinuationContext = {
        characterConcept: 'Test',
        worldbuilding: 'Test',
        tone: 'Test',
        globalCanon: [],
        globalCharacterCanon: {},
        previousNarrative: '',
        selectedChoice: '',

        accumulatedInventory: [],
        accumulatedHealth: [],
        accumulatedCharacterState: {},
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        ancestorSummaries: [],
        // Missing grandparentNarrative!
      };

      // This line exists only to use the variable (test would fail at compile time)
      expect(invalidContext).toBeDefined();
    });

    it('allows active state with populated fields', () => {
      const activeState: ActiveState = {
        currentLocation: 'Dark forest clearing',
        activeThreats: [
          { id: 'th-1', text: 'Pack of wolves circling' },
        ],
        activeConstraints: [
          { id: 'cn-1', text: 'Twisted ankle limits speed' },
        ],
        openThreads: [
          { id: 'td-1', text: 'Map destination unknown' },
        ],
      };

      const accumulatedInventory: readonly KeyedEntry[] = [
        { id: 'inv-1', text: 'torch' },
        { id: 'inv-2', text: 'dagger' },
      ];
      const accumulatedHealth: readonly KeyedEntry[] = [{ id: 'hp-1', text: 'minor-cut' }];

      const context: ContinuationContext = {
        characterConcept: 'A ranger',
        worldbuilding: 'Dangerous wilderness',
        tone: 'Survival',
        globalCanon: [],
        globalCharacterCanon: {},
        previousNarrative: 'The wolves appeared...',
        selectedChoice: 'Stand ground',

        accumulatedInventory,
        accumulatedHealth,
        accumulatedCharacterState: {},
        activeState,
        grandparentNarrative: 'You entered the forest at dawn...',
        ancestorSummaries: [],
      };

      expect(context.activeState.activeThreats).toHaveLength(1);
      expect(context.activeState.activeThreats[0].id).toBe('th-1');
      expect(context.accumulatedInventory[0].id).toBe('inv-1');
      expect(context.activeState.activeConstraints).toHaveLength(1);
      expect(context.activeState.openThreads).toHaveLength(1);
    });
  });

  describe('ContinuationGenerationResult', () => {
    function buildBaseWriterResult(): WriterResult {
      return {
        narrative: 'The lantern flickers as footsteps approach.',
        choices: [
          { text: 'Hide behind the crates', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'EXPOSURE_CHANGE' },
          { text: 'Call out to the footsteps', choiceType: 'CONFRONTATION', primaryDelta: 'RELATIONSHIP_CHANGE' },
        ],
        currentLocation: 'Dimly lit warehouse',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'tense',
          primaryIntensity: 'moderate',
          primaryCause: 'Mysterious footsteps',
          secondaryEmotions: [],
          dominantMotivation: 'Avoid detection',
        },
        isEnding: false,
        sceneSummary: 'Footsteps approach the warehouse, forcing a quick decision.',
        rawResponse: '{"narrative":"..."}',
      };
    }

    it('should extend WriterResult with analyst fields (NoDeviation)', () => {
      const result: ContinuationGenerationResult = {
        ...buildBaseWriterResult(),
        beatConcluded: false,
        beatResolution: '',
        deviation: createNoDeviation(),
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
      };

      expect(result.deviation.detected).toBe(false);
    });

    it('should extend WriterResult with analyst fields (BeatDeviation)', () => {
      const result: ContinuationGenerationResult = {
        ...buildBaseWriterResult(),
        beatConcluded: true,
        beatResolution: 'The allies turned against each other',
        deviation: createBeatDeviation('Future beats no longer fit', ['2.2', '2.3'], 'Allies joined enemy'),
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
      };

      expect(result.deviation.detected).toBe(true);
      if (result.deviation.detected) {
        expect(result.deviation.invalidatedBeatIds).toEqual(['2.2', '2.3']);
      }
    });
  });

  describe('WriterResult (compile-time)', () => {
    it('should allow creating WriterResult with all required fields', () => {
      const result: WriterResult = {
        narrative: 'The forest darkens as you step forward.',
        choices: [
          { text: 'Draw your sword', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
          { text: 'Retreat quietly', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
        ],
        currentLocation: 'Dark forest path',
        threatsAdded: ['THREAT_BANDITS: Bandits ahead'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: ['THREAD_LOST: Lost the trail'],
        threadsResolved: [],
        newCanonFacts: ['The forest is cursed.'],
        newCharacterCanonFacts: { Elara: ['Elara fears the dark'] },
        inventoryAdded: ['rusty key'],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [{ characterName: 'Elara', states: ['frightened'] }],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'apprehension',
          primaryIntensity: 'moderate',
          primaryCause: 'Strange sounds in the dark',
          secondaryEmotions: [],
          dominantMotivation: 'Find safe shelter',
        },
        isEnding: false,
        sceneSummary: 'The protagonist faces bandits in a darkening forest.',
        rawResponse: '{"narrative":"..."}',
      };

      expect(result.narrative).toContain('forest');
      expect(result.choices).toHaveLength(2);
      expect(result.currentLocation).toBe('Dark forest path');
    });

    it('should NOT include beatConcluded, beatResolution, or deviation fields', () => {
      const result: WriterResult = {
        narrative: 'Test',
        choices: [
          { text: 'A', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'B', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        currentLocation: '',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'neutral',
          primaryIntensity: 'mild',
          primaryCause: 'None',
          secondaryEmotions: [],
          dominantMotivation: 'Continue',
        },
        isEnding: false,
        sceneSummary: 'A minimal test scene for type validation.',
        rawResponse: '',
      };

      // Verify these fields do NOT exist on WriterResult
      expect('beatConcluded' in result).toBe(false);
      expect('beatResolution' in result).toBe(false);
      expect('deviation' in result).toBe(false);
    });
  });

  describe('AnalystResult (compile-time)', () => {
    it('should allow creating AnalystResult with all required fields', () => {
      const result: AnalystResult = {
        beatConcluded: true,
        beatResolution: 'The protagonist escaped the dungeon',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: '{"beatConcluded":true}',
      };

      expect(result.beatConcluded).toBe(true);
      expect(result.beatResolution).toContain('escaped');
      expect(result.deviationDetected).toBe(false);
    });

    it('should allow creating AnalystResult with deviation detected', () => {
      const result: AnalystResult = {
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: true,
        deviationReason: 'Protagonist allied with the antagonist',
        invalidatedBeatIds: ['2.2', '2.3'],
        narrativeSummary: 'The hero joined forces with the villain',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: '{"deviationDetected":true}',
      };

      expect(result.deviationDetected).toBe(true);
      expect(result.invalidatedBeatIds).toEqual(['2.2', '2.3']);
      expect(result.narrativeSummary).toContain('villain');
    });
  });

  describe('AnalystContext (compile-time)', () => {
    it('should allow creating AnalystContext with all required fields', () => {
      const context: AnalystContext = {
        narrative: 'The protagonist confronts the guardian at the gate.',
        structure: {
          acts: [
            {
              id: '1',
              name: 'Act I',
              objective: 'Reach the gate',
              stakes: 'Failure means capture',
              entryCondition: 'Story begins',
              beats: [{ id: '1.1', description: 'Approach', objective: 'Reach the gate', role: 'setup' }],
            },
          ],
          overallTheme: 'Courage under pressure',
          premise: 'A lone warrior must breach an unbreakable gate to save a captive ally.',
          pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
          generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [],
          pagesInCurrentBeat: 0,
          pacingNudge: null,
        },
        activeState: {
          currentLocation: 'Gate entrance',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
      };

      expect(context.narrative).toContain('guardian');
      expect(context.structure.acts).toHaveLength(1);
      expect(context.accumulatedStructureState.currentActIndex).toBe(0);
      expect(context.activeState.currentLocation).toBe('Gate entrance');
    });
  });

  describe('Structure rewrite types', () => {
    const structure: StoryStructure = {
      acts: [
        {
          id: '1',
          name: 'Act I',
          objective: 'Start',
          stakes: 'Failure means immediate danger',
          entryCondition: 'Story begins',
          beats: [
            { id: '1.1', description: 'Inciting incident', objective: 'Respond to threat', role: 'setup' },
            { id: '1.2', description: 'Decision point', objective: 'Choose direction', role: 'turning_point' },
          ],
        },
        {
          id: '2',
          name: 'Act II',
          objective: 'Escalate',
          stakes: 'Failure means loss of allies',
          entryCondition: 'Protagonist commits',
          beats: [
            { id: '2.1', description: 'Complication', objective: 'Adapt plan', role: 'escalation' },
            { id: '2.2', description: 'Setback', objective: 'Recover momentum', role: 'escalation' },
          ],
        },
        {
          id: '3',
          name: 'Act III',
          objective: 'Resolve',
          stakes: 'Failure means catastrophe',
          entryCondition: 'Final confrontation begins',
          beats: [
            { id: '3.1', description: 'Climax', objective: 'Confront antagonist', role: 'turning_point' },
            { id: '3.2', description: 'Aftermath', objective: 'Secure outcome', role: 'resolution' },
          ],
        },
      ],
      overallTheme: 'Hope under pressure',
      premise: 'A team under siege must hold together when every option demands sacrifice.',
      pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
      generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('should allow creating CompletedBeat with all required fields', () => {
      const completedBeat: CompletedBeat = {
        actIndex: 0,
        beatIndex: 1,
        beatId: '1.2',
        description: 'Decision point',
        objective: 'Choose direction',
        role: 'turning_point',
        resolution: 'Chose to trust the rebel faction',
      };

      expect(completedBeat.beatId).toBe('1.2');
      expect(completedBeat.resolution).toContain('rebel');
    });

    it('should allow creating StructureRewriteContext including empty completedBeats', () => {
      const context: StructureRewriteContext = {
        characterConcept: 'A field medic turned reluctant leader',
        worldbuilding: 'A flooded city-state in collapse',
        tone: 'Tense and hopeful',
        completedBeats: [],
        narrativeSummary: 'The protagonist now controls a key evacuation route.',
        currentActIndex: 1,
        currentBeatIndex: 0,
        deviationReason: 'Player allied with former rivals',
        originalTheme: 'Duty versus survival',
      };

      expect(context.completedBeats).toEqual([]);
      expect(context.currentActIndex).toBe(1);
    });

    it('should allow creating StructureRewriteResult with structure and preservedBeatIds', () => {
      const result: StructureRewriteResult = {
        structure,
        preservedBeatIds: ['1.1', '1.2'],
        rawResponse: 'REGENERATED_ACTS:\n...',
      };

      expect(result.structure.acts).toHaveLength(3);
      expect(result.preservedBeatIds).toEqual(['1.1', '1.2']);
    });
  });
});
