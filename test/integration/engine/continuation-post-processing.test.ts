/**
 * Integration tests for all exported functions from continuation-post-processing.
 * Written BEFORE refactoring to lock in behavior, then updated to import from new modules.
 */
import {
  generateStructureEvaluation,
  generatePromiseTracking,
  generateProseQualityEvaluation,
  generateNpcIntelligenceEvaluation,
} from '../../../src/llm';
import { runAnalystEvaluation } from '../../../src/engine/analyst-evaluation';
import { resolveActiveBeat } from '../../../src/engine/beat-utils';
import { resolveBeatAlignmentSkip } from '../../../src/engine/beat-alignment';
import { resolveBeatConclusion } from '../../../src/engine/beat-conclusion';
import { handleDeviationIfDetected } from '../../../src/engine/deviation-processing';
import { applyPacingResponse } from '../../../src/engine/pacing-response';
import {
  handleSpineDeviationIfDetected,
  collectRemainingBeatIds,
} from '../../../src/engine/spine-deviation-processing';
import { resolveStructureProgression } from '../../../src/engine/structure-state';
import { isActualDeviation, handleDeviation } from '../../../src/engine/deviation-handler';
import { rewriteSpine } from '../../../src/engine/spine-rewriter';
import { createMockAnalystResult, createMockStoryStructure } from '../../fixtures/llm-results';
import type { AccumulatedStructureState, StoryStructure } from '../../../src/models/story-arc';
import type { ContinuationGenerationResult } from '../../../src/llm/generation-pipeline-types';
import type { Story, VersionedStoryStructure } from '../../../src/models';

jest.mock('../../../src/llm/client', () => ({
  generateStructureEvaluation: jest.fn(),
  generatePromiseTracking: jest.fn(),
  generateProseQualityEvaluation: jest.fn(),
  generateNpcIntelligenceEvaluation: jest.fn(),
}));

jest.mock('../../../src/engine/generation-pipeline-helpers', () => ({
  emitGenerationStage: jest.fn(),
}));

jest.mock('../../../src/engine/deviation-handler', () => ({
  isActualDeviation: jest.fn(),
  handleDeviation: jest.fn(),
}));

jest.mock('../../../src/models', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('../../../src/models');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    isDeviation: jest.fn((result: { detected: boolean }) => result.detected === true),
  };
});

jest.mock('../../../src/engine/spine-rewriter', () => ({
  rewriteSpine: jest.fn(),
}));

const mockedGenerateStructureEvaluation = generateStructureEvaluation as jest.MockedFunction<
  typeof generateStructureEvaluation
>;
const mockedGeneratePromiseTracking = generatePromiseTracking as jest.MockedFunction<
  typeof generatePromiseTracking
>;
const mockedGenerateProseQualityEvaluation = generateProseQualityEvaluation as jest.MockedFunction<
  typeof generateProseQualityEvaluation
>;
const mockedGenerateNpcIntelligenceEvaluation =
  generateNpcIntelligenceEvaluation as jest.MockedFunction<
    typeof generateNpcIntelligenceEvaluation
  >;
const mockedIsActualDeviation = isActualDeviation as jest.MockedFunction<typeof isActualDeviation>;
const mockedHandleDeviation = handleDeviation as jest.MockedFunction<typeof handleDeviation>;
const mockedRewriteSpine = rewriteSpine as jest.MockedFunction<typeof rewriteSpine>;

beforeEach(() => {
  jest.clearAllMocks();
});

const baseStructureState: AccumulatedStructureState = {
  currentActIndex: 0,
  currentBeatIndex: 0,
  beatProgressions: [{ beatId: '1.1', status: 'active' }],
  pagesInCurrentBeat: 2,
  pacingNudge: null,
};

const baseStructure = createMockStoryStructure();

