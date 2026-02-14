import {
  computeContinuationThreadAges,
} from '../../../src/engine/page-builder';

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
