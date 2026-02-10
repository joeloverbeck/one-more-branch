/**
 * Unit tests for shared state-tracking section module.
 */

import {
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
} from '../../../../../../src/llm/prompts/sections/shared/state-tracking.js';

describe('shared state-tracking sections', () => {
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

    it('explains THREAT additions/removals with IDs', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('plain text description');
      expect(ACTIVE_STATE_TRACKING).toContain('"th-1"');
    });

    it('explains CONSTRAINT additions/removals with IDs', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('ACTIVE CONSTRAINTS');
      expect(ACTIVE_STATE_TRACKING).toContain('"cn-1"');
    });

    it('explains THREAD additions/resolutions with IDs', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('OPEN NARRATIVE THREADS');
      expect(ACTIVE_STATE_TRACKING).toContain('object with text, threadType, and urgency');
      expect(ACTIVE_STATE_TRACKING).toContain('"td-1"');
    });

    it('does not mention legacy prefix format', () => {
      expect(ACTIVE_STATE_TRACKING).not.toContain('THREAT_IDENTIFIER');
      expect(ACTIVE_STATE_TRACKING).not.toContain('PREFIX_ID');
    });

    it('includes Rules section', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('Rules:');
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

    it('requires ID-based inventory removals', () => {
      expect(INVENTORY_MANAGEMENT).toContain('item\'s ID');
      expect(INVENTORY_MANAGEMENT).toContain('"inv-1"');
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

    it('requires ID-based health removals', () => {
      expect(HEALTH_MANAGEMENT).toContain('condition ID');
      expect(HEALTH_MANAGEMENT).toContain('"hp-2"');
    });

    it('clarifies health is for physical conditions only', () => {
      expect(HEALTH_MANAGEMENT).toContain('PHYSICAL conditions only');
      expect(HEALTH_MANAGEMENT).toContain('emotions belong in protagonistAffect');
    });

    it('includes examples', () => {
      expect(HEALTH_MANAGEMENT).toContain('Examples of health conditions:');
    });

    it('includes anti-duplication rule', () => {
      expect(HEALTH_MANAGEMENT).toContain('Do NOT add a condition that already exists');
    });
  });

  describe('FIELD_SEPARATION', () => {
    it('is a non-empty string', () => {
      expect(typeof FIELD_SEPARATION).toBe('string');
      expect(FIELD_SEPARATION.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(FIELD_SEPARATION).toContain('FIELD SEPARATION:');
    });

    it('documents INVENTORY fields', () => {
      expect(FIELD_SEPARATION).toContain('INVENTORY');
      expect(FIELD_SEPARATION).toContain('inventoryAdded/inventoryRemoved');
    });

    it('documents HEALTH fields', () => {
      expect(FIELD_SEPARATION).toContain('HEALTH');
      expect(FIELD_SEPARATION).toContain('healthAdded/healthRemoved');
    });

    it('documents ACTIVE STATE fields with typed thread additions and ID removals', () => {
      expect(FIELD_SEPARATION).toContain('ACTIVE STATE');
      expect(FIELD_SEPARATION).toContain('threatsAdded/threatsRemoved');
      expect(FIELD_SEPARATION).toContain('constraintsAdded/constraintsRemoved');
      expect(FIELD_SEPARATION).toContain('threadsAdded/threadsResolved');
      expect(FIELD_SEPARATION).toContain('Threat/constraint additions are plain text, thread additions are typed objects');
      expect(FIELD_SEPARATION).toContain('removals/resolutions use IDs');
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