describe('runAnalystEvaluation', () => {
  const baseContext = {
    writerNarrative: 'The hero walked forward.',
    writerSceneSummary: 'The hero moved through the forest.',
    activeStructure: baseStructure,
    parentStructureState: baseStructureState,
    parentActiveState: {
      currentLocation: 'forest',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    threadsResolved: [] as string[],
    threadAges: {} as Record<string, number>,
    activeTrackedPromises: [] as readonly import('../../../src/models').TrackedPromise[],
    delayedConsequencesEligible: [] as readonly import('../../../src/models/state/delayed-consequence').DelayedConsequence[],
    tone: 'dark fantasy',
    thematicQuestion: 'Can power be used without corruption?',
    antithesis: 'Order requires domination, not restraint.',
    premisePromises: [] as readonly string[],
    fulfilledPremisePromises: [] as readonly string[],
    protagonistName: 'Test Hero',
    apiKey: 'test-key',
    logContext: { storyId: 's1' },
  };

  it('returns result and duration on success', async () => {
    mockedGenerateStructureEvaluation.mockResolvedValue({
      beatConcluded: false,
      beatResolution: '',
      sceneMomentum: 'INCREMENTAL_PROGRESS',
      objectiveEvidenceStrength: 'WEAK_IMPLICIT',
      commitmentStrength: 'TENTATIVE',
      structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
      entryConditionReadiness: 'NOT_READY',
      objectiveAnchors: [],
      anchorEvidence: [],
      completionGateSatisfied: false,
      completionGateFailureReason: '',
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [],
      spineDeviationDetected: false,
      spineDeviationReason: '',
      spineInvalidatedElement: null,
      alignedBeatId: null,
      beatAlignmentConfidence: 'LOW',
      beatAlignmentReason: '',
      pacingIssueDetected: false,
      pacingIssueReason: '',
      recommendedAction: 'none',
      pacingDirective: '',
      narrativeSummary: 'Hero progressed.',
      rawResponse: '{"structure":"ok"}',
    });
    mockedGeneratePromiseTracking.mockResolvedValue({
      promisesDetected: [],
      promisesResolved: [],
      promisePayoffAssessments: [],
      threadPayoffAssessments: [],
      premisePromiseFulfilled: null,
      obligatorySceneFulfilled: null,
      delayedConsequencesTriggered: [],
      delayedConsequencesCreated: [],
      rawResponse: '{"promise":"ok"}',
    });
    mockedGenerateProseQualityEvaluation.mockResolvedValue({
      toneAdherent: true,
      toneDriftDescription: '',
      thematicCharge: 'AMBIGUOUS',
      thematicChargeDescription: '',
      narrativeFocus: 'BALANCED',
      rawResponse: '{"prose":"ok"}',
    });
    mockedGenerateNpcIntelligenceEvaluation.mockResolvedValue({
      npcCoherenceAdherent: true,
      npcCoherenceIssues: '',
      relationshipShiftsDetected: [],
      knowledgeAsymmetryDetected: [],
      dramaticIronyOpportunities: [],
      rawResponse: '{"npc":"ok"}',
    });

    const evalResult = await runAnalystEvaluation(baseContext);

    expect(evalResult.result).not.toBeNull();
    expect(evalResult.result!.narrativeSummary).toBe('Hero progressed.');
    expect(evalResult.durationMs).toBeGreaterThanOrEqual(0);
    expect(evalResult.degradation).toBeUndefined();
  });

  it('returns null result with degradation on LLM failure', async () => {
    mockedGenerateStructureEvaluation.mockRejectedValue(new Error('LLM timeout'));
    mockedGeneratePromiseTracking.mockRejectedValue(new Error('LLM timeout'));
    mockedGenerateProseQualityEvaluation.mockRejectedValue(new Error('LLM timeout'));
    mockedGenerateNpcIntelligenceEvaluation.mockRejectedValue(new Error('LLM timeout'));

    const evalResult = await runAnalystEvaluation(baseContext);

    expect(evalResult.result).toBeNull();
    expect(evalResult.durationMs).toBeGreaterThanOrEqual(0);
    expect(evalResult.degradation).toBeDefined();
    expect(evalResult.degradation!.stage).toBe('analyst');
    expect(evalResult.degradation!.errorCode).toBe('LLM_FAILURE');
  });
});

// ---- Deviation Handling ----

describe('handleDeviationIfDetected', () => {
  const minimalStory = { id: 's1', structure: baseStructure } as unknown as Story;
  const versionedStructure: VersionedStoryStructure = {
    id: 'v1',
    structure: baseStructure,
    createdAt: new Date(),
    parentVersionId: null,
    createdByPageId: 1 as unknown as import('../../../src/models').PageId,
  };

  const baseResult = {
    deviation: { detected: true, reason: 'test', invalidatedBeatIds: ['1.1'], narrativeSummary: '' },
    beatConcluded: false,
    beatResolution: '',
  } as unknown as ContinuationGenerationResult;

  it('returns no-op when no deviation detected', async () => {
    mockedIsActualDeviation.mockReturnValue(false);

    const result = await handleDeviationIfDetected({
      result: baseResult,
      story: minimalStory,
      currentStructureVersion: versionedStructure,
      parentStructureState: baseStructureState,
      newPageId: 2 as unknown as import('../../../src/models').PageId,
      apiKey: 'test-key',
      logContext: { storyId: 's1' },
    });

    expect(result.storyForPage).toBe(minimalStory);
    expect(result.activeStructureVersion).toBe(versionedStructure);
    expect(result.deviationInfo).toBeUndefined();
    expect(result.structureRewriteDurationMs).toBeNull();
  });

  it('returns deviation result on actual deviation', async () => {
    mockedIsActualDeviation.mockReturnValue(true);
    const updatedStory = { ...minimalStory, id: 's1-updated' };
    const newVersion = { ...versionedStructure, id: 'v2' };
    mockedHandleDeviation.mockResolvedValue({
      updatedStory,
      activeVersion: newVersion,
      deviationInfo: { detected: true, reason: 'test deviation', beatsInvalidated: 1 },
    });

    const result = await handleDeviationIfDetected({
      result: baseResult,
      story: minimalStory,
      currentStructureVersion: versionedStructure,
      parentStructureState: baseStructureState,
      newPageId: 2 as unknown as import('../../../src/models').PageId,
      apiKey: 'test-key',
      logContext: { storyId: 's1' },
    });

    expect(result.storyForPage).toBe(updatedStory);
    expect(result.activeStructureVersion).toBe(newVersion);
    expect(result.deviationInfo).toEqual({
      detected: true,
      reason: 'test deviation',
      beatsInvalidated: 1,
    });
    expect(result.structureRewriteDurationMs).toBeGreaterThanOrEqual(0);
  });
});

// ---- Spine Deviation ----

describe('handleSpineDeviationIfDetected', () => {
  const storyWithSpine = {
    id: 's1',
    tone: 'dark',
    spine: {
      centralDramaticQuestion: 'Will they survive?',
      storySpineType: 'QUEST',
      conflictAxis: 'PERSON_VS_NATURE',
      conflictType: 'EXTERNAL',
      characterArcType: 'TRANSFORMATIVE',
      needWantDynamic: 'CONVERGENT',
      need: 'safety',
      want: 'glory',
      antagonisticForce: 'the wild',
    },
    decomposedCharacters: [],
    decomposedWorld: [],
  } as unknown as Story;

  it('returns no-op when no spine deviation detected', async () => {
    const result = await handleSpineDeviationIfDetected({
      analystResult: createMockAnalystResult({ spineDeviationDetected: false }),
      story: storyWithSpine,
      apiKey: 'test-key',
      logContext: { storyId: 's1' },
    });

    expect(result.spineRewritten).toBe(false);
    expect(result.updatedStory).toBe(storyWithSpine);
    expect(result.durationMs).toBeNull();
  });

  it('returns rewritten spine on success', async () => {
    const newSpine = { ...storyWithSpine.spine!, storySpineType: 'ESCAPE' };
    mockedRewriteSpine.mockResolvedValue({ spine: newSpine, rawResponse: '{}' });

    const result = await handleSpineDeviationIfDetected({
      analystResult: createMockAnalystResult({
        spineDeviationDetected: true,
        spineInvalidatedElement: 'dramatic_question',
        spineDeviationReason: 'Conflict shifted',
        narrativeSummary: 'Story changed direction',
      }),
      story: storyWithSpine,
      apiKey: 'test-key',
      logContext: { storyId: 's1' },
    });

    expect(result.spineRewritten).toBe(true);
    expect(result.updatedStory.spine).toBe(newSpine);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.degradation).toBeUndefined();
  });

  it('returns graceful degradation on spine rewrite failure', async () => {
    mockedRewriteSpine.mockRejectedValue(new Error('Spine LLM failed'));

    const result = await handleSpineDeviationIfDetected({
      analystResult: createMockAnalystResult({
        spineDeviationDetected: true,
        spineInvalidatedElement: 'dramatic_question',
        spineDeviationReason: 'Conflict shifted',
        narrativeSummary: 'Story changed',
      }),
      story: storyWithSpine,
      apiKey: 'test-key',
      logContext: { storyId: 's1' },
    });

    expect(result.spineRewritten).toBe(false);
    expect(result.updatedStory).toBe(storyWithSpine);
    expect(result.degradation).toBeDefined();
    expect(result.degradation!.stage).toBe('spineRewrite');
    expect(result.degradation!.errorCode).toBe('LLM_FAILURE');
  });
});

