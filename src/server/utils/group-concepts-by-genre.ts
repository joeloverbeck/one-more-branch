import type { SavedConcept } from '../../models/saved-concept.js';

export interface GenreGroup {
  readonly genre: string;
  readonly displayLabel: string;
  readonly concepts: readonly SavedConcept[];
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
    }))
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
}
