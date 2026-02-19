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
  STRICT_CHOICE_GUIDELINES,
} from '../../../src/llm/prompts/system-prompt.js';
import { CONTENT_POLICY } from '../../../src/llm/content-policy.js';

describe('creative system prompt composition', () => {
  describe('section presence', () => {
    it('includes STORYTELLING GUIDELINES section', () => {
      const prompt = composeCreativeSystemPrompt();
      expect(prompt).toContain('STORYTELLING GUIDELINES:');
      expect(prompt).toContain('GOLDEN RULE');
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
      expect(prompt).not.toContain('CONTINUITY CONTEXT USAGE');
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
    it('includes CONTINUITY CONTEXT USAGE section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('CONTINUITY CONTEXT USAGE');
      expect(rules).toContain('CURRENT LOCATION');
      expect(rules).toContain('READ-ONLY CONTINUITY INPUT');
      expect(rules).toContain('Show consequences in prose and choices.');
      expect(rules).not.toContain('THREAT_IDENTIFIER');
      expect(rules).not.toContain('CONSTRAINT_IDENTIFIER');
      expect(rules).not.toContain('THREAD_IDENTIFIER');
    });

    it('does not include explicit forbidden-output field lists', () => {
      const rules = composeOpeningDataRules();
      expect(rules).not.toContain('threatsAdded / threatsRemoved');
      expect(rules).not.toContain('constraintsAdded / constraintsRemoved');
      expect(rules).not.toContain('FORBIDDEN OUTPUT FIELDS');
    });

    it('includes INVENTORY MANAGEMENT section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('INVENTORY MANAGEMENT:');
      expect(rules).toContain('read-only context');
      expect(rules).toContain('Use inventory details naturally');
      expect(rules).not.toContain('inventoryAdded');
      expect(rules).not.toContain('inventoryRemoved');
    });

    it('includes HEALTH MANAGEMENT section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('HEALTH MANAGEMENT:');
      expect(rules).toContain('read-only context');
      expect(rules).toContain('Reflect physical limitations');
      expect(rules).not.toContain('healthAdded');
      expect(rules).not.toContain('healthRemoved');
    });

    it('includes FIELD SEPARATION section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).toContain('FIELD SEPARATION:');
      expect(rules).toContain('CREATIVE OUTPUT FIELDS');
      expect(rules).toContain('READ-ONLY CONTEXT');
      expect(rules).not.toContain('FORBIDDEN OUTPUT FIELDS');
      expect(rules).not.toContain('newCanonFacts / newCharacterCanonFacts');
      expect(rules).not.toContain('characterStateChangesAdded / characterStateChangesRemoved');
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
    it('does NOT include ESTABLISHMENT RULES section', () => {
      const rules = composeOpeningDataRules();
      expect(rules).not.toContain('ESTABLISHMENT RULES (OPENING):');
      expect(rules).not.toContain('CHARACTER CONCEPT FIDELITY:');
    });

    it('does NOT include opening quality criteria sections', () => {
      const rules = composeOpeningDataRules();
      expect(rules).not.toContain('OPENING ACTIVE STATE QUALITY:');
      expect(rules).not.toContain('OPENING CANON QUALITY:');
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
    it('includes CONTINUITY CONTEXT USAGE section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).toContain('CONTINUITY CONTEXT USAGE');
      expect(rules).toContain('CURRENT LOCATION');
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
      expect(rules).toContain('Weave them into narrative and sceneSummary naturally.');
      expect(rules).not.toContain('Do NOT output canon/state mutation fields');
    });

    it('includes CHARACTER CANON vs CHARACTER STATE section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).toContain('CHARACTER CANON vs CHARACTER STATE:');
      expect(rules).toContain('read-only prompt context for the writer');
      expect(rules).not.toContain('Use CHARACTER CANON (newCharacterCanonFacts)');
    });

    it('does NOT include ACTIVE STATE QUALITY CRITERIA section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).not.toContain('ACTIVE STATE QUALITY CRITERIA:');
    });

    it('does NOT include CANON QUALITY CRITERIA section', () => {
      const rules = composeContinuationDataRules();
      expect(rules).not.toContain('CANON QUALITY CRITERIA:');
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

  describe('with hasStoryBible: true', () => {
    it('uses bible continuity rules referencing RELEVANT CANON FACTS and SCENE CHARACTERS', () => {
      const rules = composeContinuationDataRules({ hasStoryBible: true });
      expect(rules).toContain('RELEVANT CANON FACTS');
      expect(rules).toContain('SCENE CHARACTERS');
      expect(rules).toContain('CHARACTER PROFILES vs CURRENT STATE');
    });

    it('does NOT include standard continuity headers or CHARACTER CANON vs STATE', () => {
      const rules = composeContinuationDataRules({ hasStoryBible: true });
      expect(rules).not.toContain('ESTABLISHED WORLD FACTS');
      expect(rules).not.toContain('NPC CURRENT STATE');
      expect(rules).not.toContain('CHARACTER CANON vs CHARACTER STATE:');
    });

    it('still includes shared data sections', () => {
      const rules = composeContinuationDataRules({ hasStoryBible: true });
      expect(rules).toContain('CONTINUITY CONTEXT USAGE');
      expect(rules).toContain('INVENTORY MANAGEMENT:');
      expect(rules).toContain('HEALTH MANAGEMENT:');
      expect(rules).toContain('FIELD SEPARATION:');
      expect(rules).toContain('PROTAGONIST AFFECT (EMOTIONAL STATE SNAPSHOT):');
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
      expect(prompt).toContain('dramatic structures (typically three-act)');
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
      expect(prompt).not.toContain('CONTINUITY CONTEXT USAGE');
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

  describe('tone injection', () => {
    it('includes tone block when tone is provided', () => {
      const prompt = buildStructureSystemPrompt('comedic fantasy');
      expect(prompt).toContain('TONE DIRECTIVE:');
      expect(prompt).toContain('Genre/tone: comedic fantasy');
    });

    it('omits tone block when no tone is provided', () => {
      const prompt = buildStructureSystemPrompt();
      expect(prompt).not.toContain('TONE DIRECTIVE:');
    });
  });
});
