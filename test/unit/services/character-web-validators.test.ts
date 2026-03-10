import { validateWebPatchPayload } from '../../../src/services/character-web-validators.js';

describe('validateWebPatchPayload', () => {
  it('rejects non-object payloads', () => {
    expect(() => validateWebPatchPayload(null)).toThrow('must be an object');
    expect(() => validateWebPatchPayload('string')).toThrow('must be an object');
    expect(() => validateWebPatchPayload(42)).toThrow('must be an object');
  });

  it('rejects empty objects with no recognized keys', () => {
    expect(() => validateWebPatchPayload({})).toThrow('must contain at least one of');
  });

  it('rejects objects with only unrecognized keys', () => {
    expect(() => validateWebPatchPayload({ foo: 'bar' })).toThrow('must contain at least one of');
  });

  describe('castDynamicsSummary', () => {
    it('accepts a valid non-empty string', () => {
      const result = validateWebPatchPayload({ castDynamicsSummary: 'Updated summary' });
      expect(result.castDynamicsSummary).toBe('Updated summary');
    });

    it('rejects an empty string', () => {
      expect(() => validateWebPatchPayload({ castDynamicsSummary: '' })).toThrow('non-empty string');
    });

    it('rejects a whitespace-only string', () => {
      expect(() => validateWebPatchPayload({ castDynamicsSummary: '   ' })).toThrow('non-empty string');
    });

    it('rejects non-string values', () => {
      expect(() => validateWebPatchPayload({ castDynamicsSummary: 123 })).toThrow('non-empty string');
    });
  });

  describe('assignments', () => {
    it('accepts a valid assignments array', () => {
      const result = validateWebPatchPayload({
        assignments: [
          {
            characterName: 'Alice',
            narrativeRole: 'Protagonist',
            conflictRelationship: 'vs. Bob',
          },
        ],
      });
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments![0].characterName).toBe('Alice');
    });

    it('rejects non-array assignments', () => {
      expect(() => validateWebPatchPayload({ assignments: 'not-array' })).toThrow('must be an array');
    });

    it('rejects assignment entries that are not objects', () => {
      expect(() => validateWebPatchPayload({ assignments: ['string'] })).toThrow(
        'assignments[0] must be an object',
      );
    });

    it('rejects assignment entries missing characterName', () => {
      expect(() =>
        validateWebPatchPayload({
          assignments: [{ narrativeRole: 'role', conflictRelationship: 'rel' }],
        }),
      ).toThrow('"characterName"');
    });

    it('rejects assignment entries missing narrativeRole', () => {
      expect(() =>
        validateWebPatchPayload({
          assignments: [{ characterName: 'Alice', conflictRelationship: 'rel' }],
        }),
      ).toThrow('"narrativeRole"');
    });

    it('rejects assignment entries missing conflictRelationship', () => {
      expect(() =>
        validateWebPatchPayload({
          assignments: [{ characterName: 'Alice', narrativeRole: 'role' }],
        }),
      ).toThrow('"conflictRelationship"');
    });
  });

  describe('relationshipArchetypes', () => {
    it('accepts a valid relationshipArchetypes array', () => {
      const result = validateWebPatchPayload({
        relationshipArchetypes: [
          {
            fromCharacter: 'Alice',
            toCharacter: 'Bob',
            essentialTension: 'Trust vs betrayal',
          },
        ],
      });
      expect(result.relationshipArchetypes).toHaveLength(1);
      expect(result.relationshipArchetypes![0].essentialTension).toBe('Trust vs betrayal');
    });

    it('rejects non-array relationshipArchetypes', () => {
      expect(() => validateWebPatchPayload({ relationshipArchetypes: {} })).toThrow(
        'must be an array',
      );
    });

    it('rejects entries that are not objects', () => {
      expect(() => validateWebPatchPayload({ relationshipArchetypes: [null] })).toThrow(
        'relationshipArchetypes[0] must be an object',
      );
    });

    it('rejects entries missing fromCharacter', () => {
      expect(() =>
        validateWebPatchPayload({
          relationshipArchetypes: [{ toCharacter: 'Bob', essentialTension: 'tension' }],
        }),
      ).toThrow('"fromCharacter"');
    });

    it('rejects entries missing toCharacter', () => {
      expect(() =>
        validateWebPatchPayload({
          relationshipArchetypes: [{ fromCharacter: 'Alice', essentialTension: 'tension' }],
        }),
      ).toThrow('"toCharacter"');
    });

    it('rejects entries missing essentialTension', () => {
      expect(() =>
        validateWebPatchPayload({
          relationshipArchetypes: [{ fromCharacter: 'Alice', toCharacter: 'Bob' }],
        }),
      ).toThrow('"essentialTension"');
    });
  });

  describe('combined payloads', () => {
    it('accepts a payload with all three keys', () => {
      const result = validateWebPatchPayload({
        castDynamicsSummary: 'Summary',
        assignments: [
          { characterName: 'Alice', narrativeRole: 'role', conflictRelationship: 'rel' },
        ],
        relationshipArchetypes: [
          { fromCharacter: 'Alice', toCharacter: 'Bob', essentialTension: 'tension' },
        ],
      });
      expect(result.castDynamicsSummary).toBe('Summary');
      expect(result.assignments).toHaveLength(1);
      expect(result.relationshipArchetypes).toHaveLength(1);
    });
  });
});
