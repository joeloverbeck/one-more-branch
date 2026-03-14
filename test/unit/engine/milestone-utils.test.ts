import {
  getMilestoneOrThrow,
  parseMilestoneIndices,
  upsertMilestoneProgression,
} from '../../../src/engine/milestone-utils';
import type { MilestoneProgression, StoryStructure } from '../../../src/models/story-arc';

function createStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act One',
        objective: 'Accept the quest',
        stakes: 'Home is at risk',
        entryCondition: 'A messenger arrives',
        milestones: [
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
        milestones: [{ id: '2.1', description: 'First major setback', objective: 'Recover from loss' }],
      },
    ],
    overallTheme: 'Restore the broken kingdom',
    generatedAt: new Date(),
  };
}

describe('milestone-utils', () => {
  describe('parseMilestoneIndices', () => {
    it('parses valid milestone ID into indices', () => {
      expect(parseMilestoneIndices('1.1')).toEqual({ actIndex: 0, milestoneIndex: 0 });
      expect(parseMilestoneIndices('2.3')).toEqual({ actIndex: 1, milestoneIndex: 2 });
      expect(parseMilestoneIndices('10.5')).toEqual({ actIndex: 9, milestoneIndex: 4 });
    });

    it('returns null for invalid formats', () => {
      expect(parseMilestoneIndices('')).toBeNull();
      expect(parseMilestoneIndices('1')).toBeNull();
      expect(parseMilestoneIndices('a.b')).toBeNull();
      expect(parseMilestoneIndices('1.2.3')).toBeNull();
      expect(parseMilestoneIndices('0.0')).toBeNull();
      expect(parseMilestoneIndices('-1.1')).toBeNull();
    });
  });

  describe('getMilestoneOrThrow', () => {
    it('returns milestone for valid indices', () => {
      const structure = createStructure();
      const milestone = getMilestoneOrThrow(structure, 0, 0);

      expect(milestone.id).toBe('1.1');
      expect(milestone.description).toBe('A warning arrives');
    });

    it('returns milestone from second act', () => {
      const structure = createStructure();
      const milestone = getMilestoneOrThrow(structure, 1, 0);

      expect(milestone.id).toBe('2.1');
    });

    it('throws for invalid act index', () => {
      const structure = createStructure();

      expect(() => getMilestoneOrThrow(structure, 5, 0)).toThrow('Invalid currentActIndex: 5');
    });

    it('throws for invalid milestone index', () => {
      const structure = createStructure();

      expect(() => getMilestoneOrThrow(structure, 0, 10)).toThrow(
        'Invalid currentMilestoneIndex: 10 for act 1'
      );
    });
  });

  describe('upsertMilestoneProgression', () => {
    it('updates existing progression', () => {
      const progressions: MilestoneProgression[] = [
        { milestoneId: '1.1', status: 'active' },
        { milestoneId: '1.2', status: 'pending' },
      ];

      const result = upsertMilestoneProgression(progressions, {
        milestoneId: '1.1',
        status: 'concluded',
        resolution: 'Done.',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ milestoneId: '1.1', status: 'concluded', resolution: 'Done.' });
      expect(result[1]).toEqual({ milestoneId: '1.2', status: 'pending' });
    });

    it('appends new progression if not found', () => {
      const progressions: MilestoneProgression[] = [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
      ];

      const result = upsertMilestoneProgression(progressions, {
        milestoneId: '1.2',
        status: 'active',
      });

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ milestoneId: '1.2', status: 'active' });
    });

    it('returns new array (immutable)', () => {
      const progressions: MilestoneProgression[] = [{ milestoneId: '1.1', status: 'active' }];

      const result = upsertMilestoneProgression(progressions, {
        milestoneId: '1.1',
        status: 'concluded',
        resolution: 'Done.',
      });

      expect(result).not.toBe(progressions);
    });
  });
});
