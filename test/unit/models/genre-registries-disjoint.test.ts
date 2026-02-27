import { GENRE_CONVENTIONS_BY_GENRE } from '@/models/genre-conventions';
import { GENRE_OBLIGATION_TAGS_BY_GENRE } from '@/models/genre-obligations';

describe('genre convention / obligation disjointness', () => {
  it('has no tag appearing in both conventions and obligations', () => {
    const conventionTags = new Set(
      Object.values(GENRE_CONVENTIONS_BY_GENRE)
        .flat()
        .map((e) => e.tag),
    );
    const obligationTags = new Set(
      Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)
        .flat()
        .map((e) => e.tag),
    );

    const overlap = [...conventionTags].filter((t) => obligationTags.has(t));
    expect(overlap).toEqual([]);
  });
});
