import { computeNarrativeStateLifecycle } from '@/engine/state-lifecycle';
import { PromiseScope, PromiseType, ThreadType, Urgency } from '@/models/state/keyed-entry';
import type { AnalystResult } from '@/llm/analyst-types';
import type { ThreadEntry, TrackedPromise } from '@/models/state';

function makeAnalystResult(overrides: Partial<AnalystResult> = {}): AnalystResult {
  return {
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    narrativeSummary: '',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'INCREMENTAL_PROGRESS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
    pacingDirective: '',
    objectiveAnchors: [],
    anchorEvidence: [],
    completionGateSatisfied: false,
    completionGateFailureReason: '',
    toneAdherent: true,
    toneDriftDescription: '',
    promisesDetected: [],
    promisesResolved: [],
    promisePayoffAssessments: [],
    threadPayoffAssessments: [],
    npcCoherenceAdherent: true,
    npcCoherenceIssues: '',
    relationshipShiftsDetected: [],
    spineDeviationDetected: false,
    spineDeviationReason: '',
    spineInvalidatedElement: null,
    alignedBeatId: null,
    beatAlignmentConfidence: 'LOW',
    beatAlignmentReason: '',
    thematicCharge: 'AMBIGUOUS',
    thematicChargeDescription: '',
    obligatorySceneFulfilled: null,
    premisePromiseFulfilled: null,
    delayedConsequencesTriggered: [],
    rawResponse: '',
    ...overrides,
  };
}

function makeThread(overrides: Partial<ThreadEntry> = {}): ThreadEntry {
  return {
    id: 'td-1',
    text: 'Unresolved mystery',
    threadType: ThreadType.MYSTERY,
    urgency: Urgency.MEDIUM,
    ...overrides,
  };
}

function makePromise(overrides: Partial<TrackedPromise> = {}): TrackedPromise {
  return {
    id: 'pr-1',
    description: 'A suspicious key was emphasized.',
    promiseType: PromiseType.CHEKHOV_GUN,
    scope: PromiseScope.BEAT,
    resolutionHint: 'Will the key matter later?',
    suggestedUrgency: Urgency.HIGH,
    age: 2,
    ...overrides,
  };
}

describe('computeNarrativeStateLifecycle', () => {
  it('computes opening lifecycle without inheriting parent state', () => {
    const result = computeNarrativeStateLifecycle({
      isOpening: true,
      parentOpenThreads: [],
      parentThreadAges: {},
      parentAccumulatedPromises: [],
      parentAccumulatedFulfilledPremisePromises: ['Ignored'],
      threadsAdded: [{ text: 'Open question' }],
      threadsResolved: [],
      analystResult: null,
      analystPromisesDetected: [
        {
          description: 'A storm front is repeatedly foreshadowed',
          promiseType: PromiseType.FORESHADOWING,
          scope: PromiseScope.BEAT,
          resolutionHint: 'Will the storm arrive?',
          suggestedUrgency: Urgency.MEDIUM,
        },
      ],
      analystPromisesResolved: ['pr-999'],
      analystPremisePromiseFulfilled: 'Ignored on opening',
    });

    expect(result.effectiveThreadsResolved).toEqual([]);
    expect(result.threadAges).toEqual({ 'td-1': 0 });
    expect(result.accumulatedPromises).toEqual([
      {
        id: 'pr-1',
        description: 'A storm front is repeatedly foreshadowed',
        promiseType: PromiseType.FORESHADOWING,
        scope: PromiseScope.BEAT,
        resolutionHint: 'Will the storm arrive?',
        suggestedUrgency: Urgency.MEDIUM,
        age: 0,
      },
    ]);
    expect(result.accumulatedFulfilledPremisePromises).toEqual([]);
    expect(result.resolvedThreadMeta).toEqual({});
    expect(result.resolvedPromiseMeta).toEqual({});
  });

  it('computes continuation lifecycle and augments resolved threads from analyst payoff assessments', () => {
    const result = computeNarrativeStateLifecycle({
      isOpening: false,
      parentOpenThreads: [
        makeThread({ id: 'td-1', text: 'Old thread', threadType: ThreadType.MYSTERY, urgency: Urgency.LOW }),
        makeThread({ id: 'td-2', text: 'Another old thread', threadType: ThreadType.DANGER, urgency: Urgency.HIGH }),
      ],
      parentThreadAges: { 'td-1': 0, 'td-2': 3 },
      parentAccumulatedPromises: [makePromise({ id: 'pr-1', age: 1 }), makePromise({ id: 'pr-2', age: 4, scope: PromiseScope.SCENE })],
      parentAccumulatedFulfilledPremisePromises: ['Promise A'],
      threadsAdded: [{ text: 'New thread' }],
      threadsResolved: ['td-1'],
      analystResult: makeAnalystResult({
        threadPayoffAssessments: [
          {
            threadId: 'td-2',
            threadText: 'Another old thread',
            satisfactionLevel: 'ADEQUATE',
            reasoning: 'Resolved in scene climax',
          },
        ],
      }),
      analystPromisesDetected: [
        {
          description: 'New unresolved vow',
          promiseType: PromiseType.UNRESOLVED_TENSION,
          scope: PromiseScope.ACT,
          resolutionHint: 'Will the vow hold?',
          suggestedUrgency: Urgency.MEDIUM,
        },
      ],
      analystPromisesResolved: ['pr-1'],
      analystPremisePromiseFulfilled: 'Promise B',
    });

    expect(result.effectiveThreadsResolved).toEqual(['td-1', 'td-2']);
    expect(result.threadAges).toEqual({ 'td-3': 0 });
    expect(result.accumulatedPromises.map((promise) => promise.id)).toEqual(['pr-3']);
    expect(result.accumulatedPromises[0]?.description).toBe('New unresolved vow');
    expect(result.accumulatedFulfilledPremisePromises).toEqual(['Promise A', 'Promise B']);
    expect(result.resolvedThreadMeta).toEqual({
      'td-1': { threadType: ThreadType.MYSTERY, urgency: Urgency.LOW },
      'td-2': { threadType: ThreadType.DANGER, urgency: Urgency.HIGH },
    });
    expect(result.resolvedPromiseMeta).toEqual({
      'pr-1': { promiseType: PromiseType.CHEKHOV_GUN, scope: PromiseScope.BEAT, urgency: Urgency.HIGH },
    });
  });

  it('does not duplicate already-fulfilled premise promises', () => {
    const result = computeNarrativeStateLifecycle({
      isOpening: false,
      parentOpenThreads: [makeThread()],
      parentThreadAges: { 'td-1': 0 },
      parentAccumulatedPromises: [makePromise()],
      parentAccumulatedFulfilledPremisePromises: ['Promise A'],
      threadsAdded: [],
      threadsResolved: [],
      analystResult: null,
      analystPromisesDetected: [],
      analystPromisesResolved: [],
      analystPremisePromiseFulfilled: 'Promise A',
    });

    expect(result.accumulatedFulfilledPremisePromises).toEqual(['Promise A']);
  });
});
