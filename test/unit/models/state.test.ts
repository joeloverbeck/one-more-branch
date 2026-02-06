import {
  accumulateState,
  addCanonFact,
  applyStateChanges,
  createEmptyAccumulatedState,
  createEmptyStateChanges,
  mergeCanonFacts,
} from '../../../src/models/state';

describe('State utilities', () => {
  describe('createEmptyAccumulatedState', () => {
    it('returns an empty changes collection', () => {
      expect(createEmptyAccumulatedState()).toEqual({ changes: [] });
    });
  });

  describe('createEmptyStateChanges', () => {
    it('returns empty added and removed arrays', () => {
      expect(createEmptyStateChanges()).toEqual({ added: [], removed: [] });
    });
  });

  describe('applyStateChanges', () => {
    describe('adding state changes', () => {
      it('adds new state changes to empty accumulated state', () => {
        const result = applyStateChanges(
          { changes: [] },
          { added: ['You are wounded', 'You befriended Elena'], removed: [] }
        );
        expect(result.changes).toEqual(['You are wounded', 'You befriended Elena']);
      });

      it('appends new state changes to existing accumulated state', () => {
        const result = applyStateChanges(
          { changes: ['Entered the cave'] },
          { added: ['Found a key'], removed: [] }
        );
        expect(result.changes).toEqual(['Entered the cave', 'Found a key']);
      });

      it('trims whitespace from added state changes', () => {
        const result = applyStateChanges(
          { changes: [] },
          { added: ['  Trimmed state  ', ''], removed: [] }
        );
        expect(result.changes).toEqual(['Trimmed state']);
      });

      it('filters out empty string additions', () => {
        const result = applyStateChanges(
          { changes: ['Existing'] },
          { added: ['', '  ', 'Valid'], removed: [] }
        );
        expect(result.changes).toEqual(['Existing', 'Valid']);
      });
    });

    describe('removing state changes', () => {
      it('removes existing state change with exact match', () => {
        const result = applyStateChanges(
          { changes: ['You are wounded', 'You befriended Elena'] },
          { added: [], removed: ['You are wounded'] }
        );
        expect(result.changes).toEqual(['You befriended Elena']);
      });

      it('removes state change with case-insensitive match', () => {
        const result = applyStateChanges(
          { changes: ['You are WOUNDED'] },
          { added: [], removed: ['you are wounded'] }
        );
        expect(result.changes).toEqual([]);
      });

      it('removes state change with whitespace-trimmed match', () => {
        const result = applyStateChanges(
          { changes: ['You are wounded'] },
          { added: [], removed: ['  You are wounded  '] }
        );
        expect(result.changes).toEqual([]);
      });

      it('removes only the first matching state when duplicates exist', () => {
        const result = applyStateChanges(
          { changes: ['Tired', 'Tired', 'Hungry'] },
          { added: [], removed: ['Tired'] }
        );
        expect(result.changes).toEqual(['Tired', 'Hungry']);
      });

      it('ignores removal when state does not exist', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = applyStateChanges(
          { changes: ['Existing state'] },
          { added: [], removed: ['Non-existent state'] }
        );
        expect(result.changes).toEqual(['Existing state']);
        expect(consoleSpy).toHaveBeenCalledWith(
          'State removal did not match any existing state: "Non-existent state"'
        );
        consoleSpy.mockRestore();
      });

      it('does not warn for empty string removals', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = applyStateChanges(
          { changes: ['Existing'] },
          { added: [], removed: ['', '  '] }
        );
        expect(result.changes).toEqual(['Existing']);
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('combined add and remove operations', () => {
      it('processes removals before additions', () => {
        const result = applyStateChanges(
          { changes: ['You are wounded'] },
          { added: ['You have been healed'], removed: ['You are wounded'] }
        );
        expect(result.changes).toEqual(['You have been healed']);
      });

      it('handles healing scenario correctly', () => {
        const result = applyStateChanges(
          { changes: ['You entered the dungeon', 'You are wounded from the battle'] },
          { added: ['You feel restored after drinking the potion'], removed: ['You are wounded from the battle'] }
        );
        expect(result.changes).toEqual([
          'You entered the dungeon',
          'You feel restored after drinking the potion'
        ]);
      });

      it('handles allegiance change scenario', () => {
        const result = applyStateChanges(
          { changes: ['You are allied with the rebels', 'You carry secret documents'] },
          { added: ['You have betrayed the rebels and joined the empire'], removed: ['You are allied with the rebels'] }
        );
        expect(result.changes).toEqual([
          'You carry secret documents',
          'You have betrayed the rebels and joined the empire'
        ]);
      });

      it('handles multiple additions and removals in single operation', () => {
        const result = applyStateChanges(
          { changes: ['Tired', 'Hungry', 'Wounded'] },
          { added: ['Rested', 'Fed'], removed: ['Tired', 'Hungry'] }
        );
        expect(result.changes).toEqual(['Wounded', 'Rested', 'Fed']);
      });
    });

    describe('immutability', () => {
      it('does not mutate the original accumulated state', () => {
        const original = { changes: ['State A', 'State B'] };
        const result = applyStateChanges(
          original,
          { added: ['State C'], removed: ['State A'] }
        );

        expect(original.changes).toEqual(['State A', 'State B']);
        expect(result.changes).toEqual(['State B', 'State C']);
        expect(result).not.toBe(original);
      });
    });
  });

  describe('accumulateState (deprecated wrapper)', () => {
    it('returns parent and new changes in order', () => {
      const result = accumulateState(
        { changes: ['Event A'] },
        { added: ['Event B', 'Event C'], removed: [] },
      );
      expect(result).toEqual({ changes: ['Event A', 'Event B', 'Event C'] });
    });

    it('does not mutate the parent state', () => {
      const parent = { changes: ['Event A'] as const };
      const result = accumulateState(parent, { added: ['Event B'], removed: [] });

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
