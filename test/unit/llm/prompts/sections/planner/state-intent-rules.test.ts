import { PLANNER_STATE_INTENT_RULES } from '../../../../../../src/llm/prompts/sections/planner/state-intent-rules.js';

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

    it('does not include inline OUTPUT FORMAT scaffolding', () => {
      expect(PLANNER_STATE_INTENT_RULES).not.toContain('OUTPUT FORMAT:');
      expect(PLANNER_STATE_INTENT_RULES).not.toContain('"sceneIntent"');
    });
  });
});
