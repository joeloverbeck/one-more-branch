/**
 * Unit tests for shared protagonist-affect section module.
 */

import { PROTAGONIST_AFFECT } from '../../../../../../src/llm/prompts/sections/shared/protagonist-affect.js';

describe('shared protagonist-affect sections', () => {
  describe('PROTAGONIST_AFFECT', () => {
    it('is a non-empty string', () => {
      expect(typeof PROTAGONIST_AFFECT).toBe('string');
      expect(PROTAGONIST_AFFECT.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(PROTAGONIST_AFFECT).toContain('PROTAGONIST AFFECT (EMOTIONAL STATE SNAPSHOT):');
    });

    it('clarifies this is a SNAPSHOT, not accumulated', () => {
      expect(PROTAGONIST_AFFECT).toContain('SNAPSHOT');
      expect(PROTAGONIST_AFFECT).toContain('NOT accumulated');
    });

    it('documents primaryEmotion field', () => {
      expect(PROTAGONIST_AFFECT).toContain('primaryEmotion');
    });

    it('documents primaryIntensity field with valid values', () => {
      expect(PROTAGONIST_AFFECT).toContain('primaryIntensity');
      expect(PROTAGONIST_AFFECT).toContain('mild');
      expect(PROTAGONIST_AFFECT).toContain('moderate');
      expect(PROTAGONIST_AFFECT).toContain('strong');
      expect(PROTAGONIST_AFFECT).toContain('overwhelming');
    });

    it('documents primaryCause field', () => {
      expect(PROTAGONIST_AFFECT).toContain('primaryCause');
    });

    it('documents secondaryEmotions field', () => {
      expect(PROTAGONIST_AFFECT).toContain('secondaryEmotions');
    });

    it('documents dominantMotivation field', () => {
      expect(PROTAGONIST_AFFECT).toContain('dominantMotivation');
    });

    it('includes bad example showing wrong usage', () => {
      expect(PROTAGONIST_AFFECT).toContain('❌');
      expect(PROTAGONIST_AFFECT).toContain('threatsAdded:');
    });

    it('includes good example showing correct usage', () => {
      expect(PROTAGONIST_AFFECT).toContain('✅');
      expect(PROTAGONIST_AFFECT).toContain('protagonistAffect:');
    });

    it('clarifies affect is for protagonist only', () => {
      expect(PROTAGONIST_AFFECT).toContain('PROTAGONIST only');
      expect(PROTAGONIST_AFFECT).toContain('NPC emotional states');
      expect(PROTAGONIST_AFFECT).toContain('narrative');
    });
  });
});
