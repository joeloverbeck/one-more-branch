/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  generateAnalystEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generatePageWriterOutput,
} from '@/llm';
import {
  createChoice,
  createPage,
  createStory,
  parsePageId,
  StoryId,
  updateStoryStructure,
} from '@/models';
import { storage } from '@/persistence';
import {
  generateFirstPage,
  generateNextPage,
  getOrGeneratePage,
  createInitialStructureState,
} from '@/engine';
import { reconcileState } from '@/engine/state-reconciler';
import type { StateReconciliationResult } from '@/engine/state-reconciler-types';
import type { StoryStructure } from '@/models/story-arc';
import { ChoiceType, PrimaryDelta } from '@/models/choice-enums';
import { LLMError } from '@/llm/llm-client-types';
import type { AnalystResult } from '@/llm/analyst-types';
import type { PagePlanGenerationResult } from '@/llm/planner-types';
import type { WriterResult } from '@/llm/writer-types';
import { logger } from '@/logging/index';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
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
const mockedReconcileState = reconcileState as jest.MockedFunction<typeof reconcileState>;
const mockedLogger = logger as {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
};

const TEST_PREFIX = 'TEST PGSVC-INT page-service integration';

function passthroughReconciledState(
  writer: WriterResult,
  previousLocation: string
): StateReconciliationResult {
  return {
    currentLocation: writer.currentLocation || previousLocation,
    threatsAdded: writer.threatsAdded,
    threatsRemoved: writer.threatsRemoved,
    constraintsAdded: writer.constraintsAdded,
    constraintsRemoved: writer.constraintsRemoved,
    threadsAdded: writer.threadsAdded,
    threadsResolved: writer.threadsResolved,
    inventoryAdded: writer.inventoryAdded,
    inventoryRemoved: writer.inventoryRemoved,
    healthAdded: writer.healthAdded,
    healthRemoved: writer.healthRemoved,
    characterStateChangesAdded: writer.characterStateChangesAdded,
    characterStateChangesRemoved: writer.characterStateChangesRemoved,
    newCanonFacts: writer.newCanonFacts,
    newCharacterCanonFacts: writer.newCharacterCanonFacts,
    reconciliationDiagnostics: [],
  };
}

function reconciledStateWithDiagnostics(
  writer: WriterResult,
  previousLocation: string,
  diagnostics: StateReconciliationResult['reconciliationDiagnostics']
): StateReconciliationResult {
  return {
    ...passthroughReconciledState(writer, previousLocation),
    reconciliationDiagnostics: diagnostics,
  };
}

function buildStructure(): StoryStructure {
  return {
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
  };
}

function buildOpeningResult(): WriterResult {
  return {
    narrative: 'You step into the fog-shrouded city as whispers follow your every step.',
    choices: [
      { text: 'Follow the whispers', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      {
        text: 'Seek shelter in the tavern',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'INFORMATION_REVEALED',
      },
    ],
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
    newCanonFacts: ['The city fog carries voices of the dead'],
    newCharacterCanonFacts: { 'The Watcher': ['Observes from the bell tower'] },
    inventoryAdded: ['Weathered map'],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'curiosity',
      primaryIntensity: 'moderate' as const,
      primaryCause: 'the mysterious whispers',
      secondaryEmotions: [],
      dominantMotivation: 'uncover the truth',
    },
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
    rawResponse: 'opening-raw',
  };
}

function buildContinuationResult(overrides?: Partial<WriterResult>): WriterResult {
  return {
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
    newCanonFacts: ['Marked doors hide resistance cells'],
    newCharacterCanonFacts: {},
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'determination',
      primaryIntensity: 'strong' as const,
      primaryCause: 'getting closer to the truth',
      secondaryEmotions: [],
      dominantMotivation: 'reach the resistance',
    },
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
    rawResponse: 'continuation-raw',
    ...overrides,
  };
}

