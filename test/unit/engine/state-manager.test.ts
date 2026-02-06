import {
  computeAccumulatedState,
  formatStateForDisplay,
  getParentAccumulatedState,
  getRecentChanges,
  mergeStateChanges,
} from '../../../src/engine/state-manager';
import { createPage, parsePageId } from '../../../src/models';

describe('State manager', () => {
  describe('computeAccumulatedState', () => {
    it('accumulates state through a 3-page chain in order', () => {
      const page1Id = parsePageId(1);
      const page2Id = parsePageId(2);
      const page3Id = parsePageId(3);
      const page4Id = parsePageId(4);

      const page1 = createPage({
        id: page1Id,
        narrativeText: 'Root',
        choices: [],
        stateChanges: { added: ['Event A'], removed: [] },
        isEnding: true,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const page2 = createPage({
        id: page2Id,
        narrativeText: 'Branch A',
        choices: [],
        stateChanges: { added: ['Event B'], removed: [] },
        isEnding: true,
        parentPageId: page1Id,
        parentChoiceIndex: 0,
        parentAccumulatedState: page1.accumulatedState,
      });

      const page3 = createPage({
        id: page3Id,
        narrativeText: 'Branch A deeper',
        choices: [],
        stateChanges: { added: ['Event C'], removed: [] },
        isEnding: true,
        parentPageId: page2Id,
        parentChoiceIndex: 0,
        parentAccumulatedState: page2.accumulatedState,
      });

      const siblingPage = createPage({
        id: page4Id,
        narrativeText: 'Branch B',
        choices: [],
        stateChanges: { added: ['Sibling Event'], removed: [] },
        isEnding: true,
        parentPageId: page1Id,
        parentChoiceIndex: 1,
        parentAccumulatedState: page1.accumulatedState,
      });

      const pages = new Map([
        [page1Id, page1],
        [page2Id, page2],
        [page3Id, page3],
        [page4Id, siblingPage],
      ]);

      const result = computeAccumulatedState(page3Id, id => pages.get(id));

      expect(result.changes).toEqual(['Event A', 'Event B', 'Event C']);
      expect(result.changes).not.toContain('Sibling Event');
    });

    it('returns empty changes for page 1 with no state changes', () => {
      const page1Id = parsePageId(1);
      const page1 = createPage({
        id: page1Id,
        narrativeText: 'Root',
        choices: [],
        stateChanges: { added: [], removed: [] },
        isEnding: true,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const result = computeAccumulatedState(page1Id, id => (id === page1Id ? page1 : undefined));

      expect(result.changes).toEqual([]);
    });

    it('handles a root page with no parent correctly', () => {
      const page1Id = parsePageId(1);
      const page1 = createPage({
        id: page1Id,
        narrativeText: 'Root',
        choices: [],
        stateChanges: { added: ['Root Event'], removed: [] },
        isEnding: true,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const result = computeAccumulatedState(page1Id, id => (id === page1Id ? page1 : undefined));

      expect(result.changes).toEqual(['Root Event']);
    });

    it('returns empty changes when target page is missing', () => {
      const result = computeAccumulatedState(parsePageId(99), () => undefined);
      expect(result.changes).toEqual([]);
    });
  });

  describe('getParentAccumulatedState', () => {
    it('returns parent accumulated state as-is', () => {
      const parent = createPage({
        id: parsePageId(1),
        narrativeText: 'Parent',
        choices: [],
        stateChanges: { added: ['Parent Event'], removed: [] },
        isEnding: true,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(getParentAccumulatedState(parent)).toBe(parent.accumulatedState);
    });
  });

  describe('mergeStateChanges', () => {
    it('combines parent state with new changes', () => {
      const parent = { changes: ['Event A', 'Event B'] };
      const result = mergeStateChanges(parent, { added: ['Event C'], removed: [] });

      expect(result.changes).toEqual(['Event A', 'Event B', 'Event C']);
    });

    it('returns a new object and does not mutate parent', () => {
      const parent = { changes: ['Event A'] as const };
      const result = mergeStateChanges(parent, { added: ['Event B'], removed: [] });

      expect(result).not.toBe(parent);
      expect(parent).toEqual({ changes: ['Event A'] });
    });

    it('handles empty new changes', () => {
      const result = mergeStateChanges({ changes: ['Event A'] }, { added: [], removed: [] });
      expect(result.changes).toEqual(['Event A']);
    });

    it('handles empty parent state', () => {
      const result = mergeStateChanges({ changes: [] }, { added: ['Event A'], removed: [] });
      expect(result.changes).toEqual(['Event A']);
    });
  });

  describe('formatStateForDisplay', () => {
    it('formats state as bulleted list', () => {
      const formatted = formatStateForDisplay({ changes: ['Event A', 'Event B'] });
      expect(formatted).toBe('• Event A\n• Event B');
    });

    it('returns placeholder for empty state', () => {
      expect(formatStateForDisplay({ changes: [] })).toBe('No significant events yet.');
    });

    it('handles a single change correctly', () => {
      expect(formatStateForDisplay({ changes: ['Only Event'] })).toBe('• Only Event');
    });
  });

  describe('getRecentChanges', () => {
    it('returns last N changes', () => {
      const recent = getRecentChanges({ changes: ['A', 'B', 'C', 'D', 'E', 'F'] }, 3);
      expect(recent).toEqual(['D', 'E', 'F']);
    });

    it('returns all changes if fewer than N exist', () => {
      const recent = getRecentChanges({ changes: ['A', 'B'] }, 5);
      expect(recent).toEqual(['A', 'B']);
    });

    it('defaults to 5 changes when count is not provided', () => {
      const recent = getRecentChanges({ changes: ['A', 'B', 'C', 'D', 'E', 'F'] });
      expect(recent).toEqual(['B', 'C', 'D', 'E', 'F']);
    });
  });
});
