import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildStructurePrompt } from '../../../../src/llm/prompts/structure-prompt';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'system')?.content ?? '';
}

function getUserMessages(messages: { role: string; content: string }[]): string[] {
  return messages.filter(message => message.role === 'user').map(message => message.content);
}

describe('buildStructurePrompt', () => {
  const baseContext = {
    characterConcept: 'A retired smuggler forced back into one final run',
    worldbuilding: 'An archipelago where each island is ruled by rival tide cults.',
    tone: 'stormy maritime thriller',
  };

  it('returns chat messages with system message first and a user prompt', () => {
    const messages = buildStructurePrompt(baseContext);

    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages.some(message => message.role === 'user')).toBe(true);
  });

  it('includes character concept, worldbuilding, and tone', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain(baseContext.characterConcept);
    expect(lastUser).toContain(baseContext.worldbuilding);
    expect(lastUser).toContain(`TONE/GENRE: ${baseContext.tone}`);
  });

  it('requests exactly 3 acts and 2-4 beats per act', () => {
    const messages = buildStructurePrompt(baseContext);
    const lastUser = getUserMessages(messages).at(-1) ?? '';

    expect(lastUser).toContain('exactly 3 acts');
    expect(lastUser).toContain('2-4 beats');
  });

  it('includes few-shot example when fewShotMode is standard', () => {
    const messages = buildStructurePrompt(baseContext, { fewShotMode: 'standard' });

    expect(messages).toHaveLength(4);
    expect(messages[1]?.role).toBe('user');
    expect(messages[2]?.role).toBe('assistant');
  });

  it('includes few-shot example when fewShotMode is minimal', () => {
    const messages = buildStructurePrompt(baseContext, { fewShotMode: 'minimal' });

    expect(messages).toHaveLength(4);
    expect(messages[1]?.role).toBe('user');
    expect(messages[2]?.role).toBe('assistant');
  });

  it('omits few-shot example when fewShotMode is none', () => {
    const messages = buildStructurePrompt(baseContext, { fewShotMode: 'none' });

    expect(messages).toHaveLength(2);
  });

  it('includes NC-21 content policy in system prompt', () => {
    const messages = buildStructurePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).toContain('NC-21');
    expect(systemMessage).toContain(CONTENT_POLICY);
  });
});
