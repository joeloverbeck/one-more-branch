import { ChoiceType, PrimaryDelta } from '../../../../src/models/choice-enums';
import { buildOpeningPrompt } from '../../../../src/llm/prompts/opening-prompt.js';
import type { OpeningContext } from '../../../../src/llm/context-types.js';

describe('buildOpeningPrompt with active state', () => {
  it('keeps requirements focused on creative output fields', () => {
    const context: OpeningContext = {
      characterConcept: 'A traveling merchant',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).toContain('sceneSummary');
    expect(userMessage).not.toContain('Do NOT output state/canon mutation fields');
    expect(userMessage).not.toContain('threatsAdded/threatsRemoved');
  });

  it('removes opening state establishment output instructions', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).not.toContain('OPENING PAGE STATE:');
    expect(userMessage).not.toContain('Example opening state');
    expect(userMessage).not.toContain('set the initial LOCATION clearly');
  });

  it('still includes plan guidance fields when pagePlan is provided', () => {
    const context: OpeningContext = {
      characterConcept: 'Test hero',
      worldbuilding: 'Test world',
      tone: 'Test tone',
      pagePlan: {
        sceneIntent: 'Introduce the debt collector conflict',
        continuityAnchors: ['The debt is due by sunrise'],
        stateIntents: {
          threats: { add: [], removeIds: [] },
          constraints: { add: [], removeIds: [] },
          threads: { add: [], resolveIds: [] },
          inventory: { add: [], removeIds: [] },
          health: { add: [], removeIds: [] },
          characterState: { add: [], removeIds: [] },
          canon: { worldAdd: [], characterAdd: [] },
        },
        writerBrief: {
          openingLineDirective: 'Start with a shouted demand at the warehouse door',
          mustIncludeBeats: ['Collector identifies the protagonist by name'],
          forbiddenRecaps: ['No mention of previous chapters'],
        },
        dramaticQuestion: 'Will you pay the debt or confront the collector?',
        choiceIntents: [
          {
            hook: 'Pay what you owe',
            choiceType: ChoiceType.RESOURCE_COMMITMENT,
            primaryDelta: PrimaryDelta.ITEM_CONTROL,
          },
          {
            hook: 'Confront the collector',
            choiceType: ChoiceType.CONFRONTATION,
            primaryDelta: PrimaryDelta.THREAT_SHIFT,
          },
        ],
      },
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).toContain('=== PLANNER GUIDANCE ===');
    expect(userMessage).toContain('Scene Intent: Introduce the debt collector conflict');
    expect(userMessage).toContain(
      'Opening line directive: Start with a shouted demand at the warehouse door'
    );
    expect(userMessage).toContain('Collector identifies the protagonist by name');
    expect(userMessage).toContain('No mention of previous chapters');
  });

  it('includes data rules in user message', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).toContain('=== DATA & STATE RULES ===');
    expect(userMessage).toContain('ACTIVE STATE TRACKING');
    expect(userMessage).toContain('INVENTORY MANAGEMENT:');
    expect(userMessage).toContain('FIELD SEPARATION:');
  });

  it('does NOT include data rules in system message', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const systemMessage = messages.find((m) => m.role === 'system')!.content;

    expect(systemMessage).not.toContain('ACTIVE STATE TRACKING');
    expect(systemMessage).not.toContain('INVENTORY MANAGEMENT:');
    expect(systemMessage).not.toContain('FIELD SEPARATION:');
  });
});

