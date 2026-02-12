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
      expect(PLANNER_STATE_INTENT_RULES).toContain('removeIds/resolveIds');
      expect(PLANNER_STATE_INTENT_RULES).toContain('provided continuation context');
      expect(PLANNER_STATE_INTENT_RULES).toContain(
        'characterState.removeIds must correspond to explicit invalidation/resolution in planned events',
      );
      expect(PLANNER_STATE_INTENT_RULES).toContain('There is no replace field');
    });

    it('defines character state persistence behavior across scenes', () => {
      expect(PLANNER_STATE_INTENT_RULES).toContain('STATE PERSISTENCE CONTRACT:');
      expect(PLANNER_STATE_INTENT_RULES).toContain(
        'Default action is to KEEP existing entries (including NPC characterState)',
      );
      expect(PLANNER_STATE_INTENT_RULES).toContain(
        'Do NOT remove an entry just because it is not foregrounded in the next scene',
      );
      expect(PLANNER_STATE_INTENT_RULES).toContain('If uncertain whether a state still holds, keep it');
      expect(PLANNER_STATE_INTENT_RULES).toContain(
        'Moving to a new location or shifting scene focus does NOT by itself justify removing threats, constraints, or threads',
      );
    });

    it('requires removal lifecycles and server-owned IDs for add payloads', () => {
      expect(PLANNER_STATE_INTENT_RULES).toContain('constraints.removeIds: only when');
      expect(PLANNER_STATE_INTENT_RULES).toContain('threats.removeIds: only when');
      expect(PLANNER_STATE_INTENT_RULES).toContain('threads.resolveIds: only when');
      expect(PLANNER_STATE_INTENT_RULES).toContain('Add fields must contain plain text/object content only');
      expect(PLANNER_STATE_INTENT_RULES).toContain('IDs are created by the server');
      expect(PLANNER_STATE_INTENT_RULES).toContain('REMOVAL SELF-CHECK');
    });

    it('defines an explicit urgency rubric and self-check for new threads', () => {
      expect(PLANNER_STATE_INTENT_RULES).toContain('THREAD URGENCY RUBRIC:');
      expect(PLANNER_STATE_INTENT_RULES).toContain(
        'Default urgency to MEDIUM unless there is clear evidence for LOW or HIGH',
      );
      expect(PLANNER_STATE_INTENT_RULES).toContain(
        'Do NOT map threadType to fixed urgency (e.g., DANGER is not automatically HIGH)',
      );
      expect(PLANNER_STATE_INTENT_RULES).toContain(
        'Keep HIGH rare: add at most one new HIGH thread per page unless multiple independent crises are explicitly active',
      );
      expect(PLANNER_STATE_INTENT_RULES).toContain('URGENCY SELF-CHECK (before you finalize JSON):');
      expect(PLANNER_STATE_INTENT_RULES).toContain('For each new HIGH thread, verify concrete urgency cues');
    });

    it('does not include inline OUTPUT FORMAT scaffolding', () => {
      expect(PLANNER_STATE_INTENT_RULES).not.toContain('OUTPUT FORMAT:');
      expect(PLANNER_STATE_INTENT_RULES).not.toContain('"sceneIntent"');
    });
  });
});
