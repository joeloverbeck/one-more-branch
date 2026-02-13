import { buildLorekeeperPrompt } from '../../../../src/llm/prompts/lorekeeper-prompt';
import {
  ChoiceType,
  PrimaryDelta,
  createEmptyActiveState,
  parsePageId,
} from '../../../../src/models';
import type { LorekeeperContext } from '../../../../src/llm/context-types';
import type { PagePlan } from '../../../../src/llm/planner-types';

function buildMinimalPagePlan(overrides?: Partial<PagePlan>): PagePlan {
  return {
    sceneIntent: 'Protagonist confronts the merchant',
    continuityAnchors: ['The merchant holds the key'],
    dramaticQuestion: 'Will the protagonist get the key peacefully?',
    writerBrief: {
      openingLineDirective: 'Start with the merchant counting coins',
      mustIncludeBeats: ['Negotiate for the key'],
      forbiddenRecaps: ['Do not repeat the bridge scene'],
    },
    stateIntents: {
      currentLocation: 'Market square',
      threats: { add: [], removeIds: [] },
      constraints: { add: [], removeIds: [] },
      threads: { add: [], resolveIds: [] },
      inventory: { add: [], removeIds: [] },
      health: { add: [], removeIds: [] },
      characterState: { add: [], removeIds: [] },
      canon: { worldAdd: [], characterAdd: [] },
    },
    choiceIntents: [],
    ...overrides,
  };
}

function buildMinimalContext(overrides?: Partial<LorekeeperContext>): LorekeeperContext {
  return {
    characterConcept: 'A wandering healer',
    worldbuilding: 'A war-torn kingdom',
    tone: 'dark fantasy',
    globalCanon: [],
    globalCharacterCanon: {},
    accumulatedCharacterState: {},
    activeState: createEmptyActiveState(),
    ancestorSummaries: [],
    grandparentNarrative: null,
    previousNarrative: 'The protagonist entered the market square.',
    pagePlan: buildMinimalPagePlan(),
    ...overrides,
  };
}

