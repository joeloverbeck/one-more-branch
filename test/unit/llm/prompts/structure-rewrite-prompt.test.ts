import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildStructureRewritePrompt } from '../../../../src/llm/prompts/structure-rewrite-prompt';
import {
  buildContinuationSystemPrompt,
  composeContinuationDataRules,
} from '../../../../src/llm/prompts/system-prompt';
import type { StructureRewriteContext } from '../../../../src/llm/structure-rewrite-types';
import { buildMinimalDecomposedCharacter, MINIMAL_DECOMPOSED_WORLD } from '../../../fixtures/decomposed';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  // Get the last user message
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages[userMessages.length - 1]?.content ?? '';
}

describe('buildStructureRewritePrompt', () => {
  const baseContext: StructureRewriteContext = {
    tone: 'tactical political thriller',
    decomposedCharacters: [buildMinimalDecomposedCharacter('A former royal scout', { rawDescription: 'A former royal scout with a forged identity' })],
    decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'A flooded republic where cities travel on chained barges.', scope: 'global' }], rawWorldbuilding: 'A flooded republic where cities travel on chained barges.' },
    completedBeats: [
      {
        actIndex: 0,
        beatIndex: 0,
        beatId: '1.1',
        name: 'Sluice Flight',
        description: 'Escape the tribunal ambush in the port quarter',
        objective: 'Survive and recover a smuggled ledger',
        role: 'setup',
        resolution: 'You escaped through maintenance sluices with the ledger intact.',
      },
    ],
    plannedBeats: [],
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

    expect(user).toContain('flooded republic');
    expect(user).toContain(baseContext.tone);
    expect(user).toContain(baseContext.originalTheme);
    expect(user).toContain(baseContext.deviationReason);
    expect(user).toContain(baseContext.narrativeSummary);
  });

  it('lists completed beats as canon with act/beat numbering, beat id, role, and resolution', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('CANON - DO NOT CHANGE');
    expect(user).toContain('Act 1, Beat 1 (1.1) [setup] "Sluice Flight"');
    expect(user).toContain(
      'Resolution: You escaped through maintenance sluices with the ledger intact.'
    );
  });

  it('shows explicit None text when no completed beats exist', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        completedBeats: [],
      })
    );

    expect(user).toContain('None (story is at the beginning)');
  });

  it('uses Act 1 scope when deviation occurs in Act 1', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 0,
      })
    );

    expect(user).toContain('remaining beats in Act 1, plus all of Acts 2 and 3');
  });

  it('uses Act 2 scope when deviation occurs in Act 2', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('remaining beats in Act 2, plus all of Act 3');
  });

  it('uses Act 3-only scope when deviation occurs in Act 3', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 2,
      })
    );

    expect(user).toContain('remaining beats in Act 3');
  });

  it('includes JSON-compatible output shape description with premise, pacingBudget, beat name, and role', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    // Now uses JSON output shape matching the schema
    expect(user).toContain('OUTPUT SHAPE');
    expect(user).toContain('overallTheme: string');
    expect(user).toContain('premise: string');
    expect(user).toContain('pacingBudget:');
    expect(user).toContain('targetPagesMin');
    expect(user).toContain('targetPagesMax');
    expect(user).toContain('acts: 3-5 items');
    expect(user).toContain('name: evocative act title');
    expect(user).toContain('objective: main goal for the act');
    expect(user).toContain('stakes: consequence of failure');
    expect(user).toContain('entryCondition:');
    expect(user).toContain('beats: 2-4 items');
    expect(user).toContain('name: short evocative beat title');
    expect(user).toContain('description: what should happen in this beat');
    expect(user).toContain('role: "setup" | "escalation" | "turning_point" | "resolution"');
  });

  it('instructs to preserve completed beats in the output', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 0,
      })
    );

    expect(user).toContain('Preserve completed beats exactly');
    expect(user).toContain('include them in the output');
  });

  it('includes planned beats section when planned beats exist', () => {
    const contextWithPlanned: StructureRewriteContext = {
      ...baseContext,
      plannedBeats: [
        {
          actIndex: 1,
          beatIndex: 1,
          beatId: '2.2',
          name: 'Betrayal Revealed',
          description: 'A hidden betrayal comes to light',
          objective: 'Confront the traitor and decide their fate',
          role: 'turning_point',
        },
        {
          actIndex: 2,
          beatIndex: 0,
          beatId: '3.1',
          name: 'Final Gambit',
          description: 'The last move before everything changes',
          objective: 'Set up the endgame',
          role: 'escalation',
        },
      ],
    };
    const user = getUserMessage(buildStructureRewritePrompt(contextWithPlanned));

    expect(user).toContain('ORIGINALLY PLANNED BEATS (REFERENCE - NOT BINDING)');
    expect(user).toContain('Act 2, Beat 2 (2.2) [turning_point] "Betrayal Revealed"');
    expect(user).toContain('Confront the traitor and decide their fate');
    expect(user).toContain('Act 3, Beat 1 (3.1) [escalation] "Final Gambit"');
  });

  it('omits planned beats section when no planned beats exist', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).not.toContain('ORIGINALLY PLANNED BEATS');
  });

  it('places planned beats section between completed beats and current situation', () => {
    const contextWithPlanned: StructureRewriteContext = {
      ...baseContext,
      plannedBeats: [
        {
          actIndex: 2,
          beatIndex: 0,
          beatId: '3.1',
          name: 'Endgame',
          description: 'The final confrontation',
          objective: 'Resolve the conflict',
          role: 'resolution',
        },
      ],
    };
    const user = getUserMessage(buildStructureRewritePrompt(contextWithPlanned));

    const canonIndex = user.indexOf('CANON - DO NOT CHANGE');
    const plannedIndex = user.indexOf('ORIGINALLY PLANNED BEATS');
    const situationIndex = user.indexOf('CURRENT SITUATION');

    expect(canonIndex).toBeLessThan(plannedIndex);
    expect(plannedIndex).toBeLessThan(situationIndex);
  });
});

