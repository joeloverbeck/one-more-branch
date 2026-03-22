import { buildSceneBlueprintPrompt } from '../../../../src/llm/prompts/scene-blueprint-prompt';
import type { SceneBlueprintContext } from '../../../../src/llm/scene-blueprint-types';
import type { PagePlanGenerationResult } from '../../../../src/llm/planner-types';
import type { StoryBible } from '../../../../src/llm/lorekeeper-types';

function buildMinimalPagePlan(
  overrides?: Partial<PagePlanGenerationResult>
): PagePlanGenerationResult {
  return {
    sceneIntent: 'Test scene intent',
    continuityAnchors: [],
    sceneMandates: ['Must include beat A'],
    forbiddenRecaps: ['Do not repeat X'],
    dramaticQuestion: 'Will they survive?',
    isEnding: false,
    stateIntents: {
      currentLocation: '',
      threats: { add: [], removeIds: [] },
      constraints: { add: [], removeIds: [] },
      threads: { add: [], resolveIds: [] },
      inventory: { add: [], removeIds: [] },
      health: { add: [], removeIds: [] },
      characterState: { add: [], removeIds: [] },
      canon: { worldAdd: [], characterAdd: [] },
    },
    rawResponse: 'test',
    ...overrides,
  };
}

function buildMinimalBlueprintContext(
  overrides?: Partial<SceneBlueprintContext>
): SceneBlueprintContext {
  return {
    pagePlan: buildMinimalPagePlan(),
    storyBible: null,
    tone: 'dark fantasy',
    isEnding: false,
    previousNarrative: 'You walk into the chamber.',
    isOpening: false,
    ...overrides,
  };
}

describe('buildSceneBlueprintPrompt', () => {
  it('returns system + user messages (2 messages, system first)', () => {
    const messages = buildSceneBlueprintPrompt(buildMinimalBlueprintContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message contains Scene Architect role', () => {
    const messages = buildSceneBlueprintPrompt(buildMinimalBlueprintContext());

    expect(messages[0].content).toContain('Scene Architect');
  });

  it('system message contains Swain Scene-Sequel model reference', () => {
    const messages = buildSceneBlueprintPrompt(buildMinimalBlueprintContext());

    expect(messages[0].content).toContain('Scene-Sequel model');
  });

  it('system message contains tone directive when tone is provided', () => {
    const messages = buildSceneBlueprintPrompt(
      buildMinimalBlueprintContext({ tone: 'cosmic horror' })
    );

    expect(messages[0].content).toContain('cosmic horror');
  });

  it('system message contains content policy', () => {
    const messages = buildSceneBlueprintPrompt(buildMinimalBlueprintContext());

    expect(messages[0].content).toContain('CONTENT GUIDELINES');
  });

  it('user message contains scene intent from pagePlan', () => {
    const messages = buildSceneBlueprintPrompt(buildMinimalBlueprintContext());

    expect(messages[1].content).toContain('Test scene intent');
  });

  it('user message contains dramatic question from pagePlan', () => {
    const messages = buildSceneBlueprintPrompt(buildMinimalBlueprintContext());

    expect(messages[1].content).toContain('Will they survive?');
  });

  it('user message contains scene mandates when provided', () => {
    const messages = buildSceneBlueprintPrompt(buildMinimalBlueprintContext());

    expect(messages[1].content).toContain('Must include beat A');
    expect(messages[1].content).toContain('mandateMapping');
  });

  it('user message contains forbidden recaps when provided', () => {
    const messages = buildSceneBlueprintPrompt(buildMinimalBlueprintContext());

    expect(messages[1].content).toContain('Forbidden Recaps');
    expect(messages[1].content).toContain('Do not repeat X');
  });

  it('user message contains opening architecture rules when isOpening is true', () => {
    const messages = buildSceneBlueprintPrompt(
      buildMinimalBlueprintContext({ isOpening: true })
    );

    expect(messages[1].content).toContain('establish orientation');
    expect(messages[1].content).toContain('introduce the protagonist');
  });

  it('user message contains continuation architecture rules when isOpening is false', () => {
    const messages = buildSceneBlueprintPrompt(
      buildMinimalBlueprintContext({ isOpening: false })
    );

    expect(messages[1].content).toContain("player's choice directly");
    expect(messages[1].content).toContain('choiceable situation');
  });

  it('user message contains story bible section when storyBible is provided', () => {
    const storyBible: StoryBible = {
      sceneWorldContext: 'A crumbling castle on the edge of the void.',
      relevantCharacters: [
        {
          name: 'Elara',
          role: 'ally',
          relevantProfile: 'A wandering healer',
          speechPatterns: 'calm and measured',
          protagonistRelationship: 'trusted companion',
          currentState: 'worried about the curse',
        },
      ],
      relevantCanonFacts: ['The seal is broken'],
      relevantHistory: 'Previously they crossed the bridge.',
    };
    const messages = buildSceneBlueprintPrompt(
      buildMinimalBlueprintContext({ storyBible })
    );

    expect(messages[1].content).toContain('STORY BIBLE');
    expect(messages[1].content).toContain('crumbling castle on the edge of the void');
    expect(messages[1].content).toContain('Elara');
  });

  it('user message contains player choice when selectedChoice is provided', () => {
    const messages = buildSceneBlueprintPrompt(
      buildMinimalBlueprintContext({ selectedChoice: 'Open the forbidden door' })
    );

    expect(messages[1].content).toContain("PLAYER'S CHOICE");
    expect(messages[1].content).toContain('Open the forbidden door');
  });

  it('user message contains opening image when provided', () => {
    const messages = buildSceneBlueprintPrompt(
      buildMinimalBlueprintContext({
        isOpening: true,
        openingImage: 'A lone figure silhouetted against the burning sky',
      })
    );

    expect(messages[1].content).toContain('OPENING IMAGE CONTRACT');
    expect(messages[1].content).toContain('lone figure silhouetted against the burning sky');
  });
});
