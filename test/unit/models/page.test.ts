import { createChoice } from '@/models/choice';
import { PageId } from '@/models/id';
import { createPage, getUnexploredChoiceIndices, isPage, isPageFullyExplored } from '@/models/page';
import type { ActiveState } from '@/models/state';
import { PromiseType, Urgency } from '@/models/state';
import { createEmptyAccumulatedStructureState } from '@/models/story-arc';
import { parseStructureVersionId } from '@/models/structure-version';

describe('Page', () => {
  describe('createPage', () => {
    it('creates valid page 1 with no parent', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: '  The story begins...  ',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Go left'), createChoice('Go right')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page.id).toBe(1);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();
      expect(page.narrativeText).toBe('The story begins...');
    });

    it('creates page with parent', () => {
      const page = createPage({
        id: 2 as PageId,
        narrativeText: 'Next page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Fight'), createChoice('Run')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });

      expect(page.id).toBe(2);
      expect(page.parentPageId).toBe(1);
      expect(page.parentChoiceIndex).toBe(0);
    });

    it('creates page with empty active state when not provided', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'The story begins...',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Go left'), createChoice('Go right')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page.activeStateChanges).toEqual({
        newLocation: null,
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      });
      expect(page.accumulatedActiveState).toEqual({
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      });
    });

    it('applies active state changes from parent active state', () => {
      const parentAccumulatedActiveState: ActiveState = {
        currentLocation: 'Starting Room',
        activeThreats: [{ id: 'th-1', text: 'X' }],
        activeConstraints: [],
        openThreads: [],
      };

      const page = createPage({
        id: 2 as PageId,
        narrativeText: 'Continuation',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Fight'), createChoice('Run')],
        activeStateChanges: {
          newLocation: 'New Room',
          threatsAdded: [],
          threatsRemoved: ['th-1'],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
        },
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
        parentAccumulatedActiveState,
      });

      expect(page.accumulatedActiveState.currentLocation).toBe('New Room');
      expect(page.accumulatedActiveState.activeThreats).toEqual([]);
    });

    it('creates ending page with no choices', () => {
      const page = createPage({
        id: 3 as PageId,
        narrativeText: 'Ending',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [],
        isEnding: true,
        parentPageId: 2 as PageId,
        parentChoiceIndex: 1,
      });

      expect(page.isEnding).toBe(true);
      expect(page.choices).toEqual([]);
    });

    it("throws 'Ending pages must have no choices' when ending has choices", () => {
      expect(() =>
        createPage({
          id: 2 as PageId,
          narrativeText: 'Bad ending',
          sceneSummary: 'Test summary of the scene events and consequences.',
          choices: [createChoice('Continue')],
          isEnding: true,
          parentPageId: 1 as PageId,
          parentChoiceIndex: 0,
        })
      ).toThrow('Ending pages must have no choices');
    });

    it("throws 'Non-ending pages must have at least 2 choices' when non-ending has < 2 choices", () => {
      expect(() =>
        createPage({
          id: 2 as PageId,
          narrativeText: 'Bad branch',
          sceneSummary: 'Test summary of the scene events and consequences.',
          choices: [createChoice('Only one')],
          isEnding: false,
          parentPageId: 1 as PageId,
          parentChoiceIndex: 0,
        })
      ).toThrow('Non-ending pages must have at least 2 choices');
    });

    it("throws 'Page 1 cannot have a parent' when page 1 has parent", () => {
      expect(() =>
        createPage({
          id: 1 as PageId,
          narrativeText: 'Invalid root',
          sceneSummary: 'Test summary of the scene events and consequences.',
          choices: [createChoice('A'), createChoice('B')],
          isEnding: false,
          parentPageId: 2 as PageId,
          parentChoiceIndex: 0,
        })
      ).toThrow('Page 1 cannot have a parent');
    });

    it("throws 'Pages after page 1 must have a parent' when page > 1 has null parent", () => {
      expect(() =>
        createPage({
          id: 2 as PageId,
          narrativeText: 'Invalid child',
          sceneSummary: 'Test summary of the scene events and consequences.',
          choices: [createChoice('A'), createChoice('B')],
          isEnding: false,
          parentPageId: null,
          parentChoiceIndex: null,
        })
      ).toThrow('Pages after page 1 must have a parent');
    });

    it('uses empty structure state when parentAccumulatedStructureState is not provided', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Root page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page.accumulatedStructureState).toEqual(createEmptyAccumulatedStructureState());
    });

    it('inherits provided parentAccumulatedStructureState', () => {
      const parentAccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          {
            beatId: '1.1',
            status: 'concluded' as const,
            resolution: 'Resolved the first milestone',
          },
        ],
      };
      const page = createPage({
        id: 2 as PageId,
        narrativeText: 'Child page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
        parentAccumulatedStructureState,
      });

      expect(page.accumulatedStructureState).toBe(parentAccumulatedStructureState);
    });

    it('defaults structureVersionId to null when not provided', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Root page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page.structureVersionId).toBeNull();
    });

    it('sets structureVersionId when provided', () => {
      const structureVersionId = parseStructureVersionId('sv-1707321600000-a1b2');
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Root page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId,
      });

      expect(page.structureVersionId).toBe(structureVersionId);
    });

    it('defaults accumulatedPromises to empty array when not provided', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Root page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page.accumulatedPromises).toEqual([]);
    });

    it('preserves provided accumulatedPromises', () => {
      const accumulatedPromises = [
        {
          id: 'pr-1',
          description: 'A cracked amulet is repeatedly mentioned.',
          promiseType: PromiseType.FORESHADOWING,
          suggestedUrgency: Urgency.MEDIUM,
          age: 2,
        },
      ] as const;

      const page = createPage({
        id: 2 as PageId,
        narrativeText: 'Child page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
        accumulatedPromises,
      });

      expect(page.accumulatedPromises).toEqual(accumulatedPromises);
    });
  });

  describe('isPage', () => {
    it('returns true for valid Page object', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(isPage(page)).toBe(true);
    });

    it('returns false for null, undefined, and missing fields', () => {
      expect(isPage(null)).toBe(false);
      expect(isPage(undefined)).toBe(false);
      expect(isPage({ id: 1 })).toBe(false);
    });

    it('returns false when accumulatedStructureState is missing', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const invalidPage = { ...page } as Record<string, unknown>;
      delete invalidPage.accumulatedStructureState;

      expect(isPage(invalidPage)).toBe(false);
    });

    it('returns false when accumulatedStructureState shape is invalid', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const invalidPage = {
        ...page,
        accumulatedStructureState: {
          currentActIndex: -1,
          currentBeatIndex: 0,
          beatProgressions: [],
          pagesInCurrentBeat: 0,
          pacingNudge: null,
        },
      };

      expect(isPage(invalidPage)).toBe(false);
    });

    it('returns false when structureVersionId is missing', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const invalidPage = { ...page } as Record<string, unknown>;
      delete invalidPage.structureVersionId;

      expect(isPage(invalidPage)).toBe(false);
    });

    it('returns true for valid structureVersionId', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: parseStructureVersionId('sv-1707321600000-a1b2'),
      });

      expect(isPage(page)).toBe(true);
    });

    it('returns false for invalid structureVersionId format', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const invalidPage = {
        ...page,
        structureVersionId: 'sv-invalid',
      };

      expect(isPage(invalidPage)).toBe(false);
    });

    it('returns false for pages missing active state fields', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Missing fields',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const invalidPage = { ...page } as Record<string, unknown>;
      delete invalidPage.activeStateChanges;
      delete invalidPage.accumulatedActiveState;

      expect(isPage(invalidPage)).toBe(false);
    });

    it('returns false when activeStateChanges shape is invalid', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Invalid active state changes',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const invalidPage = {
        ...page,
        activeStateChanges: {
          newLocation: null,
        },
      };

      expect(isPage(invalidPage)).toBe(false);
    });

    it('returns false when accumulatedPromises is missing', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const invalidPage = { ...page } as Record<string, unknown>;
      delete invalidPage.accumulatedPromises;

      expect(isPage(invalidPage)).toBe(false);
    });

    it('returns false when accumulatedPromises contains invalid entries', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const invalidPage = {
        ...page,
        accumulatedPromises: [
          {
            id: 'pr-1',
            description: 'A promise with invalid urgency',
            promiseType: PromiseType.FORESHADOWING,
            suggestedUrgency: 'CRITICAL',
            age: 2,
          },
        ],
      };

      expect(isPage(invalidPage)).toBe(false);
    });
  });

  describe('isPageFullyExplored', () => {
    it('returns true when all choices have nextPageId', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Explored',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A', 2 as PageId), createChoice('B', 3 as PageId)],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(isPageFullyExplored(page)).toBe(true);
    });

    it('returns false when any choice has nextPageId = null', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Partially explored',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A', 2 as PageId), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(isPageFullyExplored(page)).toBe(false);
    });
  });

  describe('getUnexploredChoiceIndices', () => {
    it('returns indices of choices with nextPageId = null', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Branching',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A', 2 as PageId), createChoice('B'), createChoice('C')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(getUnexploredChoiceIndices(page)).toEqual([1, 2]);
    });

    it('returns empty array when all choices are explored', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Fully explored',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('A', 2 as PageId), createChoice('B', 3 as PageId)],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(getUnexploredChoiceIndices(page)).toEqual([]);
    });
  });
});
