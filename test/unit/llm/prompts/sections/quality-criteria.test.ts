/**
 * Unit tests for quality-criteria section module.
 */

import {
  STATE_CHANGE_QUALITY,
  CANON_QUALITY,
} from '../../../../../src/llm/prompts/sections/quality-criteria.js';

describe('quality-criteria sections', () => {
  describe('STATE_CHANGE_QUALITY', () => {
    it('is a non-empty string', () => {
      expect(typeof STATE_CHANGE_QUALITY).toBe('string');
      expect(STATE_CHANGE_QUALITY.length).toBeGreaterThan(0);
    });

    it('includes section header with CRITICAL marker', () => {
      expect(STATE_CHANGE_QUALITY).toContain('STATE CHANGE QUALITY CRITERIA (CRITICAL):');
    });

    it('emphasizes CONSEQUENTIAL events', () => {
      expect(STATE_CHANGE_QUALITY).toContain('CONSEQUENTIAL');
    });

    it('includes decision question', () => {
      expect(STATE_CHANGE_QUALITY).toContain('NEED to remember');
      expect(STATE_CHANGE_QUALITY).toContain('change their future behavior');
    });

    it('includes GOOD STATE CHANGES section', () => {
      expect(STATE_CHANGE_QUALITY).toContain('GOOD STATE CHANGES');
    });

    it('lists good state change examples', () => {
      expect(STATE_CHANGE_QUALITY).toContain('Commitments');
      expect(STATE_CHANGE_QUALITY).toContain('Knowledge');
      expect(STATE_CHANGE_QUALITY).toContain('Relationship shifts');
    });

    it('includes BAD STATE CHANGES section', () => {
      expect(STATE_CHANGE_QUALITY).toContain('BAD STATE CHANGES');
    });

    it('lists bad state change examples', () => {
      expect(STATE_CHANGE_QUALITY).toContain('Observations');
      expect(STATE_CHANGE_QUALITY).toContain('Social niceties');
      expect(STATE_CHANGE_QUALITY).toContain('Fleeting emotions');
    });

    it('includes ANTI-PATTERNS section', () => {
      expect(STATE_CHANGE_QUALITY).toContain('ANTI-PATTERNS');
    });

    it('includes inventory direction', () => {
      expect(STATE_CHANGE_QUALITY).toContain('inventoryAdded/inventoryRemoved');
      expect(STATE_CHANGE_QUALITY).toContain('✅ Use');
    });

    it('includes health direction', () => {
      expect(STATE_CHANGE_QUALITY).toContain('healthAdded/healthRemoved');
    });

    it('clarifies protagonistAffect for emotions', () => {
      expect(STATE_CHANGE_QUALITY).toContain('protagonistAffect');
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
