import {
  formatCanonForPrompt,
  mightContradictCanon,
  updateStoryWithNewCanon,
  updateStoryWithNewCharacterCanon,
  updateStoryWithAllCanon,
  validateNewFacts,
} from '../../../src/engine/canon-manager';
import { createStory } from '../../../src/models';
import {
  canonFactText,
  canonFactType,
  isTaggedCanonFact,
} from '../../../src/models/state/canon';
import type { TaggedCanonFact, CanonFact } from '../../../src/models/state/canon';

describe('Canon manager', () => {
  describe('updateStoryWithNewCanon', () => {
    it('adds new facts to story and updates updatedAt', () => {
      const baselineUpdatedAt = new Date(1_000);
      const story = {
        ...createStory({
          title: 'Test Story',
          characterConcept: 'A seasoned ranger patrolling the north.',
        }),
        updatedAt: baselineUpdatedAt,
      };

      const updated = updateStoryWithNewCanon(story, ['Fact A', 'Fact B']);

      expect(updated).not.toBe(story);
      expect(updated.globalCanon).toEqual(['Fact A', 'Fact B']);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(baselineUpdatedAt.getTime());
    });

    it('returns same story object when no new facts are provided', () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A traveling artificer with a hidden map.',
      });

      const updated = updateStoryWithNewCanon(story, []);

      expect(updated).toBe(story);
    });

    it('returns same story object when new facts are only duplicates', () => {
      const story = {
        ...createStory({
          title: 'Test Story',
          characterConcept: 'A hopeful knight serving a stormbound kingdom.',
        }),
        globalCanon: ['The dragon is alive'],
      };

      const updated = updateStoryWithNewCanon(story, ['  the dragon is alive  ']);

      expect(updated).toBe(story);
      expect(updated.globalCanon).toEqual(['The dragon is alive']);
    });

    it('deduplicates facts and keeps new unique entries', () => {
      const story = {
        ...createStory({
          title: 'Test Story',
          characterConcept: 'A scout crossing the ember dunes at dusk.',
        }),
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

  describe('updateStoryWithNewCharacterCanon', () => {
    it('adds character facts to story and updates updatedAt', () => {
      const baselineUpdatedAt = new Date(1_000);
      const story = {
        ...createStory({
          title: 'Test Story',
          characterConcept: 'A seasoned ranger patrolling the north.',
        }),
        updatedAt: baselineUpdatedAt,
      };

      const updated = updateStoryWithNewCharacterCanon(story, {
        'Bobby Western': ['Bobby is in a coma'],
        'Dr. Cohen': ['Dr. Cohen is a psychiatrist'],
      });

      expect(updated).not.toBe(story);
      expect(updated.globalCharacterCanon).toEqual({
        'Bobby Western': ['Bobby is in a coma'],
        'Dr Cohen': ['Dr. Cohen is a psychiatrist'],
      });
      expect(updated.updatedAt.getTime()).toBeGreaterThan(baselineUpdatedAt.getTime());
    });

    it('returns same story object when no new facts are provided', () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A traveling artificer with a hidden map.',
      });

      const updated = updateStoryWithNewCharacterCanon(story, {});

      expect(updated).toBe(story);
    });

    it('merges with existing character canon using existing key casing', () => {
      const story = {
        ...createStory({
          title: 'Test Story',
          characterConcept: 'A hopeful knight serving a stormbound kingdom.',
        }),
        globalCharacterCanon: { 'Bobby Western': ['Bobby is in Italy'] },
      };

      const updated = updateStoryWithNewCharacterCanon(story, {
        'bobby western': ['Bobby inherited gold'],
      });

      // Uses existing key casing
      expect(updated.globalCharacterCanon).toEqual({
        'Bobby Western': ['Bobby is in Italy', 'Bobby inherited gold'],
      });
    });
  });

  describe('updateStoryWithAllCanon', () => {
    it('updates both world canon and character canon', () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A scout crossing the ember dunes at dusk.',
      });

      const updated = updateStoryWithAllCanon(story, ['The year is 1972'], {
        Margaret: ['Margaret is the intake nurse'],
      });

      expect(updated.globalCanon).toEqual(['The year is 1972']);
      expect(updated.globalCharacterCanon).toEqual({
        Margaret: ['Margaret is the intake nurse'],
      });
    });

    it('returns same story when both are empty', () => {
      const story = createStory({ title: 'Test Story', characterConcept: 'A wandering scholar.' });

      const updated = updateStoryWithAllCanon(story, [], {});

      expect(updated).toBe(story);
    });

    it('updates only world canon when character canon is empty', () => {
      const story = createStory({ title: 'Test Story', characterConcept: 'A wandering scholar.' });

      const updated = updateStoryWithAllCanon(story, ['New world fact'], {});

      expect(updated.globalCanon).toEqual(['New world fact']);
      expect(updated.globalCharacterCanon).toEqual({});
    });

    it('updates only character canon when world canon is empty', () => {
      const story = createStory({ title: 'Test Story', characterConcept: 'A wandering scholar.' });

      const updated = updateStoryWithAllCanon(story, [], {
        'The Kid': ['The Kid is an eidolon'],
      });

      expect(updated.globalCanon).toEqual([]);
      expect(updated.globalCharacterCanon).toEqual({
        'The Kid': ['The Kid is an eidolon'],
      });
    });

    it('accepts tagged canon facts for world canon', () => {
      const story = createStory({ title: 'Test Story', characterConcept: 'A wandering scholar.' });
      const tagged: TaggedCanonFact = { text: 'The year is 1972', factType: 'LAW' };

      const updated = updateStoryWithAllCanon(story, [tagged], {});

      expect(updated.globalCanon).toEqual([{ text: 'The year is 1972', factType: 'LAW' }]);
    });
  });

  describe('Helper functions (canonFactText, canonFactType, isTaggedCanonFact)', () => {
    it('canonFactText returns text from a tagged fact', () => {
      const tagged: TaggedCanonFact = { text: 'The dragon sleeps', factType: 'BELIEF' };
      expect(canonFactText(tagged)).toBe('The dragon sleeps');
    });

    it('canonFactText returns the string for a bare string fact', () => {
      expect(canonFactText('The citadel stands')).toBe('The citadel stands');
    });

    it('canonFactType returns factType from a tagged fact', () => {
      const tagged: TaggedCanonFact = { text: 'Magic is banned', factType: 'LAW' };
      expect(canonFactType(tagged)).toBe('LAW');
    });

    it('canonFactType returns undefined for a bare string fact', () => {
      expect(canonFactType('The citadel stands')).toBeUndefined();
    });

    it('isTaggedCanonFact returns true for tagged facts', () => {
      const tagged: TaggedCanonFact = { text: 'Rumor of gold', factType: 'RUMOR' };
      expect(isTaggedCanonFact(tagged)).toBe(true);
    });

    it('isTaggedCanonFact returns false for bare strings', () => {
      expect(isTaggedCanonFact('Just a string')).toBe(false);
    });

    it('isTaggedCanonFact returns false for null-ish values cast as CanonFact', () => {
      // Ensure the guard handles edge cases safely
      expect(isTaggedCanonFact('' as CanonFact)).toBe(false);
    });
  });

  describe('formatCanonForPrompt with tagged facts', () => {
    it('formats tagged facts with type prefix', () => {
      const canon: CanonFact[] = [{ text: 'Magic is banned', factType: 'LAW' }];
      expect(formatCanonForPrompt(canon)).toBe('• [LAW] Magic is banned');
    });

    it('formats mixed tagged and untagged facts', () => {
      const canon: CanonFact[] = [
        'The citadel stands',
        { text: 'Dragons are rumored to exist', factType: 'RUMOR' },
        { text: 'The council meets weekly', factType: 'NORM' },
      ];
      const formatted = formatCanonForPrompt(canon);
      expect(formatted).toBe(
        '• The citadel stands\n• [RUMOR] Dragons are rumored to exist\n• [NORM] The council meets weekly'
      );
    });

    it('handles all factType values correctly', () => {
      const types = ['LAW', 'NORM', 'BELIEF', 'DISPUTED', 'RUMOR', 'MYSTERY'] as const;
      for (const factType of types) {
        const canon: CanonFact[] = [{ text: 'Test fact', factType }];
        expect(formatCanonForPrompt(canon)).toBe(`• [${factType}] Test fact`);
      }
    });
  });

  describe('updateStoryWithNewCanon with tagged facts', () => {
    it('adds tagged facts preserving their type', () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A ranger.',
      });
      const tagged: TaggedCanonFact = { text: 'The river is poisoned', factType: 'BELIEF' };

      const updated = updateStoryWithNewCanon(story, [tagged]);

      expect(updated.globalCanon).toEqual([{ text: 'The river is poisoned', factType: 'BELIEF' }]);
    });

    it('deduplicates tagged facts against existing bare string canon', () => {
      const story = {
        ...createStory({ title: 'Test', characterConcept: 'A scout.' }),
        globalCanon: ['The dragon is alive'] as CanonFact[],
      };
      const tagged: TaggedCanonFact = { text: 'The dragon is alive', factType: 'LAW' };

      const updated = updateStoryWithNewCanon(story, [tagged]);

      // Should not add a duplicate
      expect(updated).toBe(story);
    });

    it('deduplicates bare string facts against existing tagged canon', () => {
      const story = {
        ...createStory({ title: 'Test', characterConcept: 'A scout.' }),
        globalCanon: [{ text: 'The dragon is alive', factType: 'LAW' }] as CanonFact[],
      };

      const updated = updateStoryWithNewCanon(story, ['The dragon is alive']);

      expect(updated).toBe(story);
    });
  });

  describe('mightContradictCanon with tagged facts', () => {
    it('detects contradiction against tagged canon facts', () => {
      const canon: CanonFact[] = [{ text: 'The dragon is alive', factType: 'LAW' }];
      expect(mightContradictCanon(canon, 'The dragon died in battle')).toBe(true);
    });

    it('allows compatible facts against tagged canon', () => {
      const canon: CanonFact[] = [{ text: 'The kingdom exists', factType: 'BELIEF' }];
      expect(mightContradictCanon(canon, 'The kingdom is prosperous')).toBe(false);
    });
  });
});
