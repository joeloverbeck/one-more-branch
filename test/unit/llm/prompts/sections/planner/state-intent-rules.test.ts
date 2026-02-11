import {
  PLANNER_OUTPUT_SHAPE_INSTRUCTIONS,
  PLANNER_STATE_INTENT_RULES,
} from '../../../../../../src/llm/prompts/sections/planner/state-intent-rules.js';

describe('planner state-intent rules sections', () => {
  describe('PLANNER_STATE_INTENT_RULES', () => {
    it('is a non-empty string', () => {
      expect(typeof PLANNER_STATE_INTENT_RULES).toBe('string');
      expect(PLANNER_STATE_INTENT_RULES.length).toBeGreaterThan(0);
    });

    it('forbids narrative prose, player choices, and server-assigned IDs', () => {
      expect(PLANNER_STATE_INTENT_RULES).toContain('Do NOT write narrative prose');
      expect(PLANNER_STATE_INTENT_RULES).toContain('Do NOT provide player choices');
      expect(PLANNER_STATE_INTENT_RULES).toContain('Do NOT assign new server IDs');
    });

    it('requires ID references to come from provided continuation context', () => {
      expect(PLANNER_STATE_INTENT_RULES).toContain('removeIds/resolveIds/removeId/resolveId');
      expect(PLANNER_STATE_INTENT_RULES).toContain('provided continuation context');
    });
  });

  describe('PLANNER_OUTPUT_SHAPE_INSTRUCTIONS', () => {
    it('is a non-empty string', () => {
      expect(typeof PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toBe('string');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS.length).toBeGreaterThan(0);
    });

    it('contains required PagePlan top-level fields', () => {
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"sceneIntent"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"continuityAnchors"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"stateIntents"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"writerBrief"');
    });

    it('includes all state intent categories and writer brief keys', () => {
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"threats"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"constraints"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"threads"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"inventory"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"health"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"characterState"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"canon"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"openingLineDirective"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"mustIncludeBeats"');
      expect(PLANNER_OUTPUT_SHAPE_INSTRUCTIONS).toContain('"forbiddenRecaps"');
    });
  });
});
