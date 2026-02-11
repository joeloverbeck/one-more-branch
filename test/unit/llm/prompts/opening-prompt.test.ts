import { buildOpeningPrompt } from '../../../../src/llm/prompts/opening-prompt.js';
import type { OpeningContext } from '../../../../src/llm/types.js';

describe('buildOpeningPrompt with active state', () => {
  it('includes explicit prohibition on state/canon mutation outputs', () => {
    const context: OpeningContext = {
      characterConcept: 'A traveling merchant',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('Do NOT output state/canon mutation fields');
    expect(userMessage).toContain('currentLocation');
    expect(userMessage).toContain('threatsAdded/threatsRemoved');
    expect(userMessage).toContain('newCanonFacts/newCharacterCanonFacts');
  });

  it('removes opening state establishment output instructions', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

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
          threats: { add: [], removeIds: [], replace: [] },
          constraints: { add: [], removeIds: [], replace: [] },
          threads: { add: [], resolveIds: [], replace: [] },
          inventory: { add: [], removeIds: [], replace: [] },
          health: { add: [], removeIds: [], replace: [] },
          characterState: { add: [], removeIds: [], replace: [] },
          canon: { worldAdd: [], characterAdd: [] },
        },
        writerBrief: {
          openingLineDirective: 'Start with a shouted demand at the warehouse door',
          mustIncludeBeats: ['Collector identifies the protagonist by name'],
          forbiddenRecaps: ['No mention of previous chapters'],
        },
      },
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('=== PLANNER GUIDANCE ===');
    expect(userMessage).toContain('Scene Intent: Introduce the debt collector conflict');
    expect(userMessage).toContain('Opening line directive: Start with a shouted demand at the warehouse door');
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
    const userMessage = messages.find(m => m.role === 'user')!.content;

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
    const systemMessage = messages.find(m => m.role === 'system')!.content;

    expect(systemMessage).not.toContain('ACTIVE STATE TRACKING');
    expect(systemMessage).not.toContain('INVENTORY MANAGEMENT:');
    expect(systemMessage).not.toContain('FIELD SEPARATION:');
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
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('NPCS (Available Characters)');
    expect(userMessage).toContain('NPC: Gandalf');
    expect(userMessage).toContain('A wise mentor');
    expect(userMessage).toContain('you don\'t need to include all of them');
  });

  it('omits NPC section when npcs is not provided', () => {
    const context: OpeningContext = {
      characterConcept: 'A brave knight',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

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
    const userMessage = messages.find(m => m.role === 'user')!.content;

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
    const userMessage = messages.find(m => m.role === 'user')!.content;

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
    const userMessage = messages.find(m => m.role === 'user')!.content;

    const npcIndex = userMessage.indexOf('NPCS (Available Characters)');
    const situationIndex = userMessage.indexOf('STARTING SITUATION:');
    const toneIndex = userMessage.indexOf('TONE/GENRE:');

    expect(npcIndex).toBeGreaterThan(0);
    expect(situationIndex).toBeGreaterThan(npcIndex);
    expect(toneIndex).toBeGreaterThan(situationIndex);
  });
});
