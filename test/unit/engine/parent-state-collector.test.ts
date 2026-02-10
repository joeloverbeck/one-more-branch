import {
  createChoice,
  createEmptyAccumulatedStructureState,
  createPage,
  parsePageId,
} from '@/models';
import { collectParentState, CollectedParentState } from '@/engine/parent-state-collector';

const inv = (id: number, text: string): { id: string; text: string } => ({ id: `inv-${id}`, text });
const hp = (id: number, text: string): { id: string; text: string } => ({ id: `hp-${id}`, text });
const cs = (id: number, text: string): { id: string; text: string } => ({ id: `cs-${id}`, text });

describe('parent-state-collector', () => {
  describe('collectParentState', () => {
    it('collects empty state from first page', () => {
      const firstPage = createPage({
        id: parsePageId(1),
        narrativeText: 'You begin your journey.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Go north'), createChoice('Go south')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected = collectParentState(firstPage);

      expect(collected.accumulatedActiveState.currentLocation).toBe('');
      expect(collected.accumulatedInventory).toEqual([]);
      expect(collected.accumulatedHealth).toEqual([]);
      expect(collected.accumulatedCharacterState).toEqual({});
      expect(collected.structureState).toEqual(createEmptyAccumulatedStructureState());
    });

    it('collects keyed accumulated state fields', () => {
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'A lot happened.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Option A'), createChoice('Option B')],
        activeStateChanges: {
          newLocation: 'Quest start location',
          threatsAdded: ['Storm front'],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: ['Find the relic'],
          threadsResolved: [],
        },
        inventoryChanges: { added: ['Map'], removed: [] },
        healthChanges: { added: ['Well rested'], removed: [] },
        characterStateChanges: {
          added: [{ characterName: 'Guide', states: ['Helpful'] }],
          removed: [],
        },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected = collectParentState(page);

      expect(collected.accumulatedActiveState.currentLocation).toBe('Quest start location');
      expect(collected.accumulatedInventory).toEqual([inv(1, 'Map')]);
      expect(collected.accumulatedHealth).toEqual([hp(1, 'Well rested')]);
      expect(collected.accumulatedCharacterState['Guide']).toEqual([cs(1, 'Helpful')]);
    });

    it('returns correct interface type', () => {
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'Test page.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected: CollectedParentState = collectParentState(page);
      expect(collected.accumulatedActiveState).toBeDefined();
      expect(collected.accumulatedInventory).toBeDefined();
      expect(collected.accumulatedHealth).toBeDefined();
      expect(collected.accumulatedCharacterState).toBeDefined();
      expect(collected.structureState).toBeDefined();
    });
  });
});
