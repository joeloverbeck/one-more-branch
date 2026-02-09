import { isPageId, PageId } from './id';
import { ChoiceType, CHOICE_TYPE_VALUES, PrimaryDelta, PRIMARY_DELTA_VALUES } from './choice-enums';

export interface Choice {
  readonly text: string;
  readonly choiceType: ChoiceType;
  readonly primaryDelta: PrimaryDelta;
  nextPageId: PageId | null;
}

export function createChoice(
  text: string,
  nextPageId: PageId | null = null,
  choiceType: ChoiceType = ChoiceType.TACTICAL_APPROACH,
  primaryDelta: PrimaryDelta = PrimaryDelta.GOAL_SHIFT,
): Choice {
  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    throw new Error('Choice text cannot be empty');
  }

  if (nextPageId !== null && !isPageId(nextPageId)) {
    throw new Error(`Invalid Page ID: ${String(nextPageId)}. Must be a positive integer.`);
  }

  if (!CHOICE_TYPE_VALUES.includes(choiceType)) {
    throw new Error(`Invalid choiceType: ${String(choiceType)}`);
  }

  if (!PRIMARY_DELTA_VALUES.includes(primaryDelta)) {
    throw new Error(`Invalid primaryDelta: ${String(primaryDelta)}`);
  }

  return {
    text: trimmedText,
    choiceType,
    primaryDelta,
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
  const choiceType = obj['choiceType'];
  const primaryDelta = obj['primaryDelta'];

  return (
    typeof text === 'string' &&
    text.length > 0 &&
    text.trim().length > 0 &&
    typeof choiceType === 'string' &&
    CHOICE_TYPE_VALUES.includes(choiceType as ChoiceType) &&
    typeof primaryDelta === 'string' &&
    PRIMARY_DELTA_VALUES.includes(primaryDelta as PrimaryDelta) &&
    (nextPageId === null || isPageId(nextPageId))
  );
}

export function isChoiceExplored(choice: Choice): boolean {
  return choice.nextPageId !== null;
}
