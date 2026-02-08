/**
 * Unit tests for narrative-core section module.
 */

import {
  STORYTELLING_GUIDELINES,
  CONTINUITY_RULES,
  ENDING_GUIDELINES,
} from '../../../../../src/llm/prompts/sections/narrative-core.js';

describe('narrative-core sections', () => {
  describe('STORYTELLING_GUIDELINES', () => {
    it('is a non-empty string', () => {
      expect(typeof STORYTELLING_GUIDELINES).toBe('string');
      expect(STORYTELLING_GUIDELINES.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(STORYTELLING_GUIDELINES).toContain('STORYTELLING GUIDELINES:');
    });

    it('includes prose style guidance', () => {
      expect(STORYTELLING_GUIDELINES).toContain('vivid, evocative prose');
    });

    it('requires second person perspective', () => {
      expect(STORYTELLING_GUIDELINES).toContain('second person perspective');
      expect(STORYTELLING_GUIDELINES).toContain('"you"');
    });

    it('emphasizes meaningful choices', () => {
      expect(STORYTELLING_GUIDELINES).toContain('meaningful choices');
      expect(STORYTELLING_GUIDELINES).toContain('genuine consequences');
    });

    it('mentions player agency', () => {
      expect(STORYTELLING_GUIDELINES).toContain('player agency');
    });
  });

  describe('CONTINUITY_RULES', () => {
    it('is a non-empty string', () => {
      expect(typeof CONTINUITY_RULES).toBe('string');
      expect(CONTINUITY_RULES.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(CONTINUITY_RULES).toContain('CONTINUITY RULES:');
    });

    it('prohibits contradicting established facts', () => {
      expect(CONTINUITY_RULES).toContain('Do NOT contradict');
      expect(CONTINUITY_RULES).toContain('Established World Facts');
    });

    it('prohibits retcons', () => {
      expect(CONTINUITY_RULES).toContain('Do NOT retcon');
    });

    it('requires new facts in canon fields', () => {
      expect(CONTINUITY_RULES).toContain('newCanonFacts');
      expect(CONTINUITY_RULES).toContain('newCharacterCanonFacts');
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
