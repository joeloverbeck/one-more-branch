import {
  Story,
  generateStoryId,
  createStructureVersionId,
  parsePageId,
} from '@/models';
import type { StorySpine } from '@/models/story-spine';
import type { DecomposedCharacter } from '@/models/decomposed-character';
import type { DecomposedWorld } from '@/models/decomposed-world';
import type { CanonFact } from '@/models/state/canon';
import type { NpcRelationship } from '@/models/state/npc-relationship';
import { serializeStory, deserializeStory, StoryFileData } from '@/persistence/story-serializer';

const TEST_STORY_ID = generateStoryId();

function buildMinimalStory(overrides?: Partial<Story>): Story {
  return {
    id: TEST_STORY_ID,
    title: 'Test Story',
    characterConcept: 'A brave hero',
    worldbuilding: 'A dark world',
    tone: 'gritty',
    globalCanon: [],
    globalCharacterCanon: {},
    structure: null,
    structureVersions: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function buildSpine(): StorySpine {
  return {
    centralDramaticQuestion: 'Will the hero survive?',
    protagonistNeedVsWant: {
      need: 'redemption',
      want: 'power',
      dynamic: 'DIVERGENT',
    },
    primaryAntagonisticForce: {
      description: 'The dark lord',
      pressureMechanism: 'army',
    },
    storySpineType: 'QUEST',
    conflictAxis: 'INDIVIDUAL_VS_SYSTEM',
    conflictType: 'PERSON_VS_SOCIETY',
    characterArcType: 'POSITIVE_CHANGE',
    toneFeel: ['dark', 'brooding'],
    toneAvoid: ['silly', 'whimsical'],
  };
}

function buildDecomposedCharacter(): DecomposedCharacter {
  return {
    name: 'Gandalf',
    speechFingerprint: {
      catchphrases: ['You shall not pass'],
      vocabularyProfile: 'archaic',
      sentencePatterns: 'declarative',
      verbalTics: ['hmm'],
      dialogueSamples: ['A wizard is never late'],
      metaphorFrames: 'fire and light',
      antiExamples: ['yo what up'],
      discourseMarkers: ['indeed'],
      registerShifts: 'formal to stern',
    },
    coreTraits: ['wise', 'patient'],
    motivations: 'Protect Middle Earth',
    protagonistRelationship: {
      valence: 3,
      dynamic: 'mentor',
      history: 'Met at the Shire',
      currentTension: 'Frodo doubts him',
      leverage: 'Knowledge of the ring',
    },
    knowledgeBoundaries: 'Does not know Sauron\'s exact plans',
    falseBeliefs: ['Saruman is still good'],
    secretsKept: ['The true nature of the Palantir'],
    decisionPattern: 'Cautious but decisive',
    coreBeliefs: ['Good will prevail'],
    conflictPriority: 'Protect the innocent',
    appearance: 'Tall grey robed wizard',
    rawDescription: 'A powerful wizard',
  };
}

function buildDecomposedWorld(): DecomposedWorld {
  return {
    facts: [
      { domain: 'geography', fact: 'Mordor lies to the east', scope: 'global', factType: 'LAW' },
      { domain: 'society', fact: 'Elves distrust dwarves', scope: 'regional' },
    ],
    rawWorldbuilding: 'A vast fantasy world',
  };
}

describe('story-serializer', () => {
  describe('round-trip: serializeStory -> deserializeStory', () => {
    it('preserves basic fields', () => {
      const story = buildMinimalStory();
      const result = deserializeStory(serializeStory(story));

      expect(result.id).toBe(story.id);
      expect(result.title).toBe(story.title);
      expect(result.characterConcept).toBe(story.characterConcept);
      expect(result.worldbuilding).toBe(story.worldbuilding);
      expect(result.tone).toBe(story.tone);
      expect(result.createdAt).toEqual(story.createdAt);
      expect(result.updatedAt).toEqual(story.updatedAt);
    });

    it('preserves toneFeel and toneAvoid', () => {
      const story = buildMinimalStory({ toneFeel: ['dark', 'grim'], toneAvoid: ['light'] });
      const result = deserializeStory(serializeStory(story));

      expect(result.toneFeel).toEqual(['dark', 'grim']);
      expect(result.toneAvoid).toEqual(['light']);
    });

    it('preserves spine data', () => {
      const spine = buildSpine();
      const story = buildMinimalStory({ spine });
      const result = deserializeStory(serializeStory(story));

      expect(result.spine).toBeDefined();
      expect(result.spine!.centralDramaticQuestion).toBe(spine.centralDramaticQuestion);
      expect(result.spine!.protagonistNeedVsWant).toEqual(spine.protagonistNeedVsWant);
      expect(result.spine!.primaryAntagonisticForce).toEqual(spine.primaryAntagonisticForce);
      expect(result.spine!.storySpineType).toBe(spine.storySpineType);
      expect(result.spine!.conflictAxis).toBe(spine.conflictAxis);
      expect(result.spine!.conflictType).toBe(spine.conflictType);
      expect(result.spine!.characterArcType).toBe(spine.characterArcType);
      expect(result.spine!.toneFeel).toEqual([...spine.toneFeel]);
      expect(result.spine!.toneAvoid).toEqual([...spine.toneAvoid]);
    });

    it('preserves story structure', () => {
      const story = buildMinimalStory({
        structure: {
          acts: [
            {
              id: 'act-1',
              name: 'Act One',
              objective: 'Setup',
              stakes: 'Low',
              entryCondition: 'Start',
              beats: [
                {
                  id: 'beat-1',
                  name: 'Opening',
                  description: 'The beginning',
                  objective: 'Introduce hero',
                  role: 'setup',
                },
              ],
            },
          ],
          overallTheme: 'Redemption',
          premise: 'A hero rises',
          pacingBudget: { targetPagesMin: 10, targetPagesMax: 20 },
          generatedAt: new Date('2025-01-01T12:00:00.000Z'),
        },
      });

      const result = deserializeStory(serializeStory(story));

      expect(result.structure).not.toBeNull();
      expect(result.structure!.acts).toHaveLength(1);
      expect(result.structure!.acts[0].beats).toHaveLength(1);
      expect(result.structure!.acts[0].beats[0].role).toBe('setup');
      expect(result.structure!.overallTheme).toBe('Redemption');
      expect(result.structure!.generatedAt).toEqual(new Date('2025-01-01T12:00:00.000Z'));
    });

    it('preserves structure versions', () => {
      const story = buildMinimalStory({
        structureVersions: [
          {
            id: createStructureVersionId(),
            structure: {
              acts: [],
              overallTheme: 'Test',
              premise: 'Test',
              pacingBudget: { targetPagesMin: 5, targetPagesMax: 10 },
              generatedAt: new Date('2025-01-01T00:00:00.000Z'),
            },
            previousVersionId: null,
            createdAtPageId: parsePageId(3),
            rewriteReason: 'deviation',
            preservedBeatIds: ['beat-1', 'beat-2'],
            createdAt: new Date('2025-01-02T00:00:00.000Z'),
          },
        ],
      });

      const result = deserializeStory(serializeStory(story));

      expect(result.structureVersions).toHaveLength(1);
      expect(result.structureVersions[0].id).toBe(story.structureVersions[0].id);
      expect(result.structureVersions[0].createdAtPageId).toBe(3);
      expect(result.structureVersions[0].preservedBeatIds).toEqual(['beat-1', 'beat-2']);
    });

    it('preserves decomposed characters', () => {
      const char = buildDecomposedCharacter();
      const story = buildMinimalStory({ decomposedCharacters: [char] });
      const result = deserializeStory(serializeStory(story));

      expect(result.decomposedCharacters).toHaveLength(1);
      const roundTripped = result.decomposedCharacters![0];
      expect(roundTripped.name).toBe(char.name);
      expect(roundTripped.speechFingerprint.catchphrases).toEqual([...char.speechFingerprint.catchphrases]);
      expect(roundTripped.protagonistRelationship).toEqual(char.protagonistRelationship);
      expect(roundTripped.falseBeliefs).toEqual([...char.falseBeliefs!]);
      expect(roundTripped.secretsKept).toEqual([...char.secretsKept!]);
    });

    it('preserves decomposed world', () => {
      const world = buildDecomposedWorld();
      const story = buildMinimalStory({ decomposedWorld: world });
      const result = deserializeStory(serializeStory(story));

      expect(result.decomposedWorld).toBeDefined();
      expect(result.decomposedWorld!.facts).toHaveLength(2);
      expect(result.decomposedWorld!.facts[0].factType).toBe('LAW');
      expect(result.decomposedWorld!.rawWorldbuilding).toBe(world.rawWorldbuilding);
    });

    it('preserves global canon', () => {
      const canon: CanonFact[] = [
        { text: 'The ring is dangerous', factType: 'LAW' },
        { text: 'Elves are immortal', factType: 'NORM' },
      ];
      const story = buildMinimalStory({ globalCanon: canon });
      const result = deserializeStory(serializeStory(story));

      expect(result.globalCanon).toHaveLength(2);
      expect(result.globalCanon[0]).toEqual(canon[0]);
      expect(result.globalCanon[1]).toEqual(canon[1]);
    });

    it('preserves global character canon', () => {
      const story = buildMinimalStory({
        globalCharacterCanon: { Gandalf: ['Is a wizard', 'Carries a staff'] },
      });
      const result = deserializeStory(serializeStory(story));

      expect(result.globalCharacterCanon).toEqual({ Gandalf: ['Is a wizard', 'Carries a staff'] });
    });

    it('preserves NPCs and startingSituation', () => {
      const story = buildMinimalStory({
        npcs: [{ name: 'Gandalf', description: 'A wizard' }],
        startingSituation: 'In a dark cave',
      });
      const result = deserializeStory(serializeStory(story));

      expect(result.npcs).toEqual([{ name: 'Gandalf', description: 'A wizard' }]);
      expect(result.startingSituation).toBe('In a dark cave');
    });

    it('preserves initial NPC agendas', () => {
      const story = buildMinimalStory({
        initialNpcAgendas: [
          {
            npcName: 'Gandalf',
            currentGoal: 'Defeat Sauron',
            leverage: 'Magic',
            fear: 'Corruption',
            offScreenBehavior: 'Gathering allies',
          },
        ],
      });
      const result = deserializeStory(serializeStory(story));

      expect(result.initialNpcAgendas).toHaveLength(1);
      expect(result.initialNpcAgendas![0].npcName).toBe('Gandalf');
    });

    it('preserves initial NPC relationships', () => {
      const relationships: NpcRelationship[] = [
        {
          npcName: 'Gandalf',
          valence: 3,
          dynamic: 'mentor',
          history: 'Long friendship',
          currentTension: 'None',
          leverage: 'Wisdom',
        },
      ];
      const story = buildMinimalStory({ initialNpcRelationships: relationships });
      const result = deserializeStory(serializeStory(story));

      expect(result.initialNpcRelationships).toHaveLength(1);
      expect(result.initialNpcRelationships![0]).toEqual(relationships[0]);
    });
  });

  describe('legacy field fallbacks', () => {
    it('falls back toneKeywords to toneFeel', () => {
      const fileData: StoryFileData = {
        ...serializeStory(buildMinimalStory()),
        toneKeywords: ['moody', 'tense'],
      };
      delete fileData.toneFeel;
      const result = deserializeStory(fileData);

      expect(result.toneFeel).toEqual(['moody', 'tense']);
    });

    it('falls back toneAntiKeywords to toneAvoid', () => {
      const fileData: StoryFileData = {
        ...serializeStory(buildMinimalStory()),
        toneAntiKeywords: ['happy'],
      };
      delete fileData.toneAvoid;
      const result = deserializeStory(fileData);

      expect(result.toneAvoid).toEqual(['happy']);
    });

    it('falls back spine toneKeywords to toneFeel', () => {
      const story = buildMinimalStory({ spine: buildSpine() });
      const fileData = serializeStory(story);
      // Simulate legacy: rename toneFeel/toneAvoid to toneKeywords/toneAntiKeywords on spine
      fileData.spine!.toneKeywords = fileData.spine!.toneFeel;
      fileData.spine!.toneAntiKeywords = fileData.spine!.toneAvoid;
      delete fileData.spine!.toneFeel;
      delete fileData.spine!.toneAvoid;

      const result = deserializeStory(fileData);

      expect(result.spine!.toneFeel).toEqual(['dark', 'brooding']);
      expect(result.spine!.toneAvoid).toEqual(['silly', 'whimsical']);
    });
  });

  describe('optional field handling', () => {
    it('handles absent spine gracefully', () => {
      const story = buildMinimalStory();
      const result = deserializeStory(serializeStory(story));
      expect(result.spine).toBeUndefined();
    });

    it('handles absent decomposedCharacters gracefully', () => {
      const story = buildMinimalStory();
      const result = deserializeStory(serializeStory(story));
      expect(result.decomposedCharacters).toBeUndefined();
    });

    it('handles absent decomposedWorld gracefully', () => {
      const story = buildMinimalStory();
      const result = deserializeStory(serializeStory(story));
      expect(result.decomposedWorld).toBeUndefined();
    });

    it('handles null structure', () => {
      const story = buildMinimalStory({ structure: null });
      const result = deserializeStory(serializeStory(story));
      expect(result.structure).toBeNull();
    });
  });

  describe('canon fact validation', () => {
    it('preserves valid factType values', () => {
      const canon: CanonFact[] = [
        { text: 'A law', factType: 'LAW' },
        { text: 'A belief', factType: 'BELIEF' },
        { text: 'A rumor', factType: 'RUMOR' },
        { text: 'A mystery', factType: 'MYSTERY' },
        { text: 'A disputed', factType: 'DISPUTED' },
      ];
      const story = buildMinimalStory({ globalCanon: canon });
      const result = deserializeStory(serializeStory(story));

      expect(result.globalCanon.map((f) => f.factType)).toEqual([
        'LAW',
        'BELIEF',
        'RUMOR',
        'MYSTERY',
        'DISPUTED',
      ]);
    });

    it('defaults invalid factType to NORM', () => {
      const fileData = serializeStory(buildMinimalStory());
      fileData.globalCanon = [{ text: 'Bad fact', factType: 'INVALID_TYPE' }];
      const result = deserializeStory(fileData);

      expect(result.globalCanon[0].factType).toBe('NORM');
    });
  });

  describe('deriveInitialNpcRelationshipsFromDecomposed', () => {
    it('derives relationships from decomposed characters when initialNpcRelationships is absent', () => {
      const char = buildDecomposedCharacter();
      const story = buildMinimalStory({ decomposedCharacters: [char] });
      const fileData = serializeStory(story);
      // Remove explicit relationships to trigger legacy derivation
      delete fileData.initialNpcRelationships;

      const result = deserializeStory(fileData);

      expect(result.initialNpcRelationships).toBeDefined();
      expect(result.initialNpcRelationships).toHaveLength(1);
      expect(result.initialNpcRelationships![0].npcName).toBe('Gandalf');
      expect(result.initialNpcRelationships![0].valence).toBe(3);
    });

    it('does not derive if decomposedCharacters is absent', () => {
      const fileData = serializeStory(buildMinimalStory());
      delete fileData.initialNpcRelationships;
      delete fileData.decomposedCharacters;

      const result = deserializeStory(fileData);

      expect(result.initialNpcRelationships).toBeUndefined();
    });
  });

  describe('deep copy verification', () => {
    it('serialized output does not share references with input', () => {
      const story = buildMinimalStory({
        globalCanon: [{ text: 'fact', factType: 'NORM' }],
        globalCharacterCanon: { NPC: ['trait'] },
      });

      const serialized = serializeStory(story);
      // Mutate serialized output
      serialized.globalCanon[0].text = 'MUTATED';
      serialized.globalCharacterCanon['NPC'][0] = 'MUTATED';

      // Original story should be unaffected
      expect(story.globalCanon[0].text).toBe('fact');
      expect(story.globalCharacterCanon['NPC'][0]).toBe('trait');
    });

    it('deserialized output does not share references with file data', () => {
      const fileData = serializeStory(
        buildMinimalStory({
          globalCanon: [{ text: 'fact', factType: 'NORM' }],
          globalCharacterCanon: { NPC: ['trait'] },
        })
      );

      const result = deserializeStory(fileData);
      // Mutate file data
      fileData.globalCanon[0].text = 'MUTATED';
      fileData.globalCharacterCanon['NPC'][0] = 'MUTATED';

      // Deserialized result should be unaffected
      expect(result.globalCanon[0].text).toBe('fact');
      expect(result.globalCharacterCanon['NPC'][0]).toBe('trait');
    });
  });
});
