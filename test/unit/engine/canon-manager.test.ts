import {
  formatCanonForPrompt,
  mightContradictCanon,
  updateStoryWithNewCanon,
  updateStoryWithNewCharacterCanon,
  updateStoryWithAllCanon,
  validateNewFacts,
} from '../../../src/engine/canon-manager';
import { createStory } from '../../../src/models';
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

      const updated = updateStoryWithNewCanon(story, [
        { text: 'Fact A', factType: 'NORM' },
        { text: 'Fact B', factType: 'NORM' },
      ]);

      expect(updated).not.toBe(story);
      expect(updated.globalCanon).toEqual([
        { text: 'Fact A', factType: 'NORM' },
        { text: 'Fact B', factType: 'NORM' },
      ]);
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
        globalCanon: [{ text: 'The dragon is alive', factType: 'NORM' }] as CanonFact[],
      };

      const updated = updateStoryWithNewCanon(story, [
        { text: '  the dragon is alive  ', factType: 'NORM' },
      ]);

      expect(updated).toBe(story);
      expect(updated.globalCanon).toEqual([{ text: 'The dragon is alive', factType: 'NORM' }]);
    });

    it('deduplicates facts and keeps new unique entries', () => {
      const story = {
        ...createStory({
          title: 'Test Story',
          characterConcept: 'A scout crossing the ember dunes at dusk.',
        }),
        globalCanon: [{ text: 'The citadel stands', factType: 'NORM' }] as CanonFact[],
      };

      const updated = updateStoryWithNewCanon(story, [
        { text: 'the citadel stands', factType: 'NORM' },
        { text: 'A moon gate exists', factType: 'NORM' },
      ]);

      expect(updated.globalCanon).toEqual([
        { text: 'The citadel stands', factType: 'NORM' },
        { text: 'A moon gate exists', factType: 'NORM' },
      ]);
    });
  });

  describe('formatCanonForPrompt', () => {
    it('formats canon as a bulleted list', () => {
      const formatted = formatCanonForPrompt([
        { text: 'Fact A', factType: 'NORM' },
        { text: 'Fact B', factType: 'NORM' },
      ]);

      expect(formatted).toBe('• [NORM] Fact A\n• [NORM] Fact B');
    });

    it('returns empty string for empty canon', () => {
      expect(formatCanonForPrompt([])).toBe('');
    });

    it('handles a single fact', () => {
      expect(formatCanonForPrompt([{ text: 'Only fact', factType: 'NORM' }])).toBe(
        '• [NORM] Only fact'
      );
    });

    it('formats tagged facts with type prefix', () => {
      const canon: CanonFact[] = [{ text: 'Magic is banned', factType: 'LAW' }];
      expect(formatCanonForPrompt(canon)).toBe('• [LAW] Magic is banned');
    });

    it('formats multiple tagged facts with different types', () => {
      const canon: CanonFact[] = [
        { text: 'The citadel stands', factType: 'NORM' },
        { text: 'Dragons are rumored to exist', factType: 'RUMOR' },
        { text: 'The council meets weekly', factType: 'NORM' },
      ];
      const formatted = formatCanonForPrompt(canon);
      expect(formatted).toBe(
        '• [NORM] The citadel stands\n• [RUMOR] Dragons are rumored to exist\n• [NORM] The council meets weekly'
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

  describe('mightContradictCanon', () => {
    it('detects alive vs died contradiction', () => {
      const result = mightContradictCanon(
        [{ text: 'The dragon is alive', factType: 'NORM' }],
        'The dragon died in battle'
      );

      expect(result).toBe(true);
    });

    it('allows compatible facts about the same entity', () => {
      const result = mightContradictCanon(
        [{ text: 'The kingdom exists', factType: 'NORM' }],
        'The kingdom is prosperous'
      );

      expect(result).toBe(false);
    });

    it('returns false for unrelated facts', () => {
      const result = mightContradictCanon(
        [{ text: 'The lighthouse shines over the western coast', factType: 'NORM' }],
        'The inventor builds a brass automaton'
      );

      expect(result).toBe(false);
    });

    it('handles case-insensitive matching', () => {
      const result = mightContradictCanon(
        [{ text: 'THE DRAGON IS ALIVE', factType: 'NORM' }],
        'the dragon DIED yesterday'
      );

      expect(result).toBe(true);
    });

    it('does not flag matching negation polarity as contradiction', () => {
      const result = mightContradictCanon(
        [{ text: 'The dragon died in battle', factType: 'NORM' }],
        'The dragon died defending the gate'
      );

      expect(result).toBe(false);
    });
  });

  describe('validateNewFacts', () => {
    it('returns potentially problematic facts', () => {
      const canon: CanonFact[] = [
        { text: 'The dragon is alive', factType: 'NORM' },
        { text: 'The citadel stands', factType: 'NORM' },
      ];
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
        [
          { text: 'The kingdom prospers', factType: 'NORM' },
          { text: 'A hidden library exists', factType: 'NORM' },
        ],
        ['Merchants arrive every spring']
      );

      expect(problematic).toEqual([]);
    });

    it('checks all facts in the input array', () => {
      const problematic = validateNewFacts(
        [{ text: 'The dragon is alive', factType: 'NORM' }],
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

      const updated = updateStoryWithAllCanon(
        story,
        [{ text: 'The year is 1972', factType: 'NORM' }],
        {
          Margaret: ['Margaret is the intake nurse'],
        }
      );

      expect(updated.globalCanon).toEqual([{ text: 'The year is 1972', factType: 'NORM' }]);
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

      const updated = updateStoryWithAllCanon(
        story,
        [{ text: 'New world fact', factType: 'NORM' }],
        {}
      );

      expect(updated.globalCanon).toEqual([{ text: 'New world fact', factType: 'NORM' }]);
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

    it('deduplicates tagged facts against existing tagged canon', () => {
      const story = {
        ...createStory({ title: 'Test', characterConcept: 'A scout.' }),
        globalCanon: [{ text: 'The dragon is alive', factType: 'NORM' }] as CanonFact[],
      };
      const tagged: TaggedCanonFact = { text: 'The dragon is alive', factType: 'LAW' };

      const updated = updateStoryWithNewCanon(story, [tagged]);

      // Should not add a duplicate
      expect(updated).toBe(story);
    });

    it('deduplicates tagged facts against existing tagged canon (reverse)', () => {
      const story = {
        ...createStory({ title: 'Test', characterConcept: 'A scout.' }),
        globalCanon: [{ text: 'The dragon is alive', factType: 'LAW' }] as CanonFact[],
      };

      const updated = updateStoryWithNewCanon(story, [
        { text: 'The dragon is alive', factType: 'NORM' },
      ]);

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
