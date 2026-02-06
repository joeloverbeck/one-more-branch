import { CONTENT_POLICY } from '../../../src/llm/content-policy';
import { buildContinuationPrompt, buildOpeningPrompt } from '../../../src/llm/prompts';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  // Get the last user message (after any few-shot examples)
  const userMessages = messages.filter(message => message.role === 'user');
  return userMessages[userMessages.length - 1]?.content ?? '';
}

describe('buildOpeningPrompt', () => {
  it('should include character concept in user message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'An exiled knight seeking redemption',
      worldbuilding: '',
      tone: 'grim fantasy',
    });

    expect(getUserMessage(messages)).toContain('An exiled knight seeking redemption');
  });

  it('should include content policy in system message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'horror',
    });

    expect(getSystemMessage(messages)).toContain('NC-21');
    expect(getSystemMessage(messages)).toContain(CONTENT_POLICY);
  });

  it('should include worldbuilding if provided', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: 'The city floats above a poisoned sea.',
      tone: 'dark fantasy',
    });

    expect(getUserMessage(messages)).toContain('WORLDBUILDING:');
    expect(getUserMessage(messages)).toContain('poisoned sea');
  });

  it('should NOT include OUTPUT FORMAT instructions', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const system = getSystemMessage(messages);
    expect(system).not.toContain('OUTPUT FORMAT:');
    expect(system).not.toContain('NARRATIVE:');
    expect(system).not.toContain('CHOICES:');
  });

  it('should request story arc determination', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    expect(getUserMessage(messages).toLowerCase()).toContain('story arc');
  });

  it('should include tone in user message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'neo-noir thriller',
    });

    expect(getUserMessage(messages)).toContain('TONE/GENRE: neo-noir thriller');
  });

  it('should return exactly 2 messages (system, user) with no options', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('should return exactly 2 messages with fewShotMode: none', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { fewShotMode: 'none' },
    );

    expect(messages).toHaveLength(2);
  });

  it('should return 4 messages with fewShotMode: minimal (system + example pair + user)', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { fewShotMode: 'minimal' },
    );

    expect(messages).toHaveLength(4);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user'); // example user
    expect(messages[2]?.role).toBe('assistant'); // example assistant
    expect(messages[3]?.role).toBe('user'); // actual prompt
  });

  it('should include strict choice guidelines when choiceGuidance: strict', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { choiceGuidance: 'strict' },
    );

    const system = getSystemMessage(messages);
    expect(system).toContain('CHOICE REQUIREMENTS (CRITICAL)');
    expect(system).toContain('IN-CHARACTER');
    expect(system).toContain('DIVERGENT');
    expect(system).toContain('FORBIDDEN CHOICE PATTERNS');
  });

  it('should NOT include strict choice guidelines when choiceGuidance: basic', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { choiceGuidance: 'basic' },
    );

    const system = getSystemMessage(messages);
    expect(system).not.toContain('CHOICE REQUIREMENTS (CRITICAL)');
  });

  it('should include CoT instructions when enableChainOfThought: true', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { enableChainOfThought: true },
    );

    const system = getSystemMessage(messages);
    expect(system).toContain('REASONING PROCESS');
    expect(system).toContain('<thinking>');
    expect(system).toContain('<output>');
  });

  it('should NOT include CoT instructions when enableChainOfThought: false', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { enableChainOfThought: false },
    );

    const system = getSystemMessage(messages);
    expect(system).not.toContain('REASONING PROCESS');
    expect(system).not.toContain('<thinking>');
  });

  it('should include numbered REQUIREMENTS in user message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const user = getUserMessage(messages);
    expect(user).toContain('REQUIREMENTS (follow ALL)');
    expect(user).toContain('1.');
    expect(user).toContain('2.');
    expect(user).toContain('3.');
    expect(user).toContain('4.');
    expect(user).toContain('5.');
  });
});

