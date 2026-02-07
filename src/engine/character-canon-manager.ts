import { GlobalCharacterCanon, CharacterCanon, normalizeCharacterName, normalizeForComparison } from '../models';

// Re-export for backward compatibility
export { normalizeCharacterName };

/**
 * Helper to find the existing key for a character in the canon using case-insensitive lookup.
 * Returns the existing key if found, or null if the character doesn't exist.
 */
function findExistingCanonKey(canon: GlobalCharacterCanon, cleanedName: string): string | null {
  const lookupKey = normalizeForComparison(cleanedName);
  for (const key of Object.keys(canon)) {
    if (normalizeForComparison(key) === lookupKey) {
      return key;
    }
  }
  return null;
}

/**
 * Adds a fact to a specific character's canon.
 * If the fact already exists (case-insensitive), returns the original canon.
 * Creates a new entry for the character if they don't exist.
 * Uses case-insensitive lookup but preserves first-seen casing for storage.
 */
export function addCharacterFact(
  canon: GlobalCharacterCanon,
  characterName: string,
  fact: string,
): GlobalCharacterCanon {
  const cleanedName = normalizeCharacterName(characterName);
  const trimmedFact = fact.trim();

  if (!trimmedFact) {
    return canon;
  }

  // Find existing key (case-insensitive) or use new casing
  const existingKey = findExistingCanonKey(canon, cleanedName);
  const storageKey = existingKey ?? cleanedName;
  const existingFacts = canon[storageKey] ?? [];
  const normalizedFact = normalizeForComparison(trimmedFact);

  // Check if fact already exists (case-insensitive)
  const exists = existingFacts.some(
    existingFact => normalizeForComparison(existingFact) === normalizedFact,
  );

  if (exists) {
    return canon;
  }

  return {
    ...canon,
    [storageKey]: [...existingFacts, trimmedFact],
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
 * Uses case-insensitive name matching, so "Dr. Cohen" and "Dr Cohen" return the same facts.
 * Returns an empty array if the character has no facts.
 */
export function getCharacterFacts(
  canon: GlobalCharacterCanon,
  characterName: string,
): CharacterCanon {
  const cleanedName = normalizeCharacterName(characterName);
  const existingKey = findExistingCanonKey(canon, cleanedName);
  if (existingKey) {
    return canon[existingKey] ?? [];
  }
  return [];
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
