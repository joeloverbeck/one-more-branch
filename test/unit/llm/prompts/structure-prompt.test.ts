import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import {
  buildDirectionalGuidanceSection,
  buildStructurePrompt,
} from '../../../../src/llm/prompts/structure-prompt';
import {
  buildContinuationSystemPrompt,
  composeContinuationDataRules,
} from '../../../../src/llm/prompts/system-prompt';
import type { StoryKernel } from '../../../../src/models/story-kernel';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessages(messages: { role: string; content: string }[]): string[] {
  return messages.filter((message) => message.role === 'user').map((message) => message.content);
}

describe('buildStructurePrompt', () => {
  const baseContext = {
    tone: 'stormy maritime thriller',
    decomposedCharacters: [] as import('../../../../src/models/decomposed-character').DecomposedCharacter[],
    decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'An archipelago where each island is ruled by rival tide cults.', scope: 'global' }], rawWorldbuilding: 'An archipelago where each island is ruled by rival tide cults.' },
  };

  it('returns chat messages with system message first and a user prompt', () => {
    const messages = buildStructurePrompt(baseContext);

    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages.some((message) => message.role === 'user')).toBe(true);
  });

  it('includes worldbuilding and tone but not CHARACTER CONCEPT', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('archipelago');
    expect(lastUser).toContain(`TONE/GENRE: ${baseContext.tone}`);
    expect(lastUser).not.toContain('CHARACTER CONCEPT:');
  });

  it('includes decomposed character profiles when provided', () => {
    const contextWithChars = {
      ...baseContext,
      decomposedCharacters: [
        {
          name: 'Kael',
          speechFingerprint: {
            catchphrases: [],
            vocabularyProfile: 'terse',
            sentencePatterns: 'short declaratives',
            verbalTics: [],
            dialogueSamples: [],
            metaphorFrames: 'nautical',
            antiExamples: [],
            discourseMarkers: [],
            registerShifts: 'none',
          },
          coreTraits: ['cunning', 'loyal'],
          motivations: 'Redemption through one last run',
          protagonistRelationship: null,
          knowledgeBoundaries: 'Knows the outer islands',
          decisionPattern: 'Risk-averse unless cornered',
          coreBeliefs: ['The sea provides'],
          conflictPriority: 'survival',
          appearance: 'Tall and weathered',
          rawDescription: 'A retired smuggler',
        },
      ],
    };
    const messages = buildStructurePrompt(contextWithChars);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('CHARACTERS (decomposed profiles)');
    expect(lastUser).toContain('Kael');
  });

  it('requests 3-5 acts and 2-4 beats per act', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('3-5 acts');
    expect(lastUser).toContain('2-4 beats');
  });

  it('includes NC-21 content policy in system prompt', () => {
    const messages = buildStructurePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).toContain('NC-21');
    expect(systemMessage).toContain(CONTENT_POLICY);
  });

  it('contains dramatic role guidance with all four beat roles', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('setup');
    expect(lastUser).toContain('escalation');
    expect(lastUser).toContain('turning_point');
    expect(lastUser).toContain('resolution');
    expect(lastUser).toContain('dramatic roles');
  });

  it('contains premise instruction', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('premise');
    expect(lastUser).toContain('1-2 sentence hook');
  });

  it('contains pacing budget instruction', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('pacing budget');
    expect(lastUser).toContain('targetPagesMin');
    expect(lastUser).toContain('targetPagesMax');
  });

  it('OUTPUT SHAPE includes premise, pacingBudget, beat name, and beat role', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('OUTPUT SHAPE');
    expect(lastUser).toContain('premise: string');
    expect(lastUser).toContain('pacingBudget:');
    expect(lastUser).toContain('name: short evocative beat title');
    expect(lastUser).toContain('role: "setup" | "escalation" | "turning_point" | "resolution"');
  });
});

