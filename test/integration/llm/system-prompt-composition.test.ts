/**
 * Integration tests for system prompt composition.
 * These tests verify that buildSystemPrompt() and buildStructureSystemPrompt()
 * include all required sections and handle options correctly.
 *
 * Written BEFORE refactoring as regression protection.
 */

import {
  buildSystemPrompt,
  buildStructureSystemPrompt,
  SYSTEM_PROMPT,
  STRUCTURE_SYSTEM_PROMPT,
  STRICT_CHOICE_GUIDELINES,
  COT_SYSTEM_ADDITION,
} from '../../../src/llm/prompts/system-prompt.js';
import { CONTENT_POLICY } from '../../../src/llm/content-policy.js';

describe('buildSystemPrompt composition', () => {
  describe('section presence', () => {
    it('includes STORYTELLING GUIDELINES section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('STORYTELLING GUIDELINES:');
      expect(prompt).toContain('Write vivid, evocative prose');
      expect(prompt).toContain('Use second person perspective');
    });

    it('includes CONTINUITY RULES section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('CONTINUITY RULES:');
      expect(prompt).toContain('Do NOT contradict Established World Facts');
      expect(prompt).toContain('newCanonFacts or newCharacterCanonFacts');
    });

    it('includes ACTIVE STATE TRACKING section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('ACTIVE STATE TRACKING');
      expect(prompt).toContain('currentLocation');
      expect(prompt).toContain('THREAT_IDENTIFIER');
      expect(prompt).toContain('CONSTRAINT_IDENTIFIER');
      expect(prompt).toContain('THREAD_IDENTIFIER');
    });

    it('explains prefix-only removal protocol', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('ONLY the prefix');
      expect(prompt).toContain('threatsRemoved');
    });

    it('includes INVENTORY MANAGEMENT section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('INVENTORY MANAGEMENT:');
      expect(prompt).toContain('inventoryAdded');
      expect(prompt).toContain('inventoryRemoved');
    });

    it('includes HEALTH MANAGEMENT section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('HEALTH MANAGEMENT:');
      expect(prompt).toContain('healthAdded');
      expect(prompt).toContain('healthRemoved');
    });

    it('includes FIELD SEPARATION section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('FIELD SEPARATION (CRITICAL):');
      expect(prompt).toContain('INVENTORY');
      expect(prompt).toContain('HEALTH');
      expect(prompt).toContain('ACTIVE STATE');
      expect(prompt).toContain('PREFIX_ID: Description');
      expect(prompt).toContain('PROTAGONIST AFFECT');
      expect(prompt).toContain('WORLD FACTS');
      expect(prompt).toContain('CHARACTER CANON');
    });

    it('includes CHARACTER CANON vs CHARACTER STATE section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('CHARACTER CANON vs CHARACTER STATE (CRITICAL DISTINCTION):');
      expect(prompt).toContain('newCharacterCanonFacts');
      expect(prompt).toContain('characterStateChangesAdded');
    });

    it('includes PROTAGONIST AFFECT section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('PROTAGONIST AFFECT (EMOTIONAL STATE SNAPSHOT):');
      expect(prompt).toContain('primaryEmotion');
      expect(prompt).toContain('primaryIntensity');
      expect(prompt).toContain('protagonistAffect');
    });

    it('includes ACTIVE STATE QUALITY CRITERIA section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('ACTIVE STATE QUALITY CRITERIA (CRITICAL):');
      expect(prompt).toContain('GOOD THREATS');
      expect(prompt).toContain('BAD THREATS');
      expect(prompt).toContain('GOOD CONSTRAINTS');
      expect(prompt).toContain('GOOD THREADS');
      expect(prompt).toContain('REMOVAL QUALITY');
    });

    it('includes CANON QUALITY CRITERIA section', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('CANON QUALITY CRITERIA (CRITICAL):');
      expect(prompt).toContain('GOOD WORLD CANON');
      expect(prompt).toContain('BAD WORLD CANON');
      expect(prompt).toContain('GOOD CHARACTER CANON');
      expect(prompt).toContain('BAD CHARACTER CANON');
    });

    it('includes ending guidelines', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('When writing endings');
      expect(prompt).toContain('Make the ending feel earned');
      expect(prompt).toContain('Leave no choices when the story concludes');
    });

    it('includes CONTENT_POLICY', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain(CONTENT_POLICY);
      expect(prompt).toContain('CONTENT GUIDELINES:');
      expect(prompt).toContain('NC-21 (ADULTS ONLY)');
    });

    it('includes storyteller introduction', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('expert interactive fiction storyteller');
      expect(prompt).toContain('Dungeon Master');
    });
  });

  describe('options handling', () => {
    it('adds STRICT_CHOICE_GUIDELINES when choiceGuidance: strict', () => {
      const prompt = buildSystemPrompt({ choiceGuidance: 'strict' });
      expect(prompt).toContain('CHOICE REQUIREMENTS (CRITICAL):');
      expect(prompt).toContain('IN-CHARACTER');
      expect(prompt).toContain('CONSEQUENTIAL');
      expect(prompt).toContain('DIVERGENT');
      expect(prompt).toContain('DIVERGENCE ENFORCEMENT');
      expect(prompt).toContain('FORBIDDEN CHOICE PATTERNS');
    });

    it('does NOT add strict guidelines when choiceGuidance: basic', () => {
      const prompt = buildSystemPrompt({ choiceGuidance: 'basic' });
      expect(prompt).not.toContain('CHOICE REQUIREMENTS (CRITICAL):');
      expect(prompt).not.toContain('DIVERGENCE ENFORCEMENT');
    });

    it('does NOT add strict guidelines when choiceGuidance is undefined', () => {
      const prompt = buildSystemPrompt({});
      expect(prompt).not.toContain('CHOICE REQUIREMENTS (CRITICAL):');
    });

    it('adds COT_SYSTEM_ADDITION when enableChainOfThought: true', () => {
      const prompt = buildSystemPrompt({ enableChainOfThought: true });
      expect(prompt).toContain('REASONING PROCESS:');
      expect(prompt).toContain('<thinking>');
      expect(prompt).toContain('<output>');
      expect(prompt).toContain('Consider character motivations');
    });

    it('does NOT add CoT when enableChainOfThought: false', () => {
      const prompt = buildSystemPrompt({ enableChainOfThought: false });
      expect(prompt).not.toContain('REASONING PROCESS:');
      expect(prompt).not.toContain('<thinking>');
    });

    it('does NOT add CoT when enableChainOfThought is undefined', () => {
      const prompt = buildSystemPrompt({});
      expect(prompt).not.toContain('REASONING PROCESS:');
    });

    it('combines both options correctly', () => {
      const prompt = buildSystemPrompt({
        choiceGuidance: 'strict',
        enableChainOfThought: true,
      });
      // Has strict choice guidelines
      expect(prompt).toContain('CHOICE REQUIREMENTS (CRITICAL):');
      expect(prompt).toContain('DIVERGENCE ENFORCEMENT');
      // And has CoT
      expect(prompt).toContain('REASONING PROCESS:');
      expect(prompt).toContain('<thinking>');
      // In correct order (strict first, then CoT)
      const strictIndex = prompt.indexOf('CHOICE REQUIREMENTS (CRITICAL):');
      const cotIndex = prompt.indexOf('REASONING PROCESS:');
      expect(strictIndex).toBeLessThan(cotIndex);
    });
  });

  describe('exported constants', () => {
    it('exports SYSTEM_PROMPT constant matching buildSystemPrompt() with no options', () => {
      expect(SYSTEM_PROMPT).toBe(buildSystemPrompt());
    });

    it('exports STRICT_CHOICE_GUIDELINES constant', () => {
      expect(STRICT_CHOICE_GUIDELINES).toContain('CHOICE REQUIREMENTS (CRITICAL):');
      expect(typeof STRICT_CHOICE_GUIDELINES).toBe('string');
    });

    it('exports COT_SYSTEM_ADDITION constant', () => {
      expect(COT_SYSTEM_ADDITION).toContain('REASONING PROCESS:');
      expect(typeof COT_SYSTEM_ADDITION).toBe('string');
    });
  });
});

