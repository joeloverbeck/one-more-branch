import { GENRE_FRAMES } from '@/models/concept-generator';
import {
  GENRE_OBLIGATION_TAGS_BY_GENRE,
  getGenreObligationTags,
  isGenreObligationTag,
} from '@/models/genre-obligations';

describe('genre obligations registry', () => {
  it('defines obligations for every GenreFrame', () => {
    const registryKeys = Object.keys(GENRE_OBLIGATION_TAGS_BY_GENRE).sort();
    const genreFrames = [...GENRE_FRAMES].sort();
    expect(registryKeys).toEqual(genreFrames);
  });

  it('defines exactly 6 obligation entries per genre', () => {
    for (const obligations of Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)) {
      expect(obligations).toHaveLength(6);
      for (const entry of obligations) {
        expect(typeof entry.tag).toBe('string');
        expect(entry.tag.trim().length).toBeGreaterThan(0);
        expect(typeof entry.gloss).toBe('string');
        expect(entry.gloss.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('returns per-genre entries through the accessor', () => {
    expect(getGenreObligationTags('THRILLER')).toEqual(
      GENRE_OBLIGATION_TAGS_BY_GENRE.THRILLER,
    );
  });

  it('validates obligation tags with a strict type guard', () => {
    const validTag = GENRE_OBLIGATION_TAGS_BY_GENRE.MYSTERY[0].tag;
    expect(isGenreObligationTag(validTag)).toBe(true);
    expect(isGenreObligationTag('not_a_real_tag')).toBe(false);
    expect(isGenreObligationTag(null)).toBe(false);
  });

  it('keeps obligation tags globally unique to avoid ambiguous matching', () => {
    const allTags = Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)
      .flat()
      .map((e) => e.tag);
    const unique = new Set(allTags);
    expect(unique.size).toBe(allTags.length);
  });
});
