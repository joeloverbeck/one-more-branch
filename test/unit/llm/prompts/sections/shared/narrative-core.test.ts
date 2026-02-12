/**
 * Unit tests for shared narrative-core section module.
 */

import {
  STORYTELLING_GUIDELINES,
  ENDING_GUIDELINES,
} from '../../../../../../src/llm/prompts/sections/shared/narrative-core.js';

describe('shared narrative-core sections', () => {
  describe('STORYTELLING_GUIDELINES', () => {
    it('is a non-empty string', () => {
      expect(typeof STORYTELLING_GUIDELINES).toBe('string');
      expect(STORYTELLING_GUIDELINES.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(STORYTELLING_GUIDELINES).toContain('STORYTELLING GUIDELINES:');
    });

    it('includes golden rule as first directive', () => {
      expect(STORYTELLING_GUIDELINES).toContain('GOLDEN RULE');
      expect(STORYTELLING_GUIDELINES).toContain('vigorous verbs');
      expect(STORYTELLING_GUIDELINES).toContain('specific nouns');
    });

    it('requires second person perspective', () => {
      expect(STORYTELLING_GUIDELINES).toContain('second person perspective');
      expect(STORYTELLING_GUIDELINES).toContain('"you"');
    });

    it('mentions player agency', () => {
      expect(STORYTELLING_GUIDELINES).toContain('player agency');
    });
  });

  describe('ENDING_GUIDELINES', () => {
    it('is a non-empty string', () => {
      expect(typeof ENDING_GUIDELINES).toBe('string');
      expect(ENDING_GUIDELINES.length).toBeGreaterThan(0);
    });

    it('covers ending scenarios', () => {
      expect(ENDING_GUIDELINES).toContain('writing endings');
    });

    it('requires earned endings', () => {
      expect(ENDING_GUIDELINES).toContain('earned and meaningful');
    });

    it('requires no choices at conclusion', () => {
      expect(ENDING_GUIDELINES).toContain('Leave no choices');
      expect(ENDING_GUIDELINES).toContain('story concludes');
    });
  });
});