describe('buildStructureSystemPrompt composition', () => {
  describe('section presence', () => {
    it('includes CONTENT_POLICY', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).toContain(CONTENT_POLICY);
      expect(prompt).toContain('NC-21 (ADULTS ONLY)');
    });

    it('includes STRUCTURE DESIGN GUIDELINES', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).toContain('STRUCTURE DESIGN GUIDELINES:');
      expect(prompt).toContain('three-act dramatic structures');
      expect(prompt).toContain('flexible milestones');
    });

    it('includes structure-specific introduction', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).toContain('expert interactive fiction storyteller');
      expect(prompt).toContain('story structure and dramatic arc design');
    });
  });

  describe('section exclusions', () => {
    it('does NOT include active state tracking sections', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).not.toContain('ACTIVE STATE TRACKING');
      expect(prompt).not.toContain('threatsAdded');
    });

    it('does NOT include inventory management', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).not.toContain('INVENTORY MANAGEMENT:');
    });

    it('does NOT include health management', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).not.toContain('HEALTH MANAGEMENT:');
    });

    it('does NOT include choice requirements from STRICT_CHOICE_GUIDELINES', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).not.toContain('CHOICE REQUIREMENTS (CRITICAL):');
    });
  });

  describe('options handling', () => {
    it('adds CoT reasoning when enableChainOfThought: true', () => {
      const prompt = buildStructureSystemPrompt({ enableChainOfThought: true });
      expect(prompt).toContain('REASONING PROCESS:');
      expect(prompt).toContain('<thinking>');
      expect(prompt).toContain('<output>');
      expect(prompt).toContain('Consider how the character concept drives the story');
    });

    it('does NOT add CoT when enableChainOfThought: false', () => {
      const prompt = buildStructureSystemPrompt({ enableChainOfThought: false });
      expect(prompt).not.toContain('REASONING PROCESS:');
      expect(prompt).not.toContain('<thinking>');
    });

    it('does NOT add CoT when enableChainOfThought is undefined', () => {
      const prompt = buildStructureSystemPrompt({});
      expect(prompt).not.toContain('REASONING PROCESS:');
    });
  });

  describe('exported constants', () => {
    it('exports STRUCTURE_SYSTEM_PROMPT constant matching buildStructureSystemPrompt() with no options', () => {
      expect(STRUCTURE_SYSTEM_PROMPT).toBe(buildStructureSystemPrompt());
    });
  });
});
