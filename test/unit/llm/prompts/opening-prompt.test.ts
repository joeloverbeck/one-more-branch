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
});
