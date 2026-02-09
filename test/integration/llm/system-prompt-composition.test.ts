/**
 * Integration tests for the full prompt composition pipeline.
 * Verifies that system prompts (creative only) and data rules (user message)
 * include all required sections and handle options correctly.
 */

import {
  buildOpeningSystemPrompt,
  buildContinuationSystemPrompt,
  composeCreativeSystemPrompt,
  composeOpeningDataRules,
  composeContinuationDataRules,
  buildStructureSystemPrompt,
  STRUCTURE_SYSTEM_PROMPT,
  STRICT_CHOICE_GUIDELINES,
} from '../../../src/llm/prompts/system-prompt.js';
import { CONTENT_POLICY } from '../../../src/llm/content-policy.js';

describe('creative system prompt composition', () => {
  describe('section presence', () => {
    it('includes STORYTELLING GUIDELINES section', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).toContain('STORYTELLING GUIDELINES:');
      expect(prompt).toContain('Write vivid, evocative prose');
      expect(prompt).toContain('Use second person perspective');
    });

    it('includes ending guidelines', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).toContain('When writing endings');
      expect(prompt).toContain('Make the ending feel earned');
      expect(prompt).toContain('Leave no choices when the story concludes');
    });

    it('includes CONTENT_POLICY', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).toContain(CONTENT_POLICY);
      expect(prompt).toContain('CONTENT GUIDELINES:');
      expect(prompt).toContain('NC-21 (ADULTS ONLY)');
    });

    it('includes storyteller introduction', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).toContain('expert interactive fiction storyteller');
      expect(prompt).toContain('Dungeon Master');
    });
  });

  describe('section exclusions from system prompt', () => {
    it('does NOT include data-schema sections', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).not.toContain('ACTIVE STATE TRACKING');
      expect(prompt).not.toContain('INVENTORY MANAGEMENT:');
      expect(prompt).not.toContain('HEALTH MANAGEMENT:');
      expect(prompt).not.toContain('FIELD SEPARATION:');
      expect(prompt).not.toContain('PROTAGONIST AFFECT (EMOTIONAL STATE SNAPSHOT):');
    });

    it('does NOT include opening-specific sections', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).not.toContain('ESTABLISHMENT RULES (OPENING):');
      expect(prompt).not.toContain('OPENING ACTIVE STATE QUALITY:');
    });

    it('does NOT include continuation-specific sections', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).not.toContain('CONTINUITY RULES (CONTINUATION):');
      expect(prompt).not.toContain('ACTIVE STATE QUALITY CRITERIA:');
    });

    it('does NOT include choice requirements', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).not.toContain('CHOICE REQUIREMENTS:');
      expect(prompt).not.toContain('DIVERGENCE ENFORCEMENT');
    });
  });
});

describe('opening data rules composition', () => {
  describe('shared sections present', () => {
    it('includes ACTIVE STATE TRACKING section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('ACTIVE STATE TRACKING');
      expect(rules).toContain('currentLocation');
      expect(rules).toContain('THREAT_IDENTIFIER');
      expect(rules).toContain('CONSTRAINT_IDENTIFIER');
      expect(rules).toContain('THREAD_IDENTIFIER');
    });

    it('explains prefix-only removal protocol', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('ONLY the prefix');
      expect(rules).toContain('threatsRemoved');
    });

    it('includes INVENTORY MANAGEMENT section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('INVENTORY MANAGEMENT:');
      expect(rules).toContain('inventoryAdded');
      expect(rules).toContain('inventoryRemoved');
    });

    it('includes HEALTH MANAGEMENT section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('HEALTH MANAGEMENT:');
      expect(rules).toContain('healthAdded');
      expect(rules).toContain('healthRemoved');
    });

    it('includes FIELD SEPARATION section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('FIELD SEPARATION:');
      expect(rules).toContain('INVENTORY');
      expect(rules).toContain('HEALTH');
      expect(rules).toContain('ACTIVE STATE');
      expect(rules).toContain('PREFIX_ID: Description');
      expect(rules).toContain('PROTAGONIST AFFECT');
      expect(rules).toContain('WORLD FACTS');
      expect(rules).toContain('CHARACTER CANON');
    });

    it('includes PROTAGONIST AFFECT section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('PROTAGONIST AFFECT (EMOTIONAL STATE SNAPSHOT):');
      expect(rules).toContain('primaryEmotion');
      expect(rules).toContain('primaryIntensity');
      expect(rules).toContain('protagonistAffect');
    });
  });

  describe('opening-specific sections present', () => {
    it('includes ESTABLISHMENT RULES section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('ESTABLISHMENT RULES (OPENING):');
      expect(rules).toContain('CHARACTER CONCEPT FIDELITY:');
    });

    it('includes opening quality criteria', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('OPENING ACTIVE STATE QUALITY:');
      expect(rules).toContain('OPENING CANON QUALITY:');
    });
  });

  describe('options handling', () => {
    it('adds STRICT_CHOICE_GUIDELINES when choiceGuidance: strict', () => {
      const rules = composeOpeningDataRules({ choiceGuidance: 'strict' });
      expect(rules).toContain('CHOICE REQUIREMENTS:');
      expect(rules).toContain('IN-CHARACTER');
      expect(rules).toContain('DIVERGENCE ENFORCEMENT');
    });

    it('does NOT add strict guidelines when choiceGuidance: basic', () => {
      const rules = composeOpeningDataRules({ choiceGuidance: 'basic' });
      expect(rules).not.toContain('CHOICE REQUIREMENTS:');
    });
  });
});

