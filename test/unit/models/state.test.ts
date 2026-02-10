import { logger } from '../../../src/logging/index';
import { setModelLogger } from '../../../src/models/model-logger';
import {
  ThreadType,
  Urgency,
  addCanonFact,
  applyCharacterStateChanges,
  applyActiveStateChanges,
  applyHealthChanges,
  applyInventoryChanges,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  createEmptyAccumulatedCharacterState,
  createEmptyCharacterStateChanges,
  createEmptyHealthChanges,
  createEmptyInventoryChanges,
  isActiveState,
  isActiveStateChanges,
  mergeCanonFacts,
} from '../../../src/models/state';

describe('State utilities', () => {
  beforeAll(() => {
    setModelLogger(logger);
  });

  afterAll(() => {
    setModelLogger(null);
  });

  describe('createEmpty utilities', () => {
    it('creates empty active state and changes', () => {
      expect(createEmptyActiveState()).toEqual({
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      });
      expect(createEmptyActiveStateChanges()).toEqual({
        newLocation: null,
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      });
    });

    it('creates empty inventory, health, and character state changes', () => {
      expect(createEmptyInventoryChanges()).toEqual({ added: [], removed: [] });
      expect(createEmptyHealthChanges()).toEqual({ added: [], removed: [] });
      expect(createEmptyCharacterStateChanges()).toEqual({ added: [], removed: [] });
      expect(createEmptyAccumulatedCharacterState()).toEqual({});
    });
  });

  describe('isActiveState', () => {
    it('returns true for keyed active state', () => {
      expect(
        isActiveState({
          currentLocation: 'x',
          activeThreats: [{ id: 'th-1', text: 'y' }],
          activeConstraints: [],
          openThreads: [],
        }),
      ).toBe(true);
    });

    it('returns false for legacy tagged entry shape', () => {
      expect(
        isActiveState({
          currentLocation: 'x',
          activeThreats: [{ prefix: 'THREAT_X', description: 'y', raw: 'THREAT_X: y' }],
          activeConstraints: [],
          openThreads: [],
        }),
      ).toBe(false);
    });

    it('returns false for thread entries missing metadata', () => {
      expect(
        isActiveState({
          currentLocation: 'x',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [{ id: 'td-1', text: 'Missing metadata' }],
        }),
      ).toBe(false);
    });
  });

  describe('isActiveStateChanges', () => {
    it('returns true for valid changes object', () => {
      expect(
        isActiveStateChanges({
          newLocation: null,
          threatsAdded: [],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
        }),
      ).toBe(true);
    });

    it('returns false when an array contains non-strings', () => {
      expect(
        isActiveStateChanges({
          newLocation: null,
          threatsAdded: [1],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
        }),
      ).toBe(false);
    });
  });

  describe('applyInventoryChanges', () => {
    it('applies remove by ID then add with next sequential ID', () => {
      const result = applyInventoryChanges(
        [{ id: 'inv-1', text: 'Sword' }],
        { added: ['Shield'], removed: ['inv-1'] },
      );
      expect(result).toEqual([{ id: 'inv-2', text: 'Shield' }]);
    });

    it('logs warning when removing unknown ID and keeps inventory unchanged', () => {
      logger.clear();
      const current = [{ id: 'inv-1', text: 'Sword' }] as const;
      const result = applyInventoryChanges(current, { added: [], removed: ['inv-9'] });

      expect(result).toEqual(current);
      const warning = logger
        .getEntries()
        .find(e => e.level === 'warn' && e.message.includes('removeByIds: ID "inv-9"'));
      expect(warning).toBeDefined();
    });

    it('is immutable', () => {
      const current = [{ id: 'inv-1', text: 'Sword' }] as const;
      const result = applyInventoryChanges(current, { added: ['Shield'], removed: [] });

      expect(current).toEqual([{ id: 'inv-1', text: 'Sword' }]);
      expect(result).toEqual([
        { id: 'inv-1', text: 'Sword' },
        { id: 'inv-2', text: 'Shield' },
      ]);
      expect(result).not.toBe(current);
    });
  });

  describe('applyHealthChanges', () => {
    it('applies remove by ID then add with next sequential ID', () => {
      const result = applyHealthChanges(
        [{ id: 'hp-1', text: 'Bruised arm' }],
        { added: ['Poisoned'], removed: ['hp-1'] },
      );
      expect(result).toEqual([{ id: 'hp-2', text: 'Poisoned' }]);
    });

    it('is immutable', () => {
      const current = [{ id: 'hp-1', text: 'Bruised arm' }] as const;
      const result = applyHealthChanges(current, { added: ['Poisoned'], removed: [] });

      expect(current).toEqual([{ id: 'hp-1', text: 'Bruised arm' }]);
      expect(result).toEqual([
        { id: 'hp-1', text: 'Bruised arm' },
        { id: 'hp-2', text: 'Poisoned' },
      ]);
      expect(result).not.toBe(current);
    });
  });

  describe('applyCharacterStateChanges', () => {
    it('assigns globally sequential cs IDs across characters', () => {
      const result = applyCharacterStateChanges({}, {
        added: [
          { characterName: 'Greaves', states: ['Gave map'] },
          { characterName: 'Elena', states: ['Agreed to help'] },
        ],
        removed: [],
      });

      expect(result).toEqual({
        Greaves: [{ id: 'cs-1', text: 'Gave map' }],
        Elena: [{ id: 'cs-2', text: 'Agreed to help' }],
      });
    });

    it('removes matching IDs across all characters', () => {
      const result = applyCharacterStateChanges(
        {
          Greaves: [
            { id: 'cs-1', text: 'A' },
            { id: 'cs-2', text: 'B' },
          ],
          Elena: [{ id: 'cs-3', text: 'C' }],
        },
        {
          added: [],
          removed: ['cs-1', 'cs-3'],
        },
      );

      expect(result).toEqual({
        Greaves: [{ id: 'cs-2', text: 'B' }],
      });
    });

    it('continues global sequence from highest existing ID', () => {
      const result = applyCharacterStateChanges(
        {
          Greaves: [{ id: 'cs-5', text: 'Old' }],
        },
        {
          added: [{ characterName: 'Greaves', states: ['New'] }],
          removed: [],
        },
      );

      expect(result).toEqual({
        Greaves: [
          { id: 'cs-5', text: 'Old' },
          { id: 'cs-6', text: 'New' },
        ],
      });
    });

    it('removes empty characters after removals', () => {
      const result = applyCharacterStateChanges(
        {
          Greaves: [{ id: 'cs-1', text: 'Only state' }],
        },
        {
          added: [],
          removed: ['cs-1'],
        },
      );

      expect(result).toEqual({});
    });

    it('is immutable', () => {
      const current = {
        Greaves: [{ id: 'cs-1', text: 'Existing' }],
      } as const;
      const result = applyCharacterStateChanges(current, {
        added: [{ characterName: 'Greaves', states: ['New'] }],
        removed: [],
      });

      expect(current).toEqual({
        Greaves: [{ id: 'cs-1', text: 'Existing' }],
      });
      expect(result.Greaves).toEqual([
        { id: 'cs-1', text: 'Existing' },
        { id: 'cs-2', text: 'New' },
      ]);
      expect(result).not.toBe(current);
      expect(result.Greaves).not.toBe(current.Greaves);
    });
  });

  describe('applyActiveStateChanges', () => {
    it('creates keyed threat entries from plain additions', () => {
      const result = applyActiveStateChanges(createEmptyActiveState(), {
        newLocation: null,
        threatsAdded: ['Fire everywhere'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      });

      expect(result.activeThreats).toEqual([{ id: 'th-1', text: 'Fire everywhere' }]);
    });

    it('removes keyed threat entries by ID', () => {
      const result = applyActiveStateChanges(
        {
          currentLocation: 'Hallway',
          activeThreats: [{ id: 'th-1', text: 'Fire everywhere' }],
          activeConstraints: [],
          openThreads: [],
        },
        {
          newLocation: null,
          threatsAdded: [],
          threatsRemoved: ['th-1'],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
        },
      );

      expect(result.activeThreats).toEqual([]);
    });

    it('supports mixed add/remove across threat/constraint/thread categories', () => {
      const result = applyActiveStateChanges(
        {
          currentLocation: 'Before',
          activeThreats: [{ id: 'th-1', text: 'Old threat' }],
          activeConstraints: [{ id: 'cn-1', text: 'Old constraint' }],
          openThreads: [
            {
              id: 'td-1',
              text: 'Old thread',
              threadType: ThreadType.MYSTERY,
              urgency: Urgency.HIGH,
            },
          ],
        },
        {
          newLocation: 'After',
          threatsAdded: ['New threat'],
          threatsRemoved: ['th-1'],
          constraintsAdded: ['New constraint'],
          constraintsRemoved: ['cn-1'],
          threadsAdded: ['New thread'],
          threadsResolved: ['td-1'],
        },
      );

      expect(result).toEqual({
        currentLocation: 'After',
        activeThreats: [{ id: 'th-2', text: 'New threat' }],
        activeConstraints: [{ id: 'cn-2', text: 'New constraint' }],
        openThreads: [
          {
            id: 'td-2',
            text: 'New thread',
            threadType: ThreadType.INFORMATION,
            urgency: Urgency.MEDIUM,
          },
        ],
      });
    });

    it('assigns default thread metadata for new thread additions', () => {
      const result = applyActiveStateChanges(createEmptyActiveState(), {
        newLocation: null,
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: ['Signal in the ruins'],
        threadsResolved: [],
      });

      expect(result.openThreads).toEqual([
        {
          id: 'td-1',
          text: 'Signal in the ruins',
          threadType: ThreadType.INFORMATION,
          urgency: Urgency.MEDIUM,
        },
      ]);
    });

    it('is immutable', () => {
      const original = {
        currentLocation: 'Room',
        activeThreats: [{ id: 'th-1', text: 'Old threat' }],
        activeConstraints: [],
        openThreads: [],
      } as const;

      const result = applyActiveStateChanges(original, {
        newLocation: 'New room',
        threatsAdded: ['New threat'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      });

      expect(original).toEqual({
        currentLocation: 'Room',
        activeThreats: [{ id: 'th-1', text: 'Old threat' }],
        activeConstraints: [],
        openThreads: [],
      });
      expect(result).not.toBe(original);
      expect(result.activeThreats).not.toBe(original.activeThreats);
    });
  });

  describe('canon utilities', () => {
    it('adds and merges canon facts with case-insensitive dedupe', () => {
      expect(addCanonFact(['Fact A'], 'Fact B')).toEqual(['Fact A', 'Fact B']);
      expect(addCanonFact(['The kingdom exists'], 'THE KINGDOM EXISTS')).toEqual([
        'The kingdom exists',
      ]);
      expect(mergeCanonFacts(['Fact A'], ['Fact A', 'Fact B'])).toEqual(['Fact A', 'Fact B']);
    });
  });
});
