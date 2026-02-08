/**
 * Unit tests for quality-criteria section module.
 */

import {
  ACTIVE_STATE_QUALITY,
  CANON_QUALITY,
} from '../../../../../src/llm/prompts/sections/quality-criteria.js';

describe('quality-criteria sections', () => {
  describe('ACTIVE_STATE_QUALITY', () => {
    it('is a non-empty string', () => {
      expect(typeof ACTIVE_STATE_QUALITY).toBe('string');
      expect(ACTIVE_STATE_QUALITY.length).toBeGreaterThan(0);
    });

    it('includes section header with CRITICAL marker', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('ACTIVE STATE QUALITY CRITERIA (CRITICAL):');
    });

    it('emphasizes current truth', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('TRUE RIGHT NOW');
    });

    it('includes decision question', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('currently happening');
      expect(ACTIVE_STATE_QUALITY).toContain('immediate situation');
    });

    it('includes GOOD THREATS section', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('GOOD THREATS');
      expect(ACTIVE_STATE_QUALITY).toContain('threatsAdded');
    });

    it('lists good threat examples with prefix format', () => {
      expect(ACTIVE_STATE_QUALITY).toMatch(/THREAT_\w+:/);
    });

    it('includes BAD THREATS section', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('BAD THREATS');
    });

    it('includes GOOD CONSTRAINTS section', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('GOOD CONSTRAINTS');
      expect(ACTIVE_STATE_QUALITY).toContain('constraintsAdded');
    });

    it('lists good constraint examples with prefix format', () => {
      expect(ACTIVE_STATE_QUALITY).toMatch(/CONSTRAINT_\w+:/);
    });

    it('includes BAD CONSTRAINTS section', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('BAD CONSTRAINTS');
    });

    it('includes GOOD THREADS section', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('GOOD THREADS');
      expect(ACTIVE_STATE_QUALITY).toContain('threadsAdded');
    });

    it('lists good thread examples with prefix format', () => {
      expect(ACTIVE_STATE_QUALITY).toMatch(/THREAD_\w+:/);
    });

    it('includes BAD THREADS section', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('BAD THREADS');
    });

    it('includes REMOVAL QUALITY section', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('REMOVAL QUALITY');
    });

    it('explains prefix-only removal', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('ONLY the prefix');
    });

    it('includes inventory direction', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('inventoryAdded/inventoryRemoved');
      expect(ACTIVE_STATE_QUALITY).toContain('✅ Use');
    });

    it('includes health direction', () => {
      expect(ACTIVE_STATE_QUALITY).toContain('healthAdded/healthRemoved');
    });
  });

  describe('CANON_QUALITY', () => {
    it('is a non-empty string', () => {
      expect(typeof CANON_QUALITY).toBe('string');
      expect(CANON_QUALITY.length).toBeGreaterThan(0);
    });

    it('includes section header with CRITICAL marker', () => {
      expect(CANON_QUALITY).toContain('CANON QUALITY CRITERIA (CRITICAL):');
    });

    it('emphasizes PERMANENT facts', () => {
      expect(CANON_QUALITY).toContain('PERMANENT');
    });

    it('includes decision question', () => {
      expect(CANON_QUALITY).toContain('constrain or inform future scenes');
      expect(CANON_QUALITY).toContain('ANY branch');
    });

    it('includes GOOD WORLD CANON section', () => {
      expect(CANON_QUALITY).toContain('GOOD WORLD CANON');
      expect(CANON_QUALITY).toContain('newCanonFacts');
    });

    it('lists good world canon examples', () => {
      expect(CANON_QUALITY).toContain('Locations');
      expect(CANON_QUALITY).toContain('Factions');
      expect(CANON_QUALITY).toContain('Laws/customs');
      expect(CANON_QUALITY).toContain('Geography');
    });

    it('includes BAD WORLD CANON section', () => {
      expect(CANON_QUALITY).toContain('BAD WORLD CANON');
    });

    it('lists bad world canon examples', () => {
      expect(CANON_QUALITY).toContain('Single-scene details');
      expect(CANON_QUALITY).toContain('Trivial observations');
      expect(CANON_QUALITY).toContain('Plot-specific events');
    });

    it('includes GOOD CHARACTER CANON section', () => {
      expect(CANON_QUALITY).toContain('GOOD CHARACTER CANON');
      expect(CANON_QUALITY).toContain('newCharacterCanonFacts');
    });

    it('lists good character canon examples', () => {
      expect(CANON_QUALITY).toContain('Inherent traits');
      expect(CANON_QUALITY).toContain('Abilities');
      expect(CANON_QUALITY).toContain('Background');
      expect(CANON_QUALITY).toContain('Relationships');
    });

    it('includes BAD CHARACTER CANON section', () => {
      expect(CANON_QUALITY).toContain('BAD CHARACTER CANON');
    });

    it('lists bad character canon examples', () => {
      expect(CANON_QUALITY).toContain('Actions taken this scene');
      expect(CANON_QUALITY).toContain('Temporary states');
      expect(CANON_QUALITY).toContain('Scene-specific reactions');
    });

    it('includes decision rule', () => {
      expect(CANON_QUALITY).toContain('Rule:');
      expect(CANON_QUALITY).toContain('player choices');
      expect(CANON_QUALITY).toContain('CANON');
      expect(CANON_QUALITY).toContain('STATE fields');
    });
  });
});
