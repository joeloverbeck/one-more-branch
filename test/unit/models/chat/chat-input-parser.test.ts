import type { ChatBlock } from '../../../../src/models/chat/index.js';
import { parseChatInput } from '../../../../src/models/chat/index.js';

describe('parseChatInput', () => {
  it('parses mixed action and speech segments', () => {
    expect(parseChatInput(`*leans forward* "I don't believe you." *taps the table*`)).toEqual<
      ChatBlock[]
    >([
      { type: 'ACTION', text: 'leans forward' },
      { type: 'SPEECH', text: `"I don't believe you."` },
      { type: 'ACTION', text: 'taps the table' },
    ]);
  });

  it('returns a single speech block when there are no action delimiters', () => {
    expect(parseChatInput('Hello there')).toEqual<ChatBlock[]>([
      { type: 'SPEECH', text: 'Hello there' },
    ]);
  });

  it('parses a single action block', () => {
    expect(parseChatInput('*nods*')).toEqual<ChatBlock[]>([{ type: 'ACTION', text: 'nods' }]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseChatInput('')).toEqual([]);
    expect(parseChatInput('   ')).toEqual([]);
  });

  it('omits whitespace-only action blocks', () => {
    expect(parseChatInput('*  *')).toEqual([]);
  });

  it('treats unmatched asterisks as literal speech text', () => {
    expect(parseChatInput('*unmatched')).toEqual<ChatBlock[]>([
      { type: 'SPEECH', text: '*unmatched' },
    ]);
    expect(parseChatInput('unmatched*')).toEqual<ChatBlock[]>([
      { type: 'SPEECH', text: 'unmatched*' },
    ]);
  });

  it('preserves surrounding speech when an action appears in the middle', () => {
    expect(parseChatInput(`"Fine." *shrugs* "Whatever."`)).toEqual<ChatBlock[]>([
      { type: 'SPEECH', text: '"Fine."' },
      { type: 'ACTION', text: 'shrugs' },
      { type: 'SPEECH', text: '"Whatever."' },
    ]);
  });

  it('preserves consecutive action blocks as separate blocks', () => {
    expect(parseChatInput('*nods**steps back*')).toEqual<ChatBlock[]>([
      { type: 'ACTION', text: 'nods' },
      { type: 'ACTION', text: 'steps back' },
    ]);
  });

  it('treats doubled asterisks inside text as literal speech instead of action delimiters', () => {
    expect(parseChatInput('He writes **no** in the margin.')).toEqual<ChatBlock[]>([
      { type: 'SPEECH', text: 'He writes **no** in the margin.' },
    ]);
  });

  it('does not emit empty speech blocks around trimmed actions', () => {
    expect(parseChatInput('  *nods*  ')).toEqual<ChatBlock[]>([{ type: 'ACTION', text: 'nods' }]);
  });
});
