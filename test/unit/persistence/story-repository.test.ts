import * as fsPromises from 'fs/promises';
import {
  Story,
  StoryId,
  StoryStructure,
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
          { id: '1.1', description: 'Meet the guide', objective: 'Find an ally' },
          { id: '1.2', description: 'Cross the threshold', objective: 'Leave safety' },
        ],
      },
    ],
    overallTheme: 'Hope against fear',
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
    globalCanon: ['fact-1', 'fact-2'],
    ...overrides,
  };
}

function buildVersionedStructureChain() {
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
          { id: '1.1', description: 'Escape the ambush', objective: 'Survive' },
          { id: '1.2', description: 'Find a new lead', objective: 'Regain momentum' },
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

    const persisted = await fsPromises.readFile(getStoryFilePath(story.id), 'utf-8');
    const parsed = JSON.parse(persisted) as Record<string, unknown>;
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
  });

  it('loadStory defaults structureVersions to empty array for legacy files', async () => {
    const legacyStory = buildTestStory();
    createdStoryIds.add(legacyStory.id);

    await ensureDirectory(getStoryDir(legacyStory.id));
    await writeJsonFile(getStoryFilePath(legacyStory.id), {
      id: legacyStory.id,
      title: legacyStory.title,
      characterConcept: legacyStory.characterConcept,
      worldbuilding: legacyStory.worldbuilding,
      tone: legacyStory.tone,
      globalCanon: legacyStory.globalCanon,
      globalCharacterCanon: legacyStory.globalCharacterCanon,
      structure: null,
      createdAt: legacyStory.createdAt.toISOString(),
      updatedAt: legacyStory.updatedAt.toISOString(),
    });

    const loaded = await loadStory(legacyStory.id);
    expect(loaded?.structureVersions).toEqual([]);
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
      globalCanon: ['updated-fact'],
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    };

    await updateStory(updatedStory);

    const loaded = await loadStory(story.id);
    expect(loaded?.worldbuilding).toBe('Updated worldbuilding');
    expect(loaded?.globalCanon).toEqual(['updated-fact']);
    expect(loaded?.structure).toBeNull();
    expect(loaded?.updatedAt.toISOString()).toBe('2025-01-02T00:00:00.000Z');
  });

  it('updateStory throws when the story does not exist', async () => {
    const missingStory = buildTestStory({ id: MISSING_STORY_ID });

    await expect(updateStory(missingStory)).rejects.toThrow(
      `Story ${MISSING_STORY_ID} does not exist`,
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

    await fsPromises.writeFile(
      `${getStoryDir(newerStory.id)}/page_1.json`,
      '{"id":1}',
      'utf-8',
    );
    await fsPromises.writeFile(
      `${getStoryDir(newerStory.id)}/page_2.json`,
      '{"id":2}',
      'utf-8',
    );
    await fsPromises.writeFile(
      `${getStoryDir(olderStory.id)}/page_1.json`,
      '{"id":1}',
      'utf-8',
    );

    const listedStories = await listStories();
    const listedTestStories = listedStories.filter((story) =>
      story.characterConcept.startsWith(TEST_PREFIX),
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
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    await expect(loadStory(MISMATCH_REQUEST_ID)).rejects.toThrow(
      `Story ID mismatch: expected ${MISMATCH_REQUEST_ID}, found ${MISMATCH_FILE_ID}`,
    );
  });
});
