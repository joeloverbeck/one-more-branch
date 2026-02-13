import { parsePageId } from '@/models/id';
import { StoryStructure } from '@/models/story-arc';
import {
  createInitialVersionedStructure,
  createRewrittenVersionedStructure,
  createStructureVersionId,
  isStructureVersionId,
  isVersionedStoryStructure,
  parseStructureVersionId,
} from '@/models/structure-version';

function createTestStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act 1',
        objective: 'Start',
        stakes: 'Fail to begin',
        entryCondition: 'Quest accepted',
        beats: [
          {
            id: '1.1',
            name: 'First move',
            description: 'Beat 1',
            objective: 'Do first thing',
            role: 'setup',
          },
          {
            id: '1.2',
            name: 'Second move',
            description: 'Beat 2',
            objective: 'Do second thing',
            role: 'escalation',
          },
        ],
      },
      {
        id: '2',
        name: 'Act 2',
        objective: 'Escalate',
        stakes: 'Fall behind',
        entryCondition: 'Hero commits',
        beats: [
          {
            id: '2.1',
            name: 'Risk taken',
            description: 'Beat 1',
            objective: 'Take a risk',
            role: 'escalation',
          },
          {
            id: '2.2',
            name: 'Recovery',
            description: 'Beat 2',
            objective: 'Recover losses',
            role: 'turning_point',
          },
        ],
      },
      {
        id: '3',
        name: 'Act 3',
        objective: 'Resolve',
        stakes: 'Everything is lost',
        entryCondition: 'Final chance',
        beats: [
          {
            id: '3.1',
            name: 'Final clash',
            description: 'Beat 1',
            objective: 'End conflict',
            role: 'turning_point',
          },
          {
            id: '3.2',
            name: 'Aftermath',
            description: 'Beat 2',
            objective: 'Land ending',
            role: 'resolution',
          },
        ],
      },
    ],
    overallTheme: 'Resilience',
    premise: 'A stubborn crew must hold together through escalating losses.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    generatedAt: new Date('2026-02-07T00:00:00.000Z'),
  };
}

describe('StructureVersion', () => {
  describe('createStructureVersionId', () => {
    it('generates IDs in sv-{timestamp}-{random} format', () => {
      const id = createStructureVersionId();
      expect(id).toMatch(/^sv-\d{13}-[0-9a-f]{4}$/);
    });

    it('generates unique IDs across repeated calls', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1707321600000);
      try {
        const ids = new Set(Array.from({ length: 100 }, () => createStructureVersionId()));
        expect(ids.size).toBe(100);
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  describe('isStructureVersionId and parseStructureVersionId', () => {
    it('accepts valid IDs and rejects invalid values', () => {
      const valid = 'sv-1707321600000-a1b2';
      expect(isStructureVersionId(valid)).toBe(true);
      expect(isStructureVersionId('sv-1707321600000-a1b')).toBe(false);
      expect(isStructureVersionId('sv-time-a1b2')).toBe(false);
      expect(isStructureVersionId('')).toBe(false);
      expect(isStructureVersionId(123)).toBe(false);
    });

    it('throws on invalid input and returns the ID on valid input', () => {
      const valid = 'sv-1707321600000-a1b2';
      expect(parseStructureVersionId(valid)).toBe(valid);
      expect(() => parseStructureVersionId('invalid')).toThrow('Invalid StructureVersionId format');
      expect(() => parseStructureVersionId('')).toThrow('Invalid StructureVersionId format');
    });
  });

  describe('createInitialVersionedStructure', () => {
    it('creates an initial version with null lineage fields', () => {
      const structure = createTestStructure();
      const before = Date.now();
      const version = createInitialVersionedStructure(structure);
      const after = Date.now();

      expect(isStructureVersionId(version.id)).toBe(true);
      expect(version.structure).toBe(structure);
      expect(version.previousVersionId).toBeNull();
      expect(version.createdAtPageId).toBeNull();
      expect(version.rewriteReason).toBeNull();
      expect(version.preservedBeatIds).toEqual([]);
      expect(version.createdAt).toBeInstanceOf(Date);
      expect(version.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(version.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('createRewrittenVersionedStructure', () => {
    it('creates a rewritten version linked to previous version', () => {
      const previousVersion = createInitialVersionedStructure(createTestStructure());
      const pageId = parsePageId(7);
      const preservedBeatIds = ['1.1', '1.2'];
      const newStructure = createTestStructure();
      const before = Date.now();
      const version = createRewrittenVersionedStructure(
        previousVersion,
        newStructure,
        preservedBeatIds,
        'Player joined the enemy',
        pageId
      );
      const after = Date.now();

      expect(isStructureVersionId(version.id)).toBe(true);
      expect(version.id).not.toBe(previousVersion.id);
      expect(version.structure).toBe(newStructure);
      expect(version.previousVersionId).toBe(previousVersion.id);
      expect(version.createdAtPageId).toBe(pageId);
      expect(version.rewriteReason).toBe('Player joined the enemy');
      expect(version.preservedBeatIds).toEqual(['1.1', '1.2']);
      expect(version.createdAt).toBeInstanceOf(Date);
      expect(version.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(version.createdAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('copies preservedBeatIds to avoid external mutation', () => {
      const previousVersion = createInitialVersionedStructure(createTestStructure());
      const preservedBeatIds = ['1.1'];
      const version = createRewrittenVersionedStructure(
        previousVersion,
        createTestStructure(),
        preservedBeatIds,
        'Rewrite',
        parsePageId(2)
      );

      preservedBeatIds.push('2.1');
      expect(version.preservedBeatIds).toEqual(['1.1']);
    });
  });

  describe('isVersionedStoryStructure', () => {
    it('returns true for valid structure versions', () => {
      const version = createInitialVersionedStructure(createTestStructure());
      expect(isVersionedStoryStructure(version)).toBe(true);
    });

    it('returns false when required id is missing', () => {
      expect(
        isVersionedStoryStructure({
          structure: createTestStructure(),
          previousVersionId: null,
          createdAtPageId: null,
          rewriteReason: null,
          preservedBeatIds: [],
          createdAt: new Date(),
        })
      ).toBe(false);
    });

    it('returns false for invalid shapes', () => {
      expect(isVersionedStoryStructure(null)).toBe(false);
      expect(isVersionedStoryStructure({})).toBe(false);
      expect(
        isVersionedStoryStructure({
          id: 'sv-1707321600000-a1b2',
          structure: { acts: [], overallTheme: 'Theme', generatedAt: 'not a date' },
          previousVersionId: null,
          createdAtPageId: null,
          rewriteReason: null,
          preservedBeatIds: [],
          createdAt: new Date(),
        })
      ).toBe(false);
      expect(
        isVersionedStoryStructure({
          id: 'sv-1707321600000-a1b2',
          structure: createTestStructure(),
          previousVersionId: null,
          createdAtPageId: null,
          rewriteReason: 123,
          preservedBeatIds: [],
          createdAt: new Date(),
        })
      ).toBe(false);
      expect(
        isVersionedStoryStructure({
          id: 'sv-1707321600000-a1b2',
          structure: createTestStructure(),
          previousVersionId: null,
          createdAtPageId: null,
          rewriteReason: null,
          preservedBeatIds: ['1.1', 2],
          createdAt: new Date(),
        })
      ).toBe(false);
    });
  });
});
