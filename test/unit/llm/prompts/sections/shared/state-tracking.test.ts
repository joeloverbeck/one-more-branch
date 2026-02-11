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

    it('lists read-only continuity context fields', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('READ-ONLY CONTINUITY INPUT');
      expect(ACTIVE_STATE_TRACKING).toContain('CURRENT LOCATION');
      expect(ACTIVE_STATE_TRACKING).toContain('ACTIVE THREATS');
      expect(ACTIVE_STATE_TRACKING).toContain('ACTIVE CONSTRAINTS');
      expect(ACTIVE_STATE_TRACKING).toContain('OPEN NARRATIVE THREADS');
    });

    it('treats open threads as read-only continuity context', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('OPEN NARRATIVE THREADS: unresolved hooks and mysteries');
      expect(ACTIVE_STATE_TRACKING).not.toContain('THREAD CONTRACT (OPEN LOOPS ONLY)');
      expect(ACTIVE_STATE_TRACKING).not.toContain('CANONICAL THREAD PHRASING TEMPLATES');
    });

    it('forbids state mutation output fields', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('DO NOT OUTPUT STATE/CANON MUTATION FIELDS');
      expect(ACTIVE_STATE_TRACKING).toContain('threatsAdded / threatsRemoved');
      expect(ACTIVE_STATE_TRACKING).toContain('constraintsAdded / constraintsRemoved');
      expect(ACTIVE_STATE_TRACKING).toContain('threadsAdded / threadsResolved');
    });

    it('does not mention legacy prefix format', () => {
      expect(ACTIVE_STATE_TRACKING).not.toContain('THREAT_IDENTIFIER');
      expect(ACTIVE_STATE_TRACKING).not.toContain('PREFIX_ID');
    });

    it('clarifies state represents current truth', () => {
      expect(ACTIVE_STATE_TRACKING).toContain('TRUE RIGHT NOW');
      expect(ACTIVE_STATE_TRACKING).toContain('authoritative continuity context');
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

    it('documents inventory fields', () => {
      expect(INVENTORY_MANAGEMENT).toContain('inventoryAdded');
      expect(INVENTORY_MANAGEMENT).toContain('inventoryRemoved');
    });

    it('marks inventory as read-only output context', () => {
      expect(INVENTORY_MANAGEMENT).toContain('read-only context');
      expect(INVENTORY_MANAGEMENT).toContain('Do NOT output inventoryAdded or inventoryRemoved');
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

    it('documents health fields', () => {
      expect(HEALTH_MANAGEMENT).toContain('healthAdded');
      expect(HEALTH_MANAGEMENT).toContain('healthRemoved');
    });

    it('marks health as read-only output context', () => {
      expect(HEALTH_MANAGEMENT).toContain('read-only context');
      expect(HEALTH_MANAGEMENT).toContain('Do NOT output healthAdded or healthRemoved');
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

    it('documents creative-only output and forbidden mutation fields', () => {
      expect(FIELD_SEPARATION).toContain('CREATIVE OUTPUT FIELDS');
      expect(FIELD_SEPARATION).toContain('protagonistAffect');
      expect(FIELD_SEPARATION).toContain('FORBIDDEN OUTPUT FIELDS');
      expect(FIELD_SEPARATION).toContain('inventoryAdded / inventoryRemoved');
      expect(FIELD_SEPARATION).toContain('newCanonFacts / newCharacterCanonFacts');
      expect(FIELD_SEPARATION).toContain('characterStateChangesAdded / characterStateChangesRemoved');
    });
  });
});
