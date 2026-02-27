import { GENRE_FRAMES } from '@/models/concept-generator';
import {
  GENRE_CONVENTIONS_BY_GENRE,
  getGenreConventions,
  isGenreConventionTag,
} from '@/models/genre-conventions';

describe('genre conventions registry', () => {
  it('defines conventions for every GenreFrame', () => {
    const registryKeys = Object.keys(GENRE_CONVENTIONS_BY_GENRE).sort();
    const genreFrames = [...GENRE_FRAMES].sort();
    expect(registryKeys).toEqual(genreFrames);
  });

  it('defines exactly 6 convention entries per genre', () => {
    for (const conventions of Object.values(GENRE_CONVENTIONS_BY_GENRE)) {
      expect(conventions).toHaveLength(6);
      for (const entry of conventions) {
        expect(typeof entry.tag).toBe('string');
        expect(entry.tag.trim().length).toBeGreaterThan(0);
        expect(typeof entry.gloss).toBe('string');
        expect(entry.gloss.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('returns per-genre conventions through the accessor', () => {
    expect(getGenreConventions('THRILLER')).toEqual(
      GENRE_CONVENTIONS_BY_GENRE.THRILLER,
    );
  });

  it('validates convention tags with a type guard', () => {
    const validTag = GENRE_CONVENTIONS_BY_GENRE.MYSTERY[0].tag;
    expect(isGenreConventionTag(validTag)).toBe(true);
    expect(isGenreConventionTag('not_a_real_tag')).toBe(false);
    expect(isGenreConventionTag(null)).toBe(false);
  });

  it('keeps convention tags unique within each genre', () => {
    for (const conventions of Object.values(GENRE_CONVENTIONS_BY_GENRE)) {
      const tags = conventions.map((c) => c.tag);
      expect(new Set(tags).size).toBe(tags.length);
    }
  });
});
