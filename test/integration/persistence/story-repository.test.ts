import {
  Story,
  StoryId,
  StoryStructure,
  createChoice,
  createPage,
  createStory,
  parsePageId,
} from '@/models';
import {
  deleteStory,
  getPageCount,
  listStories,
  loadStory,
  saveStory,
  storyExists,
  updateStory,
} from '@/persistence/story-repository';
import { savePage } from '@/persistence/page-repository';

const TEST_PREFIX = 'TEST: PERLAY-006 story integration';

function buildStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act I',
        objective: 'Investigate the signal',
        stakes: 'City falls to chaos',
        entryCondition: 'Signal is detected',
        beats: [
          { id: '1.1', description: 'Trace source', objective: 'Find the tower' },
          { id: '1.2', description: 'Enter tower', objective: 'Reach control room' },
        ],
      },
    ],
    overallTheme: 'Trust and sacrifice',
    generatedAt: new Date('2025-02-01T00:00:00.000Z'),
  };
}

function buildStory(overrides?: Partial<Story>): Story {
  const base = createStory({
    title: `${TEST_PREFIX} title`,
    characterConcept: `${TEST_PREFIX} base`,
    worldbuilding: 'Integration world',
    tone: 'Integration tone',
  });

  return {
    ...base,
    globalCanon: ['canon-1', 'canon-2'],
    ...overrides,
  };
}

function expectLoadedStoryToMatchPersistedFields(loaded: Story | null, expected: Story): void {
  expect(loaded).not.toBeNull();
  expect(loaded?.id).toBe(expected.id);
  expect(loaded?.title).toBe(expected.title);
  expect(loaded?.characterConcept).toBe(expected.characterConcept);
  expect(loaded?.worldbuilding).toBe(expected.worldbuilding);
  expect(loaded?.tone).toBe(expected.tone);
  expect(loaded?.globalCanon).toEqual(expected.globalCanon);
  expect(loaded?.globalCharacterCanon).toEqual(expected.globalCharacterCanon);
  expect(loaded?.structure).toEqual(expected.structure);
  expect(loaded?.createdAt).toEqual(expected.createdAt);
  expect(loaded?.updatedAt).toEqual(expected.updatedAt);
  // structureVersions persistence is introduced in STRREWSYS-009/010.
  expect(loaded?.structureVersions).toBeUndefined();
}

describe('story-repository integration', () => {
  const createdStoryIds = new Set<StoryId>();

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      await deleteStory(storyId);
    }

    createdStoryIds.clear();

    const stories = await listStories();
    for (const story of stories) {
      if (story.characterConcept.startsWith(TEST_PREFIX)) {
        await deleteStory(story.id);
      }
    }
  });

  it('save/load round-trip preserves all story fields', async () => {
    const story = buildStory({
      createdAt: new Date('2025-02-01T01:02:03.004Z'),
      updatedAt: new Date('2025-02-01T05:06:07.008Z'),
      characterConcept: `${TEST_PREFIX} round-trip`,
      worldbuilding: 'Round trip world',
      tone: 'Round trip tone',
      globalCanon: ['fact-a', 'fact-b'],
      structure: buildStructure(),
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expectLoadedStoryToMatchPersistedFields(loaded, story);
  });

  it('save/load preserves null structure', async () => {
    const story = buildStory({
      characterConcept: `${TEST_PREFIX} null structure`,
      structure: null,
    });
    createdStoryIds.add(story.id);

    await saveStory(story);
    const loaded = await loadStory(story.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.structure).toBeNull();
  });

  it('story lifecycle create save update load delete transitions correctly', async () => {
    const story = buildStory({
      characterConcept: `${TEST_PREFIX} lifecycle`,
    });

    await saveStory(story);
    createdStoryIds.add(story.id);

    await expect(storyExists(story.id)).resolves.toBe(true);

    const updatedStory: Story = {
      ...story,
      worldbuilding: 'Updated worldbuilding',
      globalCanon: ['updated-canon'],
      updatedAt: new Date('2025-02-02T00:00:00.000Z'),
    };

    await updateStory(updatedStory);
    const loaded = await loadStory(story.id);
    expectLoadedStoryToMatchPersistedFields(loaded, updatedStory);

    await deleteStory(story.id);
    createdStoryIds.delete(story.id);

    await expect(storyExists(story.id)).resolves.toBe(false);
    await expect(loadStory(story.id)).resolves.toBeNull();
  });

  it('listStories returns matching metadata sorted by createdAt descending', async () => {
    const older = buildStory({
      characterConcept: `${TEST_PREFIX} older`,
      createdAt: new Date('2025-02-01T00:00:00.000Z'),
      updatedAt: new Date('2025-02-01T00:00:00.000Z'),
    });
    const newer = buildStory({
      characterConcept: `${TEST_PREFIX} newer`,
      createdAt: new Date('2025-02-02T00:00:00.000Z'),
      updatedAt: new Date('2025-02-02T00:00:00.000Z'),
    });

    createdStoryIds.add(older.id);
    createdStoryIds.add(newer.id);

    await saveStory(older);
    await saveStory(newer);

    const stories = (await listStories()).filter((story) =>
      story.characterConcept.startsWith(TEST_PREFIX),
    );

    expect(stories.length).toBeGreaterThanOrEqual(2);
    expect(stories[0]?.id).toBe(newer.id);
    expect(stories[1]?.id).toBe(older.id);
    expect(stories[0]?.characterConcept).toBe(newer.characterConcept);
    expect(stories[1]?.characterConcept).toBe(older.characterConcept);
  });

  it('story page count is tracked and deleting story removes orphan page files', async () => {
    const story = buildStory({
      characterConcept: `${TEST_PREFIX} with pages`,
    });
    createdStoryIds.add(story.id);

    await saveStory(story);

    const rootPage = createPage({
      id: parsePageId(1),
      narrativeText: 'Root',
      choices: [createChoice('Left'), createChoice('Right')],
      stateChanges: { added: ['root'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    const childPage = createPage({
      id: parsePageId(2),
      narrativeText: 'Child',
      choices: [createChoice('Forward'), createChoice('Back')],
      stateChanges: { added: ['child'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedState: rootPage.accumulatedState,
    });

    await savePage(story.id, rootPage);
    await savePage(story.id, childPage);

    await expect(getPageCount(story.id)).resolves.toBe(2);

    await deleteStory(story.id);
    createdStoryIds.delete(story.id);

    await expect(storyExists(story.id)).resolves.toBe(false);
    await expect(getPageCount(story.id)).resolves.toBe(0);
  });

  it('concurrent story saves for different stories do not interfere', async () => {
    const stories = Array.from({ length: 5 }, (_, index) =>
      buildStory({
        characterConcept: `${TEST_PREFIX} concurrent ${index + 1}`,
      }),
    );

    for (const story of stories) {
      createdStoryIds.add(story.id);
    }

    await Promise.all(stories.map((story) => saveStory(story)));

    const loadedStories = await Promise.all(stories.map((story) => loadStory(story.id)));
    expect(loadedStories).toHaveLength(stories.length);

    for (let i = 0; i < stories.length; i += 1) {
      expectLoadedStoryToMatchPersistedFields(loadedStories[i], stories[i]);
      await expect(storyExists(stories[i].id)).resolves.toBe(true);
    }
  });
});