describe('buildLorekeeperPrompt', () => {
  it('returns system and user messages', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes content policy in system prompt', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());

    expect(messages[0]?.content).toContain('CONTENT GUIDELINES');
  });

  it('includes curation principles in system prompt', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());

    expect(messages[0]?.content).toContain('SELECTIVE INCLUSION');
    expect(messages[0]?.content).toContain('SPEECH PATTERN EXTRACTION');
    expect(messages[0]?.content).toContain('NARRATIVE CHRONOLOGY');
  });

  it('includes planner guidance in user prompt', () => {
    const context = buildMinimalContext();
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('Scene Intent: Protagonist confronts the merchant');
    expect(userPrompt).toContain('Dramatic Question: Will the protagonist get the key peacefully?');
    expect(userPrompt).toContain('The merchant holds the key');
  });

  it('includes character concept and worldbuilding', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('A wandering healer');
    expect(userPrompt).toContain('A war-torn kingdom');
    expect(userPrompt).toContain('dark fantasy');
  });

  it('includes NPC definitions when present', () => {
    const context = buildMinimalContext({
      npcs: [
        {
          name: 'Gareth',
          description: 'A gruff blacksmith who protects the village',
        },
      ],
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('NPC DEFINITIONS');
    expect(userPrompt).toContain('Gareth');
  });

  it('includes global canon when present', () => {
    const context = buildMinimalContext({
      globalCanon: ['The eastern gate is sealed', 'Dragons are extinct'],
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('ESTABLISHED WORLD FACTS');
    expect(userPrompt).toContain('The eastern gate is sealed');
    expect(userPrompt).toContain('Dragons are extinct');
  });

  it('includes character canon when present', () => {
    const context = buildMinimalContext({
      globalCharacterCanon: {
        Mira: ['Has a scar on her left hand', 'Allergic to ironwood'],
      },
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('CHARACTER CANON');
    expect(userPrompt).toContain('[Mira]');
    expect(userPrompt).toContain('Has a scar on her left hand');
  });

  it('includes accumulated character state when present', () => {
    const context = buildMinimalContext({
      accumulatedCharacterState: {
        Gareth: [{ id: 'cs-1', text: 'Wounded in the battle' }],
      },
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('NPC ACCUMULATED STATE');
    expect(userPrompt).toContain('[Gareth]');
    expect(userPrompt).toContain('[cs-1] Wounded in the battle');
  });

  it('includes active state when populated', () => {
    const context = buildMinimalContext({
      activeState: {
        currentLocation: 'Tavern',
        activeThreats: [{ id: 'th-1', text: 'Bandits outside' }],
        activeConstraints: [{ id: 'cn-1', text: 'Locked door' }],
        openThreads: [],
      },
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('ACTIVE STATE');
    expect(userPrompt).toContain('Tavern');
    expect(userPrompt).toContain('Bandits outside');
    expect(userPrompt).toContain('Locked door');
  });

  it('includes ancestor summaries when present', () => {
    const context = buildMinimalContext({
      ancestorSummaries: [
        { pageId: parsePageId(1), summary: 'The journey began' },
        { pageId: parsePageId(2), summary: 'Met the merchant' },
      ],
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('ANCESTOR PAGE SUMMARIES');
    expect(userPrompt).toContain('Page 1: The journey began');
    expect(userPrompt).toContain('Page 2: Met the merchant');
  });

  it('includes grandparent narrative when present', () => {
    const context = buildMinimalContext({
      grandparentNarrative: 'Two pages ago: the forest clearing scene.',
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('GRANDPARENT NARRATIVE');
    expect(userPrompt).toContain('Two pages ago: the forest clearing scene.');
  });

  it('always includes parent narrative', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('PARENT NARRATIVE');
    expect(userPrompt).toContain('The protagonist entered the market square.');
  });

  it('includes choice intents when present', () => {
    const context = buildMinimalContext({
      pagePlan: buildMinimalPagePlan({
        choiceIntents: [
          {
            choiceType: ChoiceType.TACTICAL_APPROACH,
            primaryDelta: PrimaryDelta.GOAL_SHIFT,
            hook: 'Try to negotiate',
          },
          {
            choiceType: ChoiceType.MORAL_DILEMMA,
            primaryDelta: PrimaryDelta.RELATIONSHIP_CHANGE,
            hook: 'Threaten the merchant',
          },
        ],
      }),
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('Choice Intents');
    expect(userPrompt).toContain('[TACTICAL_APPROACH / GOAL_SHIFT] Try to negotiate');
    expect(userPrompt).toContain('[MORAL_DILEMMA / RELATIONSHIP_CHANGE] Threaten the merchant');
  });

  it('includes NPC agendas when present', () => {
    const context = buildMinimalContext({
      accumulatedNpcAgendas: {
        Gareth: {
          npcName: 'Gareth',
          currentGoal: 'Protect the village',
          leverage: 'Knowledge of secret paths',
          fear: 'Losing his family',
          offScreenBehavior: 'Fortifying the walls',
        },
      },
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('NPC AGENDAS');
    expect(userPrompt).toContain('[Gareth]');
    expect(userPrompt).toContain('Goal: Protect the village');
    expect(userPrompt).toContain('Leverage: Knowledge of secret paths');
    expect(userPrompt).toContain('Fear: Losing his family');
    expect(userPrompt).toContain('Off-screen: Fortifying the walls');
  });

  it('includes NPC agendas curation principle in system prompt', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    expect(messages[0]?.content).toContain('NPC AGENDAS');
  });

  it('omits NPC agendas section when no agendas exist', () => {
    const context = buildMinimalContext({ accumulatedNpcAgendas: undefined });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).not.toContain('NPC AGENDAS');
  });

  it('omits optional sections when empty', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).not.toContain('NPC DEFINITIONS');
    expect(userPrompt).not.toContain('ESTABLISHED WORLD FACTS');
    expect(userPrompt).not.toContain('CHARACTER CANON');
    expect(userPrompt).not.toContain('NPC ACCUMULATED STATE');
    expect(userPrompt).not.toContain('ACTIVE STATE');
    expect(userPrompt).not.toContain('ANCESTOR PAGE SUMMARIES');
    expect(userPrompt).not.toContain('GRANDPARENT NARRATIVE');
    expect(userPrompt).not.toContain('NPC AGENDAS');
  });
});
