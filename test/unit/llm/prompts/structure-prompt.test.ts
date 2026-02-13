import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildStructurePrompt } from '../../../../src/llm/prompts/structure-prompt';
import {
  buildContinuationSystemPrompt,
  composeContinuationDataRules,
} from '../../../../src/llm/prompts/system-prompt';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessages(messages: { role: string; content: string }[]): string[] {
  return messages.filter((message) => message.role === 'user').map((message) => message.content);
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
    expect(messages.some((message) => message.role === 'user')).toBe(true);
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

  it('few-shot assistant message includes premise, pacingBudget, beat name, and role fields', () => {
    const messages = buildStructurePrompt(baseContext, { fewShotMode: 'standard' });
    const assistantMessage = messages.find((m) => m.role === 'assistant')?.content ?? '';

    expect(assistantMessage).toContain('"premise"');
    expect(assistantMessage).toContain('"pacingBudget"');
    expect(assistantMessage).toContain('"targetPagesMin"');
    expect(assistantMessage).toContain('"targetPagesMax"');
    expect(assistantMessage).toContain('"name"');
    expect(assistantMessage).toContain('"role"');
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
    characterConcept: 'A retired smuggler forced back into one final run',
    worldbuilding: 'An archipelago where each island is ruled by rival tide cults.',
    tone: 'stormy maritime thriller',
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
