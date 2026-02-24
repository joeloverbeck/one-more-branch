import type { ChatMessage } from '../../../../src/llm/llm-client-types';
import type {
  SceneIdeatorOpeningContext,
  SceneIdeatorContinuationContext,
} from '../../../../src/llm/scene-ideator-types';
import { buildSceneIdeatorPrompt } from '../../../../src/llm/prompts/scene-ideator-prompt';

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
  });
});
