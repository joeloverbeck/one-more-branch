/**
 * Character canon types for permanent character-specific facts.
 * Unlike CharacterState (branch-isolated), CharacterCanon persists globally.
 */

export type CharacterCanonFact = string;
export type CharacterCanon = readonly CharacterCanonFact[];
export type GlobalCharacterCanon = Readonly<Record<string, CharacterCanon>>;
