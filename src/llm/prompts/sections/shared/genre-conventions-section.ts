import type { GenreFrame } from '../../../../models/concept-generator.js';
import { getGenreConventions } from '../../../../models/genre-conventions.js';

export function buildGenreConventionsSection(genreFrame?: GenreFrame): string {
  if (!genreFrame) {
    return '';
  }

  const conventions = getGenreConventions(genreFrame);
  if (conventions.length === 0) {
    return '';
  }

  const listed = conventions.map((entry) => `- ${entry.tag}: ${entry.gloss}`).join('\n');
  return `GENRE CONVENTIONS (${genreFrame} — maintain throughout):
${listed}

These conventions define the genre's atmosphere, character dynamics, and tonal expectations. They are NOT specific scenes — they are persistent creative constraints that every scene should honor.

`;
}
