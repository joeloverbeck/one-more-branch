import { logger } from '../../../src/logging/index';
import { setModelLogger } from '../../../src/models/model-logger';
import {
  accumulateState,
  addCanonFact,
  applyCharacterStateChanges,
  applyHealthChanges,
  applyStateChanges,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  createEmptyAccumulatedCharacterState,
  createEmptyAccumulatedState,
  createEmptyCharacterStateChanges,
  createEmptyHealthChanges,
  createEmptyStateChanges,
  extractPrefixFromRemoval,
  isActiveState,
  isActiveStateChanges,
  isValidRemovalPrefix,
  mergeCanonFacts,
  parseTaggedEntry,
} from '../../../src/models/state';

describe('State utilities', () => {
  beforeAll(() => {
    // Wire up logger for model layer warnings
    setModelLogger(logger);
  });

  afterAll(() => {
    // Clean up
    setModelLogger(null);
  });

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

  describe('createEmptyActiveState', () => {
    it('returns state with empty location', () => {
      const state = createEmptyActiveState();
      expect(state.currentLocation).toBe('');
    });

    it('returns state with empty threat array', () => {
      const state = createEmptyActiveState();
      expect(state.activeThreats).toEqual([]);
    });

    it('returns state with empty constraints array', () => {
      const state = createEmptyActiveState();
      expect(state.activeConstraints).toEqual([]);
    });

    it('returns state with empty threads array', () => {
      const state = createEmptyActiveState();
      expect(state.openThreads).toEqual([]);
    });
  });

  describe('createEmptyActiveStateChanges', () => {
    it('returns changes with null location', () => {
      const changes = createEmptyActiveStateChanges();
      expect(changes.newLocation).toBeNull();
    });

    it('returns changes with empty arrays', () => {
      const changes = createEmptyActiveStateChanges();
      expect(changes.threatsAdded).toEqual([]);
      expect(changes.threatsRemoved).toEqual([]);
      expect(changes.constraintsAdded).toEqual([]);
      expect(changes.constraintsRemoved).toEqual([]);
      expect(changes.threadsAdded).toEqual([]);
      expect(changes.threadsResolved).toEqual([]);
    });
  });

  describe('isActiveState', () => {
    it('returns true for valid ActiveState', () => {
      const state = {
        currentLocation: 'Room',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      };
      expect(isActiveState(state)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isActiveState(null)).toBe(false);
    });

    it('returns false for missing currentLocation', () => {
      expect(isActiveState({ activeThreats: [], activeConstraints: [], openThreads: [] })).toBe(
        false
      );
    });

    it('returns true for state with entries', () => {
      const state = {
        currentLocation: 'Cave',
        activeThreats: [{ prefix: 'THREAT_X', description: 'X', raw: 'THREAT_X: X' }],
        activeConstraints: [],
        openThreads: [],
      };
      expect(isActiveState(state)).toBe(true);
    });
  });

  describe('isActiveStateChanges', () => {
    it('returns true for valid changes object', () => {
      const changes = {
        newLocation: null,
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      };
      expect(isActiveStateChanges(changes)).toBe(true);
    });

    it('returns true when newLocation is string', () => {
      const changes = {
        newLocation: 'New Place',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      };
      expect(isActiveStateChanges(changes)).toBe(true);
    });

    it('returns false for missing fields', () => {
      expect(isActiveStateChanges({ newLocation: null })).toBe(false);
    });

    it('returns false when removal arrays contain non-string values', () => {
      const invalid = {
        newLocation: null,
        threatsAdded: [],
        threatsRemoved: [123],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      };
      expect(isActiveStateChanges(invalid)).toBe(false);
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
        logger.clear();
        const result = applyStateChanges(
          { changes: ['Existing state'] },
          { added: [], removed: ['Non-existent state'] }
        );
        expect(result.changes).toEqual(['Existing state']);
        const entries = logger.getEntries();
        const warnEntry = entries.find(e => e.level === 'warn' && e.message.includes('Non-existent state'));
        expect(warnEntry).toBeDefined();
        expect(warnEntry?.message).toContain('State removal did not match any existing state');
      });

      it('does not warn for empty string removals', () => {
        logger.clear();
        const result = applyStateChanges(
          { changes: ['Existing'] },
          { added: [], removed: ['', '  '] }
        );
        expect(result.changes).toEqual(['Existing']);
        const entries = logger.getEntries();
        const warnEntries = entries.filter(e => e.level === 'warn');
        expect(warnEntries.length).toBe(0);
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

  describe('createEmptyHealthChanges', () => {
    it('returns empty added and removed arrays', () => {
      expect(createEmptyHealthChanges()).toEqual({ added: [], removed: [] });
    });
  });

  describe('applyHealthChanges', () => {
    describe('adding health entries', () => {
      it('adds new health entries to empty health', () => {
        const result = applyHealthChanges(
          [],
          { added: ['Minor wound on left arm', 'Headache'], removed: [] }
        );
        expect(result).toEqual(['Minor wound on left arm', 'Headache']);
      });

      it('appends new health entries to existing health', () => {
        const result = applyHealthChanges(
          ['Bruised ribs'],
          { added: ['Sprained ankle'], removed: [] }
        );
        expect(result).toEqual(['Bruised ribs', 'Sprained ankle']);
      });

      it('trims whitespace from added health entries', () => {
        const result = applyHealthChanges(
          [],
          { added: ['  Poison in your veins  ', ''], removed: [] }
        );
        expect(result).toEqual(['Poison in your veins']);
      });

      it('filters out empty string additions', () => {
        const result = applyHealthChanges(
          ['Existing injury'],
          { added: ['', '  ', 'New wound'], removed: [] }
        );
        expect(result).toEqual(['Existing injury', 'New wound']);
      });
    });

    describe('removing health entries', () => {
      it('removes existing health entry with exact match', () => {
        const result = applyHealthChanges(
          ['Minor wound on left arm', 'Headache'],
          { added: [], removed: ['Minor wound on left arm'] }
        );
        expect(result).toEqual(['Headache']);
      });

      it('removes health entry with case-insensitive match', () => {
        const result = applyHealthChanges(
          ['BRUISED RIBS'],
          { added: [], removed: ['bruised ribs'] }
        );
        expect(result).toEqual([]);
      });

      it('removes health entry with whitespace-trimmed match', () => {
        const result = applyHealthChanges(
          ['Sprained ankle'],
          { added: [], removed: ['  Sprained ankle  '] }
        );
        expect(result).toEqual([]);
      });

      it('removes only the first matching entry when duplicates exist', () => {
        const result = applyHealthChanges(
          ['Fatigue', 'Fatigue', 'Hunger'],
          { added: [], removed: ['Fatigue'] }
        );
        expect(result).toEqual(['Fatigue', 'Hunger']);
      });

      it('ignores removal when entry does not exist', () => {
        logger.clear();
        const result = applyHealthChanges(
          ['Existing condition'],
          { added: [], removed: ['Non-existent condition'] }
        );
        expect(result).toEqual(['Existing condition']);
        const entries = logger.getEntries();
        const warnEntry = entries.find(e => e.level === 'warn' && e.message.includes('Non-existent condition'));
        expect(warnEntry).toBeDefined();
        expect(warnEntry?.message).toContain('Health removal did not match any existing entry');
      });
    });

    describe('combined add and remove operations', () => {
      it('processes removals before additions', () => {
        const result = applyHealthChanges(
          ['Poison in your veins'],
          { added: ['Poison neutralized - feeling better'], removed: ['Poison in your veins'] }
        );
        expect(result).toEqual(['Poison neutralized - feeling better']);
      });

      it('handles healing scenario correctly', () => {
        const result = applyHealthChanges(
          ['Minor wound on left arm', 'Exhaustion'],
          { added: ['Wound healed - minor scar remains'], removed: ['Minor wound on left arm'] }
        );
        expect(result).toEqual(['Exhaustion', 'Wound healed - minor scar remains']);
      });
    });

    describe('immutability', () => {
      it('does not mutate the original health array', () => {
        const original: readonly string[] = ['Condition A', 'Condition B'];
        const result = applyHealthChanges(
          original,
          { added: ['Condition C'], removed: ['Condition A'] }
        );

        expect(original).toEqual(['Condition A', 'Condition B']);
        expect(result).toEqual(['Condition B', 'Condition C']);
        expect(result).not.toBe(original);
      });
    });
  });

  describe('createEmptyCharacterStateChanges', () => {
    it('returns an empty array', () => {
      expect(createEmptyCharacterStateChanges()).toEqual([]);
    });
  });

  describe('createEmptyAccumulatedCharacterState', () => {
    it('returns an empty object', () => {
      expect(createEmptyAccumulatedCharacterState()).toEqual({});
    });
  });

  describe('applyCharacterStateChanges', () => {
    describe('adding character state entries', () => {
      it('adds new character state to empty accumulated state with preserved casing', () => {
        const result = applyCharacterStateChanges(
          {},
          [{ characterName: 'Greaves', added: ['Gave protagonist a map'], removed: [] }]
        );
        expect(result).toEqual({
          Greaves: ['Gave protagonist a map'],
        });
      });

      it('appends new states to existing character using existing key casing', () => {
        const result = applyCharacterStateChanges(
          { Greaves: ['Gave protagonist a map'] },
          [{ characterName: 'greaves', added: ['Proposed 70-30 split'], removed: [] }]
        );
        // Uses existing key casing, not new query casing
        expect(result).toEqual({
          Greaves: ['Gave protagonist a map', 'Proposed 70-30 split'],
        });
      });

      it('handles multiple characters in single operation with preserved casing', () => {
        const result = applyCharacterStateChanges(
          {},
          [
            { characterName: 'Greaves', added: ['Gave protagonist a map'], removed: [] },
            { characterName: 'Elena', added: ['Agreed to help'], removed: [] },
          ]
        );
        expect(result).toEqual({
          Greaves: ['Gave protagonist a map'],
          Elena: ['Agreed to help'],
        });
      });

      it('cleans punctuation but preserves original casing', () => {
        const result = applyCharacterStateChanges(
          {},
          [{ characterName: '  GREAVES  ', added: ['Gave protagonist a map'], removed: [] }]
        );
        expect(result).toEqual({
          GREAVES: ['Gave protagonist a map'],
        });
      });

      it('trims whitespace from added state entries', () => {
        const result = applyCharacterStateChanges(
          {},
          [{ characterName: 'Greaves', added: ['  Trimmed entry  ', ''], removed: [] }]
        );
        expect(result).toEqual({
          Greaves: ['Trimmed entry'],
        });
      });

      it('filters out empty string additions', () => {
        const result = applyCharacterStateChanges(
          { Greaves: ['Existing'] },
          [{ characterName: 'greaves', added: ['', '  ', 'Valid'], removed: [] }]
        );
        expect(result).toEqual({
          Greaves: ['Existing', 'Valid'],
        });
      });
    });

    describe('removing character state entries', () => {
      it('removes existing state entry with exact match', () => {
        const result = applyCharacterStateChanges(
          { Greaves: ['Gave protagonist a map', 'Proposed 70-30 split'] },
          [{ characterName: 'Greaves', added: [], removed: ['Gave protagonist a map'] }]
        );
        expect(result).toEqual({
          Greaves: ['Proposed 70-30 split'],
        });
      });

      it('removes state entry with case-insensitive match', () => {
        const result = applyCharacterStateChanges(
          { Greaves: ['GAVE PROTAGONIST A MAP'] },
          [{ characterName: 'greaves', added: [], removed: ['gave protagonist a map'] }]
        );
        // Empty characters are removed from the result
        expect(result).toEqual({});
      });

      it('removes state entry with whitespace-trimmed match', () => {
        const result = applyCharacterStateChanges(
          { Greaves: ['Gave protagonist a map'] },
          [{ characterName: 'GREAVES', added: [], removed: ['  Gave protagonist a map  '] }]
        );
        // Empty characters are removed from the result
        expect(result).toEqual({});
      });

      it('ignores removal when state does not exist', () => {
        logger.clear();
        const result = applyCharacterStateChanges(
          { Greaves: ['Existing state'] },
          [{ characterName: 'greaves', added: [], removed: ['Non-existent state'] }]
        );
        expect(result).toEqual({ Greaves: ['Existing state'] });
        const entries = logger.getEntries();
        const warnEntry = entries.find(e => e.level === 'warn' && e.message.includes('Non-existent state'));
        expect(warnEntry).toBeDefined();
        expect(warnEntry?.message).toContain('Character state removal did not match any existing entry for "greaves"');
      });

      it('ignores removal when character does not exist', () => {
        logger.clear();
        const result = applyCharacterStateChanges(
          { Greaves: ['Existing state'] },
          [{ characterName: 'unknown', added: [], removed: ['Some state'] }]
        );
        expect(result).toEqual({ Greaves: ['Existing state'] });
        const entries = logger.getEntries();
        const warnEntry = entries.find(e => e.level === 'warn' && e.message.includes('Some state'));
        expect(warnEntry).toBeDefined();
        expect(warnEntry?.message).toContain('Character state removal did not match any existing entry for "unknown"');
      });
    });

    describe('combined add and remove operations', () => {
      it('processes removals before additions', () => {
        const result = applyCharacterStateChanges(
          { Greaves: ['Waiting at the docks'] },
          [{ characterName: 'greaves', added: ['Left the docks'], removed: ['Waiting at the docks'] }]
        );
        expect(result).toEqual({
          Greaves: ['Left the docks'],
        });
      });

      it('handles multiple additions and removals in single operation', () => {
        const result = applyCharacterStateChanges(
          { Greaves: ['State A', 'State B', 'State C'] },
          [{ characterName: 'greaves', added: ['State D', 'State E'], removed: ['State A', 'State B'] }]
        );
        expect(result).toEqual({
          Greaves: ['State C', 'State D', 'State E'],
        });
      });
    });

    describe('immutability', () => {
      it('does not mutate the original accumulated state', () => {
        const original = { Greaves: ['State A', 'State B'] };
        const result = applyCharacterStateChanges(
          original,
          [{ characterName: 'greaves', added: ['State C'], removed: ['State A'] }]
        );

        expect(original).toEqual({ Greaves: ['State A', 'State B'] });
        expect(result).toEqual({ Greaves: ['State B', 'State C'] });
        expect(result).not.toBe(original);
      });

      it('does not mutate the original character state array', () => {
        const originalArray = ['State A', 'State B'];
        const original = { Greaves: originalArray };
        const result = applyCharacterStateChanges(
          original,
          [{ characterName: 'greaves', added: ['State C'], removed: [] }]
        );

        expect(originalArray).toEqual(['State A', 'State B']);
        expect(result.Greaves).toEqual(['State A', 'State B', 'State C']);
        expect(result.Greaves).not.toBe(originalArray);
      });
    });
  });

  describe('parseTaggedEntry', () => {
    it('parses valid THREAT entry', () => {
      const result = parseTaggedEntry('THREAT_ENTITIES: Multiple entities tracking');
      expect(result).toEqual({
        prefix: 'THREAT_ENTITIES',
        description: 'Multiple entities tracking',
        raw: 'THREAT_ENTITIES: Multiple entities tracking',
      });
    });

    it('parses valid CONSTRAINT entry', () => {
      const result = parseTaggedEntry('CONSTRAINT_BETTY_BREATHING: Breathing fragile');
      expect(result?.prefix).toBe('CONSTRAINT_BETTY_BREATHING');
    });

    it('parses valid THREAD entry', () => {
      const result = parseTaggedEntry('THREAD_GRAFFITI: Meaning unknown');
      expect(result?.prefix).toBe('THREAD_GRAFFITI');
    });

    it('returns null for entry without colon', () => {
      logger.clear();
      expect(parseTaggedEntry('THREAT_FIRE Fire spreading')).toBeNull();

      const entries = logger.getEntries();
      const warnEntry = entries.find(
        e => e.level === 'warn' && e.message.includes('Invalid tagged state entry (missing colon)')
      );
      expect(warnEntry).toBeDefined();
    });

    it('returns null for invalid category', () => {
      logger.clear();
      expect(parseTaggedEntry('DANGER_FIRE: Fire spreading')).toBeNull();

      const entries = logger.getEntries();
      const warnEntry = entries.find(
        e => e.level === 'warn' && e.message.includes('Invalid tagged state entry prefix')
      );
      expect(warnEntry).toBeDefined();
    });

    it('handles extra whitespace', () => {
      const result = parseTaggedEntry('  THREAT_FIRE:   Fire spreading  ');
      expect(result?.prefix).toBe('THREAT_FIRE');
      expect(result?.description).toBe('Fire spreading');
    });

    it('handles empty description', () => {
      const result = parseTaggedEntry('THREAT_FIRE:');
      expect(result?.prefix).toBe('THREAT_FIRE');
      expect(result?.description).toBe('');
    });

    it('handles description with colons', () => {
      const result = parseTaggedEntry('THREAD_TIME: Clock reads 3:45 PM');
      expect(result?.description).toBe('Clock reads 3:45 PM');
    });
  });

  describe('isValidRemovalPrefix', () => {
    it('accepts valid THREAT prefix', () => {
      expect(isValidRemovalPrefix('THREAT_ENTITIES')).toBe(true);
    });

    it('accepts valid CONSTRAINT prefix', () => {
      expect(isValidRemovalPrefix('CONSTRAINT_TIME_LIMIT')).toBe(true);
    });

    it('accepts valid THREAD prefix', () => {
      expect(isValidRemovalPrefix('THREAD_MYSTERY_BOX')).toBe(true);
    });

    it('rejects prefix with description', () => {
      expect(isValidRemovalPrefix('THREAT_FIRE: Fire spreading')).toBe(false);
    });

    it('rejects invalid category', () => {
      expect(isValidRemovalPrefix('DANGER_FIRE')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidRemovalPrefix('')).toBe(false);
    });

    it('rejects category without identifier', () => {
      expect(isValidRemovalPrefix('THREAT_')).toBe(false);
    });

    it('rejects just category name', () => {
      expect(isValidRemovalPrefix('THREAT')).toBe(false);
    });
  });

  describe('extractPrefixFromRemoval', () => {
    it('returns valid removal prefix unchanged', () => {
      expect(extractPrefixFromRemoval('THREAT_ENTITIES')).toBe('THREAT_ENTITIES');
    });

    it('extracts prefix when removal includes description', () => {
      logger.clear();
      expect(extractPrefixFromRemoval('THREAT_ENTITIES: Multiple entities tracking')).toBe(
        'THREAT_ENTITIES'
      );

      const entries = logger.getEntries();
      const warnEntry = entries.find(
        e =>
          e.level === 'warn' &&
          e.message.includes('Removal prefix included description; using extracted prefix')
      );
      expect(warnEntry).toBeDefined();
    });

    it('returns null when extracted prefix is invalid', () => {
      logger.clear();
      expect(extractPrefixFromRemoval('DANGER_FIRE: Fire spreading')).toBeNull();

      const entries = logger.getEntries();
      const warnEntry = entries.find(
        e => e.level === 'warn' && e.message.includes('Invalid removal prefix')
      );
      expect(warnEntry).toBeDefined();
    });
  });
});
