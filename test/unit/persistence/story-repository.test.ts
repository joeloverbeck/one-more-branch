import * as fsPromises from 'fs/promises';
import {
  Story,
  StoryId,
  StoryStructure,
  VersionedStoryStructure,
  createStory,
  parsePageId,
  parseStoryId,
  parseStructureVersionId,
} from '@/models';
import {
  deleteDirectory,
  ensureDirectory,
  getStoryDir,
  getStoryFilePath,
  writeJsonFile,
} from '@/persistence/file-utils';
import {
  deleteStory,
  getPageCount,
  listStories,
  loadStory,
  saveStory,
  storyExists,
  updateStory,
} from '@/persistence/story-repository';

const TEST_PREFIX = 'TEST: PERLAY-003';
const MISSING_STORY_ID = parseStoryId('00000000-0000-4000-8000-000000000001');
const MISMATCH_REQUEST_ID = parseStoryId('00000000-0000-4000-8000-000000000002');
const MISMATCH_FILE_ID = parseStoryId('00000000-0000-4000-8000-000000000003');

function buildTestStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act I',
        objective: 'Start the journey',
        stakes: 'Lose your home',
        entryCondition: 'A call to action appears',
        beats: [
          {
            id: '1.1',
            name: 'Guide encounter',
            description: 'Meet the guide',
            objective: 'Find an ally',
            role: 'setup',
          },
          {
            id: '1.2',
            name: 'Threshold crossing',
            description: 'Cross the threshold',
            objective: 'Leave safety',
            role: 'turning_point',
          },
        ],
      },
    ],
    overallTheme: 'Hope against fear',
    premise: 'A sheltered survivor must leave home to stop a spreading ruin.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 35 },
    generatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };
}

function buildTestStory(overrides?: Partial<Story>): Story {
  const baseStory = createStory({
    title: `${TEST_PREFIX} title`,
    characterConcept: `${TEST_PREFIX} character`,
    worldbuilding: 'Test worldbuilding',
    tone: 'Test tone',
  });

  return {
    ...baseStory,
    globalCanon: [
      { text: 'fact-1', factType: 'NORM' as const },
      { text: 'fact-2', factType: 'NORM' as const },
    ],
    ...overrides,
  };
}

function buildVersionedStructureChain(): readonly VersionedStoryStructure[] {
  const initialStructure = buildTestStructure();
  const rewrittenStructure: StoryStructure = {
    ...buildTestStructure(),
    acts: [
      {
        id: '1',
        name: 'Act I',
        objective: 'Regroup',
        stakes: 'Lose the final clue',
        entryCondition: 'The plan fails',
        beats: [
          {
            id: '1.1',
            name: 'Ambush escape',
            description: 'Escape the ambush',
            objective: 'Survive',
            role: 'setup',
          },
          {
            id: '1.2',
            name: 'New lead',
            description: 'Find a new lead',
            objective: 'Regain momentum',
            role: 'escalation',
          },
        ],
      },
    ],
  };

  const firstVersionId = parseStructureVersionId('sv-1707321600000-a1b2');
  const secondVersionId = parseStructureVersionId('sv-1707321600001-c3d4');

  return [
    {
      id: firstVersionId,
      structure: initialStructure,
      previousVersionId: null,
      createdAtPageId: null,
      rewriteReason: null,
      preservedBeatIds: [],
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    },
    {
      id: secondVersionId,
      structure: rewrittenStructure,
      previousVersionId: firstVersionId,
      createdAtPageId: parsePageId(4),
      rewriteReason: 'Player joined the enemy faction',
      preservedBeatIds: ['1.1'],
      createdAt: new Date('2025-01-01T01:00:00.000Z'),
    },
  ] as const;
}