function buildAnalystResult(overrides?: Partial<AnalystResult>): AnalystResult {
  return {
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
    rawResponse: 'analyst-raw',
    ...overrides,
  };
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
    mockedGeneratePagePlan.mockResolvedValue(buildPagePlanResult());
    mockedReconcileState.mockImplementation((_plan, writer, previousState) =>
      passthroughReconciledState(writer as WriterResult, previousState.currentLocation)
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
      const baseStory = createStory({
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
          passthroughReconciledState(writer as WriterResult, previousState.currentLocation)
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
      const baseStory = createStory({
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
      expect(updatedStory.globalCanon).toContain('The city fog carries voices of the dead');
      expect(updatedStory.globalCharacterCanon['The Watcher']).toContain(
        'Observes from the bell tower'
      );
    });

    it('runs planner before opening writer and forwards planner output into opening context', async () => {
      const baseStory = createStory({
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
      mockedGeneratePagePlan.mockResolvedValue(pagePlan);
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
          pagePlan,
        }),
        expect.any(Object)
      );
      expect(mockedReconcileState).toHaveBeenCalledWith(
        pagePlan,
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
      const baseStory = createStory({
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
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} canon-update`,
        worldbuilding: 'A world of secrets.',
        tone: 'mysterious',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      mockedGenerateOpeningPage.mockResolvedValue({
        ...buildOpeningResult(),
        newCanonFacts: ['Fact One', 'Fact Two'],
        newCharacterCanonFacts: {
          Hero: ['Has a scar'],
          Villain: ['Wears a mask'],
        },
      });

      const { updatedStory } = await generateFirstPage(baseStory, 'test-api-key');

      expect(updatedStory.globalCanon).toContain('Fact One');
      expect(updatedStory.globalCanon).toContain('Fact Two');
      expect(updatedStory.globalCharacterCanon['Hero']).toContain('Has a scar');
      expect(updatedStory.globalCharacterCanon['Villain']).toContain('Wears a mask');
    });
  });

  describe('generateNextPage integration', () => {
    it('throws typed hard error after one reconciliation retry failure', async () => {
      const baseStory = createStory({
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
        reconciledStateWithDiagnostics(writer as WriterResult, previousState.currentLocation, [
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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

      mockedGeneratePagePlan.mockResolvedValue(buildPagePlanResult());
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
      const baseStory = createStory({
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
      mockedGeneratePagePlan.mockResolvedValue(pagePlan);
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
        pagePlan,
        expect.any(Object)
      );
      expect(mockedReconcileState).toHaveBeenCalledWith(
        pagePlan,
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

    it('passes npcs from story to writer prompt after disk roundtrip', async () => {
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} npcs-passthrough`,
        worldbuilding: 'A world with memorable characters.',
        tone: 'dramatic',
        npcs: [{ name: 'Holt', description: 'Grizzled barkeep who knows everyone' }],
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      // Reload from disk to prove persistence roundtrip
      const reloadedStory = await storage.loadStory(baseStory.id);
      expect(reloadedStory).not.toBeNull();
      expect(reloadedStory!.npcs).toEqual([
        { name: 'Holt', description: 'Grizzled barkeep who knows everyone' },
      ]);

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
          npcs: [{ name: 'Holt', description: 'Grizzled barkeep who knows everyone' }],
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
        const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
      const baseStory = createStory({
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
        newCanonFacts: ['A new world fact discovered'],
        newCharacterCanonFacts: { Sage: ['Knows ancient secrets'] },
      });

      const result = await getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key');

      // Verify story was updated with new canon
      expect(result.story.globalCanon).toContain('A new world fact discovered');
      expect(result.story.globalCharacterCanon['Sage']).toContain('Knows ancient secrets');

      // Verify persistence
      const reloadedStory = await storage.loadStory(baseStory.id);
      expect(reloadedStory?.globalCanon).toContain('A new world fact discovered');
      expect(reloadedStory?.globalCharacterCanon['Sage']).toContain('Knows ancient secrets');
    });

    it('does not persist page or choice link when writer validation fails', async () => {
      const baseStory = createStory({
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
          ruleKeys: ['writer_output.choice_pair.duplicate'],
          validationIssues: [
            {
              ruleKey: 'writer_output.choice_pair.duplicate',
              fieldPath: 'choices[1]',
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
});
