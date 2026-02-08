import {
  createChoice,
  createEmptyAccumulatedStructureState,
  createPage,
  parsePageId,
} from '@/models';
import { collectParentState, CollectedParentState } from '@/engine/parent-state-collector';

describe('parent-state-collector', () => {
  describe('collectParentState', () => {
    it('collects empty state from first page', () => {
      const firstPage = createPage({
        id: parsePageId(1),
        narrativeText: 'You begin your journey.',
        choices: [createChoice('Go north'), createChoice('Go south')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected = collectParentState(firstPage);

      expect(collected.accumulatedActiveState.currentLocation).toBe('');
      expect(collected.accumulatedActiveState.activeThreats).toEqual([]);
      expect(collected.accumulatedActiveState.activeConstraints).toEqual([]);
      expect(collected.accumulatedActiveState.openThreads).toEqual([]);
      expect(collected.accumulatedInventory).toEqual([]);
      expect(collected.accumulatedHealth).toEqual([]);
      expect(collected.accumulatedCharacterState).toEqual({});
      expect(collected.structureState).toEqual(createEmptyAccumulatedStructureState());
    });

    it('collects accumulated active state from page with active state changes', () => {
      const pageWithState = createPage({
        id: parsePageId(1),
        narrativeText: 'You found something.',
        choices: [createChoice('Take it'), createChoice('Leave it')],
        activeStateChanges: {
          newLocation: 'Secret passage',
          threatsAdded: [],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
        },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected = collectParentState(pageWithState);

      expect(collected.accumulatedActiveState.currentLocation).toBe('Secret passage');
    });

    it('collects accumulated inventory from page with inventory changes', () => {
      const pageWithInventory = createPage({
        id: parsePageId(1),
        narrativeText: 'You picked up an item.',
        choices: [createChoice('Use it'), createChoice('Keep it')],
        inventoryChanges: { added: ['Ancient key', 'Torch'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected = collectParentState(pageWithInventory);

      expect(collected.accumulatedInventory).toContain('Ancient key');
      expect(collected.accumulatedInventory).toContain('Torch');
    });

    it('collects accumulated health from page with health changes', () => {
      const pageWithHealth = createPage({
        id: parsePageId(1),
        narrativeText: 'You were injured.',
        choices: [createChoice('Rest'), createChoice('Continue')],
        healthChanges: { added: ['Minor wound', 'Fatigue'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected = collectParentState(pageWithHealth);

      expect(collected.accumulatedHealth).toContain('Minor wound');
      expect(collected.accumulatedHealth).toContain('Fatigue');
    });

    it('collects accumulated character state from page with character changes', () => {
      const pageWithCharacterState = createPage({
        id: parsePageId(1),
        narrativeText: 'Your companion grew closer.',
        choices: [createChoice('Talk'), createChoice('Rest')],
        characterStateChanges: [
          { characterName: 'Elena', added: ['Trusting', 'Curious'], removed: [] },
        ],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected = collectParentState(pageWithCharacterState);

      expect(collected.accumulatedCharacterState['Elena']).toContain('Trusting');
      expect(collected.accumulatedCharacterState['Elena']).toContain('Curious');
    });

    it('collects structure state from page', () => {
      const structureState = {
        currentActIndex: 1,
        currentBeatIndex: 2,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded' as const, resolution: 'Completed' },
          { beatId: '1.2', status: 'concluded' as const, resolution: 'Done' },
          { beatId: '2.1', status: 'active' as const },
        ],
      };

      const pageWithStructure = createPage({
        id: parsePageId(1),
        narrativeText: 'You advanced the story.',
        choices: [createChoice('Continue'), createChoice('Explore')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: structureState,
      });

      const collected = collectParentState(pageWithStructure);

      expect(collected.structureState.currentActIndex).toBe(1);
      expect(collected.structureState.currentBeatIndex).toBe(2);
      expect(collected.structureState.beatProgressions).toHaveLength(3);
    });

    it('collects all state types together from complex page', () => {
      const structureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
      };

      const complexPage = createPage({
        id: parsePageId(1),
        narrativeText: 'A lot happened.',
        choices: [createChoice('Option A'), createChoice('Option B')],
        activeStateChanges: {
          newLocation: 'Quest start location',
          threatsAdded: [],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
        },
        inventoryChanges: { added: ['Map'], removed: [] },
        healthChanges: { added: ['Well rested'], removed: [] },
        characterStateChanges: [
          { characterName: 'Guide', added: ['Helpful'], removed: [] },
        ],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: structureState,
      });

      const collected = collectParentState(complexPage);

      expect(collected.accumulatedActiveState.currentLocation).toBe('Quest start location');
      expect(collected.accumulatedInventory).toContain('Map');
      expect(collected.accumulatedHealth).toContain('Well rested');
      expect(collected.accumulatedCharacterState['Guide']).toContain('Helpful');
      expect(collected.structureState.currentBeatIndex).toBe(1);
    });

    it('returns correct interface type', () => {
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'Test page.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const collected: CollectedParentState = collectParentState(page);

      // Type checking - these should all be accessible
      expect(collected.accumulatedActiveState).toBeDefined();
      expect(collected.accumulatedInventory).toBeDefined();
      expect(collected.accumulatedHealth).toBeDefined();
      expect(collected.accumulatedCharacterState).toBeDefined();
      expect(collected.structureState).toBeDefined();
    });
  });
});
