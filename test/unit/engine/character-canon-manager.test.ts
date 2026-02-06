import {
  normalizeCharacterName,
  addCharacterFact,
  mergeCharacterCanonFacts,
  getCharacterFacts,
  formatCharacterCanonForPrompt,
} from '../../../src/engine/character-canon-manager';

describe('Character canon manager', () => {
  describe('normalizeCharacterName', () => {
    it('converts name to lowercase', () => {
      expect(normalizeCharacterName('Bobby Western')).toBe('bobby western');
    });

    it('removes periods and punctuation', () => {
      expect(normalizeCharacterName('Dr. Cohen')).toBe('dr cohen');
      expect(normalizeCharacterName("Dr. O'Brien")).toBe('dr obrien');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeCharacterName('The   Kid')).toBe('the kid');
    });

    it('trims whitespace', () => {
      expect(normalizeCharacterName('  Margaret  ')).toBe('margaret');
    });

    it('handles complex names with multiple punctuation', () => {
      expect(normalizeCharacterName("Dr. J. R. R. O'Malley!")).toBe('dr j r r omalley');
    });
  });

  describe('addCharacterFact', () => {
    it('adds a new fact to a new character', () => {
      const result = addCharacterFact({}, 'Bobby Western', 'Bobby is in a coma');

      expect(result).toEqual({
        'bobby western': ['Bobby is in a coma'],
      });
    });

    it('adds a new fact to an existing character', () => {
      const canon = { 'bobby western': ['Bobby is in a coma'] };
      const result = addCharacterFact(canon, 'Bobby Western', 'Bobby inherited gold');

      expect(result).toEqual({
        'bobby western': ['Bobby is in a coma', 'Bobby inherited gold'],
      });
    });

    it('normalizes character names when adding facts', () => {
      const canon = { 'dr cohen': ['Dr. Cohen is a psychiatrist'] };
      const result = addCharacterFact(canon, 'Dr. Cohen', 'He wears wire-rimmed glasses');

      expect(result).toEqual({
        'dr cohen': ['Dr. Cohen is a psychiatrist', 'He wears wire-rimmed glasses'],
      });
    });

    it('does not add duplicate facts (case-insensitive)', () => {
      const canon = { 'bobby western': ['Bobby is in a coma'] };
      const result = addCharacterFact(canon, 'Bobby Western', 'BOBBY IS IN A COMA');

      expect(result).toBe(canon);
    });

    it('trims facts before adding', () => {
      const result = addCharacterFact({}, 'Margaret', '  Margaret is the intake nurse  ');

      expect(result).toEqual({
        margaret: ['Margaret is the intake nurse'],
      });
    });

    it('ignores empty facts', () => {
      const canon = { 'bobby western': ['Existing fact'] };
      const result = addCharacterFact(canon, 'Bobby Western', '   ');

      expect(result).toBe(canon);
    });

    it('does not mutate original canon', () => {
      const original = { 'bobby western': ['Fact A'] };
      const result = addCharacterFact(original, 'Bobby Western', 'Fact B');

      expect(original).toEqual({ 'bobby western': ['Fact A'] });
      expect(result).not.toBe(original);
    });
  });

  describe('mergeCharacterCanonFacts', () => {
    it('merges new facts for multiple characters', () => {
      const canon = { 'bobby western': ['Bobby is in a coma'] };
      const newFacts = {
        'Bobby Western': ['Bobby inherited gold'],
        'Dr. Cohen': ['Dr. Cohen is a psychiatrist'],
      };

      const result = mergeCharacterCanonFacts(canon, newFacts);

      expect(result).toEqual({
        'bobby western': ['Bobby is in a coma', 'Bobby inherited gold'],
        'dr cohen': ['Dr. Cohen is a psychiatrist'],
      });
    });

    it('returns original canon when no new facts', () => {
      const canon = { 'bobby western': ['Bobby is in a coma'] };
      const result = mergeCharacterCanonFacts(canon, {});

      expect(result).toBe(canon);
    });

    it('handles multiple facts per character', () => {
      const result = mergeCharacterCanonFacts({}, {
        'The Kid': [
          'The Kid is an eidolon',
          'The Kid appears with unnerving clarity',
        ],
      });

      expect(result).toEqual({
        'the kid': [
          'The Kid is an eidolon',
          'The Kid appears with unnerving clarity',
        ],
      });
    });

    it('skips duplicates during merge', () => {
      const canon = { 'bobby western': ['Bobby is in a coma'] };
      const newFacts = {
        'Bobby Western': ['Bobby is in a coma', 'New fact about Bobby'],
      };

      const result = mergeCharacterCanonFacts(canon, newFacts);

      expect(result).toEqual({
        'bobby western': ['Bobby is in a coma', 'New fact about Bobby'],
      });
    });
  });

  describe('getCharacterFacts', () => {
    it('returns facts for a character using normalized name lookup', () => {
      const canon = {
        'dr cohen': ['Dr. Cohen is a psychiatrist', 'He wears glasses'],
      };

      const facts = getCharacterFacts(canon, 'Dr. Cohen');

      expect(facts).toEqual(['Dr. Cohen is a psychiatrist', 'He wears glasses']);
    });

    it('returns empty array for unknown character', () => {
      const facts = getCharacterFacts({}, 'Unknown Character');

      expect(facts).toEqual([]);
    });

    it('finds character regardless of punctuation in query', () => {
      const canon = { 'dr cohen': ['Fact about Dr. Cohen'] };

      expect(getCharacterFacts(canon, 'Dr Cohen')).toEqual(['Fact about Dr. Cohen']);
      expect(getCharacterFacts(canon, 'dr. cohen')).toEqual(['Fact about Dr. Cohen']);
      expect(getCharacterFacts(canon, 'DR. COHEN')).toEqual(['Fact about Dr. Cohen']);
    });
  });

  describe('formatCharacterCanonForPrompt', () => {
    it('formats character canon with names as headers', () => {
      const canon = {
        'bobby western': ['Bobby is in a coma', 'Bobby inherited gold'],
        'dr cohen': ['Dr. Cohen is a psychiatrist'],
      };

      const formatted = formatCharacterCanonForPrompt(canon);

      expect(formatted).toContain('[bobby western]');
      expect(formatted).toContain('- Bobby is in a coma');
      expect(formatted).toContain('- Bobby inherited gold');
      expect(formatted).toContain('[dr cohen]');
      expect(formatted).toContain('- Dr. Cohen is a psychiatrist');
    });

    it('returns empty string for empty canon', () => {
      expect(formatCharacterCanonForPrompt({})).toBe('');
    });

    it('separates characters with blank lines', () => {
      const canon = {
        'bobby western': ['Fact A'],
        'margaret': ['Fact B'],
      };

      const formatted = formatCharacterCanonForPrompt(canon);

      expect(formatted).toContain('\n\n');
    });
  });
});
