import {
  buildNpcAgendasSection,
  buildNpcRelationshipsSection,
} from '../../../../../../src/llm/prompts/sections/shared/npc-state-sections';

describe('buildNpcAgendasSection', () => {
  it('returns empty string when agendas is undefined', () => {
    expect(buildNpcAgendasSection(undefined)).toBe('');
  });

  it('returns empty string when agendas is an empty object', () => {
    expect(buildNpcAgendasSection({})).toBe('');
  });

  it('renders NPC agenda entries', () => {
    const agendas = {
      elena: {
        npcName: 'Elena',
        currentGoal: 'Find the artifact',
        leverage: 'Knowledge of the ruins',
        fear: 'Being abandoned',
        offScreenBehavior: 'Researching ancient texts',
      },
    };

    const result = buildNpcAgendasSection(agendas);

    expect(result).toContain('NPC AGENDAS');
    expect(result).toContain('[Elena]');
    expect(result).toContain('Goal: Find the artifact');
    expect(result).toContain('Leverage: Knowledge of the ruins');
    expect(result).toContain('Fear: Being abandoned');
    expect(result).toContain('Off-screen: Researching ancient texts');
  });

  it('renders multiple NPCs separated by blank lines', () => {
    const agendas = {
      elena: {
        npcName: 'Elena',
        currentGoal: 'Find the artifact',
        leverage: 'Knowledge',
        fear: 'Abandonment',
        offScreenBehavior: 'Researching',
      },
      marcus: {
        npcName: 'Marcus',
        currentGoal: 'Seize power',
        leverage: 'Military force',
        fear: 'Losing control',
        offScreenBehavior: 'Plotting',
      },
    };

    const result = buildNpcAgendasSection(agendas);

    expect(result).toContain('[Elena]');
    expect(result).toContain('[Marcus]');
    expect(result).toContain('Goal: Find the artifact');
    expect(result).toContain('Goal: Seize power');
  });
});

describe('buildNpcRelationshipsSection', () => {
  it('returns empty string when relationships is undefined', () => {
    expect(buildNpcRelationshipsSection(undefined)).toBe('');
  });

  it('returns empty string when relationships is an empty object', () => {
    expect(buildNpcRelationshipsSection({})).toBe('');
  });

  it('renders NPC relationship entries', () => {
    const relationships = {
      elena: {
        npcName: 'Elena',
        valence: 3,
        dynamic: 'ally',
        history: 'Met during the siege.',
        currentTension: 'Disagrees about the plan.',
        leverage: 'Knows the secret.',
      },
    };

    const result = buildNpcRelationshipsSection(relationships);

    expect(result).toContain('NPC-PROTAGONIST RELATIONSHIPS');
    expect(result).toContain('[Elena]');
    expect(result).toContain('Dynamic: ally | Valence: 3');
    expect(result).toContain('Tension: Disagrees about the plan.');
  });

  it('renders multiple relationships', () => {
    const relationships = {
      elena: {
        npcName: 'Elena',
        valence: 3,
        dynamic: 'ally',
        history: 'Old friends.',
        currentTension: 'Mild disagreement.',
        leverage: 'Trust.',
      },
      marcus: {
        npcName: 'Marcus',
        valence: -2,
        dynamic: 'rival',
        history: 'Bitter enemies.',
        currentTension: 'Open hostility.',
        leverage: 'Fear.',
      },
    };

    const result = buildNpcRelationshipsSection(relationships);

    expect(result).toContain('[Elena]');
    expect(result).toContain('[Marcus]');
    expect(result).toContain('Dynamic: ally | Valence: 3');
    expect(result).toContain('Dynamic: rival | Valence: -2');
  });
});
