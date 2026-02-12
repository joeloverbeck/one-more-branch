import {
  computeContinuationThreadAges,
  computeInheritedNarrativePromises,
} from '../../../src/engine/page-builder';
import { Urgency } from '../../../src/models/state/keyed-entry';
import type { NarrativePromise } from '../../../src/models/state/keyed-entry';

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
    const result = computeContinuationThreadAges(parentAges, parentOpenThreadIds, threadsAdded, [], 1);
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
      2,
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

describe('computeInheritedNarrativePromises', () => {
  const makePromise = (desc: string, type: NarrativePromise['promiseType'] = 'FORESHADOWING'): NarrativePromise => ({
    description: desc,
    promiseType: type,
    suggestedUrgency: Urgency.MEDIUM,
  });

  it('combines parent inherited and analyst-detected promises', () => {
    const inherited = [makePromise('Old promise')];
    const detected = [makePromise('New foreshadowing')];
    const result = computeInheritedNarrativePromises(inherited, detected, []);
    expect(result).toHaveLength(2);
    expect(result[0]!.description).toBe('Old promise');
    expect(result[1]!.description).toBe('New foreshadowing');
  });

  it('caps at MAX_INHERITED_PROMISES (5)', () => {
    const inherited = Array.from({ length: 4 }, (_, i) => makePromise(`Inherited ${i}`));
    const detected = Array.from({ length: 3 }, (_, i) => makePromise(`Detected ${i}`));
    const result = computeInheritedNarrativePromises(inherited, detected, []);
    expect(result).toHaveLength(5);
    // Should keep the latest 5 (drops oldest from beginning)
    expect(result[0]!.description).toBe('Inherited 2');
  });

  it('filters out promises that became threads via word overlap', () => {
    const inherited = [
      makePromise('A silver dagger was introduced with emphasis'),
      makePromise('Unusual silence from northern watchtower'),
    ];
    const threadsAdded = ['The silver dagger proves to be enchanted and very dangerous'];
    const result = computeInheritedNarrativePromises(inherited, [], threadsAdded);
    expect(result).toHaveLength(1);
    expect(result[0]!.description).toBe('Unusual silence from northern watchtower');
  });

  it('returns empty when no promises exist', () => {
    const result = computeInheritedNarrativePromises([], [], []);
    expect(result).toEqual([]);
  });
});
