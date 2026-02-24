import { ACCOUNTANT_STATE_INTENT_RULES } from '../../../../../../src/llm/prompts/sections/planner/state-intent-rules.js';

describe('accountant state-intent rules sections', () => {
  describe('ACCOUNTANT_STATE_INTENT_RULES', () => {
    it('is a non-empty string', () => {
      expect(typeof ACCOUNTANT_STATE_INTENT_RULES).toBe('string');
      expect(ACCOUNTANT_STATE_INTENT_RULES.length).toBeGreaterThan(0);
    });

    it('uses STATE ACCOUNTANT header, not PLANNER', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('STATE ACCOUNTANT RULES:');
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('PLANNER RULES:');
    });

    it('forbids narrative prose, player choices, and server-assigned IDs', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('Do NOT write narrative prose');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('Do NOT provide player choices');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('Do NOT assign new server IDs');
    });

    it('does not contain planner-only instructions', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('Decide immediate scene direction as sceneIntent');
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('Propose continuityAnchors');
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('Provide writerBrief guidance');
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('CHOICE INTENT RULES');
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('choiceIntents');
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('dramaticQuestion');
    });

    it('requires ID references to come from provided continuation context', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('removeIds/resolveIds');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('provided continuation context');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'characterState.removeIds must correspond to explicit invalidation/resolution in planned events'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('There is no replace field');
    });

    it('defines character state persistence behavior across scenes', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('STATE PERSISTENCE CONTRACT:');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'Default action is to KEEP existing entries (including NPC characterState)'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'Do NOT remove an entry just because it is not foregrounded in the next scene'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'If uncertain whether a state still holds, keep it'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'Moving to a new location or shifting scene focus does NOT by itself justify removing threats, constraints, or threads'
      );
    });

    it('requires removal lifecycles and server-owned IDs for add payloads', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('constraints.removeIds: only when');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('threats.removeIds: only when');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('threads.resolveIds: only when');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'Add fields must contain plain text/object content only'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('IDs are created by the server');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('REMOVAL SELF-CHECK');
    });

    it('defines an explicit urgency rubric and self-check for new threads', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('THREAD URGENCY RUBRIC:');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'Default urgency to MEDIUM unless there is clear evidence for LOW or HIGH'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'Do NOT map threadType to fixed urgency (e.g., DANGER is not automatically HIGH)'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'Keep HIGH rare: add at most one new HIGH thread per page unless multiple independent crises are explicitly active'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'URGENCY SELF-CHECK (before you finalize JSON):'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'For each new HIGH thread, verify concrete urgency cues'
      );
    });

    it('includes canon intent rules distinguishing permanent vs branch-specific facts', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('CANON INTENT RULES:');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('PERMANENT and BRANCH-INDEPENDENT');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('GOOD character canon (canon.characterAdd)');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'BAD character canon (do NOT add - use characterState.add instead)'
      );
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('GOOD world canon (canon.worldAdd)');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('BAD world canon (do NOT add)');
    });

    it('requires three gates for canon admission: permanence, novelty, reusability', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('THREE GATES');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('PERMANENCE');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('NOVELTY');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('REUSABILITY');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('fails ANY gate, do not add it');
    });

    it('enforces discovery scan and quantity guidance against existing canon', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('DISCOVERY SCAN (run before finalizing canon arrays):');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('scan the planned scene for these discovery signals');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('QUANTITY GUIDANCE:');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'One broad fact is better than multiple narrow variants'
      );
    });

    it('includes canon self-check before JSON finalization', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('CANON SELF-CHECK (before you finalize JSON):');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('not a variant of existing character canon');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain('move it to characterState.add instead');
      expect(ACCOUNTANT_STATE_INTENT_RULES).toContain(
        'elaborates on existing canon rather than establishing something new, drop it entirely'
      );
    });

    it('does not include inline OUTPUT FORMAT scaffolding', () => {
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('OUTPUT FORMAT:');
      expect(ACCOUNTANT_STATE_INTENT_RULES).not.toContain('"sceneIntent"');
    });
  });
});
