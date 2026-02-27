import { parseConceptEvolverSeederResponse } from '../../../src/llm/concept-evolver-seeder';
import type { ConceptSeedFields } from '../../../src/models';
import { createConceptSeedFixture } from '../../fixtures/concept-generator';

function createDiverseSeed(
  index: number,
  genreFrame: string,
  conflictAxis: string,
): ConceptSeedFields {
  return {
    ...createConceptSeedFixture(index),
    genreFrame: genreFrame as ConceptSeedFields['genreFrame'],
    conflictAxis: conflictAxis as ConceptSeedFields['conflictAxis'],
  };
}

function createValidPayload() {
  const genres = ['NOIR', 'SCI_FI', 'FANTASY', 'THRILLER', 'DRAMA', 'GOTHIC'];
  const axes = [
    'TRUTH_VS_STABILITY',
    'INDIVIDUAL_VS_SYSTEM',
    'POWER_VS_MORALITY',
    'DUTY_VS_DESIRE',
    'FREEDOM_VS_SAFETY',
    'IDENTITY_VS_BELONGING',
  ];

  return {
    concepts: Array.from({ length: 6 }, (_, i) => createDiverseSeed(i + 1, genres[i], axes[i])),
  };
}

describe('concept-evolver-seeder', () => {
  describe('parseConceptEvolverSeederResponse', () => {
    it('returns ConceptSeedFields[] for valid 6-seed diverse payload', () => {
      const parsed = parseConceptEvolverSeederResponse(createValidPayload());
      expect(parsed).toHaveLength(6);
      expect(parsed[0]?.genreFrame).toBe('NOIR');
    });

    it('rejects non-object responses', () => {
      expect(() => parseConceptEvolverSeederResponse('invalid')).toThrow('must be an object');
    });

    it('rejects null responses', () => {
      expect(() => parseConceptEvolverSeederResponse(null)).toThrow('must be an object');
    });

    it('rejects missing concepts array', () => {
      expect(() => parseConceptEvolverSeederResponse({})).toThrow('missing concepts array');
    });

    it('rejects non-6 count', () => {
      const payload = createValidPayload();
      payload.concepts = payload.concepts.slice(0, 5);
      expect(() => parseConceptEvolverSeederResponse(payload)).toThrow('exactly 6 seeds');
    });

    it('rejects 7 seeds', () => {
      const payload = createValidPayload();
      payload.concepts.push(createDiverseSeed(7, 'HORROR', 'PROGRESS_VS_TRADITION'));
      expect(() => parseConceptEvolverSeederResponse(payload)).toThrow('exactly 6 seeds');
    });

    it('rejects duplicate genreFrame+conflictAxis pairs', () => {
      const payload = createValidPayload();
      payload.concepts[5] = {
        ...payload.concepts[5],
        genreFrame: payload.concepts[0].genreFrame,
        conflictAxis: payload.concepts[0].conflictAxis,
      };
      expect(() => parseConceptEvolverSeederResponse(payload)).toThrow(
        'duplicate genreFrame+conflictAxis pair',
      );
    });

    it('rejects seeds with invalid enum values', () => {
      const payload = createValidPayload();
      (payload.concepts[0] as Record<string, unknown>)['genreFrame'] = 'INVALID';
      expect(() => parseConceptEvolverSeederResponse(payload)).toThrow('invalid genreFrame');
    });

    it('rejects seeds with missing required fields', () => {
      const payload = createValidPayload();
      delete (payload.concepts[0] as Record<string, unknown>)['whatIfQuestion'];
      expect(() => parseConceptEvolverSeederResponse(payload)).toThrow('whatIfQuestion');
    });
  });
});
