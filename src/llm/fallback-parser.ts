import { validateGenerationResponse } from './schemas.js';
import type { GenerationResult } from './types';
import { LLMError } from './types';

const SECTION_HEADER_REGEX = /\n[A-Z_]+:\s*\n?/;

/**
 * Creates a truncated preview of a response for error messages.
 */
export function createResponsePreview(response: string, maxLength = 500): string {
  if (!response) {
    return '[no response]';
  }
  if (response.length <= maxLength) {
    return response;
  }
  return response.slice(0, maxLength - 3) + '...';
}

/**
 * Attempts to parse the response as JSON and validate it.
 * Returns null if the response is not valid JSON or doesn't have the expected structure.
 */
function tryParseAsJson(response: string): GenerationResult | null {
  // Quick check: must start with { to be JSON object
  if (!response.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(response) as unknown;

    // Check if it has the expected structure
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('narrative' in parsed) ||
      !('choices' in parsed)
    ) {
      return null;
    }

    // Use the same validation as structured output
    return validateGenerationResponse(parsed, response);
  } catch {
    // Not valid JSON or validation failed
    return null;
  }
}

/**
 * Fallback parser for models that do not support structured outputs.
 * Also handles cases where the model returns JSON despite being asked for text format.
 */
export function parseTextResponse(rawResponse: string): GenerationResult {
  const response = rawResponse.trim();

  // First, try to parse as JSON (some models return JSON even in text mode)
  const jsonResult = tryParseAsJson(response);
  if (jsonResult) {
    return jsonResult;
  }

  const isEnding = /THE\s*END/i.test(response) && !/CHOICES:/i.test(response);
  const narrative = extractSection(response, 'NARRATIVE', isEnding ? 'THE END' : 'CHOICES');
  const choices = isEnding ? [] : extractChoices(response);
  const stateChanges = extractListSection(response, 'STATE_CHANGES');
  const canonFacts = extractListSection(response, 'CANON_FACTS');
  const characterCanonFacts = extractCharacterCanonFacts(response);
  const storyArc = extractSection(response, 'STORY_ARC', null);

  if (!isEnding && choices.length < 2) {
    const preview = createResponsePreview(response, 500);
    throw new LLMError(
      `Response missing required choices for non-ending page. Response preview: ${preview}`,
      'MISSING_CHOICES',
      true,
      { rawResponse: response },
    );
  }

  return {
    narrative,
    choices,
    stateChanges,
    canonFacts,
    characterCanonFacts,
    isEnding,
    storyArc: storyArc || undefined,
    rawResponse: response,
  };
}

function extractSection(text: string, startMarker: string, endMarker: string | null): string {
  const startRegex = new RegExp(`(?:^|\\n)${startMarker}:?\\s*\\n?`, 'i');
  const startMatch = startRegex.exec(text);

  if (!startMatch) {
    if (startMarker === 'NARRATIVE') {
      const boundary = text.search(/(?:^|\n)(CHOICES:|STATE_CHANGES:|CANON_FACTS:|STORY_ARC:|THE\s*END)/i);
      if (boundary > 0) {
        return text.slice(0, boundary).trim();
      }
      return text.trim();
    }

    return '';
  }

  const startIndex = (startMatch.index ?? 0) + startMatch[0].length;

  if (endMarker === null) {
    const nextSectionIndex = text.slice(startIndex).search(SECTION_HEADER_REGEX);
    if (nextSectionIndex > -1) {
      return text.slice(startIndex, startIndex + nextSectionIndex).trim();
    }

    return text.slice(startIndex).trim();
  }

  const endRegex = new RegExp(`(?:^|\\n)${endMarker}:?\\s*\\n?`, 'i');
  const endMatch = endRegex.exec(text.slice(startIndex));
  if (endMatch) {
    return text.slice(startIndex, startIndex + (endMatch.index ?? 0)).trim();
  }

  const nextSectionIndex = text.slice(startIndex).search(/\n(?:[A-Z_]+:|THE\s*END)/i);
  if (nextSectionIndex > -1) {
    return text.slice(startIndex, startIndex + nextSectionIndex).trim();
  }

  return text.slice(startIndex).trim();
}

function extractChoices(text: string): string[] {
  const section = extractSection(text, 'CHOICES', 'STATE_CHANGES');

  if (section) {
    return parseChoiceLines(section, true);
  }

  return parseChoiceLines(text, false);
}

function parseChoiceLines(text: string, includePlainLines: boolean): string[] {
  const choices: string[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const numbered = trimmed.match(/^\d+[.)]\s*(.+)$/);
    if (numbered?.[1]) {
      const choice = numbered[1].trim();
      if (choice) {
        choices.push(choice);
      }
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet?.[1]) {
      const choice = bullet[1].trim();
      if (choice) {
        choices.push(choice);
      }
      continue;
    }

    if (includePlainLines && !/^[A-Z_]+:?$/.test(trimmed)) {
      choices.push(trimmed);
    }
  }

  return choices;
}

function extractListSection(text: string, marker: string): string[] {
  const section = extractSection(text, marker, null);
  if (!section) {
    return [];
  }

  const values: string[] = [];

  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || /^[A-Z_]+:?$/.test(trimmed)) {
      continue;
    }

    const withoutBullet = trimmed.replace(/^[-*]\s*/, '').trim();
    if (withoutBullet) {
      values.push(withoutBullet);
    }
  }

  return values;
}

/**
 * Extracts character canon facts from the response.
 * Expects format:
 * CHARACTER_CANON_FACTS:
 * [Character Name]
 * - Fact about character
 * - Another fact
 *
 * [Another Character]
 * - Their fact
 */
function extractCharacterCanonFacts(text: string): Record<string, string[]> {
  const section = extractSection(text, 'CHARACTER_CANON_FACTS', null);
  if (!section) {
    return {};
  }

  const result: Record<string, string[]> = {};
  let currentCharacter: string | null = null;

  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || /^[A-Z_]+:?$/.test(trimmed)) {
      continue;
    }

    // Check if this is a character name header [Character Name]
    const characterMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (characterMatch?.[1]) {
      const name = characterMatch[1].trim();
      if (name) {
        currentCharacter = name;
        result[currentCharacter] = result[currentCharacter] ?? [];
      }
      continue;
    }

    // If we have a current character, add facts to them
    if (currentCharacter) {
      const facts = result[currentCharacter];
      if (facts) {
        const withoutBullet = trimmed.replace(/^[-*]\s*/, '').trim();
        if (withoutBullet) {
          facts.push(withoutBullet);
        }
      }
    }
  }

  return result;
}

/**
 * Appended to the system prompt when text parsing fallback is used.
 */
export function buildFallbackSystemPromptAddition(): string {
  return `

OUTPUT FORMAT:
Always structure your response as follows:

NARRATIVE:
[Your narrative text here - describe the scene, action, dialogue, and outcomes]

CHOICES:
1. [First meaningful choice]
2. [Second meaningful choice]
3. [Third meaningful choice]

STATE_CHANGES:
- [Any significant event that occurred]
- [Any item gained or lost]
- [Any relationship change]

CANON_FACTS:
- [Any new WORLD facts introduced (places, events, rules)]
- [Do NOT include character-specific facts here]

CHARACTER_CANON_FACTS:
[Character Name]
- [Permanent fact about this character]
- [Another fact about this character]

[Another Character]
- [Their permanent fact]

If this is an ENDING (character death, story conclusion, etc.), omit the CHOICES section and instead write:

THE END
[Brief epilogue or closing statement]

For the opening/first page, also include:

STORY_ARC:
[The main goal or conflict driving this adventure]`;
}
