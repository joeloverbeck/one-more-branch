import {
  formatCanonForPrompt,
  mightContradictCanon,
  updateStoryWithNewCanon,
  validateNewFacts,
} from '../../../src/engine/canon-manager';
import { createStory } from '../../../src/models';

describe('Canon manager', () => {
  describe('updateStoryWithNewCanon', () => {
    it('adds new facts to story and updates updatedAt', () => {
      const baselineUpdatedAt = new Date(1_000);
      const story = {
        ...createStory({ characterConcept: 'A seasoned ranger patrolling the north.' }),
        updatedAt: baselineUpdatedAt,
      };

      const updated = updateStoryWithNewCanon(story, ['Fact A', 'Fact B']);

      expect(updated).not.toBe(story);
      expect(updated.globalCanon).toEqual(['Fact A', 'Fact B']);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(baselineUpdatedAt.getTime());
    });

    it('returns same story object when no new facts are provided', () => {
      const story = createStory({ characterConcept: 'A traveling artificer with a hidden map.' });

      const updated = updateStoryWithNewCanon(story, []);

      expect(updated).toBe(story);
    });

    it('returns same story object when new facts are only duplicates', () => {
      const story = {
        ...createStory({ characterConcept: 'A hopeful knight serving a stormbound kingdom.' }),
        globalCanon: ['The dragon is alive'],
      };

      const updated = updateStoryWithNewCanon(story, ['  the dragon is alive  ']);

      expect(updated).toBe(story);
      expect(updated.globalCanon).toEqual(['The dragon is alive']);
    });

    it('deduplicates facts and keeps new unique entries', () => {
      const story = {
        ...createStory({ characterConcept: 'A scout crossing the ember dunes at dusk.' }),
        globalCanon: ['The citadel stands'],
      };

      const updated = updateStoryWithNewCanon(story, ['the citadel stands', 'A moon gate exists']);

      expect(updated.globalCanon).toEqual(['The citadel stands', 'A moon gate exists']);
    });
  });

  describe('formatCanonForPrompt', () => {
    it('formats canon as a bulleted list', () => {
      const formatted = formatCanonForPrompt(['Fact A', 'Fact B']);

      expect(formatted).toBe('• Fact A\n• Fact B');
    });

    it('returns empty string for empty canon', () => {
      expect(formatCanonForPrompt([])).toBe('');
    });

    it('handles a single fact', () => {
      expect(formatCanonForPrompt(['Only fact'])).toBe('• Only fact');
    });
  });

  describe('mightContradictCanon', () => {
    it('detects alive vs died contradiction', () => {
      const result = mightContradictCanon(['The dragon is alive'], 'The dragon died in battle');

      expect(result).toBe(true);
    });

    it('allows compatible facts about the same entity', () => {
      const result = mightContradictCanon(['The kingdom exists'], 'The kingdom is prosperous');

      expect(result).toBe(false);
    });

    it('returns false for unrelated facts', () => {
      const result = mightContradictCanon(
        ['The lighthouse shines over the western coast'],
        'The inventor builds a brass automaton'
      );

      expect(result).toBe(false);
    });

    it('handles case-insensitive matching', () => {
      const result = mightContradictCanon(['THE DRAGON IS ALIVE'], 'the dragon DIED yesterday');

      expect(result).toBe(true);
    });

    it('does not flag matching negation polarity as contradiction', () => {
      const result = mightContradictCanon(
        ['The dragon died in battle'],
        'The dragon died defending the gate'
      );

      expect(result).toBe(false);
    });
  });

  describe('validateNewFacts', () => {
    it('returns potentially problematic facts', () => {
      const canon = ['The dragon is alive', 'The citadel stands'];
      const newFacts = [
        'The dragon died in battle',
        'The citadel was destroyed at dawn',
        'The weather is cold',
      ];

      const problematic = validateNewFacts(canon, newFacts);

      expect(problematic).toEqual([
        'The dragon died in battle',
        'The citadel was destroyed at dawn',
      ]);
    });

    it('returns empty array when there are no conflicts', () => {
      const problematic = validateNewFacts(
        ['The kingdom prospers', 'A hidden library exists'],
        ['Merchants arrive every spring']
      );

      expect(problematic).toEqual([]);
    });

    it('checks all facts in the input array', () => {
      const problematic = validateNewFacts(
        ['The dragon is alive'],
        ['The dragon died in battle', 'The dragon never returned']
      );

      expect(problematic).toEqual(['The dragon died in battle', 'The dragon never returned']);
    });
  });
});
