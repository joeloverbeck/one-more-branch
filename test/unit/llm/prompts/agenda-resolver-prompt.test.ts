import { buildAgendaResolverPrompt } from '../../../../src/llm/prompts/agenda-resolver-prompt';
import type { AgendaResolverPromptContext } from '../../../../src/llm/prompts/agenda-resolver-prompt';
import { createEmptyActiveState } from '../../../../src/models';
import { createEmptyAccumulatedNpcAgendas } from '../../../../src/models/state/npc-agenda';

function buildMinimalContext(overrides?: Partial<AgendaResolverPromptContext>): AgendaResolverPromptContext {
  return {
    narrative: 'The smuggler confronted Azra in the hallway.',
    sceneSummary: 'A tense confrontation between the protagonist and Azra.',
    npcs: [
      { name: 'Azra', description: 'Ex-military fixer' },
      { name: 'Voss', description: 'Corporate spy' },
    ],
    currentAgendas: createEmptyAccumulatedNpcAgendas(),
    activeState: createEmptyActiveState(),
    ...overrides,
  };
}

describe('buildAgendaResolverPrompt', () => {
  it('returns system and user messages', () => {
    const messages = buildAgendaResolverPrompt(buildMinimalContext());

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes resolver rules in system prompt', () => {
    const messages = buildAgendaResolverPrompt(buildMinimalContext());
    const system = messages[0]?.content ?? '';

    expect(system).toContain('NPC Agenda Resolver');
    expect(system).toContain('materially changed');
    expect(system).toContain('Off-screen NPCs still evolve');
  });

  it('includes NPC definitions in user prompt', () => {
    const messages = buildAgendaResolverPrompt(buildMinimalContext());
    const user = messages[1]?.content ?? '';

    expect(user).toContain('NPC DEFINITIONS');
    expect(user).toContain('Azra');
    expect(user).toContain('Voss');
  });

  it('includes narrative and scene summary in user prompt', () => {
    const messages = buildAgendaResolverPrompt(buildMinimalContext());
    const user = messages[1]?.content ?? '';

    expect(user).toContain('NARRATIVE:');
    expect(user).toContain('The smuggler confronted Azra');
    expect(user).toContain('SCENE SUMMARY:');
    expect(user).toContain('A tense confrontation');
  });

  it('shows (no existing agendas) when agendas are empty', () => {
    const messages = buildAgendaResolverPrompt(buildMinimalContext());
    const user = messages[1]?.content ?? '';

    expect(user).toContain('CURRENT NPC AGENDAS:');
    expect(user).toContain('(no existing agendas)');
  });

  it('includes current agendas when present', () => {
    const context = buildMinimalContext({
      currentAgendas: {
        Azra: {
          npcName: 'Azra',
          currentGoal: 'Escape the city',
          leverage: 'Patrol schedule knowledge',
          fear: 'Capture',
          offScreenBehavior: 'Bribing guards',
        },
      },
    });

    const messages = buildAgendaResolverPrompt(context);
    const user = messages[1]?.content ?? '';

    expect(user).toContain('[Azra]');
    expect(user).toContain('Goal: Escape the city');
    expect(user).toContain('Leverage: Patrol schedule knowledge');
    expect(user).toContain('Fear: Capture');
    expect(user).toContain('Off-screen: Bribing guards');
  });

  it('includes structure context when provided', () => {
    const context = buildMinimalContext({
      structure: {
        overallTheme: 'Survival at any cost',
        premise: 'A smuggler must escape a quarantined city.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        acts: [],
      },
      accumulatedStructureState: {
        currentActIndex: 1,
        currentBeatIndex: 2,
        beatProgressions: [],
        pagesInCurrentBeat: 3,
        pacingNudge: null,
      },
    });

    const messages = buildAgendaResolverPrompt(context);
    const user = messages[1]?.content ?? '';

    expect(user).toContain('STORY STRUCTURE CONTEXT');
    expect(user).toContain('Current Act Index: 1');
    expect(user).toContain('Current Beat Index: 2');
    expect(user).toContain('Overall Theme: Survival at any cost');
  });

  it('omits structure section when no structure is provided', () => {
    const messages = buildAgendaResolverPrompt(buildMinimalContext());
    const user = messages[1]?.content ?? '';

    expect(user).not.toContain('STORY STRUCTURE CONTEXT');
  });

  it('includes active state location and threats when populated', () => {
    const context = buildMinimalContext({
      activeState: {
        currentLocation: 'Dockside warehouse',
        activeThreats: [{ id: 'th-1', text: 'Security drones' }],
        activeConstraints: [],
        openThreads: [],
      },
    });

    const messages = buildAgendaResolverPrompt(context);
    const user = messages[1]?.content ?? '';

    expect(user).toContain('Current Location: Dockside warehouse');
    expect(user).toContain('Active Threats: Security drones');
  });
});
