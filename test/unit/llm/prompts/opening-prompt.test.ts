import { buildOpeningPrompt } from '../../../../src/llm/prompts/opening-prompt.js';
import type { OpeningContext } from '../../../../src/llm/types.js';

describe('buildOpeningPrompt with active state', () => {
  it('includes currentLocation instruction', () => {
    const context: OpeningContext = {
      characterConcept: 'A traveling merchant',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('currentLocation');
  });

  it('includes threat/constraint/thread instructions', () => {
    const context: OpeningContext = {
      characterConcept: 'A detective',
      worldbuilding: 'Modern noir',
      tone: 'Mystery thriller',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('threatsAdded');
    expect(userMessage).toContain('constraintsAdded');
    expect(userMessage).toContain('threadsAdded');
  });

  it('instructs to leave removal arrays empty', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('threatsRemoved');
    expect(userMessage).toContain('EMPTY');
  });

  it('does not mention old stateChanges format', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).not.toContain('stateChangesAdded');
    expect(userMessage).not.toContain('stateChangesRemoved');
  });

  it('provides opening-specific example', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const content = messages.map(m => m.content).join('\n');

    // Should have an example showing opening state
    expect(content).toMatch(/"currentLocation":/);
    expect(content).toMatch(/"threadsAdded":/);
  });

  it('includes prefix format examples', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    // Should show PREFIX_ID: description format
    expect(userMessage).toContain('THREAT_');
    expect(userMessage).toContain('CONSTRAINT_');
    expect(userMessage).toContain('THREAD_');
  });

  it('includes constraintsRemoved and threadsResolved in empty guidance', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('constraintsRemoved');
    expect(userMessage).toContain('threadsResolved');
  });

  it('explains this is the first page establishing initial state', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('first page');
    expect(userMessage).toContain('ESTABLISHING');
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
    expect(userMessage).toContain('ESTABLISHMENT RULES (OPENING):');
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
    expect(systemMessage).not.toContain('ESTABLISHMENT RULES');
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
