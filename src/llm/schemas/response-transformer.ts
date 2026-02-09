import { createBeatDeviation, createNoDeviation } from '../../models/story-arc.js';
import type { ContinuationGenerationResult } from '../types.js';
import { GenerationResultSchema } from './validation-schema.js';

/**
 * Detects if the choices array contains a single malformed string
 * that looks like a stringified array (e.g., {\"Choice1\",\"Choice2\"})
 */
function isMalformedChoicesArray(choices: unknown): boolean {
  if (!Array.isArray(choices) || choices.length !== 1) return false;
  const item: unknown = choices[0];
  if (typeof item !== 'string') return false;
  // Pattern: starts with { and contains escaped quotes, or contains multiple comma-separated quoted strings
  const trimmed = item.trim();
  return (
    (trimmed.startsWith('{') && trimmed.includes('\\"')) ||
    (trimmed.startsWith('{') && trimmed.includes('"')) ||
    // Also catch standard JSON array accidentally stringified
    (trimmed.startsWith('[') && trimmed.includes('"'))
  );
}

/**
 * Extracts individual choice strings from a malformed single-string choices array.
 * Handles patterns like: {\"Choice 1\",\"Choice 2\"} or ["Choice 1","Choice 2"]
 */
function extractChoicesFromMalformedString(malformed: string): string[] {
  let content = malformed.trim();

  // Remove outer braces/brackets if present
  if ((content.startsWith('{') && content.endsWith('}')) ||
      (content.startsWith('[') && content.endsWith(']'))) {
    content = content.slice(1, -1);
  }

  const choices: string[] = [];

  // Check if content uses escaped quotes (\" pattern)
  if (content.includes('\\"')) {
    // Pattern: \"text\",\"text\" - split on \",\" and strip leading/trailing \"
    const parts = content.split(/\\",\\"/);
    for (const part of parts) {
      // Remove leading \" and trailing \" if present
      let cleaned = part;
      if (cleaned.startsWith('\\"')) {
        cleaned = cleaned.slice(2);
      }
      if (cleaned.endsWith('\\"')) {
        cleaned = cleaned.slice(0, -2);
      }
      // Handle any remaining escaped quotes within the choice text
      cleaned = cleaned.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (cleaned.trim()) {
        choices.push(cleaned.trim());
      }
    }
  } else {
    // Regular quoted strings: "text","text"
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
 * before Zod validation. Currently handles:
 * - Choices array containing a single stringified array element
 */
function normalizeRawResponse(rawJson: unknown): unknown {
  if (typeof rawJson !== 'object' || rawJson === null) {
    return rawJson;
  }

  const obj = rawJson as Record<string, unknown>;
  const choices = obj['choices'];

  // Check for malformed choices array
  if (isMalformedChoicesArray(choices)) {
    const choicesArray = choices as string[];
    const malformedString = choicesArray[0];
    if (typeof malformedString === 'string') {
      const extractedChoices = extractChoicesFromMalformedString(malformedString);

      if (extractedChoices.length >= 2) {
        console.warn(
          `[response-transformer] Recovered ${extractedChoices.length} choices from malformed single-string array`
        );
        return {
          ...obj,
          choices: extractedChoices,
        };
      }
      // If extraction failed or yielded too few choices, let validation fail naturally
      console.warn(
        '[response-transformer] Failed to recover choices from malformed string, proceeding with original'
      );
    }
  }

  return rawJson;
}

export function validateGenerationResponse(
  rawJson: unknown,
  rawResponse: string,
): ContinuationGenerationResult {
  // Apply normalization to fix common LLM malformation patterns before validation
  const normalizedJson = normalizeRawResponse(rawJson);
  const validated = GenerationResultSchema.parse(normalizedJson);

  // Process newCharacterCanonFacts: trim all values
  const newCharacterCanonFacts: Record<string, string[]> = {};
  for (const [name, facts] of Object.entries(validated.newCharacterCanonFacts)) {
    const trimmedFacts = facts.map(fact => fact.trim()).filter(fact => fact);
    if (trimmedFacts.length > 0) {
      newCharacterCanonFacts[name.trim()] = trimmedFacts;
    }
  }

  // Process characterStateChangesAdded: trim all values
  const characterStateChangesAdded = validated.characterStateChangesAdded.map(entry => ({
    characterName: entry.characterName.trim(),
    states: entry.states.map(s => s.trim()).filter(s => s),
  })).filter(entry => entry.characterName && entry.states.length > 0);

  // Process characterStateChangesRemoved: trim all values
  const characterStateChangesRemoved = validated.characterStateChangesRemoved.map(entry => ({
    characterName: entry.characterName.trim(),
    states: entry.states.map(s => s.trim()).filter(s => s),
  })).filter(entry => entry.characterName && entry.states.length > 0);

  const beatIdPattern = /^\d+\.\d+$/;
  const invalidatedBeatIds = validated.invalidatedBeatIds
    .map(beatId => beatId.trim())
    .filter(beatId => beatIdPattern.test(beatId));
  const deviationReason = validated.deviationReason.trim();
  const narrativeSummary = validated.narrativeSummary.trim();
  const deviation =
    validated.deviationDetected && deviationReason && narrativeSummary && invalidatedBeatIds.length > 0
      ? createBeatDeviation(deviationReason, invalidatedBeatIds, narrativeSummary)
      : createNoDeviation();

  return {
    narrative: validated.narrative.trim(),
    choices: validated.choices.map(choice => choice.trim()),

    // Active state fields
    currentLocation: validated.currentLocation.trim(),
    threatsAdded: validated.threatsAdded.map(t => t.trim()).filter(t => t),
    threatsRemoved: validated.threatsRemoved.map(t => t.trim()).filter(t => t),
    constraintsAdded: validated.constraintsAdded.map(c => c.trim()).filter(c => c),
    constraintsRemoved: validated.constraintsRemoved.map(c => c.trim()).filter(c => c),
    threadsAdded: validated.threadsAdded.map(t => t.trim()).filter(t => t),
    threadsResolved: validated.threadsResolved.map(t => t.trim()).filter(t => t),

    newCanonFacts: validated.newCanonFacts.map(fact => fact.trim()).filter(fact => fact),
    newCharacterCanonFacts,
    inventoryAdded: validated.inventoryAdded.map(item => item.trim()).filter(item => item),
    inventoryRemoved: validated.inventoryRemoved.map(item => item.trim()).filter(item => item),
    healthAdded: validated.healthAdded.map(entry => entry.trim()).filter(entry => entry),
    healthRemoved: validated.healthRemoved.map(entry => entry.trim()).filter(entry => entry),
    characterStateChangesAdded,
    characterStateChangesRemoved,
    protagonistAffect: {
      primaryEmotion: validated.protagonistAffect.primaryEmotion.trim(),
      primaryIntensity: validated.protagonistAffect.primaryIntensity,
      primaryCause: validated.protagonistAffect.primaryCause.trim(),
      secondaryEmotions: validated.protagonistAffect.secondaryEmotions.map(se => ({
        emotion: se.emotion.trim(),
        cause: se.cause.trim(),
      })),
      dominantMotivation: validated.protagonistAffect.dominantMotivation.trim(),
    },
    isEnding: validated.isEnding,
    beatConcluded: validated.beatConcluded,
    beatResolution: validated.beatResolution.trim(),
    deviation,
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    rawResponse,
  };
}
