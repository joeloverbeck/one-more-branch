import { createChoice, isChoice, isChoiceExplored } from '../../../src/models/choice';
import { PageId } from '../../../src/models/id';

describe('Choice utilities', () => {
  describe('createChoice', () => {
    it('creates a choice with null nextPageId by default', () => {
      const choice = createChoice('Go north');
      expect(choice.text).toBe('Go north');
      expect(choice.nextPageId).toBeNull();
    });

    it('creates a choice with a provided nextPageId', () => {
      const choice = createChoice('Go north', 5 as PageId);
      expect(choice.text).toBe('Go north');
      expect(choice.nextPageId).toBe(5);
    });

    it('trims whitespace from text', () => {
      const choice = createChoice('  Go north  ');
      expect(choice.text).toBe('Go north');
    });

    it('throws for empty or whitespace-only text', () => {
      expect(() => createChoice('')).toThrow('Choice text cannot be empty');
      expect(() => createChoice('   ')).toThrow('Choice text cannot be empty');
    });

    it('throws for invalid nextPageId values', () => {
      expect(() => createChoice('Go', 0 as PageId)).toThrow('Invalid Page ID');
      expect(() => createChoice('Go', -1 as PageId)).toThrow('Invalid Page ID');
      expect(() => createChoice('Go', 1.5 as PageId)).toThrow('Invalid Page ID');
    });
  });

  describe('isChoice', () => {
    it('returns true for valid choice objects', () => {
      expect(isChoice({ text: 'Go', nextPageId: null })).toBe(true);
      expect(isChoice({ text: 'Go', nextPageId: 5 })).toBe(true);
    });

    it('returns false for invalid objects', () => {
      expect(isChoice(null)).toBe(false);
      expect(isChoice({ text: '' })).toBe(false);
      expect(isChoice({ text: '   ', nextPageId: null })).toBe(false);
      expect(isChoice({ nextPageId: 1 })).toBe(false);
      expect(isChoice({ text: 'Go', nextPageId: 0 })).toBe(false);
      expect(isChoice({ text: 'Go', nextPageId: 1.2 })).toBe(false);
    });
  });

  describe('isChoiceExplored', () => {
    it('returns false when nextPageId is null', () => {
      expect(isChoiceExplored({ text: 'Go', nextPageId: null })).toBe(false);
    });

    it('returns true when nextPageId is set', () => {
      expect(isChoiceExplored({ text: 'Go', nextPageId: 5 as PageId })).toBe(true);
    });
  });
});
