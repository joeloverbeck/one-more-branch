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

export type CanonFact = string | TaggedCanonFact;
export type GlobalCanon = readonly CanonFact[];

export function isTaggedCanonFact(fact: CanonFact): fact is TaggedCanonFact {
  return typeof fact === 'object' && fact !== null && 'text' in fact && 'factType' in fact;
}

export function canonFactText(fact: CanonFact): string {
  return isTaggedCanonFact(fact) ? fact.text : fact;
}

export function canonFactType(fact: CanonFact): WorldFactType | undefined {
  return isTaggedCanonFact(fact) ? fact.factType : undefined;
}

/**
 * Adds a canon fact to the global canon if not already present.
 * Uses case-insensitive deduplication based on fact text.
 */
export function addCanonFact(canon: GlobalCanon, fact: CanonFact): GlobalCanon {
  const factText = canonFactText(fact);
  const normalizedFact = normalizeForComparison(factText);
  const exists = canon.some(
    (existingFact) => normalizeForComparison(canonFactText(existingFact)) === normalizedFact
  );

  if (exists) {
    return canon;
  }

  if (isTaggedCanonFact(fact)) {
    return [...canon, { text: fact.text.trim(), factType: fact.factType }];
  }

  return [...canon, fact.trim()];
}

/**
 * Merges multiple canon facts into the global canon.
 */
export function mergeCanonFacts(canon: GlobalCanon, facts: CanonFact[]): GlobalCanon {
  return facts.reduce((acc, fact) => addCanonFact(acc, fact), canon);
}
