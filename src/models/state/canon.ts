/**
 * Global canon types and functions for permanent story-wide facts.
 */

import { normalizeForComparison } from '../normalize.js';

export type CanonFact = string;
export type GlobalCanon = readonly CanonFact[];

/**
 * Adds a canon fact to the global canon if not already present.
 * Uses case-insensitive deduplication.
 */
export function addCanonFact(canon: GlobalCanon, fact: CanonFact): GlobalCanon {
  const normalizedFact = normalizeForComparison(fact);
  const exists = canon.some(
    (existingFact) => normalizeForComparison(existingFact) === normalizedFact
  );

  if (exists) {
    return canon;
  }

  return [...canon, fact.trim()];
}

/**
 * Merges multiple canon facts into the global canon.
 */
export function mergeCanonFacts(canon: GlobalCanon, facts: CanonFact[]): GlobalCanon {
  return facts.reduce((acc, fact) => addCanonFact(acc, fact), canon);
}