describe('buildOpeningPrompt choice intent section', () => {
  it('includes choice intent section when choiceIntents are provided', () => {
    const context: OpeningContext = {
      characterConcept: 'Test hero',
      worldbuilding: 'Test world',
      tone: 'Test tone',
      pagePlan: {
        sceneIntent: 'Test scene intent',
        continuityAnchors: [],
        stateIntents: {
          threats: { add: [], removeIds: [] },
          constraints: { add: [], removeIds: [] },
          threads: { add: [], resolveIds: [] },
          inventory: { add: [], removeIds: [] },
          health: { add: [], removeIds: [] },
          characterState: { add: [], removeIds: [] },
          canon: { worldAdd: [], characterAdd: [] },
        },
        writerBrief: {
          openingLineDirective: 'Start with action',
          mustIncludeBeats: [],
          forbiddenRecaps: [],
        },
        dramaticQuestion: 'Will you pay the debt or confront the collector?',
        choiceIntents: [
          {
            hook: 'Pay what you owe',
            choiceType: ChoiceType.RESOURCE_COMMITMENT,
            primaryDelta: PrimaryDelta.ITEM_CONTROL,
          },
          {
            hook: 'Confront the collector',
            choiceType: ChoiceType.CONFRONTATION,
            primaryDelta: PrimaryDelta.THREAT_SHIFT,
          },
        ],
      },
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).toContain('=== CHOICE INTENT GUIDANCE (from planner) ===');
    expect(userMessage).toContain(
      'Dramatic Question: Will you pay the debt or confront the collector?'
    );
    expect(userMessage).toContain('[RESOURCE_COMMITMENT / ITEM_CONTROL] Pay what you owe');
    expect(userMessage).toContain('[CONFRONTATION / THREAT_SHIFT] Confront the collector');
    expect(userMessage).toContain('Use these choice intents as a starting blueprint');
  });

  it('omits choice intent section when choiceIntents is absent', () => {
    const context: OpeningContext = {
      characterConcept: 'Test hero',
      worldbuilding: 'Test world',
      tone: 'Test tone',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).not.toContain('CHOICE INTENT GUIDANCE');
    expect(userMessage).not.toContain('Dramatic Question:');
  });

  it('omits choice intent section when choiceIntents is empty array', () => {
    const context: OpeningContext = {
      characterConcept: 'Test hero',
      worldbuilding: 'Test world',
      tone: 'Test tone',
      pagePlan: {
        sceneIntent: 'Test intent',
        continuityAnchors: [],
        stateIntents: {
          threats: { add: [], removeIds: [] },
          constraints: { add: [], removeIds: [] },
          threads: { add: [], resolveIds: [] },
          inventory: { add: [], removeIds: [] },
          health: { add: [], removeIds: [] },
          characterState: { add: [], removeIds: [] },
          canon: { worldAdd: [], characterAdd: [] },
        },
        writerBrief: {
          openingLineDirective: 'Start',
          mustIncludeBeats: [],
          forbiddenRecaps: [],
        },
        dramaticQuestion: 'Some question?',
        choiceIntents: [],
      },
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).not.toContain('CHOICE INTENT GUIDANCE');
  });
});

describe('buildOpeningPrompt with npcs and startingSituation', () => {
  it('includes NPC section when npcs is provided', () => {
    const context: OpeningContext = {
      characterConcept: 'A brave knight',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
      npcs: [{ name: 'Gandalf', description: 'A wise mentor' }],
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).toContain('NPCS (Available Characters)');
    expect(userMessage).toContain('NPC: Gandalf');
    expect(userMessage).toContain('A wise mentor');
    expect(userMessage).toContain("you don't need to include all of them");
  });

  it('omits NPC section when npcs is not provided', () => {
    const context: OpeningContext = {
      characterConcept: 'A brave knight',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).not.toContain('NPCS (Available Characters)');
  });

  it('includes starting situation section when startingSituation is provided', () => {
    const context: OpeningContext = {
      characterConcept: 'A brave knight',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
      startingSituation: 'You wake up in a dungeon cell',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).toContain('STARTING SITUATION:');
    expect(userMessage).toContain('You wake up in a dungeon cell');
    expect(userMessage).toContain('Begin the story with this situation');
  });

  it('omits starting situation section when startingSituation is not provided', () => {
    const context: OpeningContext = {
      characterConcept: 'A brave knight',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).not.toContain('STARTING SITUATION:\n');
  });

  it('includes both NPC and starting situation sections in correct order', () => {
    const context: OpeningContext = {
      characterConcept: 'A brave knight',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
      npcs: [{ name: 'Merlin', description: 'The wise wizard' }],
      startingSituation: 'You wake up in a dungeon',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    const npcIndex = userMessage.indexOf('NPCS (Available Characters)');
    const situationIndex = userMessage.indexOf('STARTING SITUATION:');
    const toneIndex = userMessage.indexOf('TONE/GENRE:');

    expect(npcIndex).toBeGreaterThan(0);
    expect(situationIndex).toBeGreaterThan(npcIndex);
    expect(toneIndex).toBeGreaterThan(situationIndex);
  });
});
