import {
  createCharacterStateChanges,
  formatCharacterStateForPrompt,
  getParentAccumulatedCharacterState,
  normalizeCharacterNameForState,
} from '../../../src/engine/character-state-manager';
import type { AccumulatedCharacterState, CharacterStateChanges } from '../../../src/models/state';

describe('character-state-manager', () => {
  describe('normalizeCharacterNameForState', () => {
    it('converts name to lowercase', () => {
      expect(normalizeCharacterNameForState('GREAVES')).toBe('greaves');
    });

    it('trims whitespace', () => {
      expect(normalizeCharacterNameForState('  greaves  ')).toBe('greaves');
    });

    it('handles mixed case and whitespace', () => {
      // Punctuation is removed during normalization
      expect(normalizeCharacterNameForState('  Dr. Elena Cohen  ')).toBe('dr elena cohen');
    });

    it('handles empty string', () => {
      expect(normalizeCharacterNameForState('')).toBe('');
    });
  });

  describe('createCharacterStateChanges', () => {
    it('returns empty array when no changes provided', () => {
      const result = createCharacterStateChanges([], []);
      expect(result).toEqual([]);
    });

    it('creates changes from added states', () => {
      const result = createCharacterStateChanges(
        [{ characterName: 'greaves', states: ['Gave protagonist a map'] }],
        []
      );
      expect(result).toEqual([
        { characterName: 'greaves', added: ['Gave protagonist a map'], removed: [] },
      ]);
    });

    it('creates changes from removed states', () => {
      const result = createCharacterStateChanges(
        [],
        [{ characterName: 'greaves', states: ['Waiting at the docks'] }]
      );
      expect(result).toEqual([
        { characterName: 'greaves', added: [], removed: ['Waiting at the docks'] },
      ]);
    });

    it('merges added and removed for same character', () => {
      const result = createCharacterStateChanges(
        [{ characterName: 'greaves', states: ['Left the docks'] }],
        [{ characterName: 'greaves', states: ['Waiting at the docks'] }]
      );
      expect(result).toEqual([
        { characterName: 'greaves', added: ['Left the docks'], removed: ['Waiting at the docks'] },
      ]);
    });

    it('handles multiple characters', () => {
      const result = createCharacterStateChanges(
        [
          { characterName: 'greaves', states: ['Gave protagonist a map'] },
          { characterName: 'elena', states: ['Agreed to help'] },
        ],
        []
      );
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        characterName: 'greaves',
        added: ['Gave protagonist a map'],
        removed: [],
      });
      expect(result).toContainEqual({
        characterName: 'elena',
        added: ['Agreed to help'],
        removed: [],
      });
    });

    it('normalizes character names', () => {
      const result = createCharacterStateChanges(
        [{ characterName: '  GREAVES  ', states: ['Map given'] }],
        [{ characterName: 'greaves', states: ['Waiting'] }]
      );
      // Should merge because normalized names are the same
      expect(result).toEqual([
        { characterName: 'greaves', added: ['Map given'], removed: ['Waiting'] },
      ]);
    });

    it('handles empty arrays gracefully', () => {
      const result = createCharacterStateChanges([], []);
      expect(result).toEqual([]);
    });
  });

  describe('formatCharacterStateForPrompt', () => {
    it('returns empty string for empty state', () => {
      const result = formatCharacterStateForPrompt({});
      expect(result).toBe('');
    });

    it('formats single character with single state', () => {
      const state: AccumulatedCharacterState = {
        greaves: ['Gave protagonist a map'],
      };
      const result = formatCharacterStateForPrompt(state);
      expect(result).toBe('[greaves]\n- Gave protagonist a map');
    });

    it('formats single character with multiple states', () => {
      const state: AccumulatedCharacterState = {
        greaves: ['Gave protagonist a map', 'Proposed 70-30 split'],
      };
      const result = formatCharacterStateForPrompt(state);
      expect(result).toBe('[greaves]\n- Gave protagonist a map\n- Proposed 70-30 split');
    });

    it('formats multiple characters', () => {
      const state: AccumulatedCharacterState = {
        greaves: ['Gave protagonist a map'],
        elena: ['Agreed to help', 'Knows the password'],
      };
      const result = formatCharacterStateForPrompt(state);
      expect(result).toContain('[greaves]');
      expect(result).toContain('- Gave protagonist a map');
      expect(result).toContain('[elena]');
      expect(result).toContain('- Agreed to help');
      expect(result).toContain('- Knows the password');
      // Characters should be separated by double newline
      expect(result).toContain('\n\n');
    });

    it('skips characters with empty state arrays', () => {
      const state: AccumulatedCharacterState = {
        greaves: ['Gave protagonist a map'],
        empty: [],
      };
      const result = formatCharacterStateForPrompt(state);
      expect(result).not.toContain('[empty]');
      expect(result).toBe('[greaves]\n- Gave protagonist a map');
    });
  });

  describe('getParentAccumulatedCharacterState', () => {
    it('returns empty object when parent has no accumulated state', () => {
      const parentPage = {
        accumulatedCharacterState: {} as AccumulatedCharacterState,
      };
      const result = getParentAccumulatedCharacterState(parentPage);
      expect(result).toEqual({});
    });

    it('returns the accumulated state directly without applying changes', () => {
      const parentPage = {
        accumulatedCharacterState: { greaves: ['Previous state'] } as AccumulatedCharacterState,
      };
      const result = getParentAccumulatedCharacterState(parentPage);
      expect(result).toEqual({
        greaves: ['Previous state'],
      });
    });

    it('returns the exact accumulated state object', () => {
      const parentPage = {
        accumulatedCharacterState: {
          greaves: ['Gave protagonist a map', 'Proposed 70-30 split'],
          elena: ['Agreed to help'],
        } as AccumulatedCharacterState,
      };
      const result = getParentAccumulatedCharacterState(parentPage);
      expect(result).toEqual({
        greaves: ['Gave protagonist a map', 'Proposed 70-30 split'],
        elena: ['Agreed to help'],
      });
    });
  });
});
