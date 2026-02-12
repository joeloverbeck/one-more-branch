/**
 * Unit tests for system prompt composition.
 * Verifies that system prompts contain only creative persona sections
 * and that data rules contain the schema/state sections.
 */

import {
  buildOpeningSystemPrompt,
  buildContinuationSystemPrompt,
  composeCreativeSystemPrompt,
  composeOpeningDataRules,
  composeContinuationDataRules,
} from '../../../../src/llm/prompts/system-prompt.js';

describe('composeCreativeSystemPrompt', () => {
  it('includes storyteller introduction', () => {
    const prompt = composeCreativeSystemPrompt();
    expect(prompt).toContain('expert interactive fiction storyteller');
    expect(prompt).toContain('Dungeon Master');
  });

  it('includes content policy', () => {
    const prompt = composeCreativeSystemPrompt();
    expect(prompt).toContain('CONTENT GUIDELINES:');
    expect(prompt).toContain('NC-21 (ADULTS ONLY)');
  });

  it('includes storytelling guidelines', () => {
    const prompt = composeCreativeSystemPrompt();
    expect(prompt).toContain('STORYTELLING GUIDELINES:');
    expect(prompt).toContain('GOLDEN RULE');
  });

  it('includes ending guidelines', () => {
    const prompt = composeCreativeSystemPrompt();
    expect(prompt).toContain('When writing endings');
    expect(prompt).toContain('Make the ending feel earned');
  });

  it('does NOT include data-schema sections', () => {
    const prompt = composeCreativeSystemPrompt();
    expect(prompt).not.toContain('ACTIVE STATE TRACKING');
    expect(prompt).not.toContain('INVENTORY MANAGEMENT:');
    expect(prompt).not.toContain('HEALTH MANAGEMENT:');
    expect(prompt).not.toContain('FIELD SEPARATION:');
    expect(prompt).not.toContain('PROTAGONIST AFFECT (EMOTIONAL STATE SNAPSHOT):');
    expect(prompt).not.toContain('ESTABLISHMENT RULES');
    expect(prompt).not.toContain('CONTINUITY RULES');
    expect(prompt).not.toContain('CHOICE REQUIREMENTS:');
  });
});

describe('buildOpeningSystemPrompt', () => {
  it('contains creative sections only', () => {
    const prompt = buildOpeningSystemPrompt();
    expect(prompt).toContain('STORYTELLING GUIDELINES:');
    expect(prompt).toContain('When writing endings');
    expect(prompt).not.toContain('ACTIVE STATE TRACKING');
    expect(prompt).not.toContain('INVENTORY MANAGEMENT:');
    expect(prompt).not.toContain('ESTABLISHMENT RULES');
  });

  it('does NOT include strict choice guidelines (they go in data rules now)', () => {
    const prompt = buildOpeningSystemPrompt();
    expect(prompt).not.toContain('CHOICE REQUIREMENTS:');
    expect(prompt).not.toContain('DIVERGENCE ENFORCEMENT');
  });

  it('is identical to buildContinuationSystemPrompt', () => {
    expect(buildOpeningSystemPrompt()).toBe(buildContinuationSystemPrompt());
  });
});

describe('buildContinuationSystemPrompt', () => {
  it('contains creative sections only', () => {
    const prompt = buildContinuationSystemPrompt();
    expect(prompt).toContain('STORYTELLING GUIDELINES:');
    expect(prompt).toContain('When writing endings');
    expect(prompt).not.toContain('ACTIVE STATE TRACKING');
    expect(prompt).not.toContain('CONTINUITY RULES');
    expect(prompt).not.toContain('CANON QUALITY CRITERIA:');
  });

});