describe('buildContinuationPrompt', () => {
  const baseContext = {
    characterConcept: 'A disgraced detective',
    worldbuilding: '',
    tone: 'noir',
    globalCanon: [] as const,
    globalCharacterCanon: {} as const,
    storyArc: null,
    previousNarrative: 'Rain batters the windows while the neon sign flickers overhead.',
    selectedChoice: 'Confront the informant at gunpoint',
    accumulatedState: [] as const,
  };

  it('should include selected choice in user message', () => {
    const messages = buildContinuationPrompt(baseContext);
    expect(getUserMessage(messages)).toContain('Confront the informant at gunpoint');
  });

  it('should include accumulated state when present', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      accumulatedState: ['Broken rib from warehouse fight', 'Lost your badge'],
    });

    const user = getUserMessage(messages);
    expect(user).toContain('CURRENT STATE:');
    expect(user).toContain('Broken rib from warehouse fight');
    expect(user).toContain('Lost your badge');
  });

  it('should include global canon when present', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      globalCanon: ['Mayor Calder controls the city police through blackmail'],
    });

    const user = getUserMessage(messages);
    expect(user).toContain('ESTABLISHED WORLD FACTS:');
    expect(user).toContain('Mayor Calder');
  });

  it('should include character canon when present', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      globalCharacterCanon: {
        'dr cohen': ['Dr. Cohen is a psychiatrist', 'He wears wire-rimmed glasses'],
        'bobby western': ['Bobby is in a coma in Italy'],
      },
    });

    const user = getUserMessage(messages);
    expect(user).toContain('CHARACTER INFORMATION:');
    expect(user).toContain('[dr cohen]');
    expect(user).toContain('Dr. Cohen is a psychiatrist');
    expect(user).toContain('He wears wire-rimmed glasses');
    expect(user).toContain('[bobby western]');
    expect(user).toContain('Bobby is in a coma in Italy');
  });

  it('should include story arc when present', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      storyArc: 'Expose the conspiracy behind your partner’s murder.',
    });

    expect(getUserMessage(messages)).toContain('STORY ARC:');
    expect(getUserMessage(messages)).toContain('Expose the conspiracy');
  });

  it('should include previous narrative', () => {
    const messages = buildContinuationPrompt(baseContext);
    expect(getUserMessage(messages)).toContain('Rain batters the windows');
  });

  it('should include content policy in system message', () => {
    const messages = buildContinuationPrompt(baseContext);
    expect(getSystemMessage(messages)).toContain('NC-21');
    expect(getSystemMessage(messages)).toContain(CONTENT_POLICY);
  });

  it('should NOT include OUTPUT FORMAT instructions', () => {
    const messages = buildContinuationPrompt(baseContext);
    const system = getSystemMessage(messages);

    expect(system).not.toContain('OUTPUT FORMAT:');
    expect(system).not.toContain('NARRATIVE:');
    expect(system).not.toContain('CHOICES:');
  });

  it('should return exactly 2 messages (system, user) with no options', () => {
    const messages = buildContinuationPrompt(baseContext);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('should return 4 messages with fewShotMode: minimal', () => {
    const messages = buildContinuationPrompt(baseContext, { fewShotMode: 'minimal' });

    expect(messages).toHaveLength(4);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user'); // example user
    expect(messages[2]?.role).toBe('assistant'); // example assistant
    expect(messages[3]?.role).toBe('user'); // actual prompt
  });

  it('should return 6 messages with fewShotMode: standard (includes ending example)', () => {
    const messages = buildContinuationPrompt(baseContext, { fewShotMode: 'standard' });

    expect(messages).toHaveLength(6);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user'); // continuation example user
    expect(messages[2]?.role).toBe('assistant'); // continuation example assistant
    expect(messages[3]?.role).toBe('user'); // ending example user
    expect(messages[4]?.role).toBe('assistant'); // ending example assistant
    expect(messages[5]?.role).toBe('user'); // actual prompt
  });

  it('should include numbered REQUIREMENTS in user message', () => {
    const messages = buildContinuationPrompt(baseContext);

    const user = getUserMessage(messages);
    expect(user).toContain('REQUIREMENTS (follow ALL)');
    expect(user).toContain('1.');
    expect(user).toContain('2.');
    expect(user).toContain('3.');
    expect(user).toContain('4.');
    expect(user).toContain('5.');
  });

  it('should not truncate text under maxLength', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: 'A short prior scene.',
    });

    expect(getUserMessage(messages)).toContain('A short prior scene.');
  });

  it('should truncate at sentence boundary when possible', () => {
    const narrative =
      `A${'a'.repeat(1040)}. ` +
      `B${'b'.repeat(1040)}. ` +
      `C${'c'.repeat(1200)} with no terminal punctuation`;
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: narrative,
    });

    const previousSceneLine =
      getUserMessage(messages).split('PREVIOUS SCENE:\n')[1]?.split('\n\nPLAYER')[0] ?? '';

    expect(previousSceneLine.endsWith('.')).toBe(true);
    expect(previousSceneLine.length).toBeLessThanOrEqual(2000);
    expect(previousSceneLine).not.toContain('...');
  });

  it('should add ellipsis when no good boundary found', () => {
    const narrative = 'x'.repeat(2500);
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: narrative,
    });

    const previousSceneLine =
      getUserMessage(messages).split('PREVIOUS SCENE:\n')[1]?.split('\n\nPLAYER')[0] ?? '';

    expect(previousSceneLine.length).toBe(2003);
    expect(previousSceneLine.endsWith('...')).toBe(true);
  });
});
