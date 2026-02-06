import { createChoice } from '@/models/choice';
import { PageId } from '@/models/id';
import { createPage, getUnexploredChoiceIndices, isPage, isPageFullyExplored } from '@/models/page';

describe('Page', () => {
  describe('createPage', () => {
    it('creates valid page 1 with no parent', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: '  The story begins...  ',
        choices: [createChoice('Go left'), createChoice('Go right')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page.id).toBe(1);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();
      expect(page.narrativeText).toBe('The story begins...');
      expect(page.accumulatedState.changes).toEqual([]);
    });

    it('creates page with parent and correctly accumulates state', () => {
      const page = createPage({
        id: 2 as PageId,
        narrativeText: 'Next page',
        choices: [createChoice('Fight'), createChoice('Run')],
        stateChanges: { added: ['Found a key'], removed: [] },
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
        parentAccumulatedState: { changes: ['Entered the cave'] },
      });

      expect(page.accumulatedState.changes).toEqual(['Entered the cave', 'Found a key']);
    });

    it('creates ending page with no choices', () => {
      const page = createPage({
        id: 3 as PageId,
        narrativeText: 'Ending',
        choices: [],
        stateChanges: { added: ['The end'], removed: [] },
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
          choices: [createChoice('Continue')],
          stateChanges: { added: [], removed: [] },
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
          choices: [createChoice('Only one')],
          stateChanges: { added: [], removed: [] },
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
          choices: [createChoice('A'), createChoice('B')],
          stateChanges: { added: [], removed: [] },
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
          choices: [createChoice('A'), createChoice('B')],
          stateChanges: { added: [], removed: [] },
          isEnding: false,
          parentPageId: null,
          parentChoiceIndex: null,
        })
      ).toThrow('Pages after page 1 must have a parent');
    });

    it('uses empty parent state when parentAccumulatedState is not provided', () => {
      const page = createPage({
        id: 2 as PageId,
        narrativeText: 'No parent state passed',
        choices: [createChoice('A'), createChoice('B')],
        stateChanges: { added: ['Only local change'], removed: [] },
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });

      expect(page.accumulatedState.changes).toEqual(['Only local change']);
    });
  });

  describe('isPage', () => {
    it('returns true for valid Page object', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Valid',
        choices: [createChoice('A'), createChoice('B')],
        stateChanges: { added: [], removed: [] },
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
  });

  describe('isPageFullyExplored', () => {
    it('returns true when all choices have nextPageId', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Explored',
        choices: [
          createChoice('A', 2 as PageId),
          createChoice('B', 3 as PageId),
        ],
        stateChanges: { added: [], removed: [] },
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
        choices: [
          createChoice('A', 2 as PageId),
          createChoice('B'),
        ],
        stateChanges: { added: [], removed: [] },
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
        choices: [
          createChoice('A', 2 as PageId),
          createChoice('B'),
          createChoice('C'),
        ],
        stateChanges: { added: [], removed: [] },
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
        choices: [
          createChoice('A', 2 as PageId),
          createChoice('B', 3 as PageId),
        ],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(getUnexploredChoiceIndices(page)).toEqual([]);
    });
  });
});