describe('composeOpeningDataRules', () => {
  it('includes shared data sections', () => {
    const rules = composeOpeningDataRules();
    expect(rules).toContain('ACTIVE STATE TRACKING');
    expect(rules).toContain('INVENTORY MANAGEMENT:');
    expect(rules).toContain('HEALTH MANAGEMENT:');
    expect(rules).toContain('FIELD SEPARATION:');
    expect(rules).toContain('PROTAGONIST AFFECT (EMOTIONAL STATE SNAPSHOT):');
  });

  it('does NOT include opening-specific sections', () => {
    const rules = composeOpeningDataRules();
    expect(rules).not.toContain('ESTABLISHMENT RULES (OPENING):');
    expect(rules).not.toContain('CHARACTER CONCEPT FIDELITY:');
    expect(rules).not.toContain('OPENING ACTIVE STATE QUALITY:');
    expect(rules).not.toContain('OPENING CANON QUALITY:');
  });

  it('does NOT include continuation-specific sections', () => {
    const rules = composeOpeningDataRules();
    expect(rules).not.toContain('CONTINUITY RULES (CONTINUATION):');
    expect(rules).not.toContain('CHARACTER CANON vs CHARACTER STATE:');
    expect(rules).not.toContain('REMOVAL QUALITY');
  });

  it('includes strict choice guidelines when choiceGuidance is strict', () => {
    const rules = composeOpeningDataRules({ choiceGuidance: 'strict' });
    expect(rules).toContain('CHOICE REQUIREMENTS:');
    expect(rules).toContain('DIVERGENCE ENFORCEMENT');
  });

  it('does NOT include strict choice guidelines when choiceGuidance is basic', () => {
    const rules = composeOpeningDataRules({ choiceGuidance: 'basic' });
    expect(rules).not.toContain('CHOICE REQUIREMENTS:');
  });
});

describe('composeContinuationDataRules', () => {
  it('includes shared data sections', () => {
    const rules = composeContinuationDataRules();
    expect(rules).toContain('ACTIVE STATE TRACKING');
    expect(rules).toContain('INVENTORY MANAGEMENT:');
    expect(rules).toContain('HEALTH MANAGEMENT:');
    expect(rules).toContain('FIELD SEPARATION:');
    expect(rules).toContain('PROTAGONIST AFFECT (EMOTIONAL STATE SNAPSHOT):');
  });

  it('includes continuation-specific sections', () => {
    const rules = composeContinuationDataRules();
    expect(rules).toContain('CONTINUITY RULES (CONTINUATION):');
    expect(rules).toContain('CHARACTER CANON vs CHARACTER STATE:');
    expect(rules).not.toContain('ACTIVE STATE QUALITY CRITERIA:');
    expect(rules).not.toContain('CANON QUALITY CRITERIA:');
  });

  it('does NOT include opening-specific sections', () => {
    const rules = composeContinuationDataRules();
    expect(rules).not.toContain('ESTABLISHMENT RULES (OPENING):');
    expect(rules).not.toContain('OPENING ACTIVE STATE QUALITY:');
    expect(rules).not.toContain('OPENING CANON QUALITY:');
  });

  it('includes strict choice guidelines when choiceGuidance is strict', () => {
    const rules = composeContinuationDataRules({ choiceGuidance: 'strict' });
    expect(rules).toContain('CHOICE REQUIREMENTS:');
    expect(rules).toContain('DIVERGENCE ENFORCEMENT');
  });

  it('does NOT include strict choice guidelines when choiceGuidance is basic', () => {
    const rules = composeContinuationDataRules({ choiceGuidance: 'basic' });
    expect(rules).not.toContain('CHOICE REQUIREMENTS:');
  });

  describe('when hasStoryBible is true', () => {
    it('uses bible continuity rules instead of standard rules', () => {
      const rules = composeContinuationDataRules({ hasStoryBible: true });
      expect(rules).toContain('RELEVANT CANON FACTS');
      expect(rules).toContain('SCENE CHARACTERS');
      expect(rules).toContain('CHARACTER PROFILES vs CURRENT STATE');
    });

    it('does NOT include standard continuity rule headers', () => {
      const rules = composeContinuationDataRules({ hasStoryBible: true });
      expect(rules).not.toContain('ESTABLISHED WORLD FACTS');
      expect(rules).not.toContain('CHARACTER INFORMATION');
      expect(rules).not.toContain('NPC CURRENT STATE');
    });

    it('does NOT include CHARACTER CANON vs CHARACTER STATE section', () => {
      const rules = composeContinuationDataRules({ hasStoryBible: true });
      expect(rules).not.toContain('CHARACTER CANON vs CHARACTER STATE:');
    });

    it('still includes shared data sections', () => {
      const rules = composeContinuationDataRules({ hasStoryBible: true });
      expect(rules).toContain('ACTIVE STATE TRACKING');
      expect(rules).toContain('INVENTORY MANAGEMENT:');
      expect(rules).toContain('HEALTH MANAGEMENT:');
    });

    it('still supports strict choice guidelines', () => {
      const rules = composeContinuationDataRules({ hasStoryBible: true, choiceGuidance: 'strict' });
      expect(rules).toContain('CHOICE REQUIREMENTS:');
    });
  });
});
