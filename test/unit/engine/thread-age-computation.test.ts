import {
  computeContinuationThreadAges,
  computeAccumulatedPromises,
} from '../../../src/engine/page-builder';
import { PromiseType, Urgency } from '../../../src/models/state/keyed-entry';
import type { TrackedPromise } from '../../../src/models/state/keyed-entry';
import type { AnalystResult, DetectedPromise } from '../../../src/llm/analyst-types';

describe('computeContinuationThreadAges', () => {
  it('increments inherited thread ages by 1', () => {
    const parentAges = { 'td-1': 0, 'td-2': 3 };
    const parentOpenThreadIds = ['td-1', 'td-2'];
    const result = computeContinuationThreadAges(parentAges, parentOpenThreadIds, [], [], 2);
    expect(result).toEqual({ 'td-1': 1, 'td-2': 4 });
  });

  it('removes resolved threads from ages', () => {
    const parentAges = { 'td-1': 2, 'td-2': 5 };
    const parentOpenThreadIds = ['td-1', 'td-2'];
    const result = computeContinuationThreadAges(parentAges, parentOpenThreadIds, [], ['td-2'], 2);
    expect(result).toEqual({ 'td-1': 3 });
  });

  it('assigns age 0 to newly added threads', () => {
    const parentAges = { 'td-1': 1 };
    const parentOpenThreadIds = ['td-1'];
    const threadsAdded = [{ text: 'New quest' }, { text: 'Another thread' }];
    const result = computeContinuationThreadAges(
      parentAges,
      parentOpenThreadIds,
      threadsAdded,
      [],
      1
    );
    expect(result).toEqual({ 'td-1': 2, 'td-2': 0, 'td-3': 0 });
  });

  it('handles simultaneous add and resolve', () => {
    const parentAges = { 'td-1': 0, 'td-2': 3 };
    const parentOpenThreadIds = ['td-1', 'td-2'];
    const threadsAdded = [{ text: 'Fresh thread' }];
    const result = computeContinuationThreadAges(
      parentAges,
      parentOpenThreadIds,
      threadsAdded,
      ['td-1'],
      2
    );
    expect(result).toEqual({ 'td-2': 4, 'td-3': 0 });
  });

  it('defaults missing parent ages to 0', () => {
    const parentAges = {};
    const parentOpenThreadIds = ['td-5'];
    const result = computeContinuationThreadAges(parentAges, parentOpenThreadIds, [], [], 5);
    expect(result).toEqual({ 'td-5': 1 });
  });

  it('returns empty map when no threads exist', () => {
    const result = computeContinuationThreadAges({}, [], [], [], 0);
    expect(result).toEqual({});
  });
});

describe('computeAccumulatedPromises', () => {
  const makeTrackedPromise = (
    id: string,
    desc: string,
    age: number,
    type: TrackedPromise['promiseType'] = PromiseType.FORESHADOWING
  ): TrackedPromise => ({
    id,
    age,
    description: desc,
    promiseType: type,
    suggestedUrgency: Urgency.MEDIUM,
  });

  const makeDetectedPromise = (
    desc: string,
    type: DetectedPromise['promiseType'] = PromiseType.FORESHADOWING
  ): DetectedPromise => ({
    description: desc,
    promiseType: type,
    suggestedUrgency: Urgency.MEDIUM,
  });

  const makeAnalystResult = (overrides: Partial<AnalystResult> = {}): AnalystResult => ({
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    narrativeSummary: '',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
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
    rawResponse: '{}',
    ...overrides,
  });

  it('ages survivors and adds analyst-detected promises with new IDs', () => {
    const tracked = [makeTrackedPromise('pr-1', 'Old promise', 2)];
    const detected = [makeDetectedPromise('New foreshadowing')];
    const result = computeAccumulatedPromises(
      tracked,
      makeAnalystResult({ promisesDetected: detected })
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.description).toBe('Old promise');
    expect(result[0]!.age).toBe(3);
    expect(result[1]!.description).toBe('New foreshadowing');
    expect(result[1]!.id).toBe('pr-2');
    expect(result[1]!.age).toBe(0);
  });

  it('does not cap inherited promises', () => {
    const tracked = Array.from({ length: 4 }, (_, i) =>
      makeTrackedPromise(`pr-${i + 1}`, `Tracked ${i}`, i)
    );
    const detected = Array.from({ length: 3 }, (_, i) => makeDetectedPromise(`Detected ${i}`));
    const result = computeAccumulatedPromises(
      tracked,
      makeAnalystResult({ promisesDetected: detected })
    );
    expect(result).toHaveLength(7);
    expect(result[0]!.description).toBe('Tracked 0');
    expect(result[6]!.description).toBe('Detected 2');
  });

  it('removes promises explicitly resolved by analyst', () => {
    const tracked = [
      makeTrackedPromise('pr-1', 'A silver dagger was introduced with emphasis', 1),
      makeTrackedPromise('pr-2', 'Unusual silence from northern watchtower', 0),
    ];
    const result = computeAccumulatedPromises(
      tracked,
      makeAnalystResult({ promisesResolved: ['pr-1'] })
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('pr-2');
    expect(result[0]!.description).toBe('Unusual silence from northern watchtower');
    expect(result[0]!.age).toBe(1);
  });

  it('returns empty when no promises exist', () => {
    const result = computeAccumulatedPromises([], makeAnalystResult());
    expect(result).toEqual([]);
  });
});
