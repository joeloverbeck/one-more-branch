import type { SavedConcept } from '../../../../src/models/saved-concept.js';
import { groupConceptsByGenre } from '../../../../src/server/utils/group-concepts-by-genre.js';

function makeConcept(id: string, genreFrame: string | undefined): SavedConcept {
  return {
    id,
    name: `Concept ${id}`,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    sourceKernelId: 'kernel-1',
    seeds: {},
    evaluatedConcept: {
      concept: { genreFrame },
      scores: {},
      overallScore: 5,
      strengths: [],
      weaknesses: [],
      passes: true,
      tradeoffSummary: '',
    } as unknown as SavedConcept['evaluatedConcept'],
  };
}

describe('groupConceptsByGenre', () => {
  it('returns empty array for no concepts', () => {
    expect(groupConceptsByGenre([])).toEqual([]);
  });

  it('groups concepts by genreFrame', () => {
    const concepts = [
      makeConcept('1', 'HORROR'),
      makeConcept('2', 'FANTASY'),
      makeConcept('3', 'HORROR'),
    ];
    const groups = groupConceptsByGenre(concepts);

    expect(groups).toHaveLength(2);
    expect(groups[0].genre).toBe('FANTASY');
    expect(groups[0].concepts).toHaveLength(1);
    expect(groups[1].genre).toBe('HORROR');
    expect(groups[1].concepts).toHaveLength(2);
  });

  it('sorts groups alphabetically by display label', () => {
    const concepts = [
      makeConcept('1', 'WESTERN'),
      makeConcept('2', 'ADVENTURE'),
      makeConcept('3', 'NOIR'),
    ];
    const groups = groupConceptsByGenre(concepts);

    expect(groups.map((g) => g.genre)).toEqual(['ADVENTURE', 'NOIR', 'WESTERN']);
  });

  it('sets displayLabel to genre with underscores replaced by spaces', () => {
    const concepts = [makeConcept('1', 'SCI_FI')];
    const groups = groupConceptsByGenre(concepts);

    expect(groups[0].displayLabel).toBe('SCI FI');
  });

  it('handles missing genreFrame by defaulting to UNKNOWN', () => {
    const concept = makeConcept('1', undefined);
    const groups = groupConceptsByGenre([concept]);

    expect(groups[0].genre).toBe('UNKNOWN');
  });
});
