import {
  isRelationshipArchetype,
  CHARACTER_DEV_STAGE_NAMES,
} from '../../../src/models/character-pipeline-types.js';
import { PipelineRelationshipType, RelationshipValence } from '../../../src/models/character-enums.js';

describe('character-pipeline-types', () => {
  describe('isRelationshipArchetype', () => {
    it('returns true for a valid RelationshipArchetype', () => {
      const valid = {
        fromCharacter: 'Alice',
        toCharacter: 'Bob',
        relationshipType: PipelineRelationshipType.RIVAL,
        valence: RelationshipValence.NEGATIVE,
        essentialTension: 'They compete for the same goal',
      };
      expect(isRelationshipArchetype(valid)).toBe(true);
    });

    it('returns false when fromCharacter is missing', () => {
      const invalid = {
        toCharacter: 'Bob',
        relationshipType: PipelineRelationshipType.RIVAL,
        valence: RelationshipValence.NEGATIVE,
        essentialTension: 'Tension',
      };
      expect(isRelationshipArchetype(invalid)).toBe(false);
    });

    it('returns false when toCharacter is missing', () => {
      const invalid = {
        fromCharacter: 'Alice',
        relationshipType: PipelineRelationshipType.RIVAL,
        valence: RelationshipValence.NEGATIVE,
        essentialTension: 'Tension',
      };
      expect(isRelationshipArchetype(invalid)).toBe(false);
    });

    it('returns false when relationshipType is invalid', () => {
      const invalid = {
        fromCharacter: 'Alice',
        toCharacter: 'Bob',
        relationshipType: 'INVALID',
        valence: RelationshipValence.NEGATIVE,
        essentialTension: 'Tension',
      };
      expect(isRelationshipArchetype(invalid)).toBe(false);
    });

    it('returns false when valence is invalid', () => {
      const invalid = {
        fromCharacter: 'Alice',
        toCharacter: 'Bob',
        relationshipType: PipelineRelationshipType.RIVAL,
        valence: 'INVALID',
        essentialTension: 'Tension',
      };
      expect(isRelationshipArchetype(invalid)).toBe(false);
    });

    it('returns false when essentialTension is missing', () => {
      const invalid = {
        fromCharacter: 'Alice',
        toCharacter: 'Bob',
        relationshipType: PipelineRelationshipType.RIVAL,
        valence: RelationshipValence.NEGATIVE,
      };
      expect(isRelationshipArchetype(invalid)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isRelationshipArchetype(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isRelationshipArchetype('string')).toBe(false);
    });
  });

  describe('CHARACTER_DEV_STAGE_NAMES', () => {
    it('maps all 5 stages to correct names', () => {
      expect(CHARACTER_DEV_STAGE_NAMES[1]).toBe('Character Kernel');
      expect(CHARACTER_DEV_STAGE_NAMES[2]).toBe('Tridimensional Profile');
      expect(CHARACTER_DEV_STAGE_NAMES[3]).toBe('Agency Model');
      expect(CHARACTER_DEV_STAGE_NAMES[4]).toBe('Deep Relationships');
      expect(CHARACTER_DEV_STAGE_NAMES[5]).toBe('Textual Presentation');
    });

    it('has exactly 5 entries', () => {
      expect(Object.keys(CHARACTER_DEV_STAGE_NAMES)).toHaveLength(5);
    });
  });
});
