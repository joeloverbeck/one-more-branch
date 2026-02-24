import type { ChatMessage } from '../../../../src/llm/llm-client-types';
import type {
  SceneIdeatorOpeningContext,
  SceneIdeatorContinuationContext,
} from '../../../../src/llm/scene-ideator-types';
import {
  buildSceneIdeatorPrompt,
  formatOverdueThreadsSection,
  formatPendingPromisesSection,
} from '../../../../src/llm/prompts/scene-ideator-prompt';
import {
  Urgency,
  ThreadType,
  PromiseType,
  PromiseScope,
} from '../../../../src/models/state/keyed-entry';
import type { ThreadEntry, TrackedPromise } from '../../../../src/models/state/keyed-entry';

describe('buildSceneIdeatorPrompt', () => {
  const openingContext: SceneIdeatorOpeningContext = {
    mode: 'opening',
    tone: 'dark fantasy',
    decomposedCharacters: [],
    decomposedWorld: { facts: [], rawWorldbuilding: '' },
  };

  const continuationContext: SceneIdeatorContinuationContext = {
    mode: 'continuation',
    tone: 'dark fantasy',
    decomposedCharacters: [],
    decomposedWorld: { facts: [], rawWorldbuilding: '' },
    previousNarrative: 'The castle crumbled around them.',
    selectedChoice: 'Run into the forest.',
    activeState: {
      currentLocation: 'Castle ruins',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    ancestorSummaries: [],
    accumulatedPromises: [],
    accumulatedInventory: [],
    accumulatedHealth: [],
  };

  it('returns a 2-element array (system + user messages)', () => {
    const messages: ChatMessage[] = buildSceneIdeatorPrompt(openingContext);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message contains the scene ideator role text', () => {
    const messages = buildSceneIdeatorPrompt(openingContext);
    expect(messages[0].content).toContain('scene direction architect');
  });

  it('system message contains content policy', () => {
    const messages = buildSceneIdeatorPrompt(openingContext);
    expect(messages[0].content).toContain('CONTENT GUIDELINES:');
  });

  it('system message contains diversity constraint', () => {
    const messages = buildSceneIdeatorPrompt(openingContext);
    expect(messages[0].content).toContain('DIVERSITY CONSTRAINT:');
  });

  it('system message contains field instructions', () => {
    const messages = buildSceneIdeatorPrompt(openingContext);
    expect(messages[0].content).toContain('FIELD INSTRUCTIONS:');
  });

  describe('opening mode', () => {
    it('user message contains "OPENING scene"', () => {
      const messages = buildSceneIdeatorPrompt(openingContext);
      expect(messages[1].content).toContain('OPENING scene');
    });

    it('user message contains "STARTING SITUATION" when startingSituation is provided', () => {
      const contextWithSituation: SceneIdeatorOpeningContext = {
        ...openingContext,
        startingSituation: 'The protagonist wakes in a dungeon cell.',
      };
      const messages = buildSceneIdeatorPrompt(contextWithSituation);
      expect(messages[1].content).toContain('STARTING SITUATION');
    });
  });

  describe('continuation mode', () => {
    it('user message contains "PREVIOUS SCENE SUMMARY"', () => {
      const messages = buildSceneIdeatorPrompt(continuationContext);
      expect(messages[1].content).toContain('PREVIOUS SCENE SUMMARY');
    });

    it('user message contains "PLAYER\'S CHOSEN ACTION"', () => {
      const messages = buildSceneIdeatorPrompt(continuationContext);
      expect(messages[1].content).toContain("PLAYER'S CHOSEN ACTION");
    });

    it('renders NPC agendas when present', () => {
      const ctx: SceneIdeatorContinuationContext = {
        ...continuationContext,
        accumulatedNpcAgendas: {
          elena: {
            npcName: 'Elena',
            currentGoal: 'Find the artifact',
            leverage: 'Knowledge of the ruins',
            fear: 'Being abandoned',
            offScreenBehavior: 'Researching ancient texts',
          },
        },
      };
      const messages = buildSceneIdeatorPrompt(ctx);
      expect(messages[1].content).toContain('NPC AGENDAS');
      expect(messages[1].content).toContain('[Elena]');
      expect(messages[1].content).toContain('Goal: Find the artifact');
    });

    it('renders NPC relationships when present', () => {
      const ctx: SceneIdeatorContinuationContext = {
        ...continuationContext,
        accumulatedNpcRelationships: {
          elena: {
            npcName: 'Elena',
            valence: 3,
            dynamic: 'ally',
            history: 'Old friends.',
            currentTension: 'Disagrees about the plan.',
            leverage: 'Trust.',
          },
        },
      };
      const messages = buildSceneIdeatorPrompt(ctx);
      expect(messages[1].content).toContain('NPC-PROTAGONIST RELATIONSHIPS');
      expect(messages[1].content).toContain('[Elena]');
      expect(messages[1].content).toContain('Dynamic: ally | Valence: 3');
    });

    it('renders inventory when present', () => {
      const ctx: SceneIdeatorContinuationContext = {
        ...continuationContext,
        accumulatedInventory: [
          { id: 'inv-1', text: 'Iron sword' },
          { id: 'inv-2', text: 'Healing potion' },
        ],
      };
      const messages = buildSceneIdeatorPrompt(ctx);
      expect(messages[1].content).toContain('YOUR INVENTORY:');
      expect(messages[1].content).toContain('- [inv-1] Iron sword');
      expect(messages[1].content).toContain('- [inv-2] Healing potion');
    });

    it('renders health conditions when present', () => {
      const ctx: SceneIdeatorContinuationContext = {
        ...continuationContext,
        accumulatedHealth: [
          { id: 'hp-1', text: 'Broken arm' },
        ],
      };
      const messages = buildSceneIdeatorPrompt(ctx);
      expect(messages[1].content).toContain('YOUR HEALTH:');
      expect(messages[1].content).toContain('- [hp-1] Broken arm');
    });

    it('omits NPC/inventory/health sections when empty', () => {
      const messages = buildSceneIdeatorPrompt(continuationContext);
      expect(messages[1].content).not.toContain('NPC AGENDAS');
      expect(messages[1].content).not.toContain('NPC-PROTAGONIST RELATIONSHIPS');
      expect(messages[1].content).not.toContain('YOUR INVENTORY:');
      expect(messages[1].content).not.toContain('YOUR HEALTH:');
    });

    it('renders overdue threads with text and metadata when urgency thresholds met', () => {
      const ctx: SceneIdeatorContinuationContext = {
        ...continuationContext,
        activeState: {
          ...continuationContext.activeState,
          openThreads: [
            { id: 'td-1', text: 'Find the lost sword', threadType: ThreadType.QUEST, urgency: Urgency.HIGH },
          ],
        },
        threadAges: { 'td-1': 5 },
      };
      const messages = buildSceneIdeatorPrompt(ctx);
      expect(messages[1].content).toContain('OVERDUE THREADS (consider addressing):');
      expect(messages[1].content).toContain('Find the lost sword');
      expect(messages[1].content).toContain('QUEST');
      expect(messages[1].content).toContain('HIGH');
      expect(messages[1].content).not.toMatch(/td-1 \(/);
    });

    it('renders pending promises with scope field', () => {
      const ctx: SceneIdeatorContinuationContext = {
        ...continuationContext,
        accumulatedPromises: [
          {
            id: 'pr-1',
            description: 'The dagger will reappear',
            promiseType: PromiseType.CHEKHOV_GUN,
            scope: PromiseScope.ACT,
            resolutionHint: 'Dagger used in confrontation',
            suggestedUrgency: Urgency.HIGH,
            age: 3,
          },
        ],
      };
      const messages = buildSceneIdeatorPrompt(ctx);
      expect(messages[1].content).toContain('PENDING PROMISES (consider fulfilling):');
      expect(messages[1].content).toContain('ACT');
    });

    it('omits overdue threads section when no threads exceed urgency thresholds', () => {
      const ctx: SceneIdeatorContinuationContext = {
        ...continuationContext,
        activeState: {
          ...continuationContext.activeState,
          openThreads: [
            { id: 'td-1', text: 'Minor quest', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
          ],
        },
        threadAges: { 'td-1': 2 },
      };
      const messages = buildSceneIdeatorPrompt(ctx);
      expect(messages[1].content).not.toContain('OVERDUE THREADS');
    });

    it('omits pending promises section when no promises match filter', () => {
      const ctx: SceneIdeatorContinuationContext = {
        ...continuationContext,
        accumulatedPromises: [
          {
            id: 'pr-1',
            description: 'Trivial hint',
            promiseType: PromiseType.FORESHADOWING,
            scope: PromiseScope.STORY,
            resolutionHint: 'Eventually',
            suggestedUrgency: Urgency.LOW,
            age: 1,
          },
        ],
      };
      const messages = buildSceneIdeatorPrompt(ctx);
      expect(messages[1].content).not.toContain('PENDING PROMISES');
    });
  });
});

describe('formatOverdueThreadsSection', () => {
  const mkThread = (
    id: string,
    text: string,
    threadType: ThreadType,
    urgency: Urgency
  ): ThreadEntry => ({ id, text, threadType, urgency });

  it('returns empty string when no threads are overdue per urgency thresholds', () => {
    const threads = [mkThread('td-1', 'Minor clue', ThreadType.MYSTERY, Urgency.LOW)];
    const ages = { 'td-1': 5 };
    expect(formatOverdueThreadsSection(threads, ages)).toBe('');
  });

  it('shows thread text instead of thread ID', () => {
    const threads = [mkThread('td-1', 'Find the lost sword', ThreadType.QUEST, Urgency.HIGH)];
    const ages = { 'td-1': 5 };
    const result = formatOverdueThreadsSection(threads, ages);
    expect(result).toContain('Find the lost sword');
    expect(result).not.toContain('td-1');
  });

  it('formats as: Thread text (THREAD_TYPE, URGENCY, N pages)', () => {
    const threads = [mkThread('td-1', 'Find the lost sword', ThreadType.QUEST, Urgency.HIGH)];
    const ages = { 'td-1': 6 };
    const result = formatOverdueThreadsSection(threads, ages);
    expect(result).toContain('Find the lost sword (QUEST, HIGH, 6 pages)');
  });

  it('sorts by age descending', () => {
    const threads = [
      mkThread('td-1', 'Young thread', ThreadType.QUEST, Urgency.HIGH),
      mkThread('td-2', 'Old thread', ThreadType.DANGER, Urgency.HIGH),
    ];
    const ages = { 'td-1': 5, 'td-2': 10 };
    const result = formatOverdueThreadsSection(threads, ages);
    const oldIdx = result.indexOf('Old thread');
    const youngIdx = result.indexOf('Young thread');
    expect(oldIdx).toBeLessThan(youngIdx);
  });

  it('limits to top 5', () => {
    const threads = Array.from({ length: 8 }, (_, i) =>
      mkThread(`td-${i}`, `Thread ${i}`, ThreadType.QUEST, Urgency.HIGH)
    );
    const ages: Record<string, number> = {};
    for (let i = 0; i < 8; i++) ages[`td-${i}`] = 20 + i;
    const result = formatOverdueThreadsSection(threads, ages);
    const matches = result.match(/Thread \d/g) ?? [];
    expect(matches).toHaveLength(5);
  });

  it('uses semicolons as separators', () => {
    const threads = [
      mkThread('td-1', 'Thread A', ThreadType.QUEST, Urgency.HIGH),
      mkThread('td-2', 'Thread B', ThreadType.DANGER, Urgency.HIGH),
    ];
    const ages = { 'td-1': 5, 'td-2': 6 };
    const result = formatOverdueThreadsSection(threads, ages);
    expect(result).toContain('; ');
  });

  it('has the correct header', () => {
    const threads = [mkThread('td-1', 'Important clue', ThreadType.MYSTERY, Urgency.HIGH)];
    const ages = { 'td-1': 5 };
    const result = formatOverdueThreadsSection(threads, ages);
    expect(result).toMatch(/^OVERDUE THREADS \(consider addressing\):/);
  });

  it('respects urgency thresholds: HIGH=4, MEDIUM=7, LOW=10', () => {
    const threads = [
      mkThread('td-h', 'High urgency', ThreadType.DANGER, Urgency.HIGH),
      mkThread('td-m', 'Medium urgency', ThreadType.QUEST, Urgency.MEDIUM),
      mkThread('td-l', 'Low urgency', ThreadType.MYSTERY, Urgency.LOW),
    ];
    // HIGH at age 3 (below 4), MEDIUM at age 6 (below 7), LOW at age 9 (below 10)
    const ages = { 'td-h': 3, 'td-m': 6, 'td-l': 9 };
    expect(formatOverdueThreadsSection(threads, ages)).toBe('');

    // HIGH at age 4 (at threshold), MEDIUM at age 7, LOW at age 10
    const agesAtThreshold = { 'td-h': 4, 'td-m': 7, 'td-l': 10 };
    const result = formatOverdueThreadsSection(threads, agesAtThreshold);
    expect(result).toContain('High urgency');
    expect(result).toContain('Medium urgency');
    expect(result).toContain('Low urgency');
  });
});

describe('formatPendingPromisesSection', () => {
  const mkPromise = (overrides: Partial<TrackedPromise> & { id: string }): TrackedPromise => ({
    description: 'A promise',
    promiseType: PromiseType.CHEKHOV_GUN,
    scope: PromiseScope.BEAT,
    resolutionHint: 'Some hint',
    suggestedUrgency: Urgency.LOW,
    age: 0,
    ...overrides,
  });

  it('returns empty string when no promises match filter', () => {
    const promises = [mkPromise({ id: 'pr-1', suggestedUrgency: Urgency.LOW, age: 1 })];
    expect(formatPendingPromisesSection(promises)).toBe('');
  });

  it('keeps existing filter: suggestedUrgency === HIGH || age >= 5', () => {
    const highUrgency = mkPromise({ id: 'pr-1', suggestedUrgency: Urgency.HIGH, age: 1 });
    const oldPromise = mkPromise({ id: 'pr-2', suggestedUrgency: Urgency.LOW, age: 6 });
    const excluded = mkPromise({ id: 'pr-3', suggestedUrgency: Urgency.LOW, age: 2 });

    const result = formatPendingPromisesSection([highUrgency, oldPromise, excluded]);
    expect(result).toContain(highUrgency.description);
    expect(result).toContain(oldPromise.description);
    expect(result).not.toContain('pr-3');
  });

  it('sorts by scope priority: SCENE first, then BEAT, then ACT, then STORY', () => {
    const storyPromise = mkPromise({
      id: 'pr-1',
      description: 'Story scope',
      scope: PromiseScope.STORY,
      suggestedUrgency: Urgency.HIGH,
      age: 3,
    });
    const scenePromise = mkPromise({
      id: 'pr-2',
      description: 'Scene scope',
      scope: PromiseScope.SCENE,
      suggestedUrgency: Urgency.HIGH,
      age: 3,
    });
    const beatPromise = mkPromise({
      id: 'pr-3',
      description: 'Beat scope',
      scope: PromiseScope.BEAT,
      suggestedUrgency: Urgency.HIGH,
      age: 3,
    });

    const result = formatPendingPromisesSection([storyPromise, scenePromise, beatPromise]);
    const sceneIdx = result.indexOf('Scene scope');
    const beatIdx = result.indexOf('Beat scope');
    const storyIdx = result.indexOf('Story scope');
    expect(sceneIdx).toBeLessThan(beatIdx);
    expect(beatIdx).toBeLessThan(storyIdx);
  });

  it('within same scope, sorts by age descending', () => {
    const young = mkPromise({
      id: 'pr-1',
      description: 'Young promise',
      scope: PromiseScope.BEAT,
      suggestedUrgency: Urgency.HIGH,
      age: 5,
    });
    const old = mkPromise({
      id: 'pr-2',
      description: 'Old promise',
      scope: PromiseScope.BEAT,
      suggestedUrgency: Urgency.HIGH,
      age: 10,
    });

    const result = formatPendingPromisesSection([young, old]);
    const oldIdx = result.indexOf('Old promise');
    const youngIdx = result.indexOf('Young promise');
    expect(oldIdx).toBeLessThan(youngIdx);
  });

  it('formats as: description [promiseType, scope, age: N]', () => {
    const promise = mkPromise({
      id: 'pr-1',
      description: 'The dagger will reappear',
      promiseType: PromiseType.CHEKHOV_GUN,
      scope: PromiseScope.ACT,
      suggestedUrgency: Urgency.HIGH,
      age: 7,
    });
    const result = formatPendingPromisesSection([promise]);
    expect(result).toContain('The dagger will reappear [CHEKHOV_GUN, ACT, age: 7]');
  });

  it('limits to top 5', () => {
    const promises = Array.from({ length: 8 }, (_, i) =>
      mkPromise({
        id: `pr-${i}`,
        description: `Promise ${i}`,
        suggestedUrgency: Urgency.HIGH,
        age: i,
      })
    );
    const result = formatPendingPromisesSection(promises);
    const matches = result.match(/Promise \d/g) ?? [];
    expect(matches).toHaveLength(5);
  });

  it('has the correct header', () => {
    const promise = mkPromise({ id: 'pr-1', suggestedUrgency: Urgency.HIGH, age: 3 });
    const result = formatPendingPromisesSection([promise]);
    expect(result).toMatch(/^PENDING PROMISES \(consider fulfilling\):/);
  });
});
