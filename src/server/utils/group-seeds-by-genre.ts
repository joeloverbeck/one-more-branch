import type { ConceptSeed } from '../../models/concept-seed.js';

export interface SeedGenreGroup {
  readonly genre: string;
  readonly displayLabel: string;
  readonly seeds: readonly ConceptSeed[];
}

export function groupSeedsByGenre(seeds: readonly ConceptSeed[]): SeedGenreGroup[] {
  const map = new Map<string, ConceptSeed[]>();

  for (const seed of seeds) {
    const genre = seed.genreFrame || 'UNKNOWN';
    const existing = map.get(genre);
    if (existing) {
      existing.push(seed);
    } else {
      map.set(genre, [seed]);
    }
  }

  return Array.from(map.entries())
    .map(([genre, grouped]) => ({
      genre,
      displayLabel: genre.replace(/_/g, ' '),
      seeds: grouped,
    }))
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
}
