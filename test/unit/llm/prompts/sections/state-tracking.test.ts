/**
 * Unit tests for state-tracking section module.
 */

import {
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
} from '../../../../../src/llm/prompts/sections/state-tracking.js';

describe('state-tracking sections', () => {
  describe('ACTIVE_STATE_TRACKING', () => {
    it('is a non-empty string', () => {
      expect(typeof ACTIVE_STATE_TRACKING).toBe('string');
      expect(ACTIVE_STATE_TRACKING.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('ACTIVE STATE TRACKING');
    });

    it('explains currentLocation field', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('currentLocation');
      expect(ACTIVE_STATE_TRACKING).toContain('END of this scene');
    });

    it('explains THREAT format with prefix', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('THREAT_IDENTIFIER');
      expect(ACTIVE_STATE_TRACKING).toMatch(/THREAT_\w+:/);
    });

    it('explains CONSTRAINT format with prefix', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('CONSTRAINT_IDENTIFIER');
      expect(ACTIVE_STATE_TRACKING).toMatch(/CONSTRAINT_\w+/);
    });

    it('explains THREAD format with prefix', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('THREAD_IDENTIFIER');
      expect(ACTIVE_STATE_TRACKING).toMatch(/THREAD_\w+/);
    });

    it('explains prefix-only removal protocol', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('ONLY the prefix');
      expect(ACTIVE_STATE_TRACKING).toContain('threatsRemoved');
    });

    it('includes IMPORTANT RULES section', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('IMPORTANT RULES');
    });

    it('provides example output', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('Example output');
      expect(ACTIVE_STATE_TRACKING).toMatch(/"currentLocation":/);
      expect(ACTIVE_STATE_TRACKING).toMatch(/"threatsAdded":/);
    });

    it('clarifies state represents current truth', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('TRUE RIGHT NOW');
      expect(ACTIVE_STATE_TRACKING).toContain('not a history');
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

    it('documents ACTIVE STATE fields with prefix format', () => {
      expect(FIELD_SEPARATION).toContain('ACTIVE STATE');
      expect(FIELD_SEPARATION).toContain('threatsAdded/threatsRemoved');
      expect(FIELD_SEPARATION).toContain('constraintsAdded/constraintsRemoved');
      expect(FIELD_SEPARATION).toContain('threadsAdded/threadsResolved');
      expect(FIELD_SEPARATION).toContain('PREFIX_ID: Description');
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
