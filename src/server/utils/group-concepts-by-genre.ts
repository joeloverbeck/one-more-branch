import type { GenreFrame } from '../../models/concept-generator.js';
import { GENRE_CONVENTIONS_BY_GENRE } from '../../models/genre-conventions.js';
import { GENRE_OBLIGATION_TAGS_BY_GENRE } from '../../models/genre-obligations.js';
import type { SavedConcept } from '../../models/saved-concept.js';

export interface GenreGroup {
  readonly genre: string;
  readonly displayLabel: string;
  readonly concepts: readonly SavedConcept[];
  readonly conventions: readonly string[];
  readonly obligations: readonly string[];
}

function lookupGlosses(
  genre: string,
  source: Record<string, readonly { readonly gloss: string }[]>,
): readonly string[] {
  const entries = source[genre as GenreFrame];
  return entries ? entries.map((e) => e.gloss) : [];
}

export function groupConceptsByGenre(concepts: readonly SavedConcept[]): GenreGroup[] {
  const map = new Map<string, SavedConcept[]>();

  for (const concept of concepts) {
    const genre = concept.evaluatedConcept.concept.genreFrame || 'UNKNOWN';
    const existing = map.get(genre);
    if (existing) {
      existing.push(concept);
    } else {
      map.set(genre, [concept]);
    }
  }

  return Array.from(map.entries())
    .map(([genre, grouped]) => ({
      genre,
      displayLabel: genre.replace(/_/g, ' '),
      concepts: grouped,
      conventions: lookupGlosses(genre, GENRE_CONVENTIONS_BY_GENRE),
      obligations: lookupGlosses(genre, GENRE_OBLIGATION_TAGS_BY_GENRE),
    }))
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
}
