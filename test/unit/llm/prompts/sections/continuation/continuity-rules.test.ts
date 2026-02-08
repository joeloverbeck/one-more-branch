/**
 * Unit tests for continuation continuity-rules section module.
 */

import {
  CONTINUATION_CONTINUITY_RULES,
  CHARACTER_CANON_VS_STATE,
} from '../../../../../../src/llm/prompts/sections/continuation/continuity-rules.js';

describe('continuation continuity-rules sections', () => {
  describe('CONTINUATION_CONTINUITY_RULES', () => {
    it('is a non-empty string', () => {
      expect(typeof CONTINUATION_CONTINUITY_RULES).toBe('string');
      expect(CONTINUATION_CONTINUITY_RULES.length).toBeGreaterThan(0);
    });

    it('includes section header with CONTINUATION marker', () => {
      expect(CONTINUATION_CONTINUITY_RULES).toContain('CONTINUITY RULES (CONTINUATION):');
    });

    it('prohibits contradicting established facts using exact prompt headers', () => {
      expect(CONTINUATION_CONTINUITY_RULES).toContain('DO NOT CONTRADICT');
      expect(CONTINUATION_CONTINUITY_RULES).toContain('ESTABLISHED WORLD FACTS');
      expect(CONTINUATION_CONTINUITY_RULES).toContain('CHARACTER INFORMATION');
    });

    it('references continuation-specific context headers', () => {
      expect(CONTINUATION_CONTINUITY_RULES).toContain('NPC CURRENT STATE');
      expect(CONTINUATION_CONTINUITY_RULES).toContain('YOUR INVENTORY');
      expect(CONTINUATION_CONTINUITY_RULES).toContain('YOUR HEALTH');
    });

    it('prohibits retcons', () => {
      expect(CONTINUATION_CONTINUITY_RULES).toContain('RETCONS ARE FORBIDDEN');
    });

    it('requires new facts in canon fields', () => {
      expect(CONTINUATION_CONTINUITY_RULES).toContain('newCanonFacts');
      expect(CONTINUATION_CONTINUITY_RULES).toContain('newCharacterCanonFacts');
    });

    it('includes consistency verification section', () => {
      expect(CONTINUATION_CONTINUITY_RULES).toContain('CONSISTENCY VERIFICATION');
    });
  });

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
});
