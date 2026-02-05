import {
  generatePageId,
  generateStoryId,
  isPageId,
  isStoryId,
  parsePageId,
  parseStoryId,
} from '../../../src/models/id';

describe('ID utilities', () => {
  describe('generateStoryId', () => {
    it('returns a valid UUID v4', () => {
      const storyId = generateStoryId();
      expect(isStoryId(storyId)).toBe(true);
    });

    it('produces unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateStoryId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('generatePageId', () => {
    it('returns 1 when page count is 0', () => {
      expect(generatePageId(0)).toBe(1);
    });

    it('returns the next page id for a non-zero count', () => {
      expect(generatePageId(5)).toBe(6);
    });
  });

  describe('isStoryId', () => {
    it('returns true for a valid UUID v4', () => {
      expect(isStoryId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isStoryId('not-a-uuid')).toBe(false);
      expect(isStoryId('')).toBe(false);
      expect(isStoryId(123)).toBe(false);
    });
  });

  describe('isPageId', () => {
    it('returns true for positive integers', () => {
      expect(isPageId(1)).toBe(true);
      expect(isPageId(100)).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isPageId(0)).toBe(false);
      expect(isPageId(-1)).toBe(false);
      expect(isPageId(1.5)).toBe(false);
      expect(isPageId('1')).toBe(false);
    });
  });

  describe('parseStoryId', () => {
    it('returns StoryId for valid input', () => {
      const value = '550e8400-e29b-41d4-a716-446655440000';
      expect(parseStoryId(value)).toBe(value);
    });

    it('throws for invalid input', () => {
      expect(() => parseStoryId('invalid')).toThrow();
    });
  });

  describe('parsePageId', () => {
    it('returns PageId for valid input', () => {
      expect(parsePageId(5)).toBe(5);
    });

    it('throws for invalid values', () => {
      expect(() => parsePageId(0)).toThrow();
      expect(() => parsePageId(-1)).toThrow();
    });
  });

  describe('parse/guard consistency', () => {
    it('parseStoryId throws exactly when isStoryId is false for sampled values', () => {
      const values = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550E8400-E29B-41D4-A716-446655440000',
        '',
        'not-a-uuid',
      ];

      values.forEach((value) => {
        if (isStoryId(value)) {
          expect(() => parseStoryId(value)).not.toThrow();
        } else {
          expect(() => parseStoryId(value)).toThrow();
        }
      });
    });

    it('parsePageId throws exactly when isPageId is false for sampled values', () => {
      const values: unknown[] = [1, 5, 0, -1, 1.2, '1'];

      values.forEach((value) => {
        if (typeof value === 'number') {
          if (isPageId(value)) {
            expect(() => parsePageId(value)).not.toThrow();
          } else {
            expect(() => parsePageId(value)).toThrow();
          }
        }
      });
    });
  });
});
