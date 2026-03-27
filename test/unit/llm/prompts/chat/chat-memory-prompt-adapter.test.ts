import { formatRollingSummaryForPrompt } from '../../../../../src/llm/prompts/chat/chat-memory-prompt-adapter';

describe('formatRollingSummaryForPrompt', () => {
  it('renders null summaries explicitly', () => {
    expect(formatRollingSummaryForPrompt(null)).toBe('None');
  });

  it('renders structured rolling summaries deterministically', () => {
    expect(
      formatRollingSummaryForPrompt({
        compressedSummary: 'Their last meeting ended with a threat and no proof.',
        keyCommitments: ['Meet before dawn'],
        keyRevelations: ['Iria copied the key'],
        unresolvedQuestions: ['Who warned the courier?'],
        leverageShifts: ['Tomas forced Iria to show how much she knew.'],
        emotionalTrajectory: 'Guarded hostility tightening into direct accusation.',
      })
    ).toBe(
      [
        'Compressed Summary: Their last meeting ended with a threat and no proof.',
        'Key Commitments:',
        '- Meet before dawn',
        'Key Revelations:',
        '- Iria copied the key',
        'Unresolved Questions:',
        '- Who warned the courier?',
        'Leverage Shifts:',
        '- Tomas forced Iria to show how much she knew.',
        'Emotional Trajectory: Guarded hostility tightening into direct accusation.',
      ].join('\n')
    );
  });
});
