import {
  normalizeHealthEntry,
  addHealthEntry,
  removeHealthEntry,
  applyHealthChanges,
  formatHealthForPrompt,
  createHealthChanges,
  hasHealthCondition,
  getParentAccumulatedHealth,
  createEmptyHealthChanges,
} from '../../../src/engine/health-manager';
import type { Health } from '../../../src/models';

const hp = (id: number, text: string): { id: string; text: string } => ({ id: `hp-${id}`, text });

describe('health-manager', () => {
  describe('normalizeHealthEntry', () => {
    it('trims and lowercases', () => {
      expect(normalizeHealthEntry('  Minor wound  ')).toBe('minor wound');
    });
  });

  describe('add/remove helpers', () => {
    it('adds keyed entries', () => {
      expect(addHealthEntry([], 'Minor wound')).toEqual([hp(1, 'Minor wound')]);
      expect(addHealthEntry([hp(1, 'Fatigue')], 'Headache')).toEqual([
        hp(1, 'Fatigue'),
        hp(2, 'Headache'),
      ]);
    });

    it('removes entry by ID', () => {
      expect(removeHealthEntry([hp(1, 'Minor wound'), hp(2, 'Fatigue')], 'hp-1')).toEqual([
        hp(2, 'Fatigue'),
      ]);
    });

    it('leaves health unchanged when ID is not found', () => {
      expect(removeHealthEntry([hp(1, 'Minor wound')], 'hp-999')).toEqual([hp(1, 'Minor wound')]);
    });
  });

  describe('applyHealthChanges', () => {
    it('applies additions/removals by ID', () => {
      const result = applyHealthChanges([hp(1, 'Poison')], {
        added: ['Antidote taken - recovering'],
        removed: ['hp-1'],
      });
      expect(result).toEqual([hp(2, 'Antidote taken - recovering')]);
    });
  });

  describe('formatHealthForPrompt', () => {
    it('formats keyed health lines', () => {
      expect(formatHealthForPrompt([hp(1, 'Bruised ribs'), hp(2, 'Headache')])).toBe(
        'YOUR HEALTH:\n- [hp-1] Bruised ribs\n- [hp-2] Headache\n'
      );
    });
  });

  describe('misc helpers', () => {
    const health: Health = [hp(1, 'Bruised ribs'), hp(2, 'Fatigue')];

    it('createHealthChanges trims inputs', () => {
      expect(createHealthChanges(['  Wound  '], ['  hp-1  '])).toEqual({
        added: ['Wound'],
        removed: ['hp-1'],
      });
    });

    it('hasHealthCondition checks text only', () => {
      expect(hasHealthCondition(health, 'fatigue')).toBe(true);
      expect(hasHealthCondition(health, 'headache')).toBe(false);
    });

    it('getParentAccumulatedHealth returns parent health', () => {
      const page = { accumulatedHealth: health };
      expect(getParentAccumulatedHealth(page)).toEqual(health);
    });

    it('createEmptyHealthChanges returns empty arrays', () => {
      expect(createEmptyHealthChanges()).toEqual({ added: [], removed: [] });
    });
  });
});
