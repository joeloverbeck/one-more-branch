/**
 * Global canon types and functions for permanent story-wide facts.
 */

import type { WorldFactType } from '../decomposed-world.js';
import { normalizeForComparison } from '../normalize.js';

export type { WorldFactType } from '../decomposed-world.js';

export interface TaggedCanonFact {
  readonly text: string;
  readonly factType: WorldFactType;
}

export type CanonFact = TaggedCanonFact;
export type GlobalCanon = readonly CanonFact[];

/**
 * Adds a canon fact to the global canon if not already present.
 * Uses case-insensitive deduplication based on fact text.
 */
export function addCanonFact(canon: GlobalCanon, fact: CanonFact): GlobalCanon {
  const normalizedFact = normalizeForComparison(fact.text);
  const exists = canon.some(
    (existingFact) => normalizeForComparison(existingFact.text) === normalizedFact
  );

  if (exists) {
    return canon;
  }

  return [...canon, { text: fact.text.trim(), factType: fact.factType }];
}

/**
 * Merges multiple canon facts into the global canon.
 */
export function mergeCanonFacts(canon: GlobalCanon, facts: CanonFact[]): GlobalCanon {
  return facts.reduce((acc, fact) => addCanonFact(acc, fact), canon);
}
