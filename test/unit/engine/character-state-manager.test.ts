import {
  createCharacterStateChanges,
  formatCharacterStateForPrompt,
  getParentAccumulatedCharacterState,
  normalizeCharacterNameForState,
} from '../../../src/engine/character-state-manager';
import type { AccumulatedCharacterState } from '../../../src/models/state';

const cs = (id: number, text: string): { id: string; text: string } => ({ id: `cs-${id}`, text });

describe('character-state-manager', () => {
  describe('normalizeCharacterNameForState', () => {
    it('normalizes names', () => {
      expect(normalizeCharacterNameForState('  Dr. Elena Cohen  ')).toBe('Dr Elena Cohen');
    });
  });

  describe('createCharacterStateChanges', () => {
    it('creates keyed change object', () => {
      const result = createCharacterStateChanges(
        [{ characterName: 'Greaves', states: ['Gave protagonist a map'] }],
        ['cs-1', 'cs-2'],
      );
      expect(result).toEqual({
        added: [{ characterName: 'Greaves', states: ['Gave protagonist a map'] }],
        removed: ['cs-1', 'cs-2'],
      });
    });
  });

  describe('formatCharacterStateForPrompt', () => {
    it('formats keyed character state', () => {
      const state: AccumulatedCharacterState = {
        greaves: [cs(1, 'Gave protagonist a map')],
      };
      expect(formatCharacterStateForPrompt(state)).toBe('[greaves]\n- [cs-1] Gave protagonist a map');
    });
  });

  describe('getParentAccumulatedCharacterState', () => {
    it('returns parent state untouched', () => {
      const parentPage = {
        accumulatedCharacterState: { greaves: [cs(1, 'Previous state')] } as AccumulatedCharacterState,
      };
      expect(getParentAccumulatedCharacterState(parentPage)).toEqual({
        greaves: [cs(1, 'Previous state')],
      });
    });
  });
});
