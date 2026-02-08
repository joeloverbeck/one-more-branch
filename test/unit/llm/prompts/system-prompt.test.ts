/**
 * Unit tests for system prompt active state content.
 * Verifies that the system prompt includes new active state format instructions
 * and does not include old state format references.
 */

import { buildSystemPrompt } from '../../../../src/llm/prompts/system-prompt.js';

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
      expect(prompt).toContain('CONTINUITY RULES:');
    });

    it('still includes ending guidelines', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('When writing endings');
    });
  });
});