describe('buildStructureRewritePrompt - minimal system prompt', () => {
  const baseContext: StructureRewriteContext = {
    tone: 'tactical political thriller',
    decomposedCharacters: [buildMinimalDecomposedCharacter('A former royal scout')],
    decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
    completedBeats: [],
    plannedBeats: [],
    narrativeSummary: 'The protagonist has publicly aligned with a rival flotilla.',
    currentActIndex: 1,
    currentBeatIndex: 0,
    deviationReason: 'The prior allies now treat the protagonist as a traitor.',
    originalTheme: 'Duty versus chosen loyalty',
  };

  it('does NOT include state management instructions', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).not.toContain('stateChangesAdded');
    expect(systemMessage).not.toContain('stateChangesRemoved');
    expect(systemMessage).not.toContain('inventoryAdded');
    expect(systemMessage).not.toContain('inventoryRemoved');
    expect(systemMessage).not.toContain('healthAdded');
    expect(systemMessage).not.toContain('healthRemoved');
  });

  it('does NOT include choice requirements', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).not.toContain('CHOICE REQUIREMENTS');
    expect(systemMessage).not.toContain('DIVERGENCE ENFORCEMENT');
    expect(systemMessage).not.toContain('FORBIDDEN CHOICE PATTERNS');
  });

  it('is significantly shorter than the full narrative prompt (system + data rules)', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const structureSystemPrompt = getSystemMessage(messages);
    const fullNarrativePrompt = buildContinuationSystemPrompt() + composeContinuationDataRules();

    // Structure prompt should be at most 40% the size of full narrative prompt
    expect(structureSystemPrompt.length).toBeLessThan(fullNarrativePrompt.length * 0.4);
  });

  it('includes structure-specific guidelines', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).toContain('three-act');
    expect(systemMessage).toContain('beats');
    expect(systemMessage).toContain('stakes');
  });
});
