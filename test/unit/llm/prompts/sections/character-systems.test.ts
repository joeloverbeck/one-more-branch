/**
 * Unit tests for character-systems section module.
 */

import {
  CHARACTER_CANON_VS_STATE,
  PROTAGONIST_AFFECT,
} from '../../../../../src/llm/prompts/sections/character-systems.js';

describe('character-systems sections', () => {
  describe('CHARACTER_CANON_VS_STATE', () => {
    it('is a non-empty string', () => {
      expect(typeof CHARACTER_CANON_VS_STATE).toBe('string');
      expect(CHARACTER_CANON_VS_STATE.length).toBeGreaterThan(0);
    });

    it('includes section header with CRITICAL marker', () => {
      expect(CHARACTER_CANON_VS_STATE).toContain(
        'CHARACTER CANON vs CHARACTER STATE (CRITICAL DISTINCTION):',
      );
    });

    it('documents CHARACTER CANON usage', () => {
      expect(CHARACTER_CANON_VS_STATE).toContain('CHARACTER CANON');
      expect(CHARACTER_CANON_VS_STATE).toContain('newCharacterCanonFacts');
      expect(CHARACTER_CANON_VS_STATE).toContain('PERMANENT traits');
    });

    it('documents CHARACTER STATE usage', () => {
      expect(CHARACTER_CANON_VS_STATE).toContain('CHARACTER STATE');
      expect(CHARACTER_CANON_VS_STATE).toContain('characterStateChangesAdded');
      expect(CHARACTER_CANON_VS_STATE).toContain('SITUATIONAL events');
    });

    it('includes canon examples', () => {
      expect(CHARACTER_CANON_VS_STATE).toContain('Inherent abilities');
      expect(CHARACTER_CANON_VS_STATE).toContain('Physical traits');
      expect(CHARACTER_CANON_VS_STATE).toContain('Background');
    });

    it('includes state examples', () => {
      expect(CHARACTER_CANON_VS_STATE).toContain('Actions taken');
      expect(CHARACTER_CANON_VS_STATE).toContain('Agreements made');
      expect(CHARACTER_CANON_VS_STATE).toContain('Knowledge gained');
    });

    it('includes decision rule', () => {
      expect(CHARACTER_CANON_VS_STATE).toContain('Rule:');
      expect(CHARACTER_CANON_VS_STATE).toContain('ANY playthrough');
      expect(CHARACTER_CANON_VS_STATE).toContain('CANON');
      expect(CHARACTER_CANON_VS_STATE).toContain('STATE');
    });
  });

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
      expect(PROTAGONIST_AFFECT).toContain('stateChangesAdded:');
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