describe('story-repository', () => {
  const createdStoryIds = new Set<StoryId>();

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      await deleteStory(storyId);
    }

    createdStoryIds.clear();

    await deleteDirectory(getStoryDir(MISMATCH_REQUEST_ID));
  });

  it('saveStory/loadStory preserves all fields, including date precision', async () => {
    const createdAt = new Date('2025-01-01T01:02:03.456Z');
    const updatedAt = new Date('2025-01-01T04:05:06.789Z');
    const story = buildTestStory({
      createdAt,
      updatedAt,
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(story.id);
    expect(loaded?.characterConcept).toBe(story.characterConcept);
    expect(loaded?.worldbuilding).toBe(story.worldbuilding);
    expect(loaded?.tone).toBe(story.tone);
    expect(loaded?.globalCanon).toEqual(story.globalCanon);
    expect(loaded?.structure).toBeNull();
    expect(loaded?.structureVersions).toEqual([]);
    expect(loaded?.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(loaded?.updatedAt.toISOString()).toBe(updatedAt.toISOString());
  });

  it('saveStory/loadStory preserves structure fields and omits legacy storyArc', async () => {
    const story = buildTestStory({
      structure: buildTestStructure(),
    });
    createdStoryIds.add(story.id);

    await saveStory(story);

    const loaded = await loadStory(story.id);
    expect(loaded?.structure).toEqual(story.structure);
    expect(loaded?.structure?.acts[0]?.beats[0]?.name).toBe('Guide encounter');

    const persisted = await fsPromises.readFile(getStoryFilePath(story.id), 'utf-8');
    const parsed = JSON.parse(persisted) as Record<string, unknown>;
    const structure = parsed['structure'] as { acts: Array<{ beats: Array<{ name: string }> }> };
    expect(structure.acts[0]?.beats[0]?.name).toBe('Guide encounter');
    expect(parsed['structure']).toBeDefined();
    expect(parsed['storyArc']).toBeUndefined();
  });

  it('saveStory/loadStory preserves structureVersions and version chain fields', async () => {
    const structureVersions = buildVersionedStructureChain();
    const story = buildTestStory({
      structure: structureVersions[1].structure,
      structureVersions: [...structureVersions],
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded?.structureVersions).toEqual([...structureVersions]);

    const persisted = await fsPromises.readFile(getStoryFilePath(story.id), 'utf-8');
    const parsed = JSON.parse(persisted) as {
      structureVersions: Array<{ structure: { acts: Array<{ beats: Array<{ name: string }> }> } }>;
    };
    expect(parsed.structureVersions[0]?.structure.acts[0]?.beats[0]?.name).toBe('Guide encounter');
    expect(parsed.structureVersions[1]?.structure.acts[0]?.beats[0]?.name).toBe('Ambush escape');
  });

  it('loadStory returns null when story does not exist', async () => {
    await expect(loadStory(MISSING_STORY_ID)).resolves.toBeNull();
  });

  it('updateStory persists updated fields', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);

    await saveStory(story);

    const updatedStory: Story = {
      ...story,
      worldbuilding: 'Updated worldbuilding',
      globalCanon: [{ text: 'updated-fact', factType: 'NORM' as const }],
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    };

    await updateStory(updatedStory);

    const loaded = await loadStory(story.id);
    expect(loaded?.worldbuilding).toBe('Updated worldbuilding');
    expect(loaded?.globalCanon).toEqual([{ text: 'updated-fact', factType: 'NORM' }]);
    expect(loaded?.structure).toBeNull();
    expect(loaded?.updatedAt.toISOString()).toBe('2025-01-02T00:00:00.000Z');
  });

  it('updateStory throws when the story does not exist', async () => {
    const missingStory = buildTestStory({ id: MISSING_STORY_ID });

    await expect(updateStory(missingStory)).rejects.toThrow(
      `Story ${MISSING_STORY_ID} does not exist`
    );
  });

  it('storyExists returns true for existing story and false otherwise', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);

    await saveStory(story);

    await expect(storyExists(story.id)).resolves.toBe(true);
    await expect(storyExists(MISSING_STORY_ID)).resolves.toBe(false);
  });

  it('deleteStory removes the story and does not throw for missing stories', async () => {
    const story = buildTestStory();

    await saveStory(story);

    await expect(storyExists(story.id)).resolves.toBe(true);
    await deleteStory(story.id);
    await expect(storyExists(story.id)).resolves.toBe(false);

    await expect(deleteStory(MISSING_STORY_ID)).resolves.toBeUndefined();
  });

  it('listStories returns metadata sorted by createdAt descending with page counts', async () => {
    const olderStory = buildTestStory({
      characterConcept: `${TEST_PREFIX} older`,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    const newerStory = buildTestStory({
      characterConcept: `${TEST_PREFIX} newer`,
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
      updatedAt: new Date('2025-01-03T00:00:00.000Z'),
    });

    createdStoryIds.add(olderStory.id);
    createdStoryIds.add(newerStory.id);

    await saveStory(olderStory);
    await saveStory(newerStory);

    await fsPromises.writeFile(`${getStoryDir(newerStory.id)}/page_1.json`, '{"id":1}', 'utf-8');
    await fsPromises.writeFile(`${getStoryDir(newerStory.id)}/page_2.json`, '{"id":2}', 'utf-8');
    await fsPromises.writeFile(`${getStoryDir(olderStory.id)}/page_1.json`, '{"id":1}', 'utf-8');

    const listedStories = await listStories();
    const listedTestStories = listedStories.filter((story) =>
      story.characterConcept.startsWith(TEST_PREFIX)
    );

    expect(listedTestStories.length).toBeGreaterThanOrEqual(2);
    expect(listedTestStories[0]?.id).toBe(newerStory.id);
    expect(listedTestStories[1]?.id).toBe(olderStory.id);
    expect(listedTestStories[0]?.pageCount).toBe(2);
    expect(listedTestStories[1]?.pageCount).toBe(1);
    expect(listedTestStories[0]?.hasEnding).toBe(false);
    expect(listedTestStories[1]?.hasEnding).toBe(false);

    await expect(getPageCount(newerStory.id)).resolves.toBe(2);
    await expect(getPageCount(olderStory.id)).resolves.toBe(1);
  });

  it('saveStory/loadStory preserves toneFeel and toneAvoid', async () => {
    const story = buildTestStory({
      toneFeel: ['gritty', 'visceral', 'tense'],
      toneAvoid: ['whimsical', 'lighthearted'],
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.toneFeel).toEqual(['gritty', 'visceral', 'tense']);
    expect(loaded?.toneAvoid).toEqual(['whimsical', 'lighthearted']);
  });

  it('loadStory throws when persisted story id does not match the directory id', async () => {
    await ensureDirectory(getStoryDir(MISMATCH_REQUEST_ID));

    await writeJsonFile(getStoryFilePath(MISMATCH_REQUEST_ID), {
      id: MISMATCH_FILE_ID,
      title: `${TEST_PREFIX} mismatch title`,
      characterConcept: `${TEST_PREFIX} mismatch`,
      worldbuilding: 'Mismatch world',
      tone: 'Mismatch tone',
      globalCanon: [],
      globalCharacterCanon: {},
      structure: null,
      npcs: null,
      startingSituation: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    await expect(loadStory(MISMATCH_REQUEST_ID)).rejects.toThrow(
      `Story ID mismatch: expected ${MISMATCH_REQUEST_ID}, found ${MISMATCH_FILE_ID}`
    );
  });

  it('saveStory/loadStory preserves npcs field', async () => {
    const story = buildTestStory({
      npcs: [{ name: 'Holt', description: 'Grizzled barkeep who knows everyone' }],
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.npcs).toEqual([
      { name: 'Holt', description: 'Grizzled barkeep who knows everyone' },
    ]);
  });

  it('saveStory/loadStory preserves startingSituation field', async () => {
    const story = buildTestStory({ startingSituation: 'Waking up in a dungeon cell' });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.startingSituation).toBe('Waking up in a dungeon cell');
  });

  it('saveStory/loadStory preserves both npcs and startingSituation together', async () => {
    const story = buildTestStory({
      npcs: [{ name: 'Oracle', description: 'A mysterious oracle' }],
      startingSituation: 'Standing at the crossroads',
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.npcs).toEqual([{ name: 'Oracle', description: 'A mysterious oracle' }]);
    expect(loaded?.startingSituation).toBe('Standing at the crossroads');
  });

  it('saveStory/loadStory writes null for npcs and startingSituation when undefined', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);

    await saveStory(story);

    const persisted = await fsPromises.readFile(getStoryFilePath(story.id), 'utf-8');
    const parsed = JSON.parse(persisted) as Record<string, unknown>;

    expect('npcs' in parsed).toBe(true);
    expect(parsed['npcs']).toBeNull();
    expect('startingSituation' in parsed).toBe(true);
    expect(parsed['startingSituation']).toBeNull();
  });

  it('saveStory/loadStory roundtrips npcs as array of objects', async () => {
    const story = buildTestStory({
      npcs: [
        { name: 'Alice', description: 'A mentor figure' },
        { name: 'Bob', description: 'An antagonist' },
      ],
    });
    createdStoryIds.add(story.id);

    await saveStory(story);

    const persisted = await fsPromises.readFile(getStoryFilePath(story.id), 'utf-8');
    const parsed = JSON.parse(persisted) as Record<string, unknown>;

    expect(parsed['npcs']).toEqual([
      { name: 'Alice', description: 'A mentor figure' },
      { name: 'Bob', description: 'An antagonist' },
    ]);
  });

  it('saveStory/loadStory preserves initialNpcRelationships', async () => {
    const story = buildTestStory({
      initialNpcRelationships: [
        {
          npcName: 'Vera',
          valence: 3,
          dynamic: 'ally',
          history: 'Fought together in the war.',
          currentTension: 'Vera suspects betrayal.',
          leverage: 'Knows protagonist\'s secret.',
        },
      ],
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.initialNpcRelationships).toEqual([
      {
        npcName: 'Vera',
        valence: 3,
        dynamic: 'ally',
        history: 'Fought together in the war.',
        currentTension: 'Vera suspects betrayal.',
        leverage: 'Knows protagonist\'s secret.',
      },
    ]);
  });

  it('saveStory/loadStory preserves initialNpcAgendas', async () => {
    const story = buildTestStory({
      initialNpcAgendas: [
        {
          npcName: 'Holt',
          currentGoal: 'Protect the tavern',
          leverage: 'Controls the supply route',
          fear: 'Losing the tavern to raiders',
          offScreenBehavior: 'Fortifying defenses and gathering allies',
        },
      ],
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.initialNpcAgendas).toEqual([
      {
        npcName: 'Holt',
        currentGoal: 'Protect the tavern',
        leverage: 'Controls the supply route',
        fear: 'Losing the tavern to raiders',
        offScreenBehavior: 'Fortifying defenses and gathering allies',
      },
    ]);
  });

  it('loadStory derives initialNpcRelationships from decomposedCharacters for old stories', async () => {
    const story = buildTestStory({
      decomposedCharacters: [
        {
          name: 'Protagonist',
          speechFingerprint: {
            catchphrases: [],
            vocabularyProfile: 'casual',
            sentencePatterns: 'short',
            verbalTics: [],
            dialogueSamples: [],
            metaphorFrames: 'nature',
            antiExamples: [],
            discourseMarkers: [],
            registerShifts: 'none',
          },
          coreTraits: ['brave'],
          motivations: 'survive',
          protagonistRelationship: null,
          knowledgeBoundaries: 'limited',
          decisionPattern: 'impulsive',
          coreBeliefs: ['justice'],
          conflictPriority: 'survival',
          appearance: 'scarred',
          rawDescription: 'The protagonist',
        },
        {
          name: 'Mira',
          speechFingerprint: {
            catchphrases: ['Indeed'],
            vocabularyProfile: 'formal',
            sentencePatterns: 'complex',
            verbalTics: ['hmm'],
            dialogueSamples: ['Indeed, the path is clear.'],
            metaphorFrames: 'mechanical',
            antiExamples: ['yo'],
            discourseMarkers: ['furthermore'],
            registerShifts: 'formal-to-casual',
          },
          coreTraits: ['cunning'],
          motivations: 'power',
          protagonistRelationship: {
            valence: -2,
            dynamic: 'rival',
            history: 'Old rivals from school.',
            currentTension: 'Competing for the throne.',
            leverage: 'Holds damaging information.',
          },
          knowledgeBoundaries: 'extensive',
          decisionPattern: 'calculating',
          coreBeliefs: ['ends justify means'],
          conflictPriority: 'dominance',
          appearance: 'elegant',
          rawDescription: 'A cunning rival',
        },
      ],
    });
    createdStoryIds.add(story.id);

    // Save without initialNpcRelationships — simulates an old story
    await saveStory(story);

    // Manually strip initialNpcRelationships from the persisted JSON to simulate old format
    const filePath = getStoryFilePath(story.id);
    const raw = await fsPromises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    delete parsed['initialNpcRelationships'];
    await fsPromises.writeFile(filePath, JSON.stringify(parsed), 'utf-8');

    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.initialNpcRelationships).toEqual([
      {
        npcName: 'Mira',
        valence: -2,
        dynamic: 'rival',
        history: 'Old rivals from school.',
        currentTension: 'Competing for the throne.',
        leverage: 'Holds damaging information.',
      },
    ]);
  });

  it('loadStory loads correctly when story has no NPCs or initial NPC data', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.initialNpcAgendas).toBeUndefined();
    expect(loaded?.initialNpcRelationships).toBeUndefined();
  });
});
