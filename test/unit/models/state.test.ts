import {
  accumulateState,
  addCanonFact,
  createEmptyAccumulatedState,
  mergeCanonFacts,
} from '../../../src/models/state';

describe('State utilities', () => {
  describe('createEmptyAccumulatedState', () => {
    it('returns an empty changes collection', () => {
      expect(createEmptyAccumulatedState()).toEqual({ changes: [] });
    });
  });

  describe('accumulateState', () => {
    it('returns parent and new changes in order', () => {
      const result = accumulateState({ changes: ['Event A'] }, ['Event B', 'Event C']);
      expect(result).toEqual({ changes: ['Event A', 'Event B', 'Event C'] });
    });

    it('does not mutate the parent state', () => {
      const parent = { changes: ['Event A'] as const };
      const result = accumulateState(parent, ['Event B']);

      expect(parent).toEqual({ changes: ['Event A'] });
      expect(result).toEqual({ changes: ['Event A', 'Event B'] });
    });
  });

  describe('addCanonFact', () => {
    it('adds a new canon fact', () => {
      expect(addCanonFact(['Fact A'], 'Fact B')).toEqual(['Fact A', 'Fact B']);
    });

    it('does not add duplicates using case-insensitive comparison', () => {
      expect(addCanonFact(['The kingdom exists'], 'THE KINGDOM EXISTS')).toEqual([
        'The kingdom exists',
      ]);
    });

    it('does not mutate original canon when adding a new fact', () => {
      const canon = ['Fact A'] as const;
      const result = addCanonFact(canon, 'Fact B');

      expect(canon).toEqual(['Fact A']);
      expect(result).toEqual(['Fact A', 'Fact B']);
      expect(result).not.toBe(canon);
    });

    it('returns the original array reference when fact is duplicate after trim', () => {
      const canon = ['Fact A'] as const;
      const result = addCanonFact(canon, '  fact a  ');

      expect(result).toBe(canon);
    });

    it('trims facts before adding', () => {
      expect(addCanonFact([], '  Fact B  ')).toEqual(['Fact B']);
    });
  });

  describe('mergeCanonFacts', () => {
    it('adds multiple non-duplicate facts', () => {
      expect(mergeCanonFacts(['Fact A'], ['Fact B', 'Fact C'])).toEqual([
        'Fact A',
        'Fact B',
        'Fact C',
      ]);
    });

    it('skips duplicates while merging', () => {
      expect(mergeCanonFacts(['Fact A'], ['Fact A', 'Fact B'])).toEqual(['Fact A', 'Fact B']);
    });
  });
});
