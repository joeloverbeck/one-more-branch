import { CONTENT_POLICY } from '../../../src/llm/content-policy';
import { buildContinuationPrompt, buildOpeningPrompt } from '../../../src/llm/prompts';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'user')?.content ?? '';
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

  it('should return exactly 2 messages (system, user)', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });
});

describe('buildContinuationPrompt', () => {
  const baseContext = {
    characterConcept: 'A disgraced detective',
    worldbuilding: '',
    tone: 'noir',
    globalCanon: [] as const,
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

  it('should return exactly 2 messages (system, user)', () => {
    const messages = buildContinuationPrompt(baseContext);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
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
