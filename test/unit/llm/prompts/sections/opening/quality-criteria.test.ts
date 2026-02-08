/**
 * Unit tests for opening quality-criteria section module.
 */

import {
  OPENING_ACTIVE_STATE_QUALITY,
  OPENING_CANON_QUALITY,
} from '../../../../../../src/llm/prompts/sections/opening/opening-quality-criteria.js';

describe('opening quality-criteria sections', () => {
  describe('OPENING_ACTIVE_STATE_QUALITY', () => {
    it('is a non-empty string', () => {
      expect(typeof OPENING_ACTIVE_STATE_QUALITY).toBe('string');
      expect(OPENING_ACTIVE_STATE_QUALITY.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('OPENING ACTIVE STATE QUALITY:');
    });

    it('focuses on ESTABLISHMENT, not removal', () => {
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('Focus on ESTABLISHMENT');
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('not removal');
    });

    it('includes GOOD INITIAL THREATS section', () => {
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('GOOD INITIAL THREATS');
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('threatsAdded');
    });

    it('includes GOOD INITIAL CONSTRAINTS section', () => {
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('GOOD INITIAL CONSTRAINTS');
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('constraintsAdded');
    });

    it('includes GOOD INITIAL THREADS section', () => {
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('GOOD INITIAL THREADS');
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('threadsAdded');
    });

    it('lists examples with prefix format', () => {
      expect(OPENING_ACTIVE_STATE_QUALITY).toMatch(/THREAT_\w+:/);
      expect(OPENING_ACTIVE_STATE_QUALITY).toMatch(/CONSTRAINT_\w+:/);
      expect(OPENING_ACTIVE_STATE_QUALITY).toMatch(/THREAD_\w+:/);
    });

    it('specifies removed arrays must be empty', () => {
      expect(OPENING_ACTIVE_STATE_QUALITY).toContain('threatsRemoved, constraintsRemoved, threadsResolved MUST be empty');
    });

    it('does NOT include REMOVAL QUALITY section', () => {
      // Opening has nothing to remove
      expect(OPENING_ACTIVE_STATE_QUALITY).not.toContain('REMOVAL QUALITY');
    });
  });

  describe('OPENING_CANON_QUALITY', () => {
    it('is a non-empty string', () => {
      expect(typeof OPENING_CANON_QUALITY).toBe('string');
      expect(OPENING_CANON_QUALITY.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(OPENING_CANON_QUALITY).toContain('OPENING CANON QUALITY:');
    });

    it('emphasizes PERMANENT facts', () => {
      expect(OPENING_CANON_QUALITY).toContain('PERMANENT');
    });

    it('includes GOOD WORLD CANON section', () => {
      expect(OPENING_CANON_QUALITY).toContain('GOOD WORLD CANON');
      expect(OPENING_CANON_QUALITY).toContain('newCanonFacts');
    });

    it('lists good world canon examples', () => {
      expect(OPENING_CANON_QUALITY).toContain('Locations');
      expect(OPENING_CANON_QUALITY).toContain('Power structures');
      expect(OPENING_CANON_QUALITY).toContain('Laws or customs');
      expect(OPENING_CANON_QUALITY).toContain('Geography');
    });

    it('includes BAD WORLD CANON section', () => {
      expect(OPENING_CANON_QUALITY).toContain('BAD WORLD CANON');
    });

    it('includes GOOD CHARACTER CANON section', () => {
      expect(OPENING_CANON_QUALITY).toContain('GOOD CHARACTER CANON');
      expect(OPENING_CANON_QUALITY).toContain('newCharacterCanonFacts');
    });

    it('includes BAD CHARACTER CANON section', () => {
      expect(OPENING_CANON_QUALITY).toContain('BAD CHARACTER CANON');
    });

    it('warns against inventing unsupported traits', () => {
      expect(OPENING_CANON_QUALITY).toContain('directly supported');
      expect(OPENING_CANON_QUALITY).toContain('character concept');
    });
  });
});
