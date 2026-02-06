import { GlobalCharacterCanon, CharacterCanon } from '../models';

/**
 * Normalizes a character name for consistent keying.
 * - Converts to lowercase
 * - Removes extra punctuation (periods, commas)
 * - Collapses multiple spaces to single space
 * - Trims whitespace
 *
 * Examples:
 * - "Dr. Cohen" -> "dr cohen"
 * - "Bobby Western" -> "bobby western"
 * - "The  Kid" -> "the kid"
 */
export function normalizeCharacterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,;:!?'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Adds a fact to a specific character's canon.
 * If the fact already exists (case-insensitive), returns the original canon.
 * Creates a new entry for the character if they don't exist.
 */
export function addCharacterFact(
  canon: GlobalCharacterCanon,
  characterName: string,
  fact: string,
): GlobalCharacterCanon {
  const normalizedName = normalizeCharacterName(characterName);
  const trimmedFact = fact.trim();

  if (!trimmedFact) {
    return canon;
  }

  const existingFacts = canon[normalizedName] ?? [];
  const normalizedFact = trimmedFact.toLowerCase();

  // Check if fact already exists (case-insensitive)
  const exists = existingFacts.some(
    existingFact => existingFact.trim().toLowerCase() === normalizedFact,
  );

  if (exists) {
    return canon;
  }

  return {
    ...canon,
    [normalizedName]: [...existingFacts, trimmedFact],
  };
}

/**
 * Merges character canon facts from LLM response into existing canon.
 * The input format is a Record<string, string[]> where keys are character names
 * and values are arrays of facts about that character.
 *
 * For facts involving multiple characters, the LLM should add an entry to EACH character.
 */
export function mergeCharacterCanonFacts(
  canon: GlobalCharacterCanon,
  newFacts: Record<string, readonly string[]>,
): GlobalCharacterCanon {
  let result = canon;

  for (const [characterName, facts] of Object.entries(newFacts)) {
    for (const fact of facts) {
      result = addCharacterFact(result, characterName, fact);
    }
  }

  return result;
}

/**
 * Retrieves all facts for a given character.
 * Uses normalized name matching, so "Dr. Cohen" and "Dr Cohen" return the same facts.
 * Returns an empty array if the character has no facts.
 */
export function getCharacterFacts(
  canon: GlobalCharacterCanon,
  characterName: string,
): CharacterCanon {
  const normalizedName = normalizeCharacterName(characterName);
  return canon[normalizedName] ?? [];
}

/**
 * Formats character canon for prompt inclusion.
 * Returns a string with each character's facts grouped under their name.
 *
 * Example output:
 * [Bobby Western]
 * - Bobby Western is in a coma in Italy
 * - Inherited one million dollars in gold
 *
 * [Dr. Cohen]
 * - Dr. Cohen is a psychiatrist at Stella Maris
 */
export function formatCharacterCanonForPrompt(canon: GlobalCharacterCanon): string {
  const entries = Object.entries(canon);

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([name, facts]) => {
      const factLines = facts.map(fact => `- ${fact}`).join('\n');
      return `[${name}]\n${factLines}`;
    })
    .join('\n\n');
}
