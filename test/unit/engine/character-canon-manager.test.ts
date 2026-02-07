import {
  normalizeCharacterName,
  addCharacterFact,
  mergeCharacterCanonFacts,
  getCharacterFacts,
  formatCharacterCanonForPrompt,
} from '../../../src/engine/character-canon-manager';

describe('Character canon manager', () => {
  describe('normalizeCharacterName', () => {
    it('preserves original casing', () => {
      expect(normalizeCharacterName('Bobby Western')).toBe('Bobby Western');
    });

    it('removes periods and punctuation but preserves casing', () => {
      expect(normalizeCharacterName('Dr. Cohen')).toBe('Dr Cohen');
      expect(normalizeCharacterName("Dr. O'Brien")).toBe('Dr OBrien');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeCharacterName('The   Kid')).toBe('The Kid');
    });

    it('trims whitespace', () => {
      expect(normalizeCharacterName('  Margaret  ')).toBe('Margaret');
    });

    it('handles complex names with multiple punctuation', () => {
      expect(normalizeCharacterName("Dr. J. R. R. O'Malley!")).toBe('Dr J R R OMalley');
    });
  });

  describe('addCharacterFact', () => {
    it('adds a new fact to a new character with preserved casing', () => {
      const result = addCharacterFact({}, 'Bobby Western', 'Bobby is in a coma');

      expect(result).toEqual({
        'Bobby Western': ['Bobby is in a coma'],
      });
    });

    it('adds a new fact to an existing character preserving original key casing', () => {
      const canon = { 'Bobby Western': ['Bobby is in a coma'] };
      const result = addCharacterFact(canon, 'bobby western', 'Bobby inherited gold');

      // Should use existing key casing, not the new query casing
      expect(result).toEqual({
        'Bobby Western': ['Bobby is in a coma', 'Bobby inherited gold'],
      });
    });

    it('case-insensitively matches existing characters', () => {
      const canon = { 'Dr Cohen': ['Dr. Cohen is a psychiatrist'] };
      const result = addCharacterFact(canon, 'DR. COHEN', 'He wears wire-rimmed glasses');

      expect(result).toEqual({
        'Dr Cohen': ['Dr. Cohen is a psychiatrist', 'He wears wire-rimmed glasses'],
      });
    });

    it('does not add duplicate facts (case-insensitive)', () => {
      const canon = { 'Bobby Western': ['Bobby is in a coma'] };
      const result = addCharacterFact(canon, 'Bobby Western', 'BOBBY IS IN A COMA');

      expect(result).toBe(canon);
    });

    it('trims facts before adding', () => {
      const result = addCharacterFact({}, 'Margaret', '  Margaret is the intake nurse  ');

      expect(result).toEqual({
        'Margaret': ['Margaret is the intake nurse'],
      });
    });

    it('ignores empty facts', () => {
      const canon = { 'Bobby Western': ['Existing fact'] };
      const result = addCharacterFact(canon, 'Bobby Western', '   ');

      expect(result).toBe(canon);
    });

    it('does not mutate original canon', () => {
      const original = { 'Bobby Western': ['Fact A'] };
      const result = addCharacterFact(original, 'Bobby Western', 'Fact B');

      expect(original).toEqual({ 'Bobby Western': ['Fact A'] });
      expect(result).not.toBe(original);
    });

    it('preserves first-seen casing when adding to a new character', () => {
      // First add to "Captain Mira"
      const step1 = addCharacterFact({}, 'Captain Mira', 'Led the expedition');
      expect(step1).toEqual({ 'Captain Mira': ['Led the expedition'] });

      // Add with different casing - should use existing key
      const step2 = addCharacterFact(step1, 'CAPTAIN MIRA', 'Was injured');
      expect(step2).toEqual({ 'Captain Mira': ['Led the expedition', 'Was injured'] });
    });
  });

  describe('mergeCharacterCanonFacts', () => {
    it('merges new facts for multiple characters with preserved casing', () => {
      const canon = { 'Bobby Western': ['Bobby is in a coma'] };
      const newFacts = {
        'Bobby Western': ['Bobby inherited gold'],
        'Dr. Cohen': ['Dr. Cohen is a psychiatrist'],
      };

      const result = mergeCharacterCanonFacts(canon, newFacts);

      expect(result).toEqual({
        'Bobby Western': ['Bobby is in a coma', 'Bobby inherited gold'],
        'Dr Cohen': ['Dr. Cohen is a psychiatrist'],
      });
    });

    it('uses existing key casing when merging case-insensitively', () => {
      const canon = { 'Bobby Western': ['Bobby is in a coma'] };
      const newFacts = {
        'bobby western': ['Bobby inherited gold'],
      };

      const result = mergeCharacterCanonFacts(canon, newFacts);

      // Should use existing key casing
      expect(result).toEqual({
        'Bobby Western': ['Bobby is in a coma', 'Bobby inherited gold'],
      });
    });

    it('returns original canon when no new facts', () => {
      const canon = { 'Bobby Western': ['Bobby is in a coma'] };
      const result = mergeCharacterCanonFacts(canon, {});

      expect(result).toBe(canon);
    });

    it('handles multiple facts per character with preserved casing', () => {
      const result = mergeCharacterCanonFacts({}, {
        'The Kid': [
          'The Kid is an eidolon',
          'The Kid appears with unnerving clarity',
        ],
      });

      expect(result).toEqual({
        'The Kid': [
          'The Kid is an eidolon',
          'The Kid appears with unnerving clarity',
        ],
      });
    });

    it('skips duplicates during merge', () => {
      const canon = { 'Bobby Western': ['Bobby is in a coma'] };
      const newFacts = {
        'Bobby Western': ['Bobby is in a coma', 'New fact about Bobby'],
      };

      const result = mergeCharacterCanonFacts(canon, newFacts);

      expect(result).toEqual({
        'Bobby Western': ['Bobby is in a coma', 'New fact about Bobby'],
      });
    });
  });

  describe('getCharacterFacts', () => {
    it('returns facts for a character using case-insensitive lookup', () => {
      const canon = {
        'Dr Cohen': ['Dr. Cohen is a psychiatrist', 'He wears glasses'],
      };

      const facts = getCharacterFacts(canon, 'dr. cohen');

      expect(facts).toEqual(['Dr. Cohen is a psychiatrist', 'He wears glasses']);
    });

    it('returns empty array for unknown character', () => {
      const facts = getCharacterFacts({}, 'Unknown Character');

      expect(facts).toEqual([]);
    });

    it('finds character case-insensitively regardless of query casing', () => {
      const canon = { 'Dr Cohen': ['Fact about Dr. Cohen'] };

      expect(getCharacterFacts(canon, 'Dr Cohen')).toEqual(['Fact about Dr. Cohen']);
      expect(getCharacterFacts(canon, 'dr. cohen')).toEqual(['Fact about Dr. Cohen']);
      expect(getCharacterFacts(canon, 'DR. COHEN')).toEqual(['Fact about Dr. Cohen']);
    });
  });

  describe('formatCharacterCanonForPrompt', () => {
    it('formats character canon with preserved casing in headers', () => {
      const canon = {
        'Bobby Western': ['Bobby is in a coma', 'Bobby inherited gold'],
        'Dr Cohen': ['Dr. Cohen is a psychiatrist'],
      };

      const formatted = formatCharacterCanonForPrompt(canon);

      expect(formatted).toContain('[Bobby Western]');
      expect(formatted).toContain('- Bobby is in a coma');
      expect(formatted).toContain('- Bobby inherited gold');
      expect(formatted).toContain('[Dr Cohen]');
      expect(formatted).toContain('- Dr. Cohen is a psychiatrist');
    });

    it('returns empty string for empty canon', () => {
      expect(formatCharacterCanonForPrompt({})).toBe('');
    });

    it('separates characters with blank lines', () => {
      const canon = {
        'Bobby Western': ['Fact A'],
        'Margaret': ['Fact B'],
      };

      const formatted = formatCharacterCanonForPrompt(canon);

      expect(formatted).toContain('\n\n');
    });
  });
});