describe('buildStructurePrompt - minimal system prompt', () => {
  const baseContext = {
    tone: 'stormy maritime thriller',
    decomposedCharacters: [] as import('../../../../src/models/decomposed-character').DecomposedCharacter[],
    decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'An archipelago where each island is ruled by rival tide cults.', scope: 'global' }], rawWorldbuilding: 'An archipelago where each island is ruled by rival tide cults.' },
  };

  it('does NOT include state management instructions', () => {
    const messages = buildStructurePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).not.toContain('stateChangesAdded');
    expect(systemMessage).not.toContain('stateChangesRemoved');
    expect(systemMessage).not.toContain('inventoryAdded');
    expect(systemMessage).not.toContain('inventoryRemoved');
    expect(systemMessage).not.toContain('healthAdded');
    expect(systemMessage).not.toContain('healthRemoved');
    expect(systemMessage).not.toContain('characterStateChangesAdded');
  });

  it('does NOT include choice requirements', () => {
    const messages = buildStructurePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).not.toContain('CHOICE REQUIREMENTS');
    expect(systemMessage).not.toContain('DIVERGENCE ENFORCEMENT');
    expect(systemMessage).not.toContain('FORBIDDEN CHOICE PATTERNS');
  });

  it('is significantly shorter than the full narrative prompt (system + data rules)', () => {
    const messages = buildStructurePrompt(baseContext);
    const structureSystemPrompt = getSystemMessage(messages);
    const fullNarrativePrompt = buildContinuationSystemPrompt() + composeContinuationDataRules();

    // Structure prompt should be at most 40% the size of full narrative prompt
    expect(structureSystemPrompt.length).toBeLessThan(fullNarrativePrompt.length * 0.4);
  });

  it('includes structure-specific guidelines', () => {
    const messages = buildStructurePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).toContain('three-act');
    expect(systemMessage).toContain('beats');
    expect(systemMessage).toContain('stakes');
  });
});

describe('buildDirectionalGuidanceSection', () => {
  const makeKernel = (direction: StoryKernel['directionOfChange']): StoryKernel => ({
    dramaticThesis: 'Power corrupts',
    valueAtStake: 'integrity',
    opposingForce: 'ambition',
    directionOfChange: direction,
    thematicQuestion: 'Can integrity survive ambition?',
  });

  it('returns generic guidance when no kernel is provided', () => {
    const result = buildDirectionalGuidanceSection(undefined);

    expect(result).toContain('impossible choice or sacrifice');
    expect(result).not.toContain('triumph');
    expect(result).not.toContain('Pyrrhic');
  });

  it('returns POSITIVE guidance emphasizing triumph through growth', () => {
    const result = buildDirectionalGuidanceSection(makeKernel('POSITIVE'));

    expect(result).toContain('supreme test');
    expect(result).toContain('triumph through sacrifice or growth');
    expect(result).toContain('consummate the victory');
  });

  it('returns NEGATIVE guidance emphasizing the protagonist\'s fall', () => {
    const result = buildDirectionalGuidanceSection(makeKernel('NEGATIVE'));

    expect(result).toContain('trap');
    expect(result).toContain('compromise or defeat');
    expect(result).toContain('consummate the fall');
  });

  it('returns IRONIC guidance emphasizing Pyrrhic victory', () => {
    const result = buildDirectionalGuidanceSection(makeKernel('IRONIC'));

    expect(result).toContain('Pyrrhic crossroads');
    expect(result).toContain('costs something essential');
    expect(result).toContain('hollow or bittersweet');
  });

  it('returns AMBIGUOUS guidance emphasizing open questions', () => {
    const result = buildDirectionalGuidanceSection(makeKernel('AMBIGUOUS'));

    expect(result).toContain('open question');
    expect(result).toContain('genuinely uncertain');
    expect(result).toContain('dramatic question resonating');
  });

  it('all directions include turning_point beat reference', () => {
    for (const direction of ['POSITIVE', 'NEGATIVE', 'IRONIC', 'AMBIGUOUS'] as const) {
      const result = buildDirectionalGuidanceSection(makeKernel(direction));

      expect(result).toContain('turning_point');
      expect(result).toContain('crisis');
    }
  });
});

describe('buildStructurePrompt - directional guidance integration', () => {
  const baseContext = {
    tone: 'dark fantasy',
    decomposedCharacters: [] as import('../../../../src/models/decomposed-character').DecomposedCharacter[],
    decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'A cursed kingdom.', scope: 'global' }], rawWorldbuilding: 'A cursed kingdom.' },
  };

  const kernel: StoryKernel = {
    dramaticThesis: 'Power corrupts',
    valueAtStake: 'integrity',
    opposingForce: 'ambition',
    directionOfChange: 'NEGATIVE',
    thematicQuestion: 'Can integrity survive ambition?',
  };

  it('uses generic guidance when no kernel is provided', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('impossible choice or sacrifice');
  });

  it('uses direction-specific guidance when kernel is provided', () => {
    const messages = buildStructurePrompt({ ...baseContext, storyKernel: kernel });
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('consummate the fall');
    expect(lastUser).not.toContain('impossible choice or sacrifice');
  });
});
