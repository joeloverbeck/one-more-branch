import type { WriterResult } from '../types.js';
import { WriterResultSchema } from './writer-validation-schema.js';

/**
 * Detects if the choices array contains plain strings instead of objects.
 * This can happen if the LLM ignores the structured format instruction.
 */
function hasPlainStringChoices(choices: unknown): boolean {
  if (!Array.isArray(choices)) return false;
  return choices.length > 0 && choices.every(item => typeof item === 'string');
}

/**
 * Converts plain string choices to structured choice objects with default enums.
 * Falls back gracefully when the LLM returns old-format string choices.
 */
function upgradeStringChoicesToObjects(choices: string[]): Array<{ text: string; choiceType: string; primaryDelta: string }> {
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

/**
 * Detects if the choices array contains a single malformed string
 * that looks like a stringified array (e.g., {\"Choice1\",\"Choice2\"})
 *
 */
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

/**
 * Extracts individual choice strings from a malformed single-string choices array.
 * Handles patterns like: {\"Choice 1\",\"Choice 2\"} or ["Choice 1","Choice 2"]
 *
 */
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

/**
 * Normalizes the raw JSON response to fix common LLM malformation patterns
 * before Zod validation. Handles:
 * - Choices array containing a single stringified array element
 * - Choices as plain strings instead of objects (upgrades to objects)
 *
 */
function normalizeRawResponse(rawJson: unknown): unknown {
  if (typeof rawJson !== 'object' || rawJson === null) {
    return rawJson;
  }

  const obj = rawJson as Record<string, unknown>;
  const choices = obj['choices'];

  // Handle malformed single-string array
  if (isMalformedChoicesArray(choices)) {
    const choicesArray = choices as string[];
    const malformedString = choicesArray[0];
    if (typeof malformedString === 'string') {
      const extractedChoices = extractChoicesFromMalformedString(malformedString);

      if (extractedChoices.length >= 2) {
        console.warn(
          `[writer-response-transformer] Recovered ${extractedChoices.length} choices from malformed single-string array`,
        );
        return {
          ...obj,
          choices: upgradeStringChoicesToObjects(extractedChoices),
        };
      }
      console.warn(
        '[writer-response-transformer] Failed to recover choices from malformed string, proceeding with original',
      );
    }
  }

  // Handle plain string choices (LLM returned old format)
  if (hasPlainStringChoices(choices)) {
    console.warn(
      '[writer-response-transformer] Upgrading plain string choices to structured objects',
    );
    return {
      ...obj,
      choices: upgradeStringChoicesToObjects(choices as string[]),
    };
  }

  return rawJson;
}

export function validateWriterResponse(rawJson: unknown, rawResponse: string): WriterResult {
  const normalizedJson = normalizeRawResponse(rawJson);
  const validated = WriterResultSchema.parse(normalizedJson);

  // Process newCharacterCanonFacts: trim all values
  const newCharacterCanonFacts: Record<string, string[]> = {};
  for (const [name, facts] of Object.entries(validated.newCharacterCanonFacts)) {
    const trimmedFacts = facts.map((fact) => fact.trim()).filter((fact) => fact);
    if (trimmedFacts.length > 0) {
      newCharacterCanonFacts[name.trim()] = trimmedFacts;
    }
  }

  // Process characterStateChangesAdded: trim all values
  const characterStateChangesAdded = validated.characterStateChangesAdded
    .map((entry) => ({
      characterName: entry.characterName.trim(),
      states: entry.states.map((s) => s.trim()).filter((s) => s),
    }))
    .filter((entry) => entry.characterName && entry.states.length > 0);

  // Process characterStateChangesRemoved: trim all values
  const characterStateChangesRemoved = validated.characterStateChangesRemoved
    .map((entry) => ({
      characterName: entry.characterName.trim(),
      states: entry.states.map((s) => s.trim()).filter((s) => s),
    }))
    .filter((entry) => entry.characterName && entry.states.length > 0);

  return {
    narrative: validated.narrative.trim(),
    choices: validated.choices.map((choice) => ({
      text: choice.text.trim(),
      choiceType: choice.choiceType,
      primaryDelta: choice.primaryDelta,
    })),
    currentLocation: validated.currentLocation.trim(),
    threatsAdded: validated.threatsAdded.map((t) => t.trim()).filter((t) => t),
    threatsRemoved: validated.threatsRemoved.map((t) => t.trim()).filter((t) => t),
    constraintsAdded: validated.constraintsAdded.map((c) => c.trim()).filter((c) => c),
    constraintsRemoved: validated.constraintsRemoved.map((c) => c.trim()).filter((c) => c),
    threadsAdded: validated.threadsAdded.map((t) => t.trim()).filter((t) => t),
    threadsResolved: validated.threadsResolved.map((t) => t.trim()).filter((t) => t),
    newCanonFacts: validated.newCanonFacts.map((fact) => fact.trim()).filter((fact) => fact),
    newCharacterCanonFacts,
    inventoryAdded: validated.inventoryAdded.map((item) => item.trim()).filter((item) => item),
    inventoryRemoved: validated.inventoryRemoved.map((item) => item.trim()).filter((item) => item),
    healthAdded: validated.healthAdded.map((entry) => entry.trim()).filter((entry) => entry),
    healthRemoved: validated.healthRemoved.map((entry) => entry.trim()).filter((entry) => entry),
    characterStateChangesAdded,
    characterStateChangesRemoved,
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
