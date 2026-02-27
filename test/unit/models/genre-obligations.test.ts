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

  it('defines 3-5 non-empty obligation tags per genre', () => {
    for (const obligations of Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)) {
      expect(obligations.length).toBeGreaterThanOrEqual(3);
      expect(obligations.length).toBeLessThanOrEqual(5);

      for (const obligation of obligations) {
        expect(typeof obligation).toBe('string');
        expect(obligation.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('returns per-genre tags through the accessor', () => {
    expect(getGenreObligationTags('THRILLER')).toEqual(
      GENRE_OBLIGATION_TAGS_BY_GENRE.THRILLER,
    );
  });

  it('validates obligation tags with a strict type guard', () => {
    const validTag = GENRE_OBLIGATION_TAGS_BY_GENRE.MYSTERY[0];

    expect(isGenreObligationTag(validTag)).toBe(true);
    expect(isGenreObligationTag('not_a_real_tag')).toBe(false);
    expect(isGenreObligationTag(null)).toBe(false);
  });

  it('keeps obligation tags globally unique to avoid ambiguous matching', () => {
    const allTags = Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE).flat();
    const unique = new Set(allTags);

    expect(unique.size).toBe(allTags.length);
  });
});
