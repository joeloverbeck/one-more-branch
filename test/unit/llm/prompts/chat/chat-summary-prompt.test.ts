import { buildChatSummaryMessages } from '../../../../../src/llm/prompts/chat/chat-summary-prompt';
import type { ChatSummaryContext } from '../../../../../src/llm/chat/chat-summary-generation';

function makeContext(): ChatSummaryContext {
  return {
    targetCharacterName: 'Iria Vale',
    interlocutorCharacterName: 'Tomas Braga',
    existingSummary: {
      compressedSummary: 'They ended the previous exchange with an accusation and no proof.',
      keyCommitments: ['Meet before dawn'],
      keyRevelations: ['She already copied the ledger'],
      unresolvedQuestions: ['Who warned the courier?'],
      leverageShifts: ['She forced him to answer first.'],
      emotionalTrajectory: 'Guarded hostility tightening into accusation.',
    },
    turnsToCompress: [
      {
        turnNumber: 9,
        speaker: 'USER',
        rawText: '*bars the door* Stop lying to me.',
        blocks: [
          { type: 'ACTION', text: 'bars the door' },
          { type: 'SPEECH', text: 'Stop lying to me.' },
        ],
        timestamp: '2026-03-27T09:00:00.000Z',
      },
      {
        turnNumber: 10,
        speaker: 'CHARACTER',
        blocks: [
          { type: 'ACTION', text: 'sets the lantern down between them' },
          { type: 'SPEECH', delivery: 'flat', text: 'Then ask the question you are afraid of.' },
        ],
        turnMeta: {
          expectsReply: true,
          endsWithQuestion: false,
          visibleEmotion: 'contained anger',
          finalPressure: 'She forces him to say the accusation plainly.',
        },
        relationshipSnapshot: {
          dynamic: 'guarded hostility',
          valence: -2,
          tension: 8,
          leverage: 'She forced him to answer first.',
          whatCharacterBelievesAboutInterlocutor: ['He is still hiding the courier warning.'],
        },
        timestamp: '2026-03-27T09:01:00.000Z',
      },
    ],
  };
}

describe('buildChatSummaryMessages', () => {
  it('returns exactly 2 messages with system and user roles', () => {
    const messages = buildChatSummaryMessages(makeContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes the content policy block in the system prompt', () => {
    const messages = buildChatSummaryMessages(makeContext());

    expect(messages[0].content).toContain('CONTENT GUIDELINES');
    expect(messages[0].content).toContain('NC-21');
  });

  it('includes the existing summary section when provided', () => {
    const userContent = buildChatSummaryMessages(makeContext())[1].content;

    expect(userContent).toContain('EXISTING ROLLING SUMMARY');
    expect(userContent).toContain(
      'Compressed Summary: They ended the previous exchange with an accusation and no proof.'
    );
    expect(userContent).toContain('Key Commitments:');
    expect(userContent).toContain('- Meet before dawn');
    expect(userContent).toContain('Key Revelations:');
    expect(userContent).toContain('- She already copied the ledger');
  });

  it('renders null existing summary explicitly and preserves formatted turns', () => {
    const userContent = buildChatSummaryMessages({
      ...makeContext(),
      existingSummary: null,
    })[1].content;

    expect(userContent).toContain('EXISTING ROLLING SUMMARY\nNone');
    expect(userContent).toContain('TURNS TO COMPRESS');
    expect(userContent).toContain('TURN 9 [Tomas Braga]');
    expect(userContent).toContain('TURN 10 [Iria Vale]');
    expect(userContent).toContain('- ACTION: bars the door');
    expect(userContent).toContain('- SPEECH: Stop lying to me.');
    expect(userContent).toContain('- SPEECH (flat): Then ask the question you are afraid of.');
    expect(userContent).toContain(
      'Turn Meta: expectsReply=true; endsWithQuestion=false; visibleEmotion=contained anger; finalPressure=She forces him to say the accusation plainly.'
    );
  });
});
