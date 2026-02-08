/**
 * Unit tests for system prompt active state content.
 * Verifies that the system prompt includes new active state format instructions
 * and does not include old state format references.
 */

import {
  buildSystemPrompt,
  buildOpeningSystemPrompt,
  buildContinuationSystemPrompt,
} from '../../../../src/llm/prompts/system-prompt.js';

describe('buildSystemPrompt', () => {
  describe('active state tracking section', () => {
    it('includes active state tracking section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('ACTIVE STATE TRACKING');
    });

    it('explains THREAT format', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('THREAT_IDENTIFIER');
      expect(prompt).toMatch(/THREAT_\w+:/);
    });

    it('explains CONSTRAINT format', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('CONSTRAINT_IDENTIFIER');
    });

    it('explains THREAD format', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('THREAD_IDENTIFIER');
    });

    it('explains prefix-only removal', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('ONLY the prefix');
      expect(prompt).toContain('threatsRemoved');
    });

    it('includes currentLocation instruction', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('currentLocation');
    });

    it('provides example output', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toMatch(/"currentLocation":/);
      expect(prompt).toMatch(/"threatsAdded":/);
    });
  });

  describe('old format removal', () => {
    it('does not instruct to use stateChangesAdded', () => {
      const prompt = buildSystemPrompt();
      // The old format instructed to use stateChanges - new format uses threats/constraints/threads
      // stateChangesAdded may still appear in anti-pattern examples (❌) showing what NOT to do
      expect(prompt).not.toContain('Use stateChangesAdded');
      expect(prompt).not.toContain('put in stateChangesAdded');
    });

    it('does not instruct to use stateChangesRemoved', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).not.toContain('Use stateChangesRemoved');
      expect(prompt).not.toContain('put in stateChangesRemoved');
    });

    it('does not include old STATE MANAGEMENT header', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).not.toContain('STATE MANAGEMENT (ADD/REMOVE PATTERN):');
    });

    it('does not include old STATE REMOVAL RULES section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).not.toContain('STATE REMOVAL RULES:');
    });

    it('does not include old STATE CHANGE QUALITY section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).not.toContain('STATE CHANGE QUALITY CRITERIA (CRITICAL):');
    });
  });

  describe('active state quality criteria', () => {
    it('includes ACTIVE STATE QUALITY section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('ACTIVE STATE QUALITY CRITERIA (CRITICAL):');
    });

    it('includes GOOD THREATS examples', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('GOOD THREATS');
    });

    it('includes GOOD CONSTRAINTS examples', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('GOOD CONSTRAINTS');
    });

    it('includes GOOD THREADS examples', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('GOOD THREADS');
    });

    it('includes REMOVAL QUALITY guidance', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('REMOVAL QUALITY');
    });
  });

  describe('field separation', () => {
    it('includes ACTIVE STATE field description', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('ACTIVE STATE');
      expect(prompt).toContain('threatsAdded/threatsRemoved');
      expect(prompt).toContain('constraintsAdded/constraintsRemoved');
      expect(prompt).toContain('threadsAdded/threadsResolved');
    });

    it('mentions PREFIX_ID format', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('PREFIX_ID: Description');
    });
  });

  describe('preserved sections', () => {
    it('still includes inventory management', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('INVENTORY MANAGEMENT:');
      expect(prompt).toContain('inventoryAdded');
      expect(prompt).toContain('inventoryRemoved');
    });

    it('still includes health management', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('HEALTH MANAGEMENT:');
      expect(prompt).toContain('healthAdded');
      expect(prompt).toContain('healthRemoved');
    });

    it('still includes canon quality', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('CANON QUALITY CRITERIA (CRITICAL):');
    });

    it('still includes storytelling guidelines', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('STORYTELLING GUIDELINES:');
    });

    it('still includes continuity rules', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('CONTINUITY RULES (CONTINUATION):');
    });

    it('still includes ending guidelines', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('When writing endings');
    });
  });
});

describe('buildOpeningSystemPrompt', () => {
  describe('establishment rules (opening-specific)', () => {
    it('includes ESTABLISHMENT RULES section', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('ESTABLISHMENT RULES (OPENING):');
    });

    it('includes character concept fidelity', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('CHARACTER CONCEPT FIDELITY');
    });

    it('includes what you establish section', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('WHAT YOU ESTABLISH:');
    });

    it('mentions empty removed arrays', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('removed');
      expect(prompt).toContain('EMPTY');
    });

    it('does NOT contain CONTINUITY RULES', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).not.toContain('CONTINUITY RULES');
    });

    it('does NOT reference Established World Facts header', () => {
      const prompt = buildOpeningSystemPrompt();
      // Opening has no established facts yet, so shouldn't reference them
      expect(prompt).not.toContain('DO NOT CONTRADICT:');
    });
  });

  describe('opening quality criteria', () => {
    it('includes opening-specific active state quality', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('OPENING ACTIVE STATE QUALITY:');
    });

    it('includes opening canon quality', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('OPENING CANON QUALITY:');
    });

    it('mentions initial threats', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('GOOD INITIAL THREATS');
    });
  });

  describe('shared sections preserved', () => {
    it('includes storytelling guidelines', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('STORYTELLING GUIDELINES:');
    });

    it('includes inventory management', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('INVENTORY MANAGEMENT:');
    });

    it('includes health management', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('HEALTH MANAGEMENT:');
    });

    it('includes protagonist affect', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('PROTAGONIST AFFECT');
    });

    it('includes active state tracking', () => {
      const prompt = buildOpeningSystemPrompt();
      expect(prompt).toContain('ACTIVE STATE TRACKING');
    });
  });
});

describe('buildContinuationSystemPrompt', () => {
  describe('continuity rules (continuation-specific)', () => {
    it('includes CONTINUITY RULES section', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('CONTINUITY RULES (CONTINUATION):');
    });

    it('references DO NOT CONTRADICT', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('DO NOT CONTRADICT:');
    });

    it('includes ESTABLISHED WORLD FACTS reference', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('ESTABLISHED WORLD FACTS');
    });

    it('includes CHARACTER INFORMATION reference', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('CHARACTER INFORMATION');
    });

    it('forbids retcons', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('RETCONS ARE FORBIDDEN');
    });

    it('does NOT contain ESTABLISHMENT RULES', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).not.toContain('ESTABLISHMENT RULES (OPENING)');
    });
  });

  describe('continuation quality criteria', () => {
    it('includes active state quality with removal patterns', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('ACTIVE STATE QUALITY CRITERIA');
      expect(prompt).toContain('REMOVAL QUALITY');
    });

    it('includes canon quality', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('CANON QUALITY CRITERIA');
    });
  });

  describe('shared sections preserved', () => {
    it('includes storytelling guidelines', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('STORYTELLING GUIDELINES:');
    });

    it('includes inventory management', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('INVENTORY MANAGEMENT:');
    });

    it('includes health management', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('HEALTH MANAGEMENT:');
    });

    it('includes protagonist affect', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('PROTAGONIST AFFECT');
    });

    it('includes active state tracking', () => {
      const prompt = buildContinuationSystemPrompt();
      expect(prompt).toContain('ACTIVE STATE TRACKING');
    });
  });
});

describe('buildSystemPrompt (deprecated)', () => {
  it('returns same content as buildContinuationSystemPrompt for backward compatibility', () => {
    const deprecated = buildSystemPrompt();
    const continuation = buildContinuationSystemPrompt();
    expect(deprecated).toBe(continuation);
  });
});
