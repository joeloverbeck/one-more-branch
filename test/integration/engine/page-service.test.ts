/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  generateAgendaResolver,
  generateAnalystEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStateAccountant,
  generatePageWriterOutput,
} from '@/llm';
import {
  ConstraintType,
  createChoice,
  createPage,
  createStory,
  parsePageId,
  StoryId,
  ThreatType,
  updateStoryStructure,
} from '@/models';
import { storage } from '@/persistence';
import {
  generateFirstPage,
  generateNextPage,
  getOrGeneratePage,
} from '@/engine';
import { reconcileState } from '@/engine/state-reconciler';
import type { StateReconciliationResult } from '@/engine/state-reconciler-types';
import { createInitialStructureState } from '@/models/story-arc';
import type { StoryStructure } from '@/models/story-arc';
import { ChoiceType, PrimaryDelta } from '@/models/choice-enums';
import { LLMError } from '@/llm/llm-client-types';
import type { CanonFact } from '@/models/state/canon';
import type { AnalystResult } from '@/llm/analyst-types';
import type {
  PagePlanGenerationResult,
  ReducedPagePlanGenerationResult,
} from '@/llm/planner-types';
import type { PageWriterResult } from '@/llm/writer-types';
import { logger } from '@/logging/index';
import type { StateAccountantGenerationResult } from '@/llm/accountant-types';
import {
  createMockAnalystResult,
  createMockPageWriterResult,
  createMockProtagonistAffect,
  createMockStoryStructure,
} from '../../fixtures/llm-results';
import { buildMinimalDecomposedCharacter, MINIMAL_DECOMPOSED_WORLD } from '../../fixtures/decomposed';
import type { Story, CreateStoryData } from '@/models/story';
import type { StorySpine } from '@/models/story-spine';
import type { NpcAgenda } from '@/models/state/npc-agenda';
import type { NpcRelationship } from '@/models/state/npc-relationship';
import type { AgendaResolverResult } from '@/llm/lorekeeper-types';
import type { TrackedPromise } from '@/models/state/keyed-entry';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
  generateStateAccountant: jest.fn(),
  generateAgendaResolver: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergePageWriterAndReconciledStateWithAnalystResults:
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    jest.requireActual('@/llm').mergePageWriterAndReconciledStateWithAnalystResults,
}));

jest.mock('@/logging/index', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logPrompt: jest.fn(),
}));

