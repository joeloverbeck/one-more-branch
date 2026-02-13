/**
 * Unit tests for shared state-tracking section module.
 */

import {
  CONTINUITY_CONTEXT_USAGE,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
} from '../../../../../../src/llm/prompts/sections/shared/state-tracking.js';

describe('shared state-tracking sections', () => {
  describe('CONTINUITY_CONTEXT_USAGE', () => {
    it('is a non-empty string', () => {
      expect(typeof CONTINUITY_CONTEXT_USAGE).toBe('string');
      expect(CONTINUITY_CONTEXT_USAGE.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(CONTINUITY_CONTEXT_USAGE).toContain('CONTINUITY CONTEXT USAGE');
    });

    it('lists read-only continuity context fields', () => {
      expect(CONTINUITY_CONTEXT_USAGE).toContain('READ-ONLY CONTINUITY INPUT');
      expect(CONTINUITY_CONTEXT_USAGE).toContain('CURRENT LOCATION');
      expect(CONTINUITY_CONTEXT_USAGE).toContain('ACTIVE THREATS');
      expect(CONTINUITY_CONTEXT_USAGE).toContain('ACTIVE CONSTRAINTS');
      expect(CONTINUITY_CONTEXT_USAGE).toContain('OPEN NARRATIVE THREADS');
    });

    it('treats open threads as read-only continuity context', () => {
      expect(CONTINUITY_CONTEXT_USAGE).toContain(
        'OPEN NARRATIVE THREADS: unresolved hooks and mysteries'
      );
      expect(CONTINUITY_CONTEXT_USAGE).not.toContain('THREAD CONTRACT (OPEN LOOPS ONLY)');
      expect(CONTINUITY_CONTEXT_USAGE).not.toContain('CANONICAL THREAD PHRASING TEMPLATES');
    });

    it('focuses active state usage on continuity context', () => {
      expect(CONTINUITY_CONTEXT_USAGE).toContain('How to use this context');
      expect(CONTINUITY_CONTEXT_USAGE).toContain('Show consequences in prose and choices.');
      expect(CONTINUITY_CONTEXT_USAGE).not.toContain('DO NOT OUTPUT STATE/CANON MUTATION FIELDS');
    });

    it('does not mention legacy prefix format', () => {
      expect(CONTINUITY_CONTEXT_USAGE).not.toContain('THREAT_IDENTIFIER');
      expect(CONTINUITY_CONTEXT_USAGE).not.toContain('PREFIX_ID');
    });

    it('clarifies state represents current truth', () => {
      expect(CONTINUITY_CONTEXT_USAGE).toContain('TRUE RIGHT NOW');
      expect(CONTINUITY_CONTEXT_USAGE).toContain('authoritative scene context');
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

    it('describes inventory continuity usage', () => {
      expect(INVENTORY_MANAGEMENT).toContain('read-only context');
      expect(INVENTORY_MANAGEMENT).toContain('Use inventory details naturally');
      expect(INVENTORY_MANAGEMENT).not.toContain('inventoryAdded');
      expect(INVENTORY_MANAGEMENT).not.toContain('inventoryRemoved');
    });

    it('marks inventory as read-only output context', () => {
      expect(INVENTORY_MANAGEMENT).toContain('read-only context');
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

    it('describes health continuity usage', () => {
      expect(HEALTH_MANAGEMENT).toContain('read-only context');
      expect(HEALTH_MANAGEMENT).toContain('Reflect physical limitations');
      expect(HEALTH_MANAGEMENT).not.toContain('healthAdded');
      expect(HEALTH_MANAGEMENT).not.toContain('healthRemoved');
    });

    it('marks health as read-only output context', () => {
      expect(HEALTH_MANAGEMENT).toContain('read-only context');
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

    it('documents creative output fields and read-only context', () => {
      expect(FIELD_SEPARATION).toContain('CREATIVE OUTPUT FIELDS');
      expect(FIELD_SEPARATION).toContain('protagonistAffect');
      expect(FIELD_SEPARATION).toContain('READ-ONLY CONTEXT');
      expect(FIELD_SEPARATION).not.toContain('FORBIDDEN OUTPUT FIELDS');
    });
  });
});
