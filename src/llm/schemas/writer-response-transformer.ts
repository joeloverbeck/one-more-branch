import type { PageWriterResult } from '../writer-types.js';
import { WriterResultSchema } from './writer-validation-schema.js';

function hasPlainStringChoices(choices: unknown): boolean {
  if (!Array.isArray(choices)) return false;
  return choices.length > 0 && choices.every((item) => typeof item === 'string');
}

function upgradeStringChoicesToObjects(
  choices: string[]
): Array<{ text: string; choiceType: string; primaryDelta: string }> {
  const defaultTypes = [
    'TACTICAL_APPROACH',
    'PATH_DIVERGENCE',
    'INVESTIGATION',
    'AVOIDANCE_RETREAT',
    'CONFRONTATION',
  ];
  const defaultDeltas = [
    'GOAL_SHIFT',
    'LOCATION_CHANGE',
    'INFORMATION_REVEALED',
    'THREAT_SHIFT',
    'RELATIONSHIP_CHANGE',
  ];

  return choices.map((text, i) => ({
    text,
    choiceType: defaultTypes[i % defaultTypes.length] as string,
    primaryDelta: defaultDeltas[i % defaultDeltas.length] as string,
  }));
}

function isMalformedChoicesArray(choices: unknown): boolean {
  if (!Array.isArray(choices) || choices.length !== 1) return false;
  const item: unknown = choices[0];
  if (typeof item !== 'string') return false;
  const trimmed = item.trim();
  return (
    (trimmed.startsWith('{') && trimmed.includes('\\"')) ||
    (trimmed.startsWith('{') && trimmed.includes('"')) ||
    (trimmed.startsWith('[') && trimmed.includes('"'))
  );
}

function extractChoicesFromMalformedString(malformed: string): string[] {
  let content = malformed.trim();

  if (
    (content.startsWith('{') && content.endsWith('}')) ||
    (content.startsWith('[') && content.endsWith(']'))
  ) {
    content = content.slice(1, -1);
  }

  const choices: string[] = [];

  if (content.includes('\\"')) {
    const parts = content.split(/\\",\\"/);
    for (const part of parts) {
      let cleaned = part;
      if (cleaned.startsWith('\\"')) {
        cleaned = cleaned.slice(2);
      }
      if (cleaned.endsWith('\\"')) {
        cleaned = cleaned.slice(0, -2);
      }
      cleaned = cleaned.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (cleaned.trim()) {
        choices.push(cleaned.trim());
      }
    }
  } else {
    const regularQuoteRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let match: RegExpExecArray | null;
    while ((match = regularQuoteRegex.exec(content)) !== null) {
      const capturedGroup = match[1];
      if (capturedGroup !== undefined) {
        const choice = capturedGroup.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        if (choice.trim()) {
          choices.push(choice.trim());
        }
      }
    }
  }

  return choices;
}

function normalizeRawResponse(rawJson: unknown): unknown {
  if (typeof rawJson !== 'object' || rawJson === null) {
    return rawJson;
  }

  const obj = rawJson as Record<string, unknown>;
  const choices = obj['choices'];

  if (isMalformedChoicesArray(choices)) {
    const choicesArray = choices as string[];
    const malformedString = choicesArray[0];
    if (typeof malformedString === 'string') {
      const extractedChoices = extractChoicesFromMalformedString(malformedString);

      if (extractedChoices.length >= 2) {
        console.warn(
          `[writer-response-transformer] Recovered ${extractedChoices.length} choices from malformed single-string array`
        );
        return {
          ...obj,
          choices: upgradeStringChoicesToObjects(extractedChoices),
        };
      }
      console.warn(
        '[writer-response-transformer] Failed to recover choices from malformed string, proceeding with original'
      );
    }
  }

  if (hasPlainStringChoices(choices)) {
    console.warn(
      '[writer-response-transformer] Upgrading plain string choices to structured objects'
    );
    return {
      ...obj,
      choices: upgradeStringChoicesToObjects(choices as string[]),
    };
  }

  return rawJson;
}

export function validateWriterResponse(rawJson: unknown, rawResponse: string): PageWriterResult {
  const normalizedJson = normalizeRawResponse(rawJson);
  const validated = WriterResultSchema.parse(normalizedJson);

  return {
    narrative: validated.narrative.trim(),
    choices: validated.choices.map((choice) => ({
      text: choice.text.trim(),
      choiceType: choice.choiceType,
      primaryDelta: choice.primaryDelta,
    })),
    protagonistAffect: {
      primaryEmotion: validated.protagonistAffect.primaryEmotion.trim(),
      primaryIntensity: validated.protagonistAffect.primaryIntensity,
      primaryCause: validated.protagonistAffect.primaryCause.trim(),
      secondaryEmotions: validated.protagonistAffect.secondaryEmotions.map((se) => ({
        emotion: se.emotion.trim(),
        cause: se.cause.trim(),
      })),
      dominantMotivation: validated.protagonistAffect.dominantMotivation.trim(),
    },
    isEnding: validated.isEnding,
    sceneSummary: validated.sceneSummary.trim(),
    rawResponse,
  };
}
