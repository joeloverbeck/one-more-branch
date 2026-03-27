import type { ChatBlock } from './chat-turn.js';

function pushSpeechBlock(blocks: ChatBlock[], text: string): void {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return;
  }

  blocks.push({ type: 'SPEECH', text: trimmed });
}

function pushActionBlock(blocks: ChatBlock[], text: string): void {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return;
  }

  blocks.push({ type: 'ACTION', text: trimmed });
}

export function parseChatInput(rawText: string): ChatBlock[] {
  if (rawText.trim().length === 0) {
    return [];
  }

  const blocks: ChatBlock[] = [];
  let speechBuffer = '';
  let index = 0;

  while (index < rawText.length) {
    if (rawText[index] !== '*') {
      speechBuffer += rawText[index];
      index += 1;
      continue;
    }

    if (rawText[index + 1] === '*') {
      const closingDoubleIndex = rawText.indexOf('**', index + 2);
      if (closingDoubleIndex === -1) {
        speechBuffer += rawText.slice(index);
        break;
      }

      speechBuffer += rawText.slice(index, closingDoubleIndex + 2);
      index = closingDoubleIndex + 2;
      continue;
    }

    const closingIndex = rawText.indexOf('*', index + 1);
    if (closingIndex === -1) {
      speechBuffer += rawText.slice(index);
      break;
    }

    const candidate = rawText.slice(index + 1, closingIndex);
    if (candidate.includes('*')) {
      speechBuffer += rawText.slice(index, closingIndex + 1);
      index = closingIndex + 1;
      continue;
    }

    pushSpeechBlock(blocks, speechBuffer);
    speechBuffer = '';
    pushActionBlock(blocks, candidate);
    index = closingIndex + 1;
  }

  pushSpeechBlock(blocks, speechBuffer);
  return blocks;
}
