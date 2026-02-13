/**
 * Unit tests for continuation quality-criteria section module.
 */

import { CONTINUATION_ACTIVE_STATE_QUALITY } from '../../../../../../src/llm/prompts/sections/continuation/continuation-quality-criteria.js';

describe('continuation quality-criteria sections', () => {
  describe('CONTINUATION_ACTIVE_STATE_QUALITY', () => {
    it('is a non-empty string', () => {
      expect(typeof CONTINUATION_ACTIVE_STATE_QUALITY).toBe('string');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY.length).toBeGreaterThan(0);
    });

    it('includes section header', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('ACTIVE STATE QUALITY CRITERIA:');
    });

    it('emphasizes current truth', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('TRUE RIGHT NOW');
    });

    it('includes decision question', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('currently happening');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('immediate situation');
    });

    it('includes GOOD THREATS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('GOOD THREATS');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('threatsAdded');
    });

    it('lists good threat examples in natural language', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('"Two guards patrol the corridor ahead"');
    });

    it('includes BAD THREATS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('BAD THREATS');
    });

    it('includes GOOD CONSTRAINTS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('GOOD CONSTRAINTS');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('constraintsAdded');
    });

    it('lists good constraint examples in natural language', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('"Leg wound slows movement"');
    });

    it('includes BAD CONSTRAINTS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('BAD CONSTRAINTS');
    });

    it('includes GOOD THREADS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('GOOD THREADS');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('threadsAdded');
    });

    it('lists good thread examples in typed object format', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        '{ text: "Open relationship question: Can Mara trust Iven after the checkpoint betrayal?", threadType: "RELATIONSHIP", urgency: "HIGH" }'
      );
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('threadType');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('urgency');
    });

    it('includes BAD THREADS section', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('BAD THREADS');
    });

    it('includes hard dedup and replacement guidance for threads', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('HARD THREAD DEDUP/REFINEMENT RULES');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('do NOT add a reworded duplicate');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('Resolve the prior thread by ID');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('Add exactly one refined successor');
    });

    it('includes threat-vs-danger classification guidance', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('THREAT VS DANGER');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('Immediate scene hazard');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'DANGER thread is only for looming structural risk'
      );
    });

    it('includes REMOVAL QUALITY section for continuation', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('REMOVAL QUALITY');
    });

    it('explains ID-based removal', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('ONLY the server-assigned ID');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('"th-2", "cn-1", "td-3"');
    });

    it('includes explicit thread resolution triggers', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'answered, achieved/abandoned, decided, or rendered moot'
      );
    });

    it('includes inventory direction', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('inventoryAdded/inventoryRemoved');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('✅ Use');
    });

    it('includes health direction', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('healthAdded/healthRemoved');
    });

    it('includes hard threat/constraint dedup rules', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('HARD THREAT/CONSTRAINT DEDUP RULES');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'One entry per distinct concept. Rephrasings, elaborations, and sub-aspects are duplicates.'
      );
    });

    it('includes bad duplicate examples for threats and constraints', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('BAD DUPLICATES');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'Individual interrogations prevent crew coordination'
      );
    });

    it('includes stricter threat classification', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('THREAT CLASSIFICATION (stricter)');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('PHYSICALLY ESCALATE or DIRECTLY HARM');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'STRATEGY, INSTITUTIONAL PROCESS, or FUTURE PLAN'
      );
    });

    it('includes stricter constraint classification', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('CONSTRAINT CLASSIFICATION (stricter)');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'RESTRICTS what the protagonist can PHYSICALLY DO right now'
      );
    });

    it('includes threat/constraint quantity discipline with soft cap', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'THREAT/CONSTRAINT QUANTITY DISCIPLINE'
      );
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('3-8 threats and 3-8 constraints');
    });

    it('includes scene-lifecycle removal triggers', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain('SCENE-LIFECYCLE REMOVAL TRIGGERS');
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'character who was the SOURCE of a threat LEAVES the scene'
      );
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'Scene-specific entries should not outlive their scene context'
      );
    });

    it('includes threat/constraint self-check', () => {
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'THREAT/CONSTRAINT SELF-CHECK (before you finalize JSON)'
      );
      expect(CONTINUATION_ACTIVE_STATE_QUALITY).toContain(
        'Will the total threats exceed 8?'
      );
    });
  });
});
