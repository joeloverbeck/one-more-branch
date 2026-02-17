import { CHOICE_TYPE_VALUES, PRIMARY_DELTA_VALUES } from '../../models/choice-enums.js';

const CHOICE_TYPE_SET = new Set<string>(CHOICE_TYPE_VALUES);
const PRIMARY_DELTA_SET = new Set<string>(PRIMARY_DELTA_VALUES);
const MAX_CHOICE_TEXT_LENGTH = 500;
const CORRUPTION_MARKER = '"choiceType":"';

export interface WriterChoiceRepairResult {
  readonly repairedJson: unknown;
  readonly repaired: boolean;
  readonly repairDetails?: string;
}

interface ChoiceCandidate {
  readonly text: string;
  readonly choiceType: string;
  readonly primaryDelta: string;
}

function isValidChoice(candidate: unknown): candidate is ChoiceCandidate {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const obj = candidate as Record<string, unknown>;
  const text = obj['text'];
  const choiceType = obj['choiceType'];
  const primaryDelta = obj['primaryDelta'];
  return (
    typeof text === 'string' &&
    text.length >= 3 &&
    typeof choiceType === 'string' &&
    CHOICE_TYPE_SET.has(choiceType) &&
    typeof primaryDelta === 'string' &&
    PRIMARY_DELTA_SET.has(primaryDelta)
  );
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

function attemptChoiceReconstruction(corruptedText: string): ChoiceCandidate[] | null {
  const reconstructed = '[{"text":"' + corruptedText;

  try {
    const parsed: unknown = JSON.parse(reconstructed);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const choices: ChoiceCandidate[] = [];
    for (const item of parsed) {
      if (!isValidChoice(item)) {
        return null;
      }
      choices.push({
        text: truncateAtWordBoundary(item.text, MAX_CHOICE_TEXT_LENGTH),
        choiceType: item.choiceType,
        primaryDelta: item.primaryDelta,
      });
    }

    return choices.length >= 2 ? choices : null;
  } catch {
    return null;
  }
}

function getChoiceText(choice: unknown): string | null {
  if (typeof choice !== 'object' || choice === null) {
    return null;
  }
  const text = (choice as Record<string, unknown>)['text'];
  return typeof text === 'string' ? text : null;
}

export function repairCorruptedChoices(rawJson: unknown): WriterChoiceRepairResult {
  if (typeof rawJson !== 'object' || rawJson === null || Array.isArray(rawJson)) {
    return { repairedJson: rawJson, repaired: false };
  }

  const source = rawJson as Record<string, unknown>;
  const choices = source['choices'];

  if (!Array.isArray(choices)) {
    return { repairedJson: rawJson, repaired: false };
  }

  const isEnding = source['isEnding'] === true;
  if (isEnding || choices.length >= 2) {
    return { repairedJson: rawJson, repaired: false };
  }

  const hasCorruptionMarker = choices.some((choice) => {
    const text = getChoiceText(choice);
    return text?.includes(CORRUPTION_MARKER) ?? false;
  });

  if (!hasCorruptionMarker) {
    return { repairedJson: rawJson, repaired: false };
  }

  const corruptedText = getChoiceText(choices[0]);
  if (corruptedText === null) {
    return { repairedJson: rawJson, repaired: false };
  }

  const reconstructedChoices = attemptChoiceReconstruction(corruptedText);
  if (!reconstructedChoices) {
    return { repairedJson: rawJson, repaired: false };
  }

  const repaired = { ...source, choices: reconstructedChoices };
  return {
    repairedJson: repaired,
    repaired: true,
    repairDetails: `Recovered ${reconstructedChoices.length} choices from corrupted single-choice text (${corruptedText.length} chars)`,
  };
}
