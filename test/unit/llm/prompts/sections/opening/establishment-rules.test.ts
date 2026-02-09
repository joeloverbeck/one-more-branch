/**
 * Unit tests for opening establishment-rules section module.
 */

import {
  OPENING_ESTABLISHMENT_RULES,
  OPENING_CHARACTER_CANON_GUIDANCE,
} from '../../../../../../src/llm/prompts/sections/opening/establishment-rules.js';

describe('opening establishment-rules sections', () => {
  describe('OPENING_ESTABLISHMENT_RULES', () => {
    it('is a non-empty string', () => {
      expect(typeof OPENING_ESTABLISHMENT_RULES).toBe('string');
      expect(OPENING_ESTABLISHMENT_RULES.length).toBeGreaterThan(0);
    });

    it('includes section header with OPENING marker', () => {
      expect(OPENING_ESTABLISHMENT_RULES).toContain('ESTABLISHMENT RULES (OPENING):');
    });

    it('emphasizes this is the FIRST page', () => {
      expect(OPENING_ESTABLISHMENT_RULES).toContain('FIRST page');
      expect(OPENING_ESTABLISHMENT_RULES).toContain('ESTABLISHING initial state');
    });

    it('emphasizes character concept fidelity', () => {
      expect(OPENING_ESTABLISHMENT_RULES).toContain('CHARACTER CONCEPT FIDELITY:');
      expect(OPENING_ESTABLISHMENT_RULES).toContain('PRIMARY source of truth');
    });

    it('lists what to establish', () => {
      expect(OPENING_ESTABLISHMENT_RULES).toContain('LOCATION');
      expect(OPENING_ESTABLISHMENT_RULES).toContain('INVENTORY');
      expect(OPENING_ESTABLISHMENT_RULES).toContain('HEALTH');
      expect(OPENING_ESTABLISHMENT_RULES).toContain('ACTIVE STATE');
      expect(OPENING_ESTABLISHMENT_RULES).toContain('CANON');
      expect(OPENING_ESTABLISHMENT_RULES).toContain('AFFECT');
    });

    it('specifies removed arrays must be empty', () => {
      expect(OPENING_ESTABLISHMENT_RULES).toContain('"removed" arrays must be EMPTY');
    });

    it('does NOT reference Established World Facts header', () => {
      // Opening has no established facts yet, so should not reference the header
      expect(OPENING_ESTABLISHMENT_RULES).not.toContain('ESTABLISHED WORLD FACTS');
    });
  });

  describe('OPENING_CHARACTER_CANON_GUIDANCE', () => {
    it('is a non-empty string', () => {
      expect(typeof OPENING_CHARACTER_CANON_GUIDANCE).toBe('string');
      expect(OPENING_CHARACTER_CANON_GUIDANCE.length).toBeGreaterThan(0);
    });

    it('includes section header with OPENING marker', () => {
      expect(OPENING_CHARACTER_CANON_GUIDANCE).toContain('CHARACTER CANON ESTABLISHMENT (OPENING):');
    });

    it('emphasizes defining characters, not referencing', () => {
      expect(OPENING_CHARACTER_CANON_GUIDANCE).toContain('DEFINING characters');
      expect(OPENING_CHARACTER_CANON_GUIDANCE).toContain('not referencing established facts');
    });

    it('documents protagonist canon extraction', () => {
      expect(OPENING_CHARACTER_CANON_GUIDANCE).toContain('PROTAGONIST CANON');
      expect(OPENING_CHARACTER_CANON_GUIDANCE).toContain('character concept');
    });

    it('documents NPC canon for newly introduced characters', () => {
      expect(OPENING_CHARACTER_CANON_GUIDANCE).toContain('NPC CANON');
      expect(OPENING_CHARACTER_CANON_GUIDANCE).toContain('NPCs introduced');
    });

    it('warns against inventing traits', () => {
      expect(OPENING_CHARACTER_CANON_GUIDANCE).toContain('not supported by the provided context');
    });
  });
});