jest.mock('@/engine/state-reconciler', () => ({
  reconcileState: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<
  typeof generateOpeningPage
>;
const mockedGenerateWriterPage = generatePageWriterOutput as jest.MockedFunction<
  typeof generatePageWriterOutput
>;
const mockedGenerateAnalystEvaluation = generateAnalystEvaluation as jest.MockedFunction<
  typeof generateAnalystEvaluation
>;
const mockedGeneratePagePlan = generatePagePlan as jest.MockedFunction<typeof generatePagePlan>;
const mockedGenerateStateAccountant = generateStateAccountant as jest.MockedFunction<
  typeof generateStateAccountant
>;
const mockedReconcileState = reconcileState as jest.MockedFunction<typeof reconcileState>;
const mockedGenerateAgendaResolver = generateAgendaResolver as jest.MockedFunction<
  typeof generateAgendaResolver
>;
const mockedLogger = logger as {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
};

const TEST_PREFIX = 'TEST PGSVC-INT page-service integration';

function createTestStory(data: CreateStoryData): Story {
  return {
    ...createStory(data),
    decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist', { rawDescription: data.characterConcept })],
    decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
  };
}

type ReconciliationWriterPayload = PageWriterResult & {
  currentLocation?: string | null;
  threatsAdded: readonly string[];
  threatsRemoved: readonly string[];
  constraintsAdded: readonly string[];
  constraintsRemoved: readonly string[];
  threadsAdded: StateReconciliationResult['threadsAdded'];
  threadsResolved: readonly string[];
  inventoryAdded: readonly string[];
  inventoryRemoved: readonly string[];
  healthAdded: readonly string[];
  healthRemoved: readonly string[];
  characterStateChangesAdded: StateReconciliationResult['characterStateChangesAdded'];
  characterStateChangesRemoved: readonly string[];
  newCanonFacts: readonly CanonFact[];
  newCharacterCanonFacts: Record<string, string[]>;
};

function passthroughReconciledState(
  writer: ReconciliationWriterPayload,
  previousLocation: string
): StateReconciliationResult {
  return {
    currentLocation: writer.currentLocation ?? previousLocation,
    threatsAdded: writer.threatsAdded.map((text) => ({
      text,
      threatType: ThreatType.ENVIRONMENTAL,
    })),
    threatsRemoved: [...writer.threatsRemoved],
    constraintsAdded: writer.constraintsAdded.map((text) => ({
      text,
      constraintType: ConstraintType.ENVIRONMENTAL,
    })),
    constraintsRemoved: [...writer.constraintsRemoved],
    threadsAdded: [...writer.threadsAdded],
    threadsResolved: [...writer.threadsResolved],
    inventoryAdded: [...writer.inventoryAdded],
    inventoryRemoved: [...writer.inventoryRemoved],
    healthAdded: [...writer.healthAdded],
    healthRemoved: [...writer.healthRemoved],
    characterStateChangesAdded: [...writer.characterStateChangesAdded],
    characterStateChangesRemoved: [...writer.characterStateChangesRemoved],
    newCanonFacts: [...writer.newCanonFacts],
    newCharacterCanonFacts: writer.newCharacterCanonFacts,
    reconciliationDiagnostics: [],
  };
}

function reconciledStateWithDiagnostics(
  writer: ReconciliationWriterPayload,
  previousLocation: string,
  diagnostics: StateReconciliationResult['reconciliationDiagnostics']
): StateReconciliationResult {
  return {
    ...passthroughReconciledState(writer, previousLocation),
    reconciliationDiagnostics: diagnostics,
  };
}

function buildStructure(): StoryStructure {
  return createMockStoryStructure({
    overallTheme: 'Navigate political intrigue in a city of shadows.',
    premise: 'A courier uncovers a conspiracy while navigating rival factions.',
    pacingBudget: { targetPagesMin: 12, targetPagesMax: 24 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Discovery',
        objective: 'Uncover the conspiracy',
        stakes: 'Ignorance means death',
        entryCondition: 'Arrived in the city',
        beats: [
          {
            id: '1.1',
            name: 'First clue',
            description: 'Find the first clue',
            objective: 'Establish the mystery',
            role: 'setup',
          },
          {
            id: '1.2',
            name: 'Ally secured',
            description: 'Secure an ally',
            objective: 'Build support network',
            role: 'escalation',
          },
        ],
      },
      {
        id: '2',
        name: 'Escalation',
        objective: 'Confront the conspirators',
        stakes: 'Allies at risk',
        entryCondition: 'Evidence gathered',
        beats: [
          {
            id: '2.1',
            name: 'Enemy territory infiltration',
            description: 'Infiltrate enemy territory',
            objective: 'Gather critical intel',
            role: 'turning_point',
          },
        ],
      },
    ],
  });
}

function buildOpeningResult(): ReconciliationWriterPayload {
  return {
    ...createMockPageWriterResult({
      narrative: 'You step into the fog-shrouded city as whispers follow your every step.',
      choices: [
        { text: 'Follow the whispers', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        {
          text: 'Seek shelter in the tavern',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      protagonistAffect: createMockProtagonistAffect({
        primaryEmotion: 'curiosity',
        primaryIntensity: 'moderate',
        primaryCause: 'the mysterious whispers',
        secondaryEmotions: [],
        dominantMotivation: 'uncover the truth',
      }),
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: 'opening-raw',
    }),
    currentLocation: 'The fog-shrouded city entrance',
    threatsAdded: ['THREAT_whispers: The whispers seem to know your name'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [
      {
        text: 'THREAD_fog: The mystery of the whispering fog',
        threadType: 'INFORMATION',
        urgency: 'MEDIUM',
      },
    ],
    threadsResolved: [],
    newCanonFacts: [{ text: 'The city fog carries voices of the dead', factType: 'LAW' }],
    newCharacterCanonFacts: { 'The Watcher': ['Observes from the bell tower'] },
    inventoryAdded: ['Weathered map'],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
  };
}

function buildContinuationResult(overrides?: Partial<PageWriterResult>): ReconciliationWriterPayload {
  return {
    ...createMockPageWriterResult({
      narrative: 'The whispers lead you deeper into the maze of alleys.',
      choices: [
        {
          text: 'Enter the marked door',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Double back to the square',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      protagonistAffect: createMockProtagonistAffect({
        primaryEmotion: 'determination',
        primaryIntensity: 'strong',
        primaryCause: 'getting closer to the truth',
        secondaryEmotions: [],
        dominantMotivation: 'reach the resistance',
      }),
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: 'continuation-raw',
      ...overrides,
    }),
    currentLocation: 'Maze of alleys',
    threatsAdded: ['THREAT_shadows: Shadows move with purpose in the alleyways'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [
      {
        text: 'THREAD_door: The marked door mystery',
        threadType: 'INFORMATION',
        urgency: 'MEDIUM',
      },
    ],
    threadsResolved: [],
    newCanonFacts: [{ text: 'Marked doors hide resistance cells', factType: 'LAW' }],
    newCharacterCanonFacts: {},
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
  };
}

function buildAnalystResult(overrides?: Partial<AnalystResult>): AnalystResult {
  return createMockAnalystResult({
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    narrativeSummary: 'The protagonist continues the current scene.',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
    objectiveAnchors: ['Establish the mystery'],
    anchorEvidence: [''],
    completionGateSatisfied: false,
    completionGateFailureReason: '',
    toneAdherent: true,
    toneDriftDescription: '',
    npcCoherenceAdherent: true,
    npcCoherenceIssues: '',
    promisesDetected: [],
    promisesResolved: [],
    promisePayoffAssessments: [],
    threadPayoffAssessments: [],
    relationshipShiftsDetected: [],
    spineDeviationDetected: false,
    spineDeviationReason: '',
    spineInvalidatedElement: null,
    rawResponse: 'analyst-raw',
    ...overrides,
  });
}

function buildPagePlanResult(
  overrides?: Partial<PagePlanGenerationResult>
): PagePlanGenerationResult {
  return {
    sceneIntent: 'Drive the scene with direct consequences of the selected action.',
    continuityAnchors: ['Recent patrol activity', 'Urgent mission pressure'],
    stateIntents: {
      threats: { add: [], removeIds: [] },
      constraints: { add: [], removeIds: [] },
      threads: { add: [], resolveIds: [] },
      inventory: { add: [], removeIds: [] },
      health: { add: [], removeIds: [] },
      characterState: { add: [], removeIds: [] },
      canon: { worldAdd: [], characterAdd: [] },
    },
    writerBrief: {
      openingLineDirective: 'Begin mid-action with immediate stakes.',
      mustIncludeBeats: ['Consequence of player choice'],
      forbiddenRecaps: ['Do not summarize prior page'],
    },
    dramaticQuestion: 'Will you confront the danger or seek another path?',
    choiceIntents: [
      {
        hook: 'Face the threat directly',
        choiceType: ChoiceType.CONFRONTATION,
        primaryDelta: PrimaryDelta.THREAT_SHIFT,
      },
      {
        hook: 'Find an alternative route',
        choiceType: ChoiceType.TACTICAL_APPROACH,
        primaryDelta: PrimaryDelta.LOCATION_CHANGE,
      },
    ],
    rawResponse: '{"ok":true}',
    ...overrides,
  };
}

function buildReducedPagePlanResult(
  overrides?: Partial<ReducedPagePlanGenerationResult>
): ReducedPagePlanGenerationResult {
  const base = buildPagePlanResult();
  return {
    sceneIntent: base.sceneIntent,
    continuityAnchors: base.continuityAnchors,
    writerBrief: base.writerBrief,
    dramaticQuestion: base.dramaticQuestion,
    choiceIntents: base.choiceIntents,
    rawResponse: base.rawResponse,
    ...overrides,
  };
}

function buildStateAccountantResult(
  overrides?: Partial<StateAccountantGenerationResult>
): StateAccountantGenerationResult {
  const base = buildPagePlanResult();
  return {
    stateIntents: base.stateIntents,
    rawResponse: '{"ok":true}',
    ...overrides,
  };
}

function createRewriteFetchResponse(): Response {
  const rewrittenStructure = {
    overallTheme: 'Survive after betrayal.',
    acts: [
      {
        name: 'Act I Reframed',
        objective: 'Escape the hunters.',
        stakes: 'Capture means execution.',
        entryCondition: 'Cover blown.',
        beats: [
          {
            name: 'Emergency shelter',
            description: 'Find emergency shelter',
            objective: 'Avoid immediate capture.',
          },
          {
            name: 'New identity',
            description: 'Establish new identity',
            objective: 'Move freely again.',
          },
        ],
      },
      {
        name: 'Act II Reframed',
        objective: 'Build new network.',
        stakes: 'Isolation means death.',
        entryCondition: 'New identity secured.',
        beats: [
          {
            name: 'Underground contact',
            description: 'Find underground contact',
            objective: 'Access resistance.',
          },
          { name: 'Loyalty proof', description: 'Prove loyalty', objective: 'Gain trust.' },
        ],
      },
      {
        name: 'Act III Reframed',
        objective: 'Strike back.',
        stakes: 'Final chance.',
        entryCondition: 'Network ready.',
        beats: [
          { name: 'Plan execution', description: 'Execute plan', objective: 'Destroy evidence.' },
          {
            name: 'Escape route',
            description: 'Escape or die',
            objective: 'Survive the aftermath.',
          },
        ],
      },
    ],
  };

  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content: JSON.stringify(rewrittenStructure) } }],
      }),
  } as Response;
}

describe('page-service integration', () => {
  const createdStoryIds = new Set<StoryId>();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue(createRewriteFetchResponse()) as typeof fetch;
    mockedGeneratePagePlan.mockResolvedValue(buildReducedPagePlanResult());
    mockedGenerateStateAccountant.mockResolvedValue(buildStateAccountantResult());
    mockedReconcileState.mockImplementation((_plan, writer, previousState) =>
      passthroughReconciledState(writer as PageWriterResult, previousState.currentLocation)
    );
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storage.deleteStory(storyId);
      } catch {
        // Ignore cleanup failures
      }
    }
    createdStoryIds.clear();
    jest.restoreAllMocks();

    // Clean up any leaked test stories
    const stories = await storage.listStories();
    for (const storyMeta of stories) {
      const story = await storage.loadStory(storyMeta.id);
      if (story?.characterConcept.startsWith(TEST_PREFIX)) {
        try {
          await storage.deleteStory(story.id);
        } catch {
          // Ignore cleanup failures
        }
      }
    }
  });

  describe('generateFirstPage integration', () => {
    it('retries once on reconciliation diagnostics and injects failure reasons into retry prompts', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} reconciliation-retry-opening`,
        worldbuilding: 'A city where alarms travel faster than footsteps.',
        tone: 'high-pressure intrigue',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const openingResult = buildOpeningResult();
      mockedGenerateOpeningPage.mockResolvedValue(openingResult);
      mockedReconcileState
        .mockReturnValueOnce(
          reconciledStateWithDiagnostics(openingResult, '', [
            {
              code: 'THREAD_DUPLICATE_LIKE_ADD',
              field: 'threadsAdded',
              message: 'Thread add "Fog" is near-duplicate of existing thread "td-1".',
            },
          ])
        )
        .mockImplementation((_plan, writer, previousState) =>
          passthroughReconciledState(writer as PageWriterResult, previousState.currentLocation)
        );

      const { metrics } = await generateFirstPage(baseStory, 'test-api-key');

      expect(mockedGeneratePagePlan).toHaveBeenCalledTimes(2);
      expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(2);
      expect(mockedReconcileState).toHaveBeenCalledTimes(2);
      expect(metrics).toEqual(
        expect.objectContaining({
          plannerDurationMs: expect.any(Number),
          writerDurationMs: expect.any(Number),
          reconcilerDurationMs: expect.any(Number),
          finalStatus: 'success',
          reconcilerRetried: true,
          reconcilerIssueCount: 1,
        })
      );
      expect(mockedLogger.info.mock.calls).toEqual(
        expect.arrayContaining([
          [
            'Generation stage started',
            expect.objectContaining({
              mode: 'opening',
              storyId: baseStory.id,
              stage: 'planner',
              attempt: 1,
              requestId: expect.any(String),
            }),
          ],
          [
            'Generation stage completed',
            expect.objectContaining({
              mode: 'opening',
              storyId: baseStory.id,
              stage: 'reconciler',
              attempt: 2,
              requestId: expect.any(String),
              durationMs: expect.any(Number),
            }),
          ],
          [
            'Generation pipeline completed',
            expect.objectContaining({
              mode: 'opening',
              storyId: baseStory.id,
              requestId: expect.any(String),
              metrics: expect.objectContaining({
                finalStatus: 'success',
                reconcilerRetried: true,
              }),
            }),
          ],
        ])
      );
      expect(mockedLogger.warn.mock.calls).toEqual(
        expect.arrayContaining([
          [
            'Retrying generation after reconciliation failure',
            expect.objectContaining({
              mode: 'opening',
              storyId: baseStory.id,
              attempt: 1,
              requestId: expect.any(String),
              failureReasons: [
                {
                  code: 'THREAD_DUPLICATE_LIKE_ADD',
                  field: 'threadsAdded',
                  message: 'Thread add "Fog" is near-duplicate of existing thread "td-1".',
                },
              ],
            }),
          ],
        ])
      );
      expect(mockedGeneratePagePlan.mock.calls[1]?.[0]).toEqual(
        expect.objectContaining({
          reconciliationFailureReasons: [
            {
              code: 'THREAD_DUPLICATE_LIKE_ADD',
              field: 'threadsAdded',
              message: 'Thread add "Fog" is near-duplicate of existing thread "td-1".',
            },
          ],
        })
      );
      expect(mockedGenerateOpeningPage.mock.calls[1]?.[0]).toEqual(
        expect.objectContaining({
          reconciliationFailureReasons: [
            {
              code: 'THREAD_DUPLICATE_LIKE_ADD',
              field: 'threadsAdded',
              message: 'Thread add "Fog" is near-duplicate of existing thread "td-1".',
            },
          ],
        })
      );
    });

    it('assembles page with correct structure state for structured stories', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} structured-first-page`,
        worldbuilding: 'A city where shadows have memory.',
        tone: 'dark mystery',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      mockedGenerateOpeningPage.mockResolvedValue(buildOpeningResult());

      const { page, updatedStory } = await generateFirstPage(storyWithStructure, 'test-api-key');
      for (const act of storyWithStructure.structure?.acts ?? []) {
        for (const beat of act.beats) {
          expect(beat.name).toBeTruthy();
        }
      }

      // Verify page assembly
      expect(page.id).toBe(1);
      expect(page.narrativeText).toContain('fog-shrouded city');
      expect(page.choices).toHaveLength(2);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();

      // Verify structure state initialization
      expect(page.accumulatedStructureState.currentActIndex).toBe(0);
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'active',
      });

      // Verify structure version ID assignment
      expect(page.structureVersionId).not.toBeNull();
      expect(page.structureVersionId).toBe(storyWithStructure.structureVersions?.[0]?.id);

      // Verify inventory changes
      expect(page.inventoryChanges.added).toContain('Weathered map');

      // Verify canon updates
      expect(updatedStory.globalCanon).toContainEqual({ text: 'The city fog carries voices of the dead', factType: 'LAW' });
      expect(updatedStory.globalCharacterCanon['The Watcher']).toContain(
        'Observes from the bell tower'
      );
    });

    it('runs planner before opening writer and forwards planner output into opening context', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} planner-opening-order`,
        worldbuilding: 'A city where every alley has watchers.',
        tone: 'suspense',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const pagePlan = buildPagePlanResult({
        sceneIntent: 'Open with immediate pursuit pressure.',
      });
      mockedGeneratePagePlan.mockResolvedValue(
        buildReducedPagePlanResult({
          sceneIntent: pagePlan.sceneIntent,
          continuityAnchors: pagePlan.continuityAnchors,
          writerBrief: pagePlan.writerBrief,
          dramaticQuestion: pagePlan.dramaticQuestion,
          choiceIntents: pagePlan.choiceIntents,
          rawResponse: pagePlan.rawResponse,
        })
      );
      mockedGenerateStateAccountant.mockResolvedValue({
        stateIntents: pagePlan.stateIntents,
        rawResponse: pagePlan.rawResponse,
      });
      mockedGenerateOpeningPage.mockResolvedValue(buildOpeningResult());

      await generateFirstPage(baseStory, 'test-api-key');

      expect(mockedGeneratePagePlan).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          observability: expect.objectContaining({
            storyId: baseStory.id,
            requestId: expect.any(String),
          }),
        })
      );
      expect(mockedGenerateOpeningPage).toHaveBeenCalledWith(
        expect.objectContaining({
          pagePlan: expect.objectContaining({
            sceneIntent: pagePlan.sceneIntent,
            continuityAnchors: pagePlan.continuityAnchors,
            stateIntents: pagePlan.stateIntents,
            writerBrief: pagePlan.writerBrief,
            dramaticQuestion: pagePlan.dramaticQuestion,
            choiceIntents: pagePlan.choiceIntents,
          }),
        }),
        expect.any(Object)
      );
      expect(mockedReconcileState).toHaveBeenCalledWith(
        expect.objectContaining({
          sceneIntent: pagePlan.sceneIntent,
          continuityAnchors: pagePlan.continuityAnchors,
          stateIntents: pagePlan.stateIntents,
          writerBrief: pagePlan.writerBrief,
          dramaticQuestion: pagePlan.dramaticQuestion,
          choiceIntents: pagePlan.choiceIntents,
        }),
        expect.objectContaining({
          narrative: expect.any(String),
          sceneSummary: expect.any(String),
        }),
        expect.objectContaining({
          currentLocation: '',
          threats: [],
          constraints: [],
          threads: [],
          inventory: [],
          health: [],
          characterState: [],
        })
      );
      expect(mockedGeneratePagePlan.mock.invocationCallOrder[0]).toBeLessThan(
        mockedGenerateOpeningPage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
      );
      expect(mockedGenerateOpeningPage.mock.invocationCallOrder[0]).toBeLessThan(
        mockedReconcileState.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
      );
    });

    it('uses empty structure state for unstructured stories', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} unstructured-first-page`,
        worldbuilding: 'A freeform world.',
        tone: 'adventurous',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      mockedGenerateOpeningPage.mockResolvedValue(buildOpeningResult());

      const { page } = await generateFirstPage(baseStory, 'test-api-key');

      // Verify empty structure state for unstructured story
      expect(page.accumulatedStructureState).toEqual({
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      });
      expect(page.structureVersionId).toBeNull();
    });

    it('updates story with canon facts from LLM result', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} canon-update`,
        worldbuilding: 'A world of secrets.',
        tone: 'mysterious',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      mockedGenerateOpeningPage.mockResolvedValue({
        ...buildOpeningResult(),
        newCanonFacts: [{ text: 'Fact One', factType: 'LAW' }, { text: 'Fact Two', factType: 'LAW' }],
        newCharacterCanonFacts: {
          Hero: ['Has a scar'],
          Villain: ['Wears a mask'],
        },
      });

      const { updatedStory } = await generateFirstPage(baseStory, 'test-api-key');

      expect(updatedStory.globalCanon).toContainEqual({ text: 'Fact One', factType: 'LAW' });
      expect(updatedStory.globalCanon).toContainEqual({ text: 'Fact Two', factType: 'LAW' });
      expect(updatedStory.globalCharacterCanon['Hero']).toContain('Has a scar');
      expect(updatedStory.globalCharacterCanon['Villain']).toContain('Wears a mask');
    });
  });

  describe('generateNextPage integration', () => {
    it('throws typed hard error after one reconciliation retry failure', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} reconciliation-hard-error`,
        worldbuilding: 'A district where patrol grids tighten every minute.',
        tone: 'tense thriller',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'You crouch under the checkpoint lanterns.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Rush the gate'), createChoice('Wait for shift change')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedReconcileState.mockImplementation((_plan, writer, previousState) =>
        reconciledStateWithDiagnostics(writer as PageWriterResult, previousState.currentLocation, [
          {
            code: 'UNKNOWN_STATE_ID',
            field: 'constraintsRemoved',
            message: 'Unknown state ID "cn-999" in constraintsRemoved.',
          },
        ])
      );

      await expect(
        generateNextPage(baseStory, parentPage, 0, 'test-api-key')
      ).rejects.toMatchObject({
        name: 'StateReconciliationError',
        code: 'RECONCILIATION_FAILED',
        retryable: false,
        diagnostics: [
          {
            code: 'UNKNOWN_STATE_ID',
            field: 'constraintsRemoved',
          },
        ],
      });
      expect(mockedGeneratePagePlan).toHaveBeenCalledTimes(2);
      expect(mockedGenerateWriterPage).toHaveBeenCalledTimes(2);
      expect(mockedReconcileState).toHaveBeenCalledTimes(2);
      expect(mockedGenerateAnalystEvaluation).not.toHaveBeenCalled();
      expect(mockedLogger.error.mock.calls).toEqual(
        expect.arrayContaining([
          [
            'Generation pipeline failed',
            expect.objectContaining({
              mode: 'continuation',
              storyId: baseStory.id,
              pageId: parentPage.id,
              requestId: expect.any(String),
              metrics: expect.objectContaining({
                finalStatus: 'hard_error',
                reconcilerRetried: true,
                reconcilerIssueCount: 2,
              }),
            }),
          ],
        ])
      );
    });

    it('collects all parent accumulated state correctly', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} parent-state-collection`,
        worldbuilding: 'A city of layers.',
        tone: 'intrigue',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The journey begins.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Go left'), createChoice('Go right')],
        inventoryChanges: { added: ['Torch'], removed: [] },
        healthChanges: { added: ['Minor fatigue'], removed: [] },
        characterStateChanges: {
          added: [{ characterName: 'Companion', states: ['Loyal'] }],
          removed: [],
        },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(buildAnalystResult());

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      expect(mockedGenerateWriterPage.mock.invocationCallOrder[0]).toBeLessThan(
        mockedReconcileState.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
      );
      expect(mockedReconcileState.mock.invocationCallOrder[0]).toBeLessThan(
        mockedGenerateAnalystEvaluation.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
      );

      // Verify parent state was collected and passed to LLM
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedInventory: expect.arrayContaining([
            expect.objectContaining({ text: 'Torch' }),
          ]),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedHealth: expect.arrayContaining([
            expect.objectContaining({ text: 'Minor fatigue' }),
          ]),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedCharacterState: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            Companion: expect.arrayContaining([expect.objectContaining({ text: 'Loyal' })]),
          }),
        }),
        expect.any(Object),
        expect.objectContaining({
          apiKey: 'test-api-key',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          writerValidationContext: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            removableIds: expect.objectContaining({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              threats: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              constraints: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              threads: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              inventory: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              health: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              characterState: expect.any(Array),
            }),
          }),
        })
      );
      const writerOptions = mockedGenerateWriterPage.mock.calls[0]?.[2];
      expect(writerOptions?.observability).toEqual(
        expect.objectContaining({
          storyId: storyWithStructure.id,
          pageId: parentPage.id,
          requestId: expect.any(String),
        })
      );

      // Verify active state accumulates correctly
      expect(page.accumulatedActiveState.currentLocation).toBe('Maze of alleys');
      expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
      expect(page.accumulatedInventory).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Torch' })])
      );
      expect(page.accumulatedHealth).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Minor fatigue' })])
      );
      expect(page.accumulatedCharacterState['Companion']).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Loyal' })])
      );
    });

    it('forwards hierarchical continuity context into planner and writer calls', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} ancestor-context-forwarding`,
        worldbuilding: 'A city where old choices keep resurfacing.',
        tone: 'tense mystery',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const page1 = createPage({
        id: parsePageId(1),
        narrativeText: 'Oldest scene: you accepted the courier mark.',
        sceneSummary: 'Accepted the courier mark and took the assignment.',
        choices: [createChoice('Continue'), createChoice('Turn back')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const page2 = createPage({
        id: parsePageId(2),
        narrativeText: 'Second-oldest scene: you crossed the flooded district.',
        sceneSummary: 'Crossed the flooded district while avoiding patrols.',
        choices: [createChoice('Push onward'), createChoice('Find shelter')],
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });
      const page3 = createPage({
        id: parsePageId(3),
        narrativeText: 'Grandparent scene: you bribed the checkpoint guard.',
        sceneSummary: 'Bribed the checkpoint guard and reached the inner quarter.',
        choices: [createChoice('Enter the archive'), createChoice('Wait and observe')],
        isEnding: false,
        parentPageId: parsePageId(2),
        parentChoiceIndex: 0,
      });
      const parentPage = createPage({
        id: parsePageId(4),
        narrativeText: 'Immediate prior scene: sirens rise as you pick the lock.',
        sceneSummary: 'Picked the lock while alarms spread through the quarter.',
        choices: [createChoice('Slip inside the archive'), createChoice('Retreat to the alleys')],
        isEnding: false,
        parentPageId: parsePageId(3),
        parentChoiceIndex: 0,
      });
      await storage.savePage(baseStory.id, page1);
      await storage.savePage(baseStory.id, page2);
      await storage.savePage(baseStory.id, page3);
      await storage.savePage(baseStory.id, parentPage);

      mockedGeneratePagePlan.mockResolvedValue(buildReducedPagePlanResult());
      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());

      await generateNextPage(baseStory, parentPage, 0, 'test-api-key');

      const expectedAncestorSummaries = [
        {
          pageId: parsePageId(1),
          summary: 'Accepted the courier mark and took the assignment.',
        },
        {
          pageId: parsePageId(2),
          summary: 'Crossed the flooded district while avoiding patrols.',
        },
      ];

      expect(mockedGeneratePagePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          previousNarrative: 'Immediate prior scene: sirens rise as you pick the lock.',
          selectedChoice: 'Slip inside the archive',
          grandparentNarrative: 'Grandparent scene: you bribed the checkpoint guard.',
          ancestorSummaries: expectedAncestorSummaries,
        }),
        expect.any(Object)
      );
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          previousNarrative: 'Immediate prior scene: sirens rise as you pick the lock.',
          selectedChoice: 'Slip inside the archive',
          grandparentNarrative: 'Grandparent scene: you bribed the checkpoint guard.',
          ancestorSummaries: expectedAncestorSummaries,
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('runs planner before continuation writer and forwards planner output into writer context', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} planner-continuation-order`,
        worldbuilding: 'A city with shifting loyalties.',
        tone: 'tense intrigue',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'You hear boots closing in from the plaza.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Run through the arcade'), createChoice('Hide in the chapel')],
        stateChanges: { added: ['Spotted by patrol'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      const pagePlan = buildPagePlanResult({
        sceneIntent: 'Escalate with pursuit and constrained options.',
      });
      mockedGeneratePagePlan.mockResolvedValue(
        buildReducedPagePlanResult({
          sceneIntent: pagePlan.sceneIntent,
          continuityAnchors: pagePlan.continuityAnchors,
          writerBrief: pagePlan.writerBrief,
          dramaticQuestion: pagePlan.dramaticQuestion,
          choiceIntents: pagePlan.choiceIntents,
          rawResponse: pagePlan.rawResponse,
        })
      );
      mockedGenerateStateAccountant.mockResolvedValue({
        stateIntents: pagePlan.stateIntents,
        rawResponse: pagePlan.rawResponse,
      });
      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());

      await generateNextPage(baseStory, parentPage, 0, 'test-api-key');

      expect(mockedGeneratePagePlan).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          observability: expect.objectContaining({
            storyId: baseStory.id,
            pageId: parentPage.id,
            requestId: expect.any(String),
          }),
        })
      );
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          sceneIntent: pagePlan.sceneIntent,
          continuityAnchors: pagePlan.continuityAnchors,
          stateIntents: pagePlan.stateIntents,
          writerBrief: pagePlan.writerBrief,
          dramaticQuestion: pagePlan.dramaticQuestion,
          choiceIntents: pagePlan.choiceIntents,
        }),
        expect.any(Object)
      );
      expect(mockedReconcileState).toHaveBeenCalledWith(
        expect.objectContaining({
          sceneIntent: pagePlan.sceneIntent,
          continuityAnchors: pagePlan.continuityAnchors,
          stateIntents: pagePlan.stateIntents,
          writerBrief: pagePlan.writerBrief,
          dramaticQuestion: pagePlan.dramaticQuestion,
          choiceIntents: pagePlan.choiceIntents,
        }),
        expect.objectContaining({
          narrative: expect.any(String),
          sceneSummary: expect.any(String),
        }),
        expect.objectContaining({
          currentLocation: expect.any(String),
          threats: expect.any(Array),
          constraints: expect.any(Array),
          threads: expect.any(Array),
          inventory: expect.any(Array),
          health: expect.any(Array),
          characterState: expect.any(Array),
        })
      );
      expect(mockedGeneratePagePlan.mock.invocationCallOrder[0]).toBeLessThan(
        mockedGenerateWriterPage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
      );
      expect(mockedGenerateWriterPage.mock.invocationCallOrder[0]).toBeLessThan(
        mockedReconcileState.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
      );
    });

    it('passes decomposed characters from story to writer prompt after disk roundtrip', async () => {
      const holtCharacter = buildMinimalDecomposedCharacter('Holt', {
        rawDescription: 'Grizzled barkeep who knows everyone',
      });
      const baseStory: Story = {
        ...createStory({
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} npcs-passthrough`,
          worldbuilding: 'A world with memorable characters.',
          tone: 'dramatic',
          npcs: [{ name: 'Holt', description: 'Grizzled barkeep who knows everyone' }],
        }),
        decomposedCharacters: [
          buildMinimalDecomposedCharacter('Protagonist'),
          holtCharacter,
        ],
        decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
      };
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      // Reload from disk to prove persistence roundtrip
      const reloadedStory = await storage.loadStory(baseStory.id);
      expect(reloadedStory).not.toBeNull();
      expect(reloadedStory!.decomposedCharacters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Holt' }),
        ])
      );

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Holt pours you a drink.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Ask about the rumor'), createChoice('Leave quietly')],
        stateChanges: { added: ['Met Holt'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(reloadedStory!.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());

      await generateNextPage(reloadedStory!, parentPage, 0, 'test-api-key');

      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          decomposedCharacters: expect.arrayContaining([
            expect.objectContaining({ name: 'Holt' }),
          ]),
        }),
        expect.any(Object),
        expect.objectContaining({
          apiKey: 'test-api-key',
        })
      );
      const writerOptions = mockedGenerateWriterPage.mock.calls[0]?.[2];
      expect(writerOptions?.observability).toEqual(
        expect.objectContaining({
          storyId: reloadedStory!.id,
          pageId: parentPage.id,
          requestId: expect.any(String),
        })
      );
    });

    it('uses parent structureVersionId for branch isolation', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} branch-isolation`,
        worldbuilding: 'A branching world.',
        tone: 'complex',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      const initialVersionId = storyWithStructure.structureVersions?.[0]?.id ?? null;
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'At the crossroads.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Path A'), createChoice('Path B')],
        stateChanges: { added: ['Reached crossroads'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: initialVersionId,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(buildAnalystResult());

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // Child page inherits parent's structure version
      expect(page.structureVersionId).toBe(initialVersionId);
    });

    it('triggers structure rewrite on deviation and creates new version', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} deviation-rewrite`,
        worldbuilding: 'A mutable world.',
        tone: 'dramatic',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      const initialVersionId = storyWithStructure.structureVersions?.[0]?.id ?? null;
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'A pivotal moment.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Betray allies'), createChoice('Stay loyal')],
        stateChanges: { added: ['At pivotal moment'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: initialVersionId,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          deviationDetected: true,
          deviationReason: 'Betrayal invalidates trust-based beats.',
          invalidatedBeatIds: ['1.2', '2.1'],
          narrativeSummary: 'The protagonist chose betrayal.',
        })
      );

      const { page, updatedStory, deviationInfo } = await generateNextPage(
        storyWithStructure,
        parentPage,
        0,
        'test-api-key'
      );

      // Verify new structure version was created
      expect(updatedStory.structureVersions).toHaveLength(2);
      const newVersion = updatedStory.structureVersions?.[1];
      expect(newVersion?.previousVersionId).toBe(initialVersionId);
      expect(newVersion?.rewriteReason).toBe('Betrayal invalidates trust-based beats.');
      expect(newVersion?.createdAtPageId).toBe(page.id);

      // Verify page uses new version
      expect(page.structureVersionId).toBe(newVersion?.id);
      expect(page.structureVersionId).not.toBe(initialVersionId);

      // Verify deviationInfo is returned
      expect(deviationInfo).toBeDefined();
      expect(deviationInfo?.detected).toBe(true);
      expect(deviationInfo?.reason).toBe('Betrayal invalidates trust-based beats.');
      expect(deviationInfo?.beatsInvalidated).toBe(2);
    });

    it('advances structure state when beat is concluded', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} beat-advancement`,
        worldbuilding: 'A progressing world.',
        tone: 'epic',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Working on the first beat.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Complete the beat'), createChoice('Wait for opportunity')],
        stateChanges: { added: ['Working on beat'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          beatConcluded: true,
          beatResolution: 'The first clue was found successfully.',
          objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
          completionGateSatisfied: true,
          objectiveAnchors: ['Establish the mystery'],
          anchorEvidence: ['The first clue was found successfully.'],
        })
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // Verify beat advancement
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'The first clue was found successfully.',
      });
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'active',
      });
    });

    it('action-heavy scene without explicit objective evidence does not conclude beat', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} gating-false-positive`,
        worldbuilding: 'A war-torn capital with collapsing checkpoints.',
        tone: 'high-intensity thriller',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The team races through exploding streets to reach the archive.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Rush the archive gate'), createChoice('Take rooftop route')],
        stateChanges: { added: ['Under pursuit'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(
        buildContinuationResult({
          narrative:
            'Gunfire tears across the boulevard as the team sprints between burning vehicles and collapsing barricades.',
        })
      );
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          beatConcluded: false,
          sceneMomentum: 'MAJOR_PROGRESS',
          objectiveEvidenceStrength: 'WEAK_IMPLICIT',
          commitmentStrength: 'TENTATIVE',
          structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
          entryConditionReadiness: 'PARTIAL',
          objectiveAnchors: ['Establish the mystery'],
          anchorEvidence: [''],
          completionGateSatisfied: false,
          completionGateFailureReason:
            'Action escalation occurred without explicit objective completion.',
        })
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      expect(page.accumulatedStructureState.currentActIndex).toBe(0);
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'active',
      });
      expect(page.accumulatedStructureState.beatProgressions).not.toContainEqual(
        expect.objectContaining({ beatId: '1.1', status: 'concluded' })
      );
    });

    it('turning_point with explicit commitment and anchor evidence can conclude beat', async () => {
      const baseStructure = buildStructure();
      const structure: StoryStructure = {
        ...baseStructure,
        acts: [
          {
            ...baseStructure.acts[0],
            beats: [
              {
                ...baseStructure.acts[0]!.beats[0]!,
                role: 'turning_point',
                objective: 'Publicly commit to exposing the conspiracy',
              },
              baseStructure.acts[0]!.beats[1]!,
            ],
          },
          baseStructure.acts[1]!,
        ],
      };
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} gating-turning-point`,
        worldbuilding: 'A capital where every vow is a political weapon.',
        tone: 'political thriller',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The council chamber waits in tense silence.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [
          createChoice('Make the accusation publicly'),
          createChoice('Delay and gather more proof'),
        ],
        stateChanges: { added: ['Conspiracy evidence prepared'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(
        buildContinuationResult({
          narrative:
            'Before the full council, you name the conspirators and swear to release the ledgers, accepting exile if you fail.',
        })
      );
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          beatConcluded: true,
          beatResolution:
            'The protagonist publicly commits to exposing the conspiracy despite irreversible consequences.',
          sceneMomentum: 'MAJOR_PROGRESS',
          objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
          commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
          structuralPositionSignal: 'BRIDGING_TO_NEXT_BEAT',
          entryConditionReadiness: 'READY',
          objectiveAnchors: ['Publicly commit to exposing the conspiracy'],
          anchorEvidence: [
            'You publicly accuse the conspirators and swear to release the ledgers.',
          ],
          completionGateSatisfied: true,
        })
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      expect(page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution:
          'The protagonist publicly commits to exposing the conspiracy despite irreversible consequences.',
      });
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'active',
      });
    });

    it.each([
      {
        label: 'political thriller',
        concept: 'A whistleblower tries to survive a corrupt ministry purge.',
        worldbuilding: 'A surveillance state where ministries erase dissent overnight.',
        tone: 'tense political thriller',
        narrative:
          'Black sedans close in as leaked dossiers trigger a citywide crackdown, but no proof reaches the tribunal yet.',
      },
      {
        label: 'wilderness survival',
        concept: 'A stranded climber searches for a pass before winter closes in.',
        worldbuilding: 'An alpine range with unstable weather and no rescue corridor.',
        tone: 'gritty survival drama',
        narrative:
          'An avalanche forces a desperate sprint across breaking ice, but no secure route beyond the ridge is established.',
      },
      {
        label: 'romance drama',
        concept: 'Former lovers navigate a high-stakes reunion amid family pressure.',
        worldbuilding: 'A coastal city where family alliances shape every relationship.',
        tone: 'emotional romance drama',
        narrative:
          'The reunion erupts into confessions and confrontation, but neither character makes an explicit commitment to rebuild trust.',
      },
    ])(
      'applies the same completion-gate semantics for $label domain scenarios',
      async (scenario) => {
        const structure = buildStructure();
        const baseStory = createTestStory({
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} cross-domain-${scenario.label}`,
          worldbuilding: scenario.worldbuilding,
          tone: scenario.tone,
        });
        const storyWithStructure = updateStoryStructure(baseStory, structure);
        await storage.saveStory(storyWithStructure);
        createdStoryIds.add(storyWithStructure.id);

        const parentPage = createPage({
          id: parsePageId(1),
          narrativeText: scenario.concept,
          sceneSummary: 'Test summary of the scene events and consequences.',
          choices: [
            createChoice('Push forward under pressure'),
            createChoice('Hold position and reassess'),
          ],
          stateChanges: { added: ['Pressure escalates'], removed: [] },
          isEnding: false,
          parentPageId: null,
          parentChoiceIndex: null,
          parentAccumulatedStructureState: createInitialStructureState(structure),
          structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
        });
        await storage.savePage(storyWithStructure.id, parentPage);

        mockedGenerateWriterPage.mockResolvedValue(
          buildContinuationResult({ narrative: scenario.narrative })
        );
        mockedGenerateAnalystEvaluation.mockResolvedValue(
          buildAnalystResult({
            beatConcluded: false,
            sceneMomentum: 'MAJOR_PROGRESS',
            objectiveEvidenceStrength: 'WEAK_IMPLICIT',
            commitmentStrength: 'TENTATIVE',
            structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
            entryConditionReadiness: 'PARTIAL',
            objectiveAnchors: ['Establish the mystery'],
            anchorEvidence: [''],
            completionGateSatisfied: false,
            completionGateFailureReason:
              'Escalation alone is insufficient without explicit objective evidence.',
          })
        );

        const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

        expect(page.accumulatedStructureState.currentActIndex).toBe(0);
        expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);
        expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
          beatId: '1.1',
          status: 'active',
        });
        expect(page.accumulatedStructureState.beatProgressions).not.toContainEqual(
          expect.objectContaining({ beatId: '1.1', status: 'concluded' })
        );
      }
    );

    it('degrades gracefully when analyst evaluation throws', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} analyst-graceful-degrade`,
        worldbuilding: 'A city of volatile magic.',
        tone: 'dark fantasy',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The ritual circle pulses with unstable energy.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Channel the energy'), createChoice('Disrupt the circle')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockRejectedValue(new Error('Analyst API timeout'));

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // Page is still generated despite analyst failure
      expect(page.narrativeText).toBe('The whispers lead you deeper into the maze of alleys.');
      expect(page.choices).toHaveLength(2);

      // Beat should NOT be concluded (no analyst data)
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'active',
      });
      expect(page.accumulatedStructureState.beatProgressions).not.toContainEqual(
        expect.objectContaining({ beatId: '1.1', status: 'concluded' })
      );

      // No structure rewrite should occur
      expect(page.structureVersionId).toBe(storyWithStructure.structureVersions?.[0]?.id);

      // Graceful degradation should log a warning
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Analyst evaluation failed, continuing with defaults',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('applies pacing nudge from analyst recommendation', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} pacing-nudge`,
        worldbuilding: 'A city of slow revelations.',
        tone: 'deliberate mystery',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The investigation drags through another uneventful alley.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Check the next alley'), createChoice('Return to the plaza')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          recommendedAction: 'nudge',
          pacingIssueDetected: true,
          pacingIssueReason: 'scene dragging',
        })
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      expect(page.accumulatedStructureState.pacingNudge).toBe('scene dragging');
    });

    it('defers pacing rewrite and logs warning instead of rewriting', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} pacing-rewrite-deferred`,
        worldbuilding: 'A city of overextended arcs.',
        tone: 'epic saga',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Another exhausting day of negotiations.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Push through'), createChoice('Take a break')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          recommendedAction: 'rewrite',
          pacingIssueDetected: true,
          pacingIssueReason: 'over budget',
        })
      );

      const { page, updatedStory } = await generateNextPage(
        storyWithStructure,
        parentPage,
        0,
        'test-api-key'
      );

      // Pacing nudge should be null (rewrite is deferred, not applied)
      expect(page.accumulatedStructureState.pacingNudge).toBeNull();

      // No structure rewrite should occur (only deviation triggers rewrite)
      expect(updatedStory.structureVersions).toHaveLength(1);

      // Should log a warning about deferred rewrite
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Pacing issue detected: rewrite recommended (deferred)',
        expect.objectContaining({
          pacingIssueReason: 'over budget',
        })
      );
    });

    it('skips pacing logic when deviation is detected', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} pacing-skipped-on-deviation`,
        worldbuilding: 'A world of betrayal.',
        tone: 'dramatic',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The alliance fractures.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Betray the group'), createChoice('Stay loyal')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          deviationDetected: true,
          deviationReason: 'Betrayal breaks trust arc.',
          invalidatedBeatIds: ['1.2'],
          narrativeSummary: 'The protagonist betrayed the group.',
          recommendedAction: 'nudge',
          pacingIssueDetected: true,
          pacingIssueReason: 'scene moving too slowly',
        })
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // Pacing nudge should be null because deviation takes priority
      // (pacing logic is skipped when deviationInfo is present)
      expect(page.accumulatedStructureState.pacingNudge).toBeNull();
    });
  });

  describe('generateFirstPage integration', () => {
    it('propagates planner failure with pipeline metrics logging', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} planner-failure-propagation`,
        worldbuilding: 'A world of failed plans.',
        tone: 'grim',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const plannerError = new LLMError(
        'Planner schema validation failed',
        'VALIDATION_ERROR',
        false,
        {
          ruleKeys: ['planner.invalid_schema'],
          validationIssues: [{ ruleKey: 'planner.invalid_schema', fieldPath: 'stateIntents' }],
        }
      );
      mockedGeneratePagePlan.mockRejectedValue(plannerError);

      await expect(generateFirstPage(baseStory, 'test-api-key')).rejects.toBe(plannerError);

      // Should log pipeline failure with hard_error status
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Generation pipeline failed',
        expect.objectContaining({
          metrics: expect.objectContaining({
            finalStatus: 'hard_error',
          }),
        })
      );

      // Writer should never have been called
      expect(mockedGenerateOpeningPage).not.toHaveBeenCalled();
    });
  });

  describe('getOrGeneratePage integration', () => {
    it('persists page and updates choice link correctly', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} persistence-test`,
        worldbuilding: 'A persistent world.',
        tone: 'adventure',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The starting point.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Explore'), createChoice('Wait')],
        stateChanges: { added: ['Started'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());

      const result = await getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key');

      // Verify generation occurred
      expect(result.wasGenerated).toBe(true);
      expect(result.page.id).toBe(2);
      expect(result.page.parentPageId).toBe(1);
      expect(result.page.parentChoiceIndex).toBe(0);

      // Verify page was persisted
      const loadedPage = await storage.loadPage(baseStory.id, result.page.id);
      expect(loadedPage).not.toBeNull();
      expect(loadedPage?.narrativeText).toBe(result.page.narrativeText);

      // Verify choice link was updated
      const updatedParent = await storage.loadPage(baseStory.id, parentPage.id);
      expect(updatedParent?.choices[0]?.nextPageId).toBe(result.page.id);
    });

    it('returns cached page without regeneration', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} cache-test`,
        worldbuilding: 'A cached world.',
        tone: 'replay',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root page.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Already explored', parsePageId(2)), createChoice('New path')],
        stateChanges: { added: ['At root'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      const existingChildPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Previously generated content.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Go back')],
        stateChanges: { added: ['Explored before'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });
      await storage.savePage(baseStory.id, existingChildPage);

      // Call getOrGeneratePage for already-linked choice
      const result = await getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key');

      // Verify no regeneration
      expect(result.wasGenerated).toBe(false);
      expect(result.page.id).toBe(2);
      expect(result.page.narrativeText).toBe('Previously generated content.');
      expect(mockedGenerateWriterPage).not.toHaveBeenCalled();
    });

    it('persists story when canon is updated', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} canon-persistence`,
        worldbuilding: 'A world with growing lore.',
        tone: 'epic',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The lore begins.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Discover more'), createChoice('Rest first')],
        stateChanges: { added: ['Started'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue({
        ...buildContinuationResult(),
        newCanonFacts: [{ text: 'A new world fact discovered', factType: 'LAW' }],
        newCharacterCanonFacts: { Sage: ['Knows ancient secrets'] },
      });

      const result = await getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key');

      // Verify story was updated with new canon
      expect(result.story.globalCanon).toContainEqual({ text: 'A new world fact discovered', factType: 'LAW' });
      expect(result.story.globalCharacterCanon['Sage']).toContain('Knows ancient secrets');

      // Verify persistence
      const reloadedStory = await storage.loadStory(baseStory.id);
      expect(reloadedStory?.globalCanon).toContainEqual({ text: 'A new world fact discovered', factType: 'LAW' });
      expect(reloadedStory?.globalCharacterCanon['Sage']).toContain('Knows ancient secrets');
    });

    it('does not persist page or choice link when writer validation fails', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} validation-failure`,
        worldbuilding: 'A world with strict validation.',
        tone: 'tense',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Parent page.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Explore'), createChoice('Wait')],
        stateChanges: { added: ['Started'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockRejectedValue(
        new LLMError('Deterministic validation failed', 'VALIDATION_ERROR', false, {
          ruleKeys: ['writer_output.protagonist_affect.required_non_empty'],
          validationIssues: [
            {
              ruleKey: 'writer_output.protagonist_affect.required_non_empty',
              fieldPath: 'protagonistAffect.primaryEmotion',
            },
          ],
        })
      );

      await expect(
        getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key')
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });

      const child = await storage.loadPage(baseStory.id, parsePageId(2));
      expect(child).toBeNull();

      const parentAfter = await storage.loadPage(baseStory.id, parentPage.id);
      expect(parentAfter?.choices[0]?.nextPageId).toBeNull();
    });
  });

  describe('spine deviation handling', () => {
    function createSpine(): StorySpine {
      return {
        centralDramaticQuestion: 'Will the courier survive the conspiracy?',
        protagonistNeedVsWant: {
          need: 'trust',
          want: 'survival',
          dynamic: 'DIVERGENT',
        },
        primaryAntagonisticForce: {
          description: 'The Shadow Council',
          pressureMechanism: 'Political assassination',
        },
        storySpineType: 'SURVIVAL',
        conflictAxis: 'LOYALTY_VS_SURVIVAL',
        conflictType: 'PERSON_VS_SOCIETY',
        characterArcType: 'POSITIVE_CHANGE',
        toneFeel: ['gritty', 'tense'],
        toneAvoid: ['comedic'],
      };
    }

    function createSpineRewriteFetchResponse(): Response {
      const rewrittenSpine = {
        centralDramaticQuestion: 'Will the courier rise to lead the rebellion?',
        protagonistNeedVsWant: {
          need: 'purpose',
          want: 'power',
          dynamic: 'CONVERGENT',
        },
        primaryAntagonisticForce: {
          description: 'The Iron Ministry',
          pressureMechanism: 'Systematic oppression',
        },
        storySpineType: 'REBELLION',
        conflictAxis: 'INDIVIDUAL_VS_SYSTEM',
        conflictType: 'PERSON_VS_SOCIETY',
        characterArcType: 'POSITIVE_CHANGE',
        toneFeel: ['revolutionary', 'intense'],
        toneAvoid: ['passive'],
      };

      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(rewrittenSpine) } }],
          }),
      } as Response;
    }

    it('triggers spine rewrite and forces structure rewrite when spine deviates', async () => {
      const structure = buildStructure();
      const spine = createSpine();
      const baseStory: Story = {
        ...createTestStory({
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} spine-deviation-rewrite`,
          worldbuilding: 'A city of shifting power.',
          tone: 'tense political thriller',
        }),
        spine,
      };
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The protagonist stumbles onto the rebellion.',
        sceneSummary: 'Discovered the rebellion headquarters.',
        choices: [createChoice('Join the rebellion'), createChoice('Report to authorities')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          spineDeviationDetected: true,
          spineDeviationReason: 'Story shifted from survival to rebellion arc.',
          spineInvalidatedElement: 'conflictType',
        })
      );

      // First fetch call = spine rewrite, second = structure rewrite
      let fetchCallCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.resolve(createSpineRewriteFetchResponse());
        }
        return Promise.resolve(createRewriteFetchResponse());
      });

      const { deviationInfo, updatedStory } = await generateNextPage(
        storyWithStructure,
        parentPage,
        0,
        'test-api-key'
      );

      expect(deviationInfo).toBeDefined();
      expect(deviationInfo?.spineRewritten).toBe(true);
      expect(deviationInfo?.spineInvalidatedElement).toBe('conflictType');
      // Structure rewrite was triggered by spine deviation
      expect(updatedStory.structureVersions).toHaveLength(2);
      expect(updatedStory.spine?.storySpineType).toBe('REBELLION');
    });

    it('spine deviation with concurrent beat deviation enriches deviation info', async () => {
      const structure = buildStructure();
      const spine = createSpine();
      const baseStory: Story = {
        ...createTestStory({
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} spine-beat-concurrent`,
          worldbuilding: 'A city of layered intrigue.',
          tone: 'dramatic thriller',
        }),
        spine,
      };
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Both spine and beat are disrupted.',
        sceneSummary: 'Everything changes.',
        choices: [createChoice('Face the chaos'), createChoice('Retreat')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          spineDeviationDetected: true,
          spineDeviationReason: 'Spine shifted to rebellion.',
          spineInvalidatedElement: 'storySpineType',
          deviationDetected: true,
          deviationReason: 'Beat-level deviation also detected.',
          invalidatedBeatIds: ['1.2'],
          narrativeSummary: 'Major story pivot.',
        })
      );

      let fetchCallCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.resolve(createSpineRewriteFetchResponse());
        }
        return Promise.resolve(createRewriteFetchResponse());
      });

      const { deviationInfo, updatedStory } = await generateNextPage(
        storyWithStructure,
        parentPage,
        0,
        'test-api-key'
      );

      expect(deviationInfo).toBeDefined();
      expect(deviationInfo?.detected).toBe(true);
      expect(deviationInfo?.spineRewritten).toBe(true);
      expect(deviationInfo?.spineInvalidatedElement).toBe('storySpineType');
      expect(updatedStory.structureVersions).toHaveLength(2);
    });

    it('graceful degradation when spine rewrite LLM call fails', async () => {
      const structure = buildStructure();
      const spine = createSpine();
      const baseStory: Story = {
        ...createTestStory({
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} spine-rewrite-failure`,
          worldbuilding: 'A city of fallible systems.',
          tone: 'tense',
        }),
        spine,
      };
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The system fails to adapt.',
        sceneSummary: 'A failed adaptation.',
        choices: [createChoice('Push forward'), createChoice('Retreat')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          spineDeviationDetected: true,
          spineDeviationReason: 'Spine drift detected.',
          spineInvalidatedElement: 'conflictAxis',
        })
      );

      // Spine rewrite fetch fails with non-retryable error to avoid 3s retry delays.
      // The retry mechanism is tested in its own suite (llm/client.test.ts).
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new LLMError('Spine rewrite API timeout', 'NETWORK_ERROR', false)
      );
      // Structure rewrite fetch succeeds (for any other fetch calls)
      (global.fetch as jest.Mock).mockResolvedValue(createRewriteFetchResponse());

      const { page, deviationInfo, updatedStory } = await generateNextPage(
        storyWithStructure,
        parentPage,
        0,
        'test-api-key'
      );

      // Page still generated despite spine rewrite failure
      expect(page.narrativeText).toBe('The whispers lead you deeper into the maze of alleys.');
      // No spine rewrite metadata (spine rewrite failed gracefully)
      expect(deviationInfo?.spineRewritten).toBeUndefined();
      // Original spine preserved
      expect(updatedStory.spine?.storySpineType).toBe('SURVIVAL');
      // Spine rewrite failure was logged
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Spine rewrite failed, continuing with original spine',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('validation guards', () => {
    it('throws STORY_NOT_PREPARED when decomposed data is missing', async () => {
      // Create story WITHOUT decomposedCharacters/decomposedWorld
      const storyWithoutDecomposed = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} missing-decomposed`,
        worldbuilding: 'A world needing decomposition.',
        tone: 'test',
      });
      await storage.saveStory(storyWithoutDecomposed);
      createdStoryIds.add(storyWithoutDecomposed.id);

      await expect(
        generateFirstPage(storyWithoutDecomposed, 'test-api-key')
      ).rejects.toMatchObject({
        name: 'EngineError',
        code: 'STORY_NOT_PREPARED',
      });
    });
  });

  describe('protagonist guidance forwarding', () => {
    it('forwards protagonist guidance through to continuation context', async () => {
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} guidance-forwarding`,
        worldbuilding: 'A city of guided protagonists.',
        tone: 'dramatic',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The protagonist awaits guidance.',
        sceneSummary: 'Awaiting direction.',
        choices: [createChoice('Act with purpose'), createChoice('Hesitate')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());

      const guidance = {
        suggestedEmotions: 'determination and resolve',
        suggestedThoughts: 'thinking about the mission',
        suggestedSpeech: 'I will not fail.',
      };

      await getOrGeneratePage(
        baseStory,
        parentPage,
        0,
        'test-api-key',
        undefined,
        guidance
      );

      // Verify guidance was passed to writer prompt
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          protagonistGuidance: expect.objectContaining({
            suggestedEmotions: 'determination and resolve',
            suggestedThoughts: 'thinking about the mission',
            suggestedSpeech: 'I will not fail.',
          }),
        }),
        expect.any(Object),
        expect.any(Object)
      );

      // Verify guidance was also passed to planner
      expect(mockedGeneratePagePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          protagonistGuidance: expect.objectContaining({
            suggestedEmotions: 'determination and resolve',
            suggestedThoughts: 'thinking about the mission',
            suggestedSpeech: 'I will not fail.',
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('NPC initialization on opening', () => {
    it('initializes NPC agendas and relationships from story initial data on opening', async () => {
      const initialAgendas: readonly NpcAgenda[] = [
        {
          npcName: 'Vex',
          currentGoal: 'Undermine the protagonist',
          leverage: 'Political connections',
          fear: 'Being exposed',
          offScreenBehavior: 'Spreads rumors',
        },
      ];
      const initialRelationships: readonly NpcRelationship[] = [
        {
          npcName: 'Vex',
          valence: -2,
          dynamic: 'rival',
          history: 'Competed for the same position.',
          currentTension: 'Simmering resentment.',
          leverage: 'Knows a dark secret.',
        },
      ];

      const baseStory: Story = {
        ...createTestStory({
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} npc-opening-init`,
          worldbuilding: 'A city of scheming NPCs.',
          tone: 'political intrigue',
          npcs: [{ name: 'Vex', description: 'A scheming rival' }],
        }),
        initialNpcAgendas: initialAgendas,
        initialNpcRelationships: initialRelationships,
      };
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      mockedGenerateOpeningPage.mockResolvedValue(buildOpeningResult());

      const { page } = await generateFirstPage(baseStory, 'test-api-key');

      // NPC agendas initialized from story initial data
      expect(page.accumulatedNpcAgendas).toEqual(
        expect.objectContaining({
          Vex: expect.objectContaining({
            npcName: 'Vex',
            currentGoal: 'Undermine the protagonist',
          }),
        })
      );

      // NPC relationships initialized from story initial data
      expect(page.accumulatedNpcRelationships).toEqual(
        expect.objectContaining({
          Vex: expect.objectContaining({
            npcName: 'Vex',
            valence: -2,
            dynamic: 'rival',
          }),
        })
      );
    });
  });

  describe('NPC relationship updates through page-service', () => {
    it('includes NPC relationship updates from agenda resolver in built page', async () => {
      const initialAgendas: readonly NpcAgenda[] = [
        {
          npcName: 'Mira',
          currentGoal: 'Help the protagonist',
          leverage: 'Healing knowledge',
          fear: 'Being abandoned',
          offScreenBehavior: 'Gathers herbs',
        },
      ];

      const baseStory: Story = {
        ...createTestStory({
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} npc-relationship-updates`,
          worldbuilding: 'A city of evolving relationships.',
          tone: 'dramatic',
          npcs: [{ name: 'Mira', description: 'A helpful healer' }],
        }),
        initialNpcAgendas: initialAgendas,
        decomposedCharacters: [
          buildMinimalDecomposedCharacter('Protagonist'),
          buildMinimalDecomposedCharacter('Mira', { rawDescription: 'A helpful healer' }),
        ],
      };
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Mira tends to your wounds.',
        sceneSummary: 'Mira heals the protagonist.',
        choices: [createChoice('Thank Mira'), createChoice('Continue silently')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());

      const updatedRelationship: NpcRelationship = {
        npcName: 'Mira',
        valence: 3,
        dynamic: 'ally',
        history: 'Healed the protagonist twice.',
        currentTension: 'Growing trust.',
        leverage: 'Emotional bond.',
      };

      const agendaResult: AgendaResolverResult = {
        updatedAgendas: [
          {
            npcName: 'Mira',
            currentGoal: 'Protect the protagonist',
            leverage: 'Healing knowledge',
            fear: 'Being abandoned',
            offScreenBehavior: 'Prepares supplies',
          },
        ],
        updatedRelationships: [updatedRelationship],
        rawResponse: '{"ok":true}',
      };
      mockedGenerateAgendaResolver.mockResolvedValue(agendaResult);

      const { page } = await generateNextPage(baseStory, parentPage, 0, 'test-api-key');

      expect(page.npcRelationshipUpdates).toContainEqual(
        expect.objectContaining({
          npcName: 'Mira',
          valence: 3,
          dynamic: 'ally',
        })
      );
      expect(page.accumulatedNpcRelationships).toEqual(
        expect.objectContaining({
          Mira: expect.objectContaining({
            npcName: 'Mira',
            valence: 3,
            dynamic: 'ally',
          }),
        })
      );
    });
  });

  describe('promise payoff lifecycle', () => {
    it('propagates promise detection and resolution from analyst into page', async () => {
      const structure = buildStructure();
      const baseStory = createTestStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} promise-lifecycle`,
        worldbuilding: 'A world of narrative promises.',
        tone: 'dramatic',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const existingPromise: TrackedPromise = {
        id: 'pr-1',
        description: 'The locked chest in the tower',
        promiseType: 'CHEKHOV_GUN',
        scope: 'ACT',
        resolutionHint: 'The chest will be opened in a critical moment',
        suggestedUrgency: 'HIGH',
        age: 2,
      };

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The tower looms with its secret chest.',
        sceneSummary: 'Approaching the tower.',
        choices: [createChoice('Open the chest'), createChoice('Explore further')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
        accumulatedPromises: [existingPromise],
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          promisesDetected: [
            {
              description: 'A new foreshadowing of betrayal',
              promiseType: 'FORESHADOWING',
              scope: 'BEAT',
              resolutionHint: 'Betrayal will come from an ally',
              suggestedUrgency: 'MEDIUM',
            },
          ],
          promisesResolved: ['pr-1'],
        })
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // The existing promise (pr-1) should be resolved (removed from accumulated)
      const resolvedPromiseIds = page.accumulatedPromises.map((p) => p.id);
      expect(resolvedPromiseIds).not.toContain('pr-1');

      // The new promise should be detected and tracked
      expect(page.accumulatedPromises).toContainEqual(
        expect.objectContaining({
          description: 'A new foreshadowing of betrayal',
          promiseType: 'FORESHADOWING',
          scope: 'BEAT',
          age: 0,
        })
      );

      // Resolved promise metadata should be recorded
      expect(page.resolvedPromiseMeta).toHaveProperty('pr-1');
      expect(page.resolvedPromiseMeta?.['pr-1']).toEqual(
        expect.objectContaining({
          promiseType: 'CHEKHOV_GUN',
          scope: 'ACT',
        })
      );
    });
  });
});
