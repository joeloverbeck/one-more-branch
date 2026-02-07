import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildStructureRewritePrompt } from '../../../../src/llm/prompts/structure-rewrite-prompt';
import type { StructureRewriteContext } from '../../../../src/llm/types';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'user')?.content ?? '';
}

describe('buildStructureRewritePrompt', () => {
  const baseContext: StructureRewriteContext = {
    characterConcept: 'A former royal scout with a forged identity',
    worldbuilding: 'A flooded republic where cities travel on chained barges.',
    tone: 'tactical political thriller',
    completedBeats: [
      {
        actIndex: 0,
        beatIndex: 0,
        beatId: '1.1',
        description: 'Escape the tribunal ambush in the port quarter',
        objective: 'Survive and recover a smuggled ledger',
        resolution: 'You escaped through maintenance sluices with the ledger intact.',
      },
    ],
    narrativeSummary: 'The protagonist has publicly aligned with a rival flotilla.',
    currentActIndex: 1,
    currentBeatIndex: 0,
    deviationReason: 'The prior allies now treat the protagonist as a traitor.',
    originalTheme: 'Duty versus chosen loyalty',
  };

  it('returns system and user messages', () => {
    const messages = buildStructureRewritePrompt(baseContext);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes NC-21 content policy in system prompt', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const system = getSystemMessage(messages);

    expect(system).toContain('NC-21');
    expect(system).toContain(CONTENT_POLICY);
  });

  it('includes key rewrite context in user prompt', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain(baseContext.characterConcept);
    expect(user).toContain(baseContext.worldbuilding);
    expect(user).toContain(baseContext.tone);
    expect(user).toContain(baseContext.originalTheme);
    expect(user).toContain(baseContext.deviationReason);
    expect(user).toContain(baseContext.narrativeSummary);
  });

  it('lists completed beats as canon with act/beat numbering, beat id, and resolution', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('CANON - DO NOT CHANGE');
    expect(user).toContain('Act 1, Beat 1 (1.1)');
    expect(user).toContain('Resolution: You escaped through maintenance sluices with the ledger intact.');
  });

  it('shows explicit None text when no completed beats exist', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        completedBeats: [],
      }),
    );

    expect(user).toContain('None (story is at the beginning)');
  });

  it('uses Act 1 scope when deviation occurs in Act 1', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 0,
      }),
    );

    expect(user).toContain('remaining beats in Act 1, plus all of Acts 2 and 3');
    expect(user).toContain('ACT_1:');
    expect(user).toContain('ACT_2:');
    expect(user).toContain('ACT_3:');
  });

  it('uses Act 2 scope when deviation occurs in Act 2', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('remaining beats in Act 2, plus all of Act 3');
    expect(user).toContain('ACT_2:');
    expect(user).toContain('ACT_3:');
    expect(user).not.toContain('ACT_1:');
  });

  it('uses Act 3-only scope when deviation occurs in Act 3', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 2,
      }),
    );

    expect(user).toContain('remaining beats in Act 3');
    expect(user).toContain('ACT_3:');
    expect(user).not.toContain('ACT_1:');
    expect(user).not.toContain('ACT_2:');
  });

  it('includes required output sections and core act fields', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('REGENERATED_ACTS:');
    expect(user).toContain('THEME_EVOLUTION:');
    expect(user).toContain('NAME:');
    expect(user).toContain('OBJECTIVE:');
    expect(user).toContain('STAKES:');
    expect(user).toContain('ENTRY_CONDITION:');
    expect(user).toContain('BEATS:');
    expect(user).toContain('2-4 beats per act total');
  });

  it('marks preserved beats in the current act as do-not-regenerate instructions', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 0,
      }),
    );

    expect(user).toContain('[PRESERVED BEATS - DO NOT REGENERATE]');
    expect(user).toContain('[NEW BEATS - GENERATE THESE]');
  });
});
