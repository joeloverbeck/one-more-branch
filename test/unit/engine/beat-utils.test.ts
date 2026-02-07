import { getBeatOrThrow, parseBeatIndices, upsertBeatProgression } from '../../../src/engine/beat-utils';
import type { BeatProgression, StoryStructure } from '../../../src/models/story-arc';

function createStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act One',
        objective: 'Accept the quest',
        stakes: 'Home is at risk',
        entryCondition: 'A messenger arrives',
        beats: [
          { id: '1.1', description: 'A warning arrives', objective: 'Hear the warning' },
          { id: '1.2', description: 'A difficult choice', objective: 'Leave home' },
        ],
      },
      {
        id: '2',
        name: 'Act Two',
        objective: 'Survive the campaign',
        stakes: 'The kingdom may fall',
        entryCondition: 'The journey begins',
        beats: [{ id: '2.1', description: 'First major setback', objective: 'Recover from loss' }],
      },
    ],
    overallTheme: 'Restore the broken kingdom',
    generatedAt: new Date(),
  };
}

describe('beat-utils', () => {
  describe('parseBeatIndices', () => {
    it('parses valid beat ID into indices', () => {
      expect(parseBeatIndices('1.1')).toEqual({ actIndex: 0, beatIndex: 0 });
      expect(parseBeatIndices('2.3')).toEqual({ actIndex: 1, beatIndex: 2 });
      expect(parseBeatIndices('10.5')).toEqual({ actIndex: 9, beatIndex: 4 });
    });

    it('returns null for invalid formats', () => {
      expect(parseBeatIndices('')).toBeNull();
      expect(parseBeatIndices('1')).toBeNull();
      expect(parseBeatIndices('a.b')).toBeNull();
      expect(parseBeatIndices('1.2.3')).toBeNull();
      expect(parseBeatIndices('0.0')).toBeNull();
      expect(parseBeatIndices('-1.1')).toBeNull();
    });
  });

  describe('getBeatOrThrow', () => {
    it('returns beat for valid indices', () => {
      const structure = createStructure();
      const beat = getBeatOrThrow(structure, 0, 0);

      expect(beat.id).toBe('1.1');
      expect(beat.description).toBe('A warning arrives');
    });

    it('returns beat from second act', () => {
      const structure = createStructure();
      const beat = getBeatOrThrow(structure, 1, 0);

      expect(beat.id).toBe('2.1');
    });

    it('throws for invalid act index', () => {
      const structure = createStructure();

      expect(() => getBeatOrThrow(structure, 5, 0)).toThrow('Invalid currentActIndex: 5');
    });

    it('throws for invalid beat index', () => {
      const structure = createStructure();

      expect(() => getBeatOrThrow(structure, 0, 10)).toThrow('Invalid currentBeatIndex: 10 for act 1');
    });
  });

  describe('upsertBeatProgression', () => {
    it('updates existing progression', () => {
      const progressions: BeatProgression[] = [
        { beatId: '1.1', status: 'active' },
        { beatId: '1.2', status: 'pending' },
      ];

      const result = upsertBeatProgression(progressions, {
        beatId: '1.1',
        status: 'concluded',
        resolution: 'Done.',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ beatId: '1.1', status: 'concluded', resolution: 'Done.' });
      expect(result[1]).toEqual({ beatId: '1.2', status: 'pending' });
    });

    it('appends new progression if not found', () => {
      const progressions: BeatProgression[] = [
        { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
      ];

      const result = upsertBeatProgression(progressions, {
        beatId: '1.2',
        status: 'active',
      });

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ beatId: '1.2', status: 'active' });
    });

    it('returns new array (immutable)', () => {
      const progressions: BeatProgression[] = [{ beatId: '1.1', status: 'active' }];

      const result = upsertBeatProgression(progressions, { beatId: '1.1', status: 'concluded', resolution: 'Done.' });

      expect(result).not.toBe(progressions);
    });
  });
});
