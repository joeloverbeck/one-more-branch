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

describe('health-manager', () => {
  describe('normalizeHealthEntry', () => {
    it('trims whitespace', () => {
      expect(normalizeHealthEntry('  Minor wound  ')).toBe('minor wound');
    });

    it('lowercases entry', () => {
      expect(normalizeHealthEntry('BRUISED RIBS')).toBe('bruised ribs');
    });

    it('handles combined whitespace and case', () => {
      expect(normalizeHealthEntry('  Poison In Your Veins  ')).toBe('poison in your veins');
    });
  });

  describe('addHealthEntry', () => {
    it('adds entry to empty health', () => {
      expect(addHealthEntry([], 'Minor wound')).toEqual(['Minor wound']);
    });

    it('appends entry to existing health', () => {
      expect(addHealthEntry(['Fatigue'], 'Headache')).toEqual(['Fatigue', 'Headache']);
    });

    it('trims whitespace from entry', () => {
      expect(addHealthEntry([], '  Bruised ribs  ')).toEqual(['Bruised ribs']);
    });

    it('ignores empty entries', () => {
      expect(addHealthEntry(['Existing'], '')).toEqual(['Existing']);
      expect(addHealthEntry(['Existing'], '   ')).toEqual(['Existing']);
    });

    it('allows duplicate entries (multiple injuries)', () => {
      expect(addHealthEntry(['Bruised ribs'], 'Bruised ribs')).toEqual([
        'Bruised ribs',
        'Bruised ribs',
      ]);
    });
  });

  describe('removeHealthEntry', () => {
    it('removes entry with exact match', () => {
      expect(removeHealthEntry(['Minor wound', 'Fatigue'], 'Minor wound')).toEqual(['Fatigue']);
    });

    it('removes entry with case-insensitive match', () => {
      expect(removeHealthEntry(['BRUISED RIBS'], 'bruised ribs')).toEqual([]);
    });

    it('removes entry with trimmed match', () => {
      expect(removeHealthEntry(['Headache'], '  Headache  ')).toEqual([]);
    });

    it('removes only first matching entry', () => {
      expect(removeHealthEntry(['Fatigue', 'Fatigue', 'Hunger'], 'Fatigue')).toEqual([
        'Fatigue',
        'Hunger',
      ]);
    });

    it('returns unchanged health if entry not found', () => {
      const health = ['Existing condition'] as const;
      expect(removeHealthEntry(health, 'Non-existent')).toEqual(['Existing condition']);
    });

    it('does not mutate original array', () => {
      const original = ['Condition A', 'Condition B'];
      const result = removeHealthEntry(original, 'Condition A');
      expect(original).toEqual(['Condition A', 'Condition B']);
      expect(result).toEqual(['Condition B']);
    });
  });

  describe('applyHealthChanges', () => {
    it('applies additions and removals', () => {
      const result = applyHealthChanges(['Poison'], {
        added: ['Antidote taken - recovering'],
        removed: ['Poison'],
      });
      expect(result).toEqual(['Antidote taken - recovering']);
    });

    it('handles empty changes', () => {
      expect(applyHealthChanges(['Fatigue'], { added: [], removed: [] })).toEqual(['Fatigue']);
    });

    it('handles multiple additions', () => {
      expect(
        applyHealthChanges([], {
          added: ['Wound A', 'Wound B'],
          removed: [],
        }),
      ).toEqual(['Wound A', 'Wound B']);
    });

    it('handles multiple removals', () => {
      expect(
        applyHealthChanges(['A', 'B', 'C'], {
          added: [],
          removed: ['A', 'C'],
        }),
      ).toEqual(['B']);
    });
  });

  describe('formatHealthForPrompt', () => {
    it('returns default text when healthy', () => {
      expect(formatHealthForPrompt([])).toBe('YOUR HEALTH:\n- You feel fine.\n');
    });

    it('formats single condition', () => {
      expect(formatHealthForPrompt(['Minor wound on left arm'])).toBe(
        'YOUR HEALTH:\n- Minor wound on left arm\n',
      );
    });

    it('formats multiple conditions', () => {
      expect(formatHealthForPrompt(['Bruised ribs', 'Headache'])).toBe(
        'YOUR HEALTH:\n- Bruised ribs\n- Headache\n',
      );
    });
  });

  describe('createHealthChanges', () => {
    it('creates changes from arrays', () => {
      expect(createHealthChanges(['Wound'], ['Healed injury'])).toEqual({
        added: ['Wound'],
        removed: ['Healed injury'],
      });
    });

    it('trims entries', () => {
      expect(createHealthChanges(['  Wound  '], ['  Healed  '])).toEqual({
        added: ['Wound'],
        removed: ['Healed'],
      });
    });

    it('filters empty entries', () => {
      expect(createHealthChanges(['Valid', '', '  '], ['', 'Also valid'])).toEqual({
        added: ['Valid'],
        removed: ['Also valid'],
      });
    });
  });

  describe('hasHealthCondition', () => {
    it('returns true for matching condition', () => {
      expect(hasHealthCondition(['Bruised ribs', 'Fatigue'], 'Fatigue')).toBe(true);
    });

    it('returns true for case-insensitive match', () => {
      expect(hasHealthCondition(['BRUISED RIBS'], 'bruised ribs')).toBe(true);
    });

    it('returns false when condition not present', () => {
      expect(hasHealthCondition(['Fatigue'], 'Headache')).toBe(false);
    });

    it('returns false for empty health', () => {
      expect(hasHealthCondition([], 'Any condition')).toBe(false);
    });
  });

  describe('getParentAccumulatedHealth', () => {
    it('extracts health from page-like object', () => {
      const page = { accumulatedHealth: ['Wound A', 'Wound B'] };
      expect(getParentAccumulatedHealth(page)).toEqual(['Wound A', 'Wound B']);
    });

    it('returns empty array when parent has no conditions', () => {
      const page = { accumulatedHealth: [] as const };
      expect(getParentAccumulatedHealth(page)).toEqual([]);
    });
  });

  describe('createEmptyHealthChanges', () => {
    it('returns empty added and removed arrays', () => {
      expect(createEmptyHealthChanges()).toEqual({ added: [], removed: [] });
    });
  });
});
