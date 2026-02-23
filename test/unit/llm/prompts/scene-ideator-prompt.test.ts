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
  });
});
