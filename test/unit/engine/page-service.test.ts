/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  generateAnalystEvaluation,
  generatePagePlan,
  generateOpeningPage,
  generatePageWriterOutput,
  generateLorekeeperBible,
} from '../../../src/llm';
import {
  createChoice,
  createInitialVersionedStructure,
  createPage,
  createStory,
  parsePageId,
  Story,
  StructureVersionId,
  VersionedStoryStructure,
} from '../../../src/models';
import { createInitialStructureState } from '../../../src/engine/structure-state';
import { createStructureRewriter } from '../../../src/engine/structure-rewriter';
import { StateReconciliationError } from '../../../src/engine/state-reconciler-errors';
import { reconcileState } from '../../../src/engine/state-reconciler';
import type { StateReconciliationResult } from '../../../src/engine/state-reconciler-types';
import { storage } from '../../../src/persistence';
import { EngineError } from '../../../src/engine/types';
import {
  generateFirstPage,
  generateNextPage,
  getOrGeneratePage,
} from '../../../src/engine/page-service';
import { ChoiceType, PrimaryDelta } from '../../../src/models/choice-enums';
import { LLMError } from '../../../src/llm/llm-client-types';
import type { PagePlanGenerationResult } from '../../../src/llm/planner-types';
import type { WriterResult } from '../../../src/llm/writer-types';
import { logger } from '../../../src/logging/index.js';
import type { StoryStructure } from '../../../src/models/story-arc';

jest.mock('../../../src/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
  generateLorekeeperBible: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergePageWriterAndReconciledStateWithAnalystResults:
    jest.requireActual('../../../src/llm').mergePageWriterAndReconciledStateWithAnalystResults, // eslint-disable-line @typescript-eslint/no-unsafe-member-access
}));

jest.mock('../../../src/logging/index.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/persistence', () => ({
  storage: {
    getMaxPageId: jest.fn(),
    loadPage: jest.fn(),
    savePage: jest.fn(),
    updateChoiceLink: jest.fn(),
    updateStory: jest.fn(),
  },
}));

jest.mock('../../../src/engine/structure-rewriter', () => ({
  createStructureRewriter: jest.fn(),
}));

jest.mock('../../../src/engine/state-reconciler', () => ({
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
const mockedGenerateLorekeeperBible = generateLorekeeperBible as jest.MockedFunction<
  typeof generateLorekeeperBible
>;
const mockedReconcileState = reconcileState as jest.MockedFunction<typeof reconcileState>;

const mockedStorage = storage as {
  getMaxPageId: jest.Mock;
  loadPage: jest.Mock;
  savePage: jest.Mock;
  updateChoiceLink: jest.Mock;
  updateStory: jest.Mock;
};

const mockedCreateStructureRewriter = createStructureRewriter as jest.MockedFunction<
  typeof createStructureRewriter
>;
const mockedLogger = logger as {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
};

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

function buildStory(overrides?: Partial<Story>): Story {
  return {
    ...createStory({
      title: 'Test Story',
      characterConcept: 'A courier smuggling letters through occupied cities',
      worldbuilding: 'A fractured empire with watchtowers on every road',
      tone: 'tense espionage',
    }),
    ...overrides,
  };
}

function buildStructure(): StoryStructure {
  return {
    overallTheme: 'Outmaneuver the imperial intelligence network.',
    premise: 'A courier must smuggle evidence through occupied territory without being caught.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 30 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Infiltration',
        objective: 'Get inside the censors bureau',
        stakes: 'All courier cells are exposed if you fail',
        entryCondition: 'Curfew patrols intensify',
        beats: [
          {
            id: '1.1',
            description: 'Secure a forged transit seal',
            objective: 'Gain access credentials',
            role: 'setup' as const,
          },
          {
            id: '1.2',
            description: 'Enter the records archive',
            objective: 'Reach the target ledgers',
            role: 'escalation' as const,
          },
        ],
      },
    ],
  };
}

function buildTurningPointFirstBeatStructure(): StoryStructure {
  return {
    overallTheme: 'Expose the conspiracy before the regime consolidates power.',
    premise: 'A courier must force a public commitment that irreversibly changes the conflict.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 30 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Commitment',
        objective: 'Force a point-of-no-return decision',
        stakes: 'Failure means the conspiracy becomes untouchable',
        entryCondition: 'Evidence is assembled',
        beats: [
          {
            id: '1.1',
            description: 'Make the public accusation',
            objective: 'Commit publicly to exposing the conspiracy',
            role: 'turning_point' as const,
          },
          {
            id: '1.2',
            description: 'Withstand immediate retaliation',
            objective: 'Survive the first counterstrike',
            role: 'resolution' as const,
          },
        ],
      },
    ],
  };
}