describe('continuation data rules composition', () => {
  describe('shared sections present', () => {
    it('includes ACTIVE STATE TRACKING section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).toContain('ACTIVE STATE TRACKING');
      expect(rules).toContain('currentLocation');
    });

    it('includes INVENTORY and HEALTH MANAGEMENT', () => {
      const rules = composeContinuationDataRules();
      expect(rules).toContain('INVENTORY MANAGEMENT:');
      expect(rules).toContain('HEALTH MANAGEMENT:');
    });
  });

  describe('continuation-specific sections present', () => {
    it('includes CONTINUITY RULES section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).toContain('CONTINUITY RULES (CONTINUATION):');
      expect(rules).toContain('ESTABLISHED WORLD FACTS');
      expect(rules).toContain('newCanonFacts');
    });

    it('includes CHARACTER CANON vs CHARACTER STATE section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).toContain('CHARACTER CANON vs CHARACTER STATE:');
      expect(rules).toContain('newCharacterCanonFacts');
      expect(rules).toContain('characterStateChangesAdded');
    });

    it('includes ACTIVE STATE QUALITY CRITERIA section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).toContain('ACTIVE STATE QUALITY CRITERIA:');
      expect(rules).toContain('GOOD THREATS');
      expect(rules).toContain('BAD THREATS');
      expect(rules).toContain('GOOD CONSTRAINTS');
      expect(rules).toContain('GOOD THREADS');
      expect(rules).toContain('REMOVAL QUALITY');
    });

    it('includes CANON QUALITY CRITERIA section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).toContain('CANON QUALITY CRITERIA:');
      expect(rules).toContain('GOOD WORLD CANON');
      expect(rules).toContain('BAD WORLD CANON');
      expect(rules).toContain('GOOD CHARACTER CANON');
      expect(rules).toContain('BAD CHARACTER CANON');
    });
  });

  describe('options handling', () => {
    it('adds STRICT_CHOICE_GUIDELINES when choiceGuidance: strict', () => {
      const rules = composeContinuationDataRules({ choiceGuidance: 'strict' });
      expect(rules).toContain('CHOICE REQUIREMENTS:');
      expect(rules).toContain('DIVERGENCE ENFORCEMENT');
    });

    it('does NOT add strict guidelines when choiceGuidance: basic', () => {
      const rules = composeContinuationDataRules({ choiceGuidance: 'basic' });
      expect(rules).not.toContain('CHOICE REQUIREMENTS:');
    });
  });
});

describe('build system prompt options', () => {
  it('opening and continuation system prompts are identical', () => {
    expect(buildOpeningSystemPrompt()).toBe(buildContinuationSystemPrompt());
  });
});

describe('exported constants', () => {
  it('exports STRICT_CHOICE_GUIDELINES constant', () => {
    expect(STRICT_CHOICE_GUIDELINES).toContain('CHOICE REQUIREMENTS:');
    expect(typeof STRICT_CHOICE_GUIDELINES).toBe('string');
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

    it('does NOT include choice requirements', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).not.toContain('CHOICE REQUIREMENTS:');
    });
  });

  describe('exported constants', () => {
    it('exports STRUCTURE_SYSTEM_PROMPT constant matching buildStructureSystemPrompt()', () => {
      expect(STRUCTURE_SYSTEM_PROMPT).toBe(buildStructureSystemPrompt());
    });
  });
});
