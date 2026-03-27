import type { RollingSummaryOutput } from '../../../models/chat/index.js';
import { formatStringList } from './chat-prompt-formatters.js';

export function formatRollingSummaryForPrompt(summary: RollingSummaryOutput | null): string {
  if (summary === null) {
    return 'None';
  }

  return [
    `Compressed Summary: ${summary.compressedSummary}`,
    'Key Commitments:',
    formatStringList(summary.keyCommitments),
    'Key Revelations:',
    formatStringList(summary.keyRevelations),
    'Unresolved Questions:',
    formatStringList(summary.unresolvedQuestions),
    'Leverage Shifts:',
    formatStringList(summary.leverageShifts),
    `Emotional Trajectory: ${summary.emotionalTrajectory}`,
  ].join('\n');
}