function buildPagePlanResult(
  overrides?: Partial<PagePlanGenerationResult>
): PagePlanGenerationResult {
  return {
    sceneIntent: 'Push the courier toward a risky move with immediate consequences.',
    continuityAnchors: ['Curfew has started', 'Patrols are active'],
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
      openingLineDirective: 'Start with movement under pressure.',
      mustIncludeBeats: ['Immediate consequence of the selected choice'],
      forbiddenRecaps: ['Do not restate the previous page ending'],
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

describe('page-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGeneratePagePlan.mockResolvedValue(buildPagePlanResult());
    mockedGenerateLorekeeperBible.mockResolvedValue({
      sceneWorldContext: 'Test world context',
      relevantCharacters: [],
      relevantCanonFacts: [],
      relevantHistory: 'Test history',
      rawResponse: 'raw-lorekeeper',
    });
    mockedReconcileState.mockImplementation((_plan, writer, previousState) =>
      passthroughReconciledState(writer as WriterResult, previousState.currentLocation)
    );
  });

  describe('generateFirstPage', () => {
    it('retries reconciliation once with strict failure reasons and preserves request correlation', async () => {
      const story = buildStory();
      const onGenerationStage = jest.fn();
      const pagePlan = buildPagePlanResult();
      const openingWriterResult: WriterResult = {
        narrative: 'You dive behind a collapsed archway as horns echo through the square.',
        choices: [
          {
            text: 'Circle around the patrol',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Hold position and observe',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        currentLocation: 'Collapsed archway',
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
          primaryEmotion: 'urgency',
          primaryIntensity: 'strong' as const,
          primaryCause: 'patrol horns closing in',
          secondaryEmotions: [],
          dominantMotivation: 'avoid immediate capture',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      };
      mockedGeneratePagePlan.mockResolvedValue(pagePlan);
      mockedGenerateOpeningPage.mockResolvedValue(openingWriterResult);
      mockedReconcileState
        .mockReturnValueOnce(
          reconciledStateWithDiagnostics(openingWriterResult, '', [
            {
              code: 'THREAD_DUPLICATE_LIKE_ADD',
              field: 'threadsAdded',
              message: 'Thread add "Reach the archive" is near-duplicate of existing thread "td-1".',
            },
          ])
        )
        .mockImplementation((_plan, writer, previousState) =>
          passthroughReconciledState(writer as WriterResult, previousState.currentLocation)
        );

      const { metrics } = await generateFirstPage(story, 'test-key', onGenerationStage);

      expect(mockedGeneratePagePlan).toHaveBeenCalledTimes(2);
      expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(2);
      expect(mockedReconcileState).toHaveBeenCalledTimes(2);
      expect(mockedGeneratePagePlan.mock.calls[1]?.[0]).toEqual(
        expect.objectContaining({
          reconciliationFailureReasons: [
            {
              code: 'THREAD_DUPLICATE_LIKE_ADD',
              field: 'threadsAdded',
              message: 'Thread add "Reach the archive" is near-duplicate of existing thread "td-1".',
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
              message: 'Thread add "Reach the archive" is near-duplicate of existing thread "td-1".',
            },
          ],
        })
      );
      const plannerRequestIdAttemptOne =
        mockedGeneratePagePlan.mock.calls[0]?.[1]?.observability?.requestId;
      const plannerRequestIdAttemptTwo =
        mockedGeneratePagePlan.mock.calls[1]?.[1]?.observability?.requestId;
      const writerRequestIdAttemptOne =
        mockedGenerateOpeningPage.mock.calls[0]?.[1]?.observability?.requestId;
      const writerRequestIdAttemptTwo =
        mockedGenerateOpeningPage.mock.calls[1]?.[1]?.observability?.requestId;
      expect(plannerRequestIdAttemptOne).toBeTruthy();
      expect(plannerRequestIdAttemptOne).toBe(plannerRequestIdAttemptTwo);
      expect(plannerRequestIdAttemptOne).toBe(writerRequestIdAttemptOne);
      expect(writerRequestIdAttemptOne).toBe(writerRequestIdAttemptTwo);
      expect(metrics).toEqual(
        expect.objectContaining({
          plannerDurationMs: expect.any(Number),
          writerDurationMs: expect.any(Number),
          reconcilerDurationMs: expect.any(Number),
          plannerValidationIssueCount: 0,
          writerValidationIssueCount: 0,
          reconcilerIssueCount: 1,
          reconcilerRetried: true,
          finalStatus: 'success',
        })
      );
      expect(mockedLogger.info.mock.calls).toEqual(
        expect.arrayContaining([
          [
            'Generation stage started',
            expect.objectContaining({
              mode: 'opening',
              storyId: story.id,
              requestId: expect.any(String),
              stage: 'planner',
              attempt: 1,
            }),
          ],
          [
            'Generation stage completed',
            expect.objectContaining({
              mode: 'opening',
              storyId: story.id,
              requestId: expect.any(String),
              stage: 'reconciler',
              attempt: 2,
              durationMs: expect.any(Number),
            }),
          ],
          [
            'Generation pipeline completed',
            expect.objectContaining({
              mode: 'opening',
              storyId: story.id,
              requestId: expect.any(String),
              metrics: expect.objectContaining({
                finalStatus: 'success',
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
              storyId: story.id,
              requestId: expect.any(String),
              attempt: 1,
              failureReasons: [
                {
                  code: 'THREAD_DUPLICATE_LIKE_ADD',
                  field: 'threadsAdded',
                  message: 'Thread add "Reach the archive" is near-duplicate of existing thread "td-1".',
                },
              ],
            }),
          ],
        ])
      );
      expect(onGenerationStage.mock.calls).toEqual([
        [{ stage: 'PLANNING_PAGE', status: 'started', attempt: 1 }],
        [{ stage: 'PLANNING_PAGE', status: 'completed', attempt: 1 }],
        [{ stage: 'WRITING_OPENING_PAGE', status: 'started', attempt: 1 }],
        [{ stage: 'WRITING_OPENING_PAGE', status: 'completed', attempt: 1 }],
        [{ stage: 'PLANNING_PAGE', status: 'started', attempt: 2 }],
        [{ stage: 'PLANNING_PAGE', status: 'completed', attempt: 2 }],
        [{ stage: 'WRITING_OPENING_PAGE', status: 'started', attempt: 2 }],
        [{ stage: 'WRITING_OPENING_PAGE', status: 'completed', attempt: 2 }],
      ]);
    });

    it('passes structure to opening context and uses initial structure state when present', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You arrive under curfew bells as paper ash drifts across the square.',
        choices: [
          {
            text: 'Hide in the print shop',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Bribe a gate sergeant',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'EXPOSURE_CHANGE',
          },
        ],
        currentLocation: 'The capital square at dusk',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: ['Curfew in effect'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: ['The city enforces nightly curfew'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'caution',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'arriving during curfew',
          secondaryEmotions: [],
          dominantMotivation: 'find safe passage',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page, updatedStory } = await generateFirstPage(story, 'test-key');

      expect(mockedGenerateOpeningPage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          apiKey: 'test-key',
          observability: expect.objectContaining({
            storyId: story.id,
            requestId: expect.any(String),
          }),
        })
      );
      expect(page.id).toBe(1);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();
      expect(page.accumulatedStructureState).toEqual(createInitialStructureState(structure));
      expect(page.structureVersionId).toBe(initialVersion.id);
      expect(page.choices.map((choice) => choice.text)).toEqual([
        'Hide in the print shop',
        'Bribe a gate sergeant',
      ]);
      expect(updatedStory.globalCanon).toContain('The city enforces nightly curfew');
      expect(updatedStory.structure).toEqual(structure);
    });

    it('calls planner before opening writer and threads planner output into opening context', async () => {
      const story = buildStory();
      const pagePlan = buildPagePlanResult({ sceneIntent: 'Open with immediate pursuit.' });
      mockedGeneratePagePlan.mockResolvedValue(pagePlan);
      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'Bootsteps close in as you slip through the alley.',
        choices: [
          {
            text: 'Duck into a cellar',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Blend with the crowd',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'EXPOSURE_CHANGE',
          },
        ],
        currentLocation: 'Shadowed alleyway',
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
          primaryEmotion: 'urgency',
          primaryIntensity: 'strong' as const,
          primaryCause: 'incoming patrol',
          secondaryEmotions: [],
          dominantMotivation: 'avoid capture',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      await generateFirstPage(story, 'test-key');

      expect(mockedGeneratePagePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'opening',
          characterConcept: story.characterConcept,
        }),
        expect.objectContaining({
          apiKey: 'test-key',
          observability: expect.objectContaining({
            storyId: story.id,
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

    it('aborts first-page generation before writer call when planner fails', async () => {
      const story = buildStory();
      mockedGeneratePagePlan.mockRejectedValue(
        new LLMError('planner invalid', 'VALIDATION_ERROR', false, { source: 'planner' })
      );

      await expect(generateFirstPage(story, 'test-key')).rejects.toMatchObject({
        name: 'LLMError',
        code: 'VALIDATION_ERROR',
      });
      expect(mockedGenerateOpeningPage).not.toHaveBeenCalled();
    });

    it('throws INVALID_STRUCTURE_VERSION when story has structure but no versions', async () => {
      const structure = buildStructure();
      const story = buildStory({ structure }); // Has structure but no structureVersions

      let error: unknown;
      try {
        await generateFirstPage(story, 'test-key');
      } catch (e) {
        error = e;
      }

      expect(error).toMatchObject({
        name: 'EngineError',
        code: 'INVALID_STRUCTURE_VERSION',
      });
      expect((error as Error).message).toContain('no structure versions');
      expect(mockedGenerateOpeningPage).not.toHaveBeenCalled();
    });

    it('uses empty structure state and omits structure context when story has no structure', async () => {
      const story = buildStory();

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You arrive under curfew bells as paper ash drifts across the square.',
        choices: [
          {
            text: 'Hide in the print shop',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Bribe a gate sergeant',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'EXPOSURE_CHANGE',
          },
        ],
        currentLocation: 'The capital square at dusk',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: ['Curfew in effect'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: ['The city enforces nightly curfew'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'caution',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'arriving during curfew',
          secondaryEmotions: [],
          dominantMotivation: 'find safe passage',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page, updatedStory } = await generateFirstPage(story, 'test-key');

      expect(mockedGenerateOpeningPage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          apiKey: 'test-key',
          observability: expect.objectContaining({
            storyId: story.id,
            requestId: expect.any(String),
          }),
        })
      );
      expect(page.accumulatedStructureState).toEqual({
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      });
      expect(updatedStory.structure).toBeNull();
    });

    it('assigns structureVersionId to first page when story has structure versions', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialVersion],
      });

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You slip through the checkpoint as dusk falls.',
        choices: [
          {
            text: 'Head to the safe house',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Scout the perimeter',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        currentLocation: 'Inside the city walls',
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
          primaryEmotion: 'relief',
          primaryIntensity: 'mild' as const,
          primaryCause: 'successfully entering the city',
          secondaryEmotions: [],
          dominantMotivation: 'find safe shelter',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page } = await generateFirstPage(story, 'test-key');

      // First page should have the initial structure version ID for branch isolation
      expect(page.structureVersionId).toBe(initialVersion.id);
    });

    it('leaves structureVersionId null when story has no structure versions', async () => {
      const story = buildStory(); // No structure, no versions

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You begin your journey.',
        choices: [
          { text: 'Go north', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
          { text: 'Go south', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
        ],
        currentLocation: 'The starting point',
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
          primaryEmotion: 'anticipation',
          primaryIntensity: 'mild' as const,
          primaryCause: 'beginning the journey',
          secondaryEmotions: [],
          dominantMotivation: 'explore the world',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page } = await generateFirstPage(story, 'test-key');

      expect(page.structureVersionId).toBeNull();
    });
  });

  describe('generateNextPage', () => {
    it('throws RECONCILIATION_FAILED after one retry when reconciliation keeps failing', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'You brace as the checkpoint bells begin to ring.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Push through now'), createChoice('Hide and wait')],
        inventoryChanges: { added: ['Courier badge'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGeneratePagePlan.mockResolvedValue(buildPagePlanResult());
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You dash between wagons while lantern light sweeps the road.',
        choices: [
          {
            text: 'Cut through the foundry',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Blend into the queue',
            choiceType: 'SOCIAL_MANIPULATION',
            primaryDelta: 'EXPOSURE_CHANGE',
          },
        ],
        currentLocation: 'Checkpoint approach',
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
          primaryEmotion: 'strain',
          primaryIntensity: 'strong' as const,
          primaryCause: 'checkpoint alarms',
          secondaryEmotions: [],
          dominantMotivation: 'slip through unseen',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedReconcileState.mockImplementation((_plan, writer, previousState) =>
        reconciledStateWithDiagnostics(writer as WriterResult, previousState.currentLocation, [
          {
            code: 'UNKNOWN_STATE_ID',
            field: 'constraintsRemoved',
            message: 'Unknown state ID "cn-999" in constraintsRemoved.',
          },
        ])
      );

      const promise = generateNextPage(story, parentPage, 0, 'test-key');

      await expect(promise).rejects.toBeInstanceOf(StateReconciliationError);
      await expect(promise).rejects.toMatchObject({
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
              storyId: story.id,
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

    it('throws INVALID_CHOICE for out-of-bounds index', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        inventoryChanges: { added: ['Started mission'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      await expect(generateNextPage(story, parentPage, 3, 'test-key')).rejects.toMatchObject({
        name: 'EngineError',
        code: 'INVALID_CHOICE',
      });
      expect(mockedStorage.getMaxPageId).not.toHaveBeenCalled();
    });

    it('calls planner before continuation writer and passes planner output to writer context', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'You hear armored footsteps behind you.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Sprint down the alley'), createChoice('Hide in a doorway')],
        inventoryChanges: { added: ['Courier satchel'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const pagePlan = buildPagePlanResult({
        sceneIntent: 'Immediate pursuit through narrow passages.',
      });
      mockedGeneratePagePlan.mockResolvedValue(pagePlan);
      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You vault a crate and nearly collide with a market stall.',
        choices: [
          {
            text: 'Cut through the market',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Climb to the roofs',
            choiceType: 'PATH_DIVERGENCE',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: 'Crowded market lane',
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
          primaryEmotion: 'strain',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'sprinting while pursued',
          secondaryEmotions: [],
          dominantMotivation: 'break line of sight',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      await generateNextPage(
        story,
        parentPage,
        0,
        'test-key',
        undefined,
        'We should cut through the courtyard.'
      );

      expect(mockedGeneratePagePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'continuation',
          selectedChoice: parentPage.choices[0]?.text,
          previousNarrative: parentPage.narrativeText,
          suggestedProtagonistSpeech: 'We should cut through the courtyard.',
        }),
        expect.objectContaining({
          apiKey: 'test-key',
          observability: expect.objectContaining({
            storyId: story.id,
            pageId: parentPage.id,
            requestId: expect.any(String),
          }),
        })
      );
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedProtagonistSpeech: 'We should cut through the courtyard.',
        }),
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

    it('emits continuation and analyst stage callbacks at prompt boundaries', async () => {
      const onGenerationStage = jest.fn();
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialVersion],
      });
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'You slip into the archive.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Investigate the logbook'), createChoice('Lock the door')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'Dust rises as you open the ledger.',
        choices: [
          { text: 'Copy names', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
          { text: 'Hide evidence', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        ],
        currentLocation: 'Archive office',
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
          primaryEmotion: 'focus',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'found useful records',
          secondaryEmotions: [],
          dominantMotivation: 'secure proof',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist recovered useful clues.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        completionGateSatisfied: true,
        rawResponse: 'raw-analyst',
      });

      await generateNextPage(story, parentPage, 0, 'test-key', onGenerationStage);

      expect(onGenerationStage.mock.calls).toEqual([
        [{ stage: 'PLANNING_PAGE', status: 'started', attempt: 1 }],
        [{ stage: 'PLANNING_PAGE', status: 'completed', attempt: 1 }],
        [{ stage: 'WRITING_CONTINUING_PAGE', status: 'started', attempt: 1 }],
        [{ stage: 'CURATING_CONTEXT', status: 'started', attempt: 1 }],
        [{ stage: 'CURATING_CONTEXT', status: 'completed', attempt: 1 }],
        [{ stage: 'WRITING_CONTINUING_PAGE', status: 'started', attempt: 1 }],
        [{ stage: 'WRITING_CONTINUING_PAGE', status: 'completed', attempt: 1 }],
        [{ stage: 'ANALYZING_SCENE', status: 'started', attempt: 1 }],
        [{ stage: 'ANALYZING_SCENE', status: 'completed', attempt: 1 }],
      ]);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Generation stage started',
        expect.objectContaining({
          mode: 'continuation',
          storyId: story.id,
          pageId: parentPage.id,
          requestId: expect.any(String),
          stage: 'analyst',
          attempt: 1,
        })
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Generation stage completed',
        expect.objectContaining({
          mode: 'continuation',
          storyId: story.id,
          pageId: parentPage.id,
          requestId: expect.any(String),
          stage: 'analyst',
          attempt: 1,
          durationMs: expect.any(Number),
        })
      );
    });

    it('aborts continuation generation before writer call when planner fails', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'You ready your next move.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Advance'), createChoice('Wait')],
        inventoryChanges: { added: ['Signal flare'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGeneratePagePlan.mockRejectedValue(
        new LLMError('planner invalid', 'VALIDATION_ERROR', false, { source: 'planner' })
      );

      await expect(generateNextPage(story, parentPage, 0, 'test-key')).rejects.toMatchObject({
        name: 'LLMError',
        code: 'VALIDATION_ERROR',
      });
      expect(mockedGenerateWriterPage).not.toHaveBeenCalled();
    });

    it('creates child page with proper parent linkage and sequential id', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        globalCanon: ['The watch captain is corrupt'],
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You slip into an alley lit by furnace smoke.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Take the rooftops'), createChoice('Use the sewer tunnels')],
        inventoryChanges: { added: ['Escaped the checkpoint'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedInventory: [{ id: 'inv-1', text: 'Reached the capital at dusk' }],
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(7);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You move across wet tiles while patrol torches sweep below.',
        choices: [
          {
            text: 'Leap to the clocktower',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Drop into the market canopy',
            choiceType: 'PATH_DIVERGENCE',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: 'Rooftops above the market district',
        threatsAdded: ['Patrol torches are scanning the rooftops below'],
        threatsRemoved: [],
        constraintsAdded: ['Must move quietly to avoid detection'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: ['Clocktower guards rotate every ten minutes'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'focus',
          primaryIntensity: 'strong' as const,
          primaryCause: 'navigating the rooftops',
          secondaryEmotions: [],
          dominantMotivation: 'reach the clocktower unseen',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page, updatedStory, metrics } = await generateNextPage(
        story,
        parentPage,
        0,
        'test-key'
      );

      expect(mockedStorage.getMaxPageId).toHaveBeenCalledWith(story.id);
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          apiKey: 'test-key',
          observability: expect.objectContaining({
            storyId: story.id,
            pageId: parentPage.id,
            requestId: expect.any(String),
          }),
          writerValidationContext: expect.objectContaining({
            removableIds: expect.objectContaining({
              threats: expect.any(Array),
              constraints: expect.any(Array),
              threads: expect.any(Array),
              inventory: expect.any(Array),
              health: expect.any(Array),
              characterState: expect.any(Array),
            }),
          }),
        })
      );
      expect(page.id).toBe(8);
      expect(page.parentPageId).toBe(parentPage.id);
      expect(page.parentChoiceIndex).toBe(0);
      expect(page.structureVersionId).toBe(initialStructureVersion.id);
      // Accumulated inventory inherits parent state plus own additions
      expect(page.accumulatedInventory).toEqual(parentPage.accumulatedInventory);
      // New active state is in accumulatedActiveState
      expect(page.accumulatedActiveState.currentLocation).toBe(
        'Rooftops above the market district'
      );
      // Active state stores keyed entries ({ id, text }) in accumulated state
      expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
      expect(page.accumulatedActiveState.activeConstraints).toHaveLength(1);
      expect(updatedStory.globalCanon).toContain('Clocktower guards rotate every ten minutes');
      expect(metrics).toEqual(
        expect.objectContaining({
          reconcilerRetried: false,
          reconcilerIssueCount: 0,
          finalStatus: 'success',
        })
      );
    });

    it('throws INVALID_STRUCTURE_VERSION when story has structure but no versions', async () => {
      const structure = buildStructure();
      const story = buildStory({ structure }); // Has structure but no structureVersions
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You slip into the archive district after curfew.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Scale the intake vent'), createChoice('Wait for guard change')],
        inventoryChanges: { added: ['Reached archive district'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: createInitialStructureState(structure),
      });

      let error: unknown;
      try {
        await generateNextPage(story, parentPage, 0, 'test-key');
      } catch (e) {
        error = e;
      }

      expect(error).toMatchObject({
        name: 'EngineError',
        code: 'INVALID_STRUCTURE_VERSION',
      });
      expect((error as Error).message).toContain('no structure versions');
      expect(mockedStorage.getMaxPageId).not.toHaveBeenCalled();
    });

    it('advances structure state when continuation result concludes the current beat', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You secure forged papers in a shuttered print cellar.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [
          createChoice('Approach the archive checkpoint'),
          createChoice('Scout the sewer hatch'),
        ],
        inventoryChanges: { added: ['Acquired forged transit seal'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'The checkpoint captain stamps your seal and waves you through.',
        choices: [
          {
            text: 'Enter the archive corridor',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Detour to the guard locker',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        currentLocation: 'Inside the censors bureau',
        threatsAdded: [],
        threatsRemoved: ['Checkpoint security'],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [
          { text: 'Access the records archive', threadType: 'INFORMATION', urgency: 'MEDIUM' },
        ],
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
          primaryEmotion: 'satisfaction',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'passing the checkpoint successfully',
          secondaryEmotions: [],
          dominantMotivation: 'reach the target ledgers',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: true,
        beatResolution: 'The forged transit seal got you through the checkpoint.',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.accumulatedStructureState.currentActIndex).toBe(0);
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'The forged transit seal got you through the checkpoint.',
      });
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'active',
      });
    });

    it('guardrail prevents turning_point progression when completion gate is not satisfied', async () => {
      const structure = buildTurningPointFirstBeatStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You stand before the full council with ledgers in hand.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [
          createChoice('Accuse the minister publicly'),
          createChoice('Delay and gather one more witness'),
        ],
        inventoryChanges: { added: ['Council hearing scheduled'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'The chamber erupts, but your accusation remains ambiguous and contestable.',
        choices: [
          { text: 'Name names now', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'Retreat and regroup',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: 'Council chamber',
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
          primaryEmotion: 'urgency',
          primaryIntensity: 'strong' as const,
          primaryCause: 'public confrontation under pressure',
          secondaryEmotions: [],
          dominantMotivation: 'force accountability',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: true,
        beatResolution: 'The accusation scene escalates rapidly.',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        sceneMomentum: 'MAJOR_PROGRESS',
        objectiveEvidenceStrength: 'WEAK_IMPLICIT',
        commitmentStrength: 'TENTATIVE',
        structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
        entryConditionReadiness: 'PARTIAL',
        objectiveAnchors: ['Commit publicly to exposing the conspiracy'],
        anchorEvidence: [''],
        completionGateSatisfied: false,
        completionGateFailureReason: 'No explicit irrevocable commitment was made.',
        rawResponse: 'raw-analyst',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'active',
      });
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Turning point completion gate mismatch; forcing beatConcluded=false',
        expect.objectContaining({
          storyId: story.id,
          parentPageId: parentPage.id,
          beatId: '1.1',
          beatRole: 'turning_point',
          completionGateFailureReason: 'No explicit irrevocable commitment was made.',
        })
      );
    });

    it('does not apply turning_point guardrail to non-turning_point beats', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You are still on the setup beat.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Push through checkpoint'), createChoice('Retreat')],
        inventoryChanges: { added: ['Forged papers'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You slip through the gate and secure access.',
        choices: [
          {
            text: 'Proceed to archive wing',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Hold position',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        currentLocation: 'Archive threshold',
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
          primaryEmotion: 'focus',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'momentum through security',
          secondaryEmotions: [],
          dominantMotivation: 'reach the ledgers',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: true,
        beatResolution: 'Checkpoint bypassed successfully.',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        sceneMomentum: 'MAJOR_PROGRESS',
        objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
        commitmentStrength: 'NONE',
        structuralPositionSignal: 'BRIDGING_TO_NEXT_BEAT',
        entryConditionReadiness: 'READY',
        objectiveAnchors: ['Gain access credentials'],
        anchorEvidence: ['Forged papers are accepted and access is granted.'],
        completionGateSatisfied: false,
        completionGateFailureReason: 'Intentional control case for non-turning-point beat.',
        rawResponse: 'raw-analyst',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(mockedLogger.warn).not.toHaveBeenCalledWith(
        'Turning point completion gate mismatch; forcing beatConcluded=false',
        expect.anything()
      );
    });

    it('allows turning_point progression when completion gate is satisfied', async () => {
      const structure = buildTurningPointFirstBeatStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'The council awaits your declaration.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Commit publicly now'), createChoice('Abandon the hearing')],
        inventoryChanges: { added: ['Prepared public evidence packet'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You publicly name the conspirators and bind yourself to the prosecution.',
        choices: [
          {
            text: 'Face retaliation head-on',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'THREAT_SHIFT',
          },
          {
            text: 'Seek immediate sanctuary',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: 'Council chamber',
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
          primaryEmotion: 'resolve',
          primaryIntensity: 'strong' as const,
          primaryCause: 'irreversible public commitment',
          secondaryEmotions: [],
          dominantMotivation: 'see the conspiracy broken',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: true,
        beatResolution: 'The accusation is publicly and irreversibly committed.',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        sceneMomentum: 'MAJOR_PROGRESS',
        objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
        commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
        structuralPositionSignal: 'BRIDGING_TO_NEXT_BEAT',
        entryConditionReadiness: 'READY',
        objectiveAnchors: ['Commit publicly to exposing the conspiracy'],
        anchorEvidence: ['The protagonist names conspirators and accepts immediate legal risk.'],
        completionGateSatisfied: true,
        completionGateFailureReason: '',
        rawResponse: 'raw-analyst',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'The accusation is publicly and irreversibly committed.',
      });
    });

    it('keeps structure state unchanged when continuation result does not conclude the beat', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You wait beside the archive gate until patrols shift.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Slip in behind a clerk'), createChoice('Retreat before dawn')],
        inventoryChanges: { added: ['Observed patrol rotation'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You stay hidden and gather more intel from passing clerks.',
        choices: [
          {
            text: 'Keep watching',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
          {
            text: 'Create a distraction',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'THREAT_SHIFT',
          },
        ],
        currentLocation: 'Hidden near the archive gate',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [
          { text: 'Mapped sentry rotation patterns', threadType: 'INFORMATION', urgency: 'MEDIUM' },
        ],
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
          primaryEmotion: 'patience',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'gathering intel carefully',
          secondaryEmotions: [],
          dominantMotivation: 'find the right moment',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.accumulatedStructureState).toEqual({
        ...parentPage.accumulatedStructureState,
        pagesInCurrentBeat: parentPage.accumulatedStructureState.pagesInCurrentBeat + 1,
      });
    });

    it('keeps structure progression isolated per branch', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'At the bureau wall, you choose speed or caution.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [
          createChoice('Force a checkpoint pass'),
          createChoice('Gather more evidence first'),
        ],
        inventoryChanges: { added: ['Reached bureau perimeter'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(10);
      mockedGenerateWriterPage
        .mockResolvedValueOnce({
          narrative: 'A forged seal gets you inside.',
          choices: [
            {
              text: 'Head for ledger room',
              choiceType: 'TACTICAL_APPROACH',
              primaryDelta: 'LOCATION_CHANGE',
            },
            {
              text: 'Plant false records',
              choiceType: 'TACTICAL_APPROACH',
              primaryDelta: 'EXPOSURE_CHANGE',
            },
          ],
          currentLocation: 'Inside the bureau',
          threatsAdded: [],
          threatsRemoved: ['Checkpoint guards'],
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
            primaryEmotion: 'triumph',
            primaryIntensity: 'moderate' as const,
            primaryCause: 'breaching the checkpoint',
            secondaryEmotions: [],
            dominantMotivation: 'reach the ledger room',
          },
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
          rawResponse: 'raw',
        })
        .mockResolvedValueOnce({
          narrative: 'You hold position and log patrol timing.',
          choices: [
            {
              text: 'Create diversion',
              choiceType: 'TACTICAL_APPROACH',
              primaryDelta: 'THREAT_SHIFT',
            },
            { text: 'Withdraw', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
          ],
          currentLocation: 'Hidden observation post',
          threatsAdded: [],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [
            { text: 'Patrol schedule documented', threadType: 'INFORMATION', urgency: 'MEDIUM' },
          ],
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
            primaryEmotion: 'patience',
            primaryIntensity: 'moderate' as const,
            primaryCause: 'gathering critical intel',
            secondaryEmotions: [],
            dominantMotivation: 'find the right moment',
          },
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
          rawResponse: 'raw',
        });
      // Branch 1: analyst concludes the beat; Branch 2: analyst does not
      mockedGenerateAnalystEvaluation
        .mockResolvedValueOnce({
          beatConcluded: true,
          beatResolution: 'Checkpoint breached with forged credentials.',
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: 'The protagonist continues the current scene.',
          pacingIssueDetected: false,
          pacingIssueReason: '',
          recommendedAction: 'none',
          rawResponse: 'raw-analyst',
        })
        .mockResolvedValueOnce({
          beatConcluded: false,
          beatResolution: '',
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: 'The protagonist continues the current scene.',
          pacingIssueDetected: false,
          pacingIssueReason: '',
          recommendedAction: 'none',
          rawResponse: 'raw-analyst',
        });

      const branchOne = await generateNextPage(story, parentPage, 0, 'test-key');
      const branchTwo = await generateNextPage(story, parentPage, 1, 'test-key');

      expect(branchOne.page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(branchTwo.page.accumulatedStructureState).toEqual({
        ...parentPage.accumulatedStructureState,
        pagesInCurrentBeat: parentPage.accumulatedStructureState.pagesInCurrentBeat + 1,
      });
      expect(parentPage.accumulatedStructureState.currentBeatIndex).toBe(0);
    });

    it('does not trigger structure rewrite when deviation is not detected', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider your next move.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Proceed carefully'), createChoice('Rush ahead')],
        inventoryChanges: { added: ['Assessed situation'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You move carefully through the shadows.',
        choices: [
          {
            text: 'Continue forward',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Take alternate route',
            choiceType: 'PATH_DIVERGENCE',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: 'Shadow corridor',
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
          primaryEmotion: 'stealth',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'moving unseen',
          secondaryEmotions: [],
          dominantMotivation: 'remain undetected',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      const { page, updatedStory } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedCreateStructureRewriter).not.toHaveBeenCalled();
      expect(page.structureVersionId).toBe(initialStructureVersion.id);
      expect(updatedStory.structureVersions).toHaveLength(1);
      expect(updatedStory.structureVersions?.[0]?.id).toBe(initialStructureVersion.id);
    });

    it('triggers structure rewrite and creates new version when deviation is detected', async () => {
      const onGenerationStage = jest.fn();
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider betraying your original mission.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Join imperial command'), createChoice('Stay with resistance')],
        inventoryChanges: { added: ['Mission allegiance uncertain'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      const rewrittenStructure: StoryStructure = {
        overallTheme: 'Outmaneuver the imperial intelligence network.',
        premise: 'A courier defects to the empire and must prove loyalty.',
        pacingBudget: { targetPagesMin: 15, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Imperial Service',
            objective: 'Prove loyalty to the empire',
            stakes: 'Discovery means execution',
            entryCondition: 'After defection',
            beats: [
              {
                id: '1.1',
                description: 'Accept imperial posting',
                objective: 'Gain trust within command structure',
                role: 'setup' as const,
              },
              {
                id: '1.2',
                description: 'First loyalty test',
                objective: 'Prove allegiance to new masters',
                role: 'escalation' as const,
              },
            ],
          },
        ],
      };

      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: rewrittenStructure,
          preservedBeatIds: [],
          rawResponse: 'rewritten',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You publicly defect and swear service to the empire.',
        choices: [
          {
            text: 'Take command posting',
            choiceType: 'IDENTITY_EXPRESSION',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: 'Return as double agent',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'EXPOSURE_CHANGE',
          },
        ],
        currentLocation: 'Imperial command hall',
        threatsAdded: ['Resistance hunting you'],
        threatsRemoved: ['Imperial suspicion'],
        constraintsAdded: ['Must prove loyalty'],
        constraintsRemoved: [],
        threadsAdded: [
          { text: 'Serve imperial command', threadType: 'INFORMATION', urgency: 'MEDIUM' },
        ],
        threadsResolved: ['Infiltrate the empire'],
        newCanonFacts: ['Resistance branded you a traitor'],
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
          primaryCause: 'committing to the new path',
          secondaryEmotions: [],
          dominantMotivation: 'prove worth to new masters',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: true,
        deviationReason: 'Current infiltration beats are invalid after defection.',
        invalidatedBeatIds: ['1.2'],
        narrativeSummary: 'Protagonist joined imperial command hierarchy.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      const { page, updatedStory } = await generateNextPage(
        story,
        parentPage,
        0,
        'test-key',
        onGenerationStage
      );

      expect(mockedCreateStructureRewriter).toHaveBeenCalled();
      expect(mockRewriter.rewriteStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
          deviationReason: 'Current infiltration beats are invalid after defection.',
          narrativeSummary: 'Protagonist joined imperial command hierarchy.',
        }),
        'test-key'
      );

      expect(page.id).toBe(3);
      expect(page.parentPageId).toBe(parentPage.id);
      expect(page.structureVersionId).not.toBe(initialStructureVersion.id);
      expect(page.structureVersionId).not.toBeNull();

      expect(updatedStory.structureVersions).toHaveLength(2);
      expect(updatedStory.structureVersions?.[1]?.previousVersionId).toBe(
        initialStructureVersion.id
      );
      expect(updatedStory.structureVersions?.[1]?.rewriteReason).toBe(
        'Current infiltration beats are invalid after defection.'
      );
      expect(updatedStory.structureVersions?.[1]?.createdAtPageId).toBe(page.id);
      expect(updatedStory.globalCanon).toContain('Resistance branded you a traitor');
      expect(onGenerationStage.mock.calls).toEqual(
        expect.arrayContaining([
          [{ stage: 'RESTRUCTURING_STORY', status: 'started', attempt: 1 }],
          [{ stage: 'RESTRUCTURING_STORY', status: 'completed', attempt: 1 }],
        ])
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Generation stage started',
        expect.objectContaining({
          mode: 'continuation',
          storyId: story.id,
          pageId: parentPage.id,
          requestId: expect.any(String),
          stage: 'structure-rewrite',
          attempt: 1,
        })
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Generation stage completed',
        expect.objectContaining({
          mode: 'continuation',
          storyId: story.id,
          pageId: parentPage.id,
          requestId: expect.any(String),
          stage: 'structure-rewrite',
          attempt: 1,
          durationMs: expect.any(Number),
        })
      );
    });

    it('uses parent page structureVersionId for branch isolation instead of latest version', async () => {
      // Setup: Create v1 structure and parent page using v1
      const structureV1 = buildStructure();
      const versionV1 = createInitialVersionedStructure(structureV1);
      const parentStructureState = createInitialStructureState(structureV1);

      // Create a rewritten structure v2 (simulating another branch caused a rewrite)
      const structureV2: StoryStructure = {
        overallTheme: 'Rewritten theme from another branch.',
        premise: 'A different path through the occupied territory.',
        pacingBudget: { targetPagesMin: 15, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Different Path',
            objective: 'Different objective',
            stakes: 'Different stakes',
            entryCondition: 'Different entry',
            beats: [
              {
                id: '1.1',
                description: 'Different beat 1',
                objective: 'Different obj 1',
                role: 'setup' as const,
              },
              {
                id: '1.2',
                description: 'Different beat 2',
                objective: 'Different obj 2',
                role: 'escalation' as const,
              },
            ],
          },
        ],
      };
      const versionV2: VersionedStoryStructure = {
        id: 'sv-9999999999999-v2v2' as StructureVersionId,
        structure: structureV2,
        previousVersionId: versionV1.id,
        createdAtPageId: parsePageId(99),
        rewriteReason: 'Another branch caused this rewrite',
        preservedBeatIds: [],
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      };

      // Story has BOTH versions (v1 is original, v2 was created by another branch)
      // story.structure points to v2 (the "latest")
      const story = buildStory({
        structure: structureV2, // Latest structure is v2
        structureVersions: [versionV1, versionV2], // Both versions exist
      });

      // Parent page was created with v1 (before the rewrite in another branch)
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You stand at a crossroads in the archive.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Take the left passage'), createChoice('Take the right passage')],
        inventoryChanges: { added: ['Reached crossroads'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: versionV1.id, // Parent was created with v1!
      });

      mockedStorage.getMaxPageId.mockResolvedValue(100);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You proceed down the left passage.',
        choices: [
          {
            text: 'Continue forward',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          { text: 'Turn back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
        ],
        currentLocation: 'Left passage in the archive',
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
          primaryEmotion: 'curiosity',
          primaryIntensity: 'mild' as const,
          primaryCause: 'exploring the archive',
          secondaryEmotions: [],
          dominantMotivation: 'find the records',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      // CRITICAL: The new page should use v1 (parent's version), NOT v2 (latest)
      expect(page.structureVersionId).toBe(versionV1.id);

      // The LLM should have been called with v1's structure, not v2's
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          structure: structureV1, // Should be v1, not v2!
        }),
        expect.any(Object),
        expect.objectContaining({
          apiKey: 'test-key',
          observability: expect.objectContaining({
            storyId: story.id,
            pageId: parentPage.id,
            requestId: expect.any(String),
          }),
        })
      );
    });

    it('throws INVALID_STRUCTURE_VERSION when parent page has null structureVersionId but story has structure', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);

      const story = buildStory({
        structure,
        structureVersions: [initialVersion],
      });

      // Parent page has null structureVersionId - this is now invalid for structured stories
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Legacy page without version tracking.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Proceed'), createChoice('Stay back')],
        inventoryChanges: { added: ['Started'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: null, // No version ID - invalid for structured stories
      });

      let error: unknown;
      try {
        await generateNextPage(story, parentPage, 0, 'test-key');
      } catch (e) {
        error = e;
      }

      expect(error).toMatchObject({
        name: 'EngineError',
        code: 'INVALID_STRUCTURE_VERSION',
      });
      expect((error as Error).message).toContain('null structureVersionId');
      expect(mockedStorage.getMaxPageId).not.toHaveBeenCalled();
      expect(mockedGenerateWriterPage).not.toHaveBeenCalled();
    });

    it('does not trigger rewrite when story has no structure', async () => {
      // Story without structure at all - no rewrite should occur
      const story = buildStory(); // No structure, no versions
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider betraying your original mission.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Join imperial command'), createChoice('Stay with resistance')],
        inventoryChanges: { added: ['Mission allegiance uncertain'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You publicly defect and swear service to the empire.',
        choices: [
          {
            text: 'Take command posting',
            choiceType: 'IDENTITY_EXPRESSION',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: 'Return as double agent',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'EXPOSURE_CHANGE',
          },
        ],
        currentLocation: 'Imperial command hall',
        threatsAdded: ['Resistance hunters'],
        threatsRemoved: [],
        constraintsAdded: ['Prove loyalty'],
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
          primaryEmotion: 'resolve',
          primaryIntensity: 'strong' as const,
          primaryCause: 'choosing a new path',
          secondaryEmotions: [],
          dominantMotivation: 'survive the transition',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page, updatedStory } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedGenerateAnalystEvaluation).not.toHaveBeenCalled();
      expect(mockedCreateStructureRewriter).not.toHaveBeenCalled();
      expect(page.structureVersionId).toBeNull();
      // Story without structure has no structureVersions
      expect(updatedStory.structureVersions).toHaveLength(0);
    });

    it('returns deviationInfo when deviation is detected', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider a dramatic change of course.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Betray allies'), createChoice('Stay loyal')],
        inventoryChanges: { added: ['At crossroads'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      const rewrittenStructure: StoryStructure = {
        overallTheme: 'New path theme.',
        premise: 'After betraying allies, the protagonist forges a new identity.',
        pacingBudget: { targetPagesMin: 15, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'New Path',
            objective: 'Follow new direction',
            stakes: 'Everything',
            entryCondition: 'After betrayal',
            beats: [
              {
                id: '1.1',
                description: 'Accept new role',
                objective: 'Establish new identity',
                role: 'setup' as const,
              },
            ],
          },
        ],
      };

      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: rewrittenStructure,
          preservedBeatIds: [],
          rawResponse: 'rewritten',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You betray your allies.',
        choices: [
          {
            text: 'Embrace new life',
            choiceType: 'IDENTITY_EXPRESSION',
            primaryDelta: 'GOAL_SHIFT',
          },
          { text: 'Second thoughts', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT' },
        ],
        currentLocation: 'The aftermath of betrayal',
        threatsAdded: ['Former allies seek revenge'],
        threatsRemoved: [],
        constraintsAdded: ['Trust broken'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: ['Alliance with companions'],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'guilt',
          primaryIntensity: 'strong' as const,
          primaryCause: 'betraying trusted allies',
          secondaryEmotions: [],
          dominantMotivation: 'justify the betrayal',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: true,
        deviationReason: 'Player chose to betray allies, invalidating trust-based beats.',
        invalidatedBeatIds: ['1.1', '1.2'],
        narrativeSummary: 'Alliance shattered after betrayal.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      const { deviationInfo } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(deviationInfo).toBeDefined();
      expect(deviationInfo?.detected).toBe(true);
      expect(deviationInfo?.reason).toBe(
        'Player chose to betray allies, invalidating trust-based beats.'
      );
      expect(deviationInfo?.beatsInvalidated).toBe(2);
    });

    it('returns undefined deviationInfo when no deviation detected', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You proceed normally.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Wait')],
        inventoryChanges: { added: ['Proceeding'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You continue on your path.',
        choices: [
          { text: 'Keep going', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
          { text: 'Rest', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'CONDITION_CHANGE' },
        ],
        currentLocation: 'The road ahead',
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
          primaryEmotion: 'determination',
          primaryIntensity: 'mild' as const,
          primaryCause: 'steady progress',
          secondaryEmotions: [],
          dominantMotivation: 'keep moving forward',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      const { deviationInfo } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(deviationInfo).toBeUndefined();
    });

    it('passes pre-incremented pagesInCurrentBeat to analyst evaluation', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = {
        ...createInitialStructureState(structure),
        pagesInCurrentBeat: 2,
      };
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You scout the perimeter.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Enter now'), createChoice('Wait for nightfall')],
        inventoryChanges: { added: ['Scouted perimeter'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You slip through the gap in the fence.',
        choices: [
          { text: 'Head left', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
          { text: 'Head right', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
        ],
        currentLocation: 'Inside the compound',
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
          primaryEmotion: 'focus',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'entering the compound',
          secondaryEmotions: [],
          dominantMotivation: 'reach the target',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedGenerateWriterPage.mock.invocationCallOrder[0]).toBeLessThan(
        mockedReconcileState.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
      );
      expect(mockedReconcileState.mock.invocationCallOrder[0]).toBeLessThan(
        mockedGenerateAnalystEvaluation.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
      );

      const firstAnalystCall = mockedGenerateAnalystEvaluation.mock.calls[0];
      expect(firstAnalystCall).toBeDefined();
      if (!firstAnalystCall) {
        return;
      }

      const [analystInput, analystOptions] = firstAnalystCall;
      expect(analystInput.accumulatedStructureState.pagesInCurrentBeat).toBe(
        parentStructureState.pagesInCurrentBeat + 1
      );
      expect(analystOptions).toEqual({ apiKey: 'test-key' });
    });

    it('skips analyst call when story has no structure', async () => {
      const story = buildStory(); // No structure
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'A quiet road stretches ahead.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Follow the road'), createChoice('Cut through the woods')],
        inventoryChanges: { added: ['On the road'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You follow the dusty road toward the distant village.',
        choices: [
          {
            text: 'Approach the gate',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'LOCATION_CHANGE',
          },
          {
            text: 'Camp outside',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: 'Village outskirts',
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
          primaryEmotion: 'calm',
          primaryIntensity: 'mild' as const,
          primaryCause: 'walking in peace',
          secondaryEmotions: [],
          dominantMotivation: 'reach the village',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedGenerateWriterPage).toHaveBeenCalled();
      expect(mockedGenerateAnalystEvaluation).not.toHaveBeenCalled();
      expect(page.narrativeText).toBe('You follow the dusty road toward the distant village.');
    });

    it('continues with default beat/deviation values when analyst call fails', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You crouch behind the warehouse barrels.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Rush the door'), createChoice('Wait for the signal')],
        inventoryChanges: { added: ['In position'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You burst through the door into the darkened room.',
        choices: [
          {
            text: 'Search the desk',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
          { text: 'Check the safe', choiceType: 'INVESTIGATION', primaryDelta: 'ITEM_CONTROL' },
        ],
        currentLocation: 'Inside the warehouse office',
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
          primaryEmotion: 'adrenaline',
          primaryIntensity: 'strong' as const,
          primaryCause: 'breaching the warehouse',
          secondaryEmotions: [],
          dominantMotivation: 'find the evidence',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockRejectedValue(new Error('API timeout'));

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      // Page should still be generated successfully with default beat/deviation values
      expect(page.narrativeText).toBe('You burst through the door into the darkened room.');
      expect(page.accumulatedStructureState).toEqual({
        ...parentPage.accumulatedStructureState,
        pagesInCurrentBeat: parentPage.accumulatedStructureState.pagesInCurrentBeat + 1,
      });
      expect(mockedCreateStructureRewriter).not.toHaveBeenCalled();
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Generation stage failed',
        expect.objectContaining({
          mode: 'continuation',
          storyId: story.id,
          pageId: parentPage.id,
          requestId: expect.any(String),
          stage: 'analyst',
          attempt: 1,
          durationMs: expect.any(Number),
          error: expect.any(Error),
        })
      );
    });

    describe('pacing response', () => {
      function buildPacingTestSetup(): { story: Story; parentPage: ReturnType<typeof createPage> } {
        const structure = buildStructure();
        const initialVersion = createInitialVersionedStructure(structure);
        const parentStructureState = createInitialStructureState(structure);
        const story = buildStory({ structure, structureVersions: [initialVersion] });
        const parentPage = createPage({
          id: parsePageId(2),
          narrativeText: 'You wait in the shadows.',
          sceneSummary: 'Test summary of the scene events and consequences.',
          choices: [createChoice('Move forward'), createChoice('Hold position')],
          inventoryChanges: { added: ['In position'], removed: [] },
          isEnding: false,
          parentPageId: parsePageId(1),
          parentChoiceIndex: 0,
          parentAccumulatedStructureState: parentStructureState,
          structureVersionId: initialVersion.id,
        });

        mockedStorage.getMaxPageId.mockResolvedValue(2);
        mockedGenerateWriterPage.mockResolvedValue({
          narrative: 'You creep through the corridor.',
          choices: [
            {
              text: 'Open the door',
              choiceType: 'TACTICAL_APPROACH',
              primaryDelta: 'LOCATION_CHANGE',
            },
            { text: 'Turn back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
          ],
          currentLocation: 'A dim corridor',
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
            primaryEmotion: 'tension',
            primaryIntensity: 'moderate' as const,
            primaryCause: 'creeping through unknown territory',
            secondaryEmotions: [],
            dominantMotivation: 'reach the objective',
          },
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
          rawResponse: 'raw',
        });

        return { story, parentPage };
      }

      it('sets pacingNudge when recommendedAction is nudge', async () => {
        const { story, parentPage } = buildPacingTestSetup();
        mockedGenerateAnalystEvaluation.mockResolvedValue({
          beatConcluded: false,
          beatResolution: '',
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: 'The protagonist continues the current scene.',
          pacingIssueDetected: true,
          pacingIssueReason: 'Beat stalled',
          recommendedAction: 'nudge',
          rawResponse: 'raw-analyst',
        });

        const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

        expect(page.accumulatedStructureState.pacingNudge).toBe('Beat stalled');
      });

      it('clears pacingNudge when recommendedAction is none', async () => {
        const { story, parentPage } = buildPacingTestSetup();
        mockedGenerateAnalystEvaluation.mockResolvedValue({
          beatConcluded: false,
          beatResolution: '',
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: 'The protagonist continues the current scene.',
          pacingIssueDetected: false,
          pacingIssueReason: '',
          recommendedAction: 'none',
          rawResponse: 'raw-analyst',
        });

        const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

        expect(page.accumulatedStructureState.pacingNudge).toBeNull();
      });

      it('logs warning for rewrite but does not trigger rewrite', async () => {
        const { story, parentPage } = buildPacingTestSetup();
        mockedGenerateAnalystEvaluation.mockResolvedValue({
          beatConcluded: false,
          beatResolution: '',
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: 'The protagonist continues the current scene.',
          pacingIssueDetected: true,
          pacingIssueReason: 'Beat dragging on too long',
          recommendedAction: 'rewrite',
          rawResponse: 'raw-analyst',
        });

        const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

        expect((logger.warn as jest.Mock).mock.calls).toContainEqual([
          'Pacing issue detected: rewrite recommended (deferred)',
          expect.objectContaining({ pacingIssueReason: 'Beat dragging on too long' }),
        ]);
        expect(mockedCreateStructureRewriter).not.toHaveBeenCalled();
        expect(page.accumulatedStructureState.pacingNudge).toBeNull();
      });

      it('skips pacing logic when deviation is detected', async () => {
        const structure = buildStructure();
        const initialVersion = createInitialVersionedStructure(structure);
        const parentStructureState = createInitialStructureState(structure);
        const story = buildStory({ structure, structureVersions: [initialVersion] });
        const parentPage = createPage({
          id: parsePageId(2),
          narrativeText: 'A critical turning point.',
          sceneSummary: 'Test summary of the scene events and consequences.',
          choices: [createChoice('Defect'), createChoice('Hold')],
          inventoryChanges: { added: ['At turning point'], removed: [] },
          isEnding: false,
          parentPageId: parsePageId(1),
          parentChoiceIndex: 0,
          parentAccumulatedStructureState: parentStructureState,
          structureVersionId: initialVersion.id,
        });

        const rewrittenStructure: StoryStructure = {
          overallTheme: 'After the defection.',
          premise: 'The courier chose a new path after defecting.',
          pacingBudget: { targetPagesMin: 15, targetPagesMax: 30 },
          generatedAt: new Date('2026-01-02T00:00:00.000Z'),
          acts: [
            {
              id: '1',
              name: 'New Path',
              objective: 'Survive',
              stakes: 'Everything',
              entryCondition: 'After defection',
              beats: [
                {
                  id: '1.1',
                  description: 'New beginning',
                  objective: 'Establish new life',
                  role: 'setup' as const,
                },
              ],
            },
          ],
        };

        const mockRewriter = {
          rewriteStructure: jest.fn().mockResolvedValue({
            structure: rewrittenStructure,
            preservedBeatIds: [],
            rawResponse: 'rewritten',
          }),
        };
        mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

        mockedStorage.getMaxPageId.mockResolvedValue(2);
        mockedGenerateWriterPage.mockResolvedValue({
          narrative: 'You defect to the other side.',
          choices: [
            {
              text: 'Accept posting',
              choiceType: 'IDENTITY_EXPRESSION',
              primaryDelta: 'GOAL_SHIFT',
            },
            {
              text: 'Go underground',
              choiceType: 'AVOIDANCE_RETREAT',
              primaryDelta: 'LOCATION_CHANGE',
            },
          ],
          currentLocation: 'The defection point',
          threatsAdded: ['Hunted by former allies'],
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
            primaryEmotion: 'resolve',
            primaryIntensity: 'strong' as const,
            primaryCause: 'making an irreversible choice',
            secondaryEmotions: [],
            dominantMotivation: 'survive the transition',
          },
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
          rawResponse: 'raw',
        });
        mockedGenerateAnalystEvaluation.mockResolvedValue({
          beatConcluded: false,
          beatResolution: '',
          deviationDetected: true,
          deviationReason: 'Defection invalidates current beats.',
          invalidatedBeatIds: ['1.1', '1.2'],
          narrativeSummary: 'Player defected.',
          pacingIssueDetected: true,
          pacingIssueReason: 'Beat stalled before defection',
          recommendedAction: 'nudge',
          rawResponse: 'raw-analyst',
        });

        const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

        // Deviation was triggered, so pacing logic should be skipped.
        // The pacingNudge should come from the rewritten structure's initial state, not from pacing logic.
        expect(mockedCreateStructureRewriter).toHaveBeenCalled();
        // Pacing nudge should NOT be set since deviation takes priority
        expect(page.accumulatedStructureState.pacingNudge).toBeNull();
      });
    });
  });

  describe('getOrGeneratePage', () => {
    it('returns existing page without regeneration when choice already linked', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A', parsePageId(2)), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const existingPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Existing',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [],
        isEnding: true,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedInventory: parentPage.accumulatedInventory,
      });

      mockedStorage.loadPage.mockResolvedValue(existingPage);

      const result = await getOrGeneratePage(story, parentPage, 0, 'test-key');

      expect(result.wasGenerated).toBe(false);
      expect(result.metrics).toBeUndefined();
      expect(result.page).toBe(existingPage);
      expect(result.story).toBe(story);
      expect(mockedGenerateWriterPage).not.toHaveBeenCalled();
      expect(mockedStorage.savePage).not.toHaveBeenCalled();
      expect(mockedStorage.updateChoiceLink).not.toHaveBeenCalled();
      expect(mockedStorage.updateStory).not.toHaveBeenCalled();
    });

    it('throws PAGE_NOT_FOUND when linked next page is missing', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A', parsePageId(3)), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      mockedStorage.loadPage.mockResolvedValue(null);

      await expect(getOrGeneratePage(story, parentPage, 0, 'test-key')).rejects.toMatchObject({
        name: 'EngineError',
        code: 'PAGE_NOT_FOUND',
      });
    });

    it('generates, saves, and links a new page for unexplored choices', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        inventoryChanges: { added: ['Started mission'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'A coded anthem drifts from the tavern cellar.',
        choices: [
          {
            text: 'Signal the contact',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'RELATIONSHIP_CHANGE',
          },
          {
            text: 'Circle back to the docks',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: 'The tavern cellar entrance',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [
          { text: 'Contact the resistance', threadType: 'INFORMATION', urgency: 'MEDIUM' },
        ],
        threadsResolved: [],
        newCanonFacts: ['Resistance uses songs as ciphers'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'hope',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'finding resistance allies',
          secondaryEmotions: [],
          dominantMotivation: 'make contact',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      const result = await getOrGeneratePage(story, parentPage, 0, 'test-key');

      expect(result.wasGenerated).toBe(true);
      expect(result.metrics).toEqual(
        expect.objectContaining({
          finalStatus: 'success',
        })
      );
      expect(result.page.id).toBe(2);
      expect(mockedStorage.savePage).toHaveBeenCalledWith(story.id, result.page);
      expect(mockedStorage.updateChoiceLink).toHaveBeenCalledWith(
        story.id,
        parentPage.id,
        0,
        result.page.id
      );
      expect(mockedStorage.updateStory).toHaveBeenCalledWith(result.story);
      expect(mockedStorage.savePage.mock.invocationCallOrder[0]).toBeLessThan(
        mockedStorage.updateChoiceLink.mock.invocationCallOrder[0]
      );
    });

    it('does not commit page data when writer validation fails', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateWriterPage.mockRejectedValue(
        new LLMError('Deterministic writer output validation failed', 'VALIDATION_ERROR', false, {
          ruleKeys: ['writer_output.choice_pair.duplicate'],
          validationIssues: [
            {
              ruleKey: 'writer_output.choice_pair.duplicate',
              fieldPath: 'choices[1]',
            },
          ],
        })
      );

      await expect(getOrGeneratePage(story, parentPage, 0, 'test-key')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
      expect(mockedStorage.savePage).not.toHaveBeenCalled();
      expect(mockedStorage.updateChoiceLink).not.toHaveBeenCalled();
      expect(mockedStorage.updateStory).not.toHaveBeenCalled();
    });

    it('does not persist story when generation produces no canon or arc updates', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You wait in silence until the patrol passes.',
        choices: [
          { text: 'Move now', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'URGENCY_CHANGE' },
          {
            text: 'Wait longer',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'CONDITION_CHANGE',
          },
        ],
        currentLocation: 'Hidden in the shadows',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: ['Time pressure'],
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
          primaryEmotion: 'tension',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'waiting for patrol to pass',
          secondaryEmotions: [],
          dominantMotivation: 'remain undetected',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });

      await getOrGeneratePage(story, parentPage, 1, 'test-key');

      expect(mockedStorage.updateStory).not.toHaveBeenCalled();
    });

    it('throws INVALID_CHOICE for invalid choice index', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      await expect(getOrGeneratePage(story, parentPage, -1, 'test-key')).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_CHOICE',
        } as Partial<EngineError>)
      );
      expect(mockedStorage.loadPage).not.toHaveBeenCalled();
      expect(mockedStorage.getMaxPageId).not.toHaveBeenCalled();
    });

    it('returns existing page without apiKey when choice is already explored', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A', parsePageId(2)), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const existingPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Existing page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [],
        isEnding: true,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedInventory: parentPage.accumulatedInventory,
      });

      mockedStorage.loadPage.mockResolvedValue(existingPage);

      const result = await getOrGeneratePage(story, parentPage, 0);

      expect(result.wasGenerated).toBe(false);
      expect(result.page).toBe(existingPage);
      expect(result.story).toBe(story);
      expect(mockedGenerateWriterPage).not.toHaveBeenCalled();
    });

    it('throws VALIDATION_FAILED when apiKey is missing and choice needs generation', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      await expect(getOrGeneratePage(story, parentPage, 0)).rejects.toMatchObject({
        name: 'EngineError',
        code: 'VALIDATION_FAILED',
      });
      expect(mockedGenerateWriterPage).not.toHaveBeenCalled();
      expect(mockedStorage.savePage).not.toHaveBeenCalled();
    });

    it('returns undefined deviationInfo when loading cached page', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A', parsePageId(2)), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const existingPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Cached page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [],
        isEnding: true,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedInventory: parentPage.accumulatedInventory,
      });

      mockedStorage.loadPage.mockResolvedValue(existingPage);

      const result = await getOrGeneratePage(story, parentPage, 0, 'test-key');

      expect(result.wasGenerated).toBe(false);
      expect(result.deviationInfo).toBeUndefined();
    });

    it('passes through deviationInfo when generating new page with deviation', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Deviate'), createChoice('Normal')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      const rewrittenStructure: StoryStructure = {
        overallTheme: 'Rewritten after deviation.',
        premise: 'The story takes an unexpected turn after the protagonist deviates.',
        pacingBudget: { targetPagesMin: 15, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Deviated Path',
            objective: 'New direction',
            stakes: 'High',
            entryCondition: 'After deviation',
            beats: [
              {
                id: '1.1',
                description: 'New beat',
                objective: 'New objective',
                role: 'setup' as const,
              },
            ],
          },
        ],
      };

      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: rewrittenStructure,
          preservedBeatIds: [],
          rawResponse: 'rewritten',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateWriterPage.mockResolvedValue({
        narrative: 'You deviate from the plan.',
        choices: [
          { text: 'New choice 1', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'New choice 2', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
        ],
        currentLocation: 'An unexpected path',
        threatsAdded: ['Unknown consequences'],
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
          primaryEmotion: 'uncertainty',
          primaryIntensity: 'strong' as const,
          primaryCause: 'choosing an unexpected path',
          secondaryEmotions: [],
          dominantMotivation: 'explore new possibilities',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
        rawResponse: 'raw',
      });
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: true,
        deviationReason: 'Story deviated from planned beats.',
        invalidatedBeatIds: ['1.1'],
        narrativeSummary: 'Player chose unexpected path.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        rawResponse: 'raw-analyst',
      });

      const result = await getOrGeneratePage(story, parentPage, 0, 'test-key');

      expect(result.wasGenerated).toBe(true);
      expect(result.deviationInfo).toBeDefined();
      expect(result.deviationInfo?.detected).toBe(true);
      expect(result.deviationInfo?.reason).toBe('Story deviated from planned beats.');
      expect(result.deviationInfo?.beatsInvalidated).toBe(1);
    });
  });
});
