import { validateAgendaResolverResponse } from '../../../../src/llm/schemas/agenda-resolver-response-transformer';
import type { Npc } from '../../../../src/models/npc';

const storyNpcs: readonly Npc[] = [
  { name: 'Garak', description: 'A tailor with secrets' },
  { name: 'Kira Nerys', description: 'A fierce major' },
];

describe('validateAgendaResolverResponse', () => {
  it('accepts valid agendas for known NPCs', () => {
    const raw = {
      updatedAgendas: [
        {
          npcName: 'Garak',
          currentGoal: 'Escape the station',
          leverage: 'Knows the codes',
          fear: 'Being caught',
          offScreenBehavior: 'Packing supplies',
        },
      ],
    };

    const result = validateAgendaResolverResponse(raw, '{}', storyNpcs);
    expect(result.updatedAgendas).toHaveLength(1);
    expect(result.updatedAgendas[0].npcName).toBe('Garak');
  });

  it('filters out agendas for unknown NPCs', () => {
    const raw = {
      updatedAgendas: [
        {
          npcName: 'Unknown Character',
          currentGoal: 'Mystery',
          leverage: 'None',
          fear: 'None',
          offScreenBehavior: 'Nothing',
        },
        {
          npcName: 'Garak',
          currentGoal: 'Real goal',
          leverage: 'Real leverage',
          fear: 'Real fear',
          offScreenBehavior: 'Real behavior',
        },
      ],
    };

    const result = validateAgendaResolverResponse(raw, '{}', storyNpcs);
    expect(result.updatedAgendas).toHaveLength(1);
    expect(result.updatedAgendas[0].npcName).toBe('Garak');
  });

  it('matches NPC names case-insensitively', () => {
    const raw = {
      updatedAgendas: [
        {
          npcName: 'garak',
          currentGoal: 'Goal',
          leverage: 'Lev',
          fear: 'Fear',
          offScreenBehavior: 'Behavior',
        },
        {
          npcName: 'KIRA NERYS',
          currentGoal: 'Goal',
          leverage: 'Lev',
          fear: 'Fear',
          offScreenBehavior: 'Behavior',
        },
      ],
    };

    const result = validateAgendaResolverResponse(raw, '{}', storyNpcs);
    expect(result.updatedAgendas).toHaveLength(2);
  });

  it('trims whitespace from all fields', () => {
    const raw = {
      updatedAgendas: [
        {
          npcName: '  Garak  ',
          currentGoal: '  Goal  ',
          leverage: '  Lev  ',
          fear: '  Fear  ',
          offScreenBehavior: '  Behavior  ',
        },
      ],
    };

    const result = validateAgendaResolverResponse(raw, '{}', storyNpcs);
    expect(result.updatedAgendas[0].npcName).toBe('Garak');
    expect(result.updatedAgendas[0].currentGoal).toBe('Goal');
  });

  it('skips entries with missing required fields', () => {
    const raw = {
      updatedAgendas: [
        {
          npcName: 'Garak',
          currentGoal: 'Goal',
          // missing leverage, fear, offScreenBehavior
        },
        {
          npcName: 'Kira Nerys',
          currentGoal: 'Goal',
          leverage: 'Lev',
          fear: 'Fear',
          offScreenBehavior: 'Behavior',
        },
      ],
    };

    const result = validateAgendaResolverResponse(raw, '{}', storyNpcs);
    expect(result.updatedAgendas).toHaveLength(1);
    expect(result.updatedAgendas[0].npcName).toBe('Kira Nerys');
  });

  it('skips non-object entries in the array', () => {
    const raw = {
      updatedAgendas: [
        null,
        42,
        'string',
        { npcName: 'Garak', currentGoal: 'G', leverage: 'L', fear: 'F', offScreenBehavior: 'B' },
      ],
    };

    const result = validateAgendaResolverResponse(raw, '{}', storyNpcs);
    expect(result.updatedAgendas).toHaveLength(1);
  });

  it('throws on non-object response', () => {
    expect(() => validateAgendaResolverResponse('not an object', '{}', storyNpcs)).toThrow();
  });

  it('throws when updatedAgendas is not an array', () => {
    expect(() =>
      validateAgendaResolverResponse({ updatedAgendas: 'not an array' }, '{}', storyNpcs)
    ).toThrow();
  });

  it('parses string input as JSON', () => {
    const jsonStr = JSON.stringify({
      updatedAgendas: [
        {
          npcName: 'Garak',
          currentGoal: 'Goal',
          leverage: 'Lev',
          fear: 'Fear',
          offScreenBehavior: 'Behavior',
        },
      ],
    });

    const result = validateAgendaResolverResponse(jsonStr, '{}', storyNpcs);
    expect(result.updatedAgendas).toHaveLength(1);
  });

  it('returns empty array when no valid agendas', () => {
    const raw = {
      updatedAgendas: [
        {
          npcName: 'Nobody',
          currentGoal: 'G',
          leverage: 'L',
          fear: 'F',
          offScreenBehavior: 'B',
        },
      ],
    };

    const result = validateAgendaResolverResponse(raw, '{}', storyNpcs);
    expect(result.updatedAgendas).toHaveLength(0);
  });
});
