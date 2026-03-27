import type { SpeechFingerprint } from '../../../models/decomposed-character.js';
import type { ChatTurn } from '../../../models/chat/index.js';

export function formatStringList(items: readonly string[]): string {
  if (items.length === 0) {
    return '- None';
  }

  return items.map((item) => `- ${item}`).join('\n');
}

export function formatRecentTurns(turns: readonly ChatTurn[]): string {
  if (turns.length === 0) {
    return 'No prior turns in this session.';
  }

  return turns
    .map((turn) => {
      const lines = [`TURN ${turn.turnNumber} [${turn.speaker}]`];

      if (turn.rawText) {
        lines.push(`Raw Text: ${turn.rawText}`);
      }

      lines.push('Blocks:');
      for (const block of turn.blocks) {
        const prefix =
          block.type === 'ACTION' ? 'ACTION' : `SPEECH${block.delivery ? ` (${block.delivery})` : ''}`;
        lines.push(`- ${prefix}: ${block.text}`);
      }

      if (turn.turnMeta) {
        lines.push(
          `Turn Meta: expectsReply=${turn.turnMeta.expectsReply}; endsWithQuestion=${turn.turnMeta.endsWithQuestion}; visibleEmotion=${turn.turnMeta.visibleEmotion}; finalPressure=${turn.turnMeta.finalPressure ?? 'null'}`
        );
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

export function formatSpeechFingerprint(fingerprint: SpeechFingerprint): string {
  return [
    `Vocabulary Profile: ${fingerprint.vocabularyProfile}`,
    `Sentence Patterns: ${fingerprint.sentencePatterns}`,
    'Catchphrases:',
    formatStringList(fingerprint.catchphrases),
    'Verbal Tics:',
    formatStringList(fingerprint.verbalTics),
    'Dialogue Samples:',
    formatStringList(fingerprint.dialogueSamples),
    `Metaphor Frames: ${fingerprint.metaphorFrames}`,
    'Anti-Examples:',
    formatStringList(fingerprint.antiExamples),
    'Discourse Markers:',
    formatStringList(fingerprint.discourseMarkers),
    `Register Shifts: ${fingerprint.registerShifts}`,
  ].join('\n');
}
