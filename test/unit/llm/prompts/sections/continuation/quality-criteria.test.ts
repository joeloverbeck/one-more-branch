/**
 * Unit tests for continuation quality-criteria section module.
 */

import {
  CONTINUATION_ACTIVE_STATE_QUALITY,
  CONTINUATION_CANON_QUALITY,
} from '../../../../../../src/llm/prompts/sections/continuation/continuation-quality-criteria.js';

describe('continuation quality-criteria sections', () => {
  describe('CONTINUATION_ACTIVE_STATE_QUALITY', () => {
    it('is a non-empty string', () => {
      expect(typeof CONTINUATION_ACTIVE_STATE_QUALITY).toBe('string');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('ACTIVE STATE QUALITY CRITERIA:');
    });

    it('emphasizes current truth', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('TRUE RIGHT NOW');
    });

    it('includes decision question', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('currently happening');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('immediate situation');
    });

    it('includes GOOD THREATS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('GOOD THREATS');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('threatsAdded');
    });

    it('lists good threat examples in natural language', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('"Two guards patrol the corridor ahead"');
    });

    it('includes BAD THREATS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('BAD THREATS');
    });

    it('includes GOOD CONSTRAINTS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('GOOD CONSTRAINTS');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('constraintsAdded');
    });

    it('lists good constraint examples in natural language', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('"Leg wound slows movement"');
    });

    it('includes BAD CONSTRAINTS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('BAD CONSTRAINTS');
    });

    it('includes GOOD THREADS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('GOOD THREADS');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('threadsAdded');
    });

    it('lists good thread examples in natural language', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('"The letter\'s contents remain unknown"');
    });

    it('includes BAD THREADS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('BAD THREADS');
    });

    it('includes REMOVAL QUALITY section for continuation', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('REMOVAL QUALITY');
    });

    it('explains ID-based removal', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('ONLY the server-assigned ID');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('"th-2", "cn-1", "td-3"');
    });

    it('includes inventory direction', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('inventoryAdded/inventoryRemoved');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('✅ Use');
    });

    it('includes health direction', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('healthAdded/healthRemoved');
    });
  });

  describe('CONTINUATION_CANON_QUALITY', () => {
    it('is a non-empty string', () => {
      expect(typeof CONTINUATION_CANON_QUALITY).toBe('string');
      expect(CONTINUATION_CANON_QUALITY.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('CANON QUALITY CRITERIA:');
    });

    it('emphasizes PERMANENT facts', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('PERMANENT');
    });

    it('includes decision question', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('constrain or inform future scenes');
      expect(CONTINUATION_CANON_QUALITY).toContain('ANY branch');
    });

    it('includes GOOD WORLD CANON section', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('GOOD WORLD CANON');
      expect(CONTINUATION_CANON_QUALITY).toContain('newCanonFacts');
    });

    it('lists good world canon examples', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('Locations');
      expect(CONTINUATION_CANON_QUALITY).toContain('Factions');
      expect(CONTINUATION_CANON_QUALITY).toContain('Laws/customs');
      expect(CONTINUATION_CANON_QUALITY).toContain('Geography');
    });

    it('includes BAD WORLD CANON section', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('BAD WORLD CANON');
    });

    it('lists bad world canon examples', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('Single-scene details');
      expect(CONTINUATION_CANON_QUALITY).toContain('Trivial observations');
      expect(CONTINUATION_CANON_QUALITY).toContain('Plot-specific events');
    });

    it('includes GOOD CHARACTER CANON section', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('GOOD CHARACTER CANON');
      expect(CONTINUATION_CANON_QUALITY).toContain('newCharacterCanonFacts');
    });

    it('lists good character canon examples', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('Inherent traits');
      expect(CONTINUATION_CANON_QUALITY).toContain('Abilities');
      expect(CONTINUATION_CANON_QUALITY).toContain('Background');
      expect(CONTINUATION_CANON_QUALITY).toContain('Relationships');
    });

    it('includes BAD CHARACTER CANON section', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('BAD CHARACTER CANON');
    });

    it('lists bad character canon examples', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('Actions taken this scene');
      expect(CONTINUATION_CANON_QUALITY).toContain('Temporary states');
      expect(CONTINUATION_CANON_QUALITY).toContain('Scene-specific reactions');
    });

    it('includes decision rule', () => {
      expect(CONTINUATION_CANON_QUALITY).toContain('Rule:');
      expect(CONTINUATION_CANON_QUALITY).toContain('player choices');
      expect(CONTINUATION_CANON_QUALITY).toContain('CANON');
      expect(CONTINUATION_CANON_QUALITY).toContain('STATE fields');
    });
  });
});
