/**
 * Unit tests for state-tracking section module.
 */

import {
  STATE_MANAGEMENT,
  STATE_REMOVAL_RULES,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
} from '../../../../../src/llm/prompts/sections/state-tracking.js';

describe('state-tracking sections', () => {
  describe('STATE_MANAGEMENT', () => {
    it('is a non-empty string', () => {
      expect(typeof STATE_MANAGEMENT).toBe('string');
      expect(STATE_MANAGEMENT.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(STATE_MANAGEMENT).toContain('STATE MANAGEMENT (ADD/REMOVE PATTERN):');
    });

    it('documents stateChangesAdded field', () => {
      expect(STATE_MANAGEMENT).toContain('stateChangesAdded:');
    });

    it('documents stateChangesRemoved field', () => {
      expect(STATE_MANAGEMENT).toContain('stateChangesRemoved:');
    });

    it('requires second person for player events', () => {
      expect(STATE_MANAGEMENT).toContain('second person');
      expect(STATE_MANAGEMENT).toContain('"You"');
    });

    it('clarifies state changes exclude items', () => {
      expect(STATE_MANAGEMENT).toContain('NOT for items');
    });
  });

  describe('STATE_REMOVAL_RULES', () => {
    it('is a non-empty string', () => {
      expect(typeof STATE_REMOVAL_RULES).toBe('string');
      expect(STATE_REMOVAL_RULES.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(STATE_REMOVAL_RULES).toContain('STATE REMOVAL RULES:');
    });

    it('covers RESOLVED conditions', () => {
      expect(STATE_REMOVAL_RULES).toContain('RESOLVED');
    });

    it('covers CONTRADICTED conditions', () => {
      expect(STATE_REMOVAL_RULES).toContain('CONTRADICTED');
    });

    it('requires exact text matching for removals', () => {
      expect(STATE_REMOVAL_RULES).toContain('EXACT');
    });

    it('includes example', () => {
      expect(STATE_REMOVAL_RULES).toContain('Example:');
    });
  });

  describe('INVENTORY_MANAGEMENT', () => {
    it('is a non-empty string', () => {
      expect(typeof INVENTORY_MANAGEMENT).toBe('string');
      expect(INVENTORY_MANAGEMENT.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(INVENTORY_MANAGEMENT).toContain('INVENTORY MANAGEMENT:');
    });

    it('documents inventoryAdded field', () => {
      expect(INVENTORY_MANAGEMENT).toContain('inventoryAdded');
    });

    it('documents inventoryRemoved field', () => {
      expect(INVENTORY_MANAGEMENT).toContain('inventoryRemoved');
    });

    it('requires specific item names', () => {
      expect(INVENTORY_MANAGEMENT).toContain('be specific');
    });

    it('mentions duplicates are allowed', () => {
      expect(INVENTORY_MANAGEMENT).toContain('Duplicates are allowed');
    });
  });

  describe('HEALTH_MANAGEMENT', () => {
    it('is a non-empty string', () => {
      expect(typeof HEALTH_MANAGEMENT).toBe('string');
      expect(HEALTH_MANAGEMENT.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(HEALTH_MANAGEMENT).toContain('HEALTH MANAGEMENT:');
    });

    it('documents healthAdded field', () => {
      expect(HEALTH_MANAGEMENT).toContain('healthAdded');
    });

    it('documents healthRemoved field', () => {
      expect(HEALTH_MANAGEMENT).toContain('healthRemoved');
    });

    it('clarifies health is for physical conditions only', () => {
      expect(HEALTH_MANAGEMENT).toContain('PHYSICAL conditions only');
      expect(HEALTH_MANAGEMENT).toContain('emotions belong in protagonistAffect');
    });

    it('includes examples', () => {
      expect(HEALTH_MANAGEMENT).toContain('Examples of health conditions:');
    });
  });

  describe('FIELD_SEPARATION', () => {
    it('is a non-empty string', () => {
      expect(typeof FIELD_SEPARATION).toBe('string');
      expect(FIELD_SEPARATION.length).toBeGreaterThan(0);
    });

    it('includes section header with CRITICAL marker', () => {
      expect(FIELD_SEPARATION).toContain('FIELD SEPARATION (CRITICAL):');
    });

    it('documents INVENTORY fields', () => {
      expect(FIELD_SEPARATION).toContain('INVENTORY');
      expect(FIELD_SEPARATION).toContain('inventoryAdded/inventoryRemoved');
    });

    it('documents HEALTH fields', () => {
      expect(FIELD_SEPARATION).toContain('HEALTH');
      expect(FIELD_SEPARATION).toContain('healthAdded/healthRemoved');
    });

    it('documents STATE CHANGES fields', () => {
      expect(FIELD_SEPARATION).toContain('STATE CHANGES');
      expect(FIELD_SEPARATION).toContain('stateChangesAdded/stateChangesRemoved');
    });

    it('documents PROTAGONIST AFFECT field', () => {
      expect(FIELD_SEPARATION).toContain('PROTAGONIST AFFECT');
      expect(FIELD_SEPARATION).toContain('protagonistAffect');
    });

    it('documents WORLD FACTS field', () => {
      expect(FIELD_SEPARATION).toContain('WORLD FACTS');
      expect(FIELD_SEPARATION).toContain('newCanonFacts');
    });

    it('documents CHARACTER CANON field', () => {
      expect(FIELD_SEPARATION).toContain('CHARACTER CANON');
      expect(FIELD_SEPARATION).toContain('newCharacterCanonFacts');
    });

    it('documents CHARACTER STATE field', () => {
      expect(FIELD_SEPARATION).toContain('CHARACTER STATE');
      expect(FIELD_SEPARATION).toContain('characterStateChangesAdded/characterStateChangesRemoved');
    });
  });
});