// ---- collectRemainingBeatIds ----

describe('collectRemainingBeatIds', () => {
  const multiActStructure: StoryStructure = {
    ...baseStructure,
    acts: [
      {
        id: '1',
        name: 'Act 1',
        objective: 'o',
        stakes: 's',
        entryCondition: 'e',
        beats: [
          { id: '1.1', name: 'b1', description: 'd', objective: 'o', role: 'setup', escalationType: null, uniqueScenarioHook: null, approachVectors: null },
          { id: '1.2', name: 'b2', description: 'd', objective: 'o', role: 'escalation', escalationType: null, uniqueScenarioHook: null, approachVectors: null },
        ],
      },
      {
        id: '2',
        name: 'Act 2',
        objective: 'o',
        stakes: 's',
        entryCondition: 'e',
        beats: [
          { id: '2.1', name: 'b3', description: 'd', objective: 'o', role: 'setup', escalationType: null, uniqueScenarioHook: null, approachVectors: null },
        ],
      },
    ],
  };

  it('returns non-concluded beat IDs from multi-act structure', () => {
    const state: AccumulatedStructureState = {
      ...baseStructureState,
      beatProgressions: [{ beatId: '1.1', status: 'concluded', resolution: 'Done.' }],
    };

    const result = collectRemainingBeatIds(multiActStructure, state);

    expect(result).toEqual(['1.2', '2.1']);
  });

  it('returns empty when all beats concluded', () => {
    const state: AccumulatedStructureState = {
      ...baseStructureState,
      beatProgressions: [
        { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
        { beatId: '1.2', status: 'concluded', resolution: 'Done.' },
        { beatId: '2.1', status: 'concluded', resolution: 'Done.' },
      ],
    };

    const result = collectRemainingBeatIds(multiActStructure, state);

    expect(result).toEqual([]);
  });
});

// ---- resolveBeatConclusion ----

describe('resolveBeatConclusion', () => {
  const baseCtx = {
    storyId: 's1',
    parentPageId: 1 as unknown as import('../../../src/models').PageId,
  };

  it('resolves standard conclusion from result fields', () => {
    const result = resolveBeatConclusion({
      ...baseCtx,
      result: {
        beatConcluded: true,
        beatResolution: 'Hero prevailed.',
      } as unknown as ContinuationGenerationResult,
      activeBeat: undefined,
      analystResult: null,
    });

    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('Hero prevailed.');
  });

  it('turning-point gate blocks conclusion when gate not satisfied', () => {
    const result = resolveBeatConclusion({
      ...baseCtx,
      result: {
        beatConcluded: true,
        beatResolution: 'Tried to conclude.',
      } as unknown as ContinuationGenerationResult,
      activeBeat: { id: '1.2', name: 'TP', description: 'd', objective: 'o', role: 'turning_point', escalationType: null, uniqueScenarioHook: null, approachVectors: null },
      analystResult: createMockAnalystResult({
        beatConcluded: true,
        completionGateSatisfied: false,
        completionGateFailureReason: 'Not enough tension.',
      }),
    });

    expect(result.beatConcluded).toBe(false);
  });

  it('defaults missing fields to false and empty string', () => {
    const result = resolveBeatConclusion({
      ...baseCtx,
      result: {} as unknown as ContinuationGenerationResult,
      activeBeat: undefined,
      analystResult: null,
    });

    expect(result.beatConcluded).toBe(false);
    expect(result.beatResolution).toBe('');
  });
});

// ---- applyPacingResponse ----

describe('applyPacingResponse', () => {
  it('skips pacing when deviation present', () => {
    const result = applyPacingResponse({
      deviationInfo: { detected: true, reason: 'test', beatsInvalidated: 1 },
      structureState: { ...baseStructureState, pacingNudge: 'old nudge' },
      recommendedAction: 'nudge',
      pacingIssueReason: 'too fast',
    });

    expect(result.pacingNudge).toBe('old nudge');
  });

  it('applies nudge', () => {
    const result = applyPacingResponse({
      deviationInfo: undefined,
      structureState: baseStructureState,
      recommendedAction: 'nudge',
      pacingIssueReason: 'rushing the beat',
    });

    expect(result.pacingNudge).toBe('rushing the beat');
  });

  it('defers rewrite and clears nudge', () => {
    const result = applyPacingResponse({
      deviationInfo: undefined,
      structureState: { ...baseStructureState, pacingNudge: 'old' },
      recommendedAction: 'rewrite',
      pacingIssueReason: 'too many pages',
    });

    expect(result.pacingNudge).toBeNull();
  });

  it('clears nudge on none', () => {
    const result = applyPacingResponse({
      deviationInfo: undefined,
      structureState: { ...baseStructureState, pacingNudge: 'stale' },
      recommendedAction: 'none',
      pacingIssueReason: '',
    });

    expect(result.pacingNudge).toBeNull();
  });
});

// ---- resolveStructureProgression ----

describe('resolveStructureProgression', () => {
  it('returns parent state when no structure', () => {
    const result = resolveStructureProgression({
      activeStructureVersion: null,
      storyStructure: null,
      parentStructureState: baseStructureState,
      beatConcluded: false,
      beatResolution: '',
    });

    expect(result).toBe(baseStructureState);
  });

  it('delegates with beat concluded', () => {
    const result = resolveStructureProgression({
      activeStructureVersion: null,
      storyStructure: baseStructure,
      parentStructureState: baseStructureState,
      beatConcluded: true,
      beatResolution: 'Quest accepted.',
    });

    expect(result.currentBeatIndex).toBe(1);
    expect(result.pagesInCurrentBeat).toBe(0);
  });

  it('delegates with alignment skip', () => {
    const threeBeatsStructure = createMockStoryStructure({
      acts: [
        {
          id: '1',
          name: 'Act 1',
          objective: 'o',
          stakes: 's',
          entryCondition: 'e',
          beats: [
            { id: '1.1', name: 'b1', description: 'd', objective: 'o', role: 'setup', escalationType: null, uniqueScenarioHook: null, approachVectors: null },
            { id: '1.2', name: 'b2', description: 'd', objective: 'o', role: 'escalation', escalationType: null, uniqueScenarioHook: null, approachVectors: null },
            { id: '1.3', name: 'b3', description: 'd', objective: 'o', role: 'turning_point', escalationType: null, uniqueScenarioHook: null, approachVectors: null },
          ],
        },
      ],
    });

    const result = resolveStructureProgression({
      activeStructureVersion: null,
      storyStructure: threeBeatsStructure,
      parentStructureState: baseStructureState,
      beatConcluded: true,
      beatResolution: 'Done with setup.',
      alignmentSkip: { targetBeatId: '1.3', bridgedResolution: 'Skipped via narrative leap' },
    });

    expect(result.currentBeatIndex).toBe(2);
  });
});

// ---- resolveActiveBeat ----

describe('resolveActiveBeat', () => {
  it('returns beat from structure', () => {
    const beat = resolveActiveBeat(null, baseStructure, baseStructureState);

    expect(beat).toBeDefined();
    expect(beat!.id).toBe('1.1');
  });

  it('returns undefined when no structure', () => {
    const beat = resolveActiveBeat(null, null, baseStructureState);

    expect(beat).toBeUndefined();
  });
});

// ---- resolveBeatAlignmentSkip (integration-level) ----

describe('resolveBeatAlignmentSkip (integration)', () => {
  it('returns skip info for multi-beat jump scenario', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [
        { beatId: '1.1', status: 'active' },
        { beatId: '1.2', status: 'pending' },
        { beatId: '1.3', status: 'pending' },
      ],
      pagesInCurrentBeat: 3,
      pacingNudge: null,
    };

    const analyst = createMockAnalystResult({
      alignedBeatId: '1.3',
      beatAlignmentConfidence: 'HIGH',
      beatAlignmentReason: 'Narrative leaped ahead.',
    });

    const result = resolveBeatAlignmentSkip(analyst, true, state);

    expect(result).toBeDefined();
    expect(result!.targetBeatId).toBe('1.3');
  });
});
