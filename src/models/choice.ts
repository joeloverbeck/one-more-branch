import { isPageId, PageId } from './id';

export interface Choice {
  readonly text: string;
  nextPageId: PageId | null;
}

export function createChoice(text: string, nextPageId: PageId | null = null): Choice {
  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    throw new Error('Choice text cannot be empty');
  }

  if (nextPageId !== null && !isPageId(nextPageId)) {
    throw new Error(`Invalid Page ID: ${nextPageId}. Must be a positive integer.`);
  }

  return {
    text: trimmedText,
    nextPageId,
  };
}

export function isChoice(value: unknown): value is Choice {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const text = obj['text'];
  const nextPageId = obj['nextPageId'];

  return (
    typeof text === 'string' &&
    text.length > 0 &&
    text.trim().length > 0 &&
    (nextPageId === null || isPageId(nextPageId))
  );
}

export function isChoiceExplored(choice: Choice): boolean {
  return choice.nextPageId !== null;
}
