import {
  Page,
  Story,
  StoryId,
  createChoice,
  createPage,
  createStory,
  parsePageId,
} from '@/models';
import {
  findEndingPages,
  getMaxPageId,
  loadAllPages,
  loadPage,
  savePage,
  updateChoiceLink,
} from '@/persistence/page-repository';
import { deleteStory, listStories, saveStory } from '@/persistence/story-repository';

const TEST_PREFIX = 'TEST: PERLAY-006 page integration';

function buildStory(overrides?: Partial<Story>): Story {
  const base = createStory({
    title: `${TEST_PREFIX} title`,
    characterConcept: `${TEST_PREFIX} base`,
    worldbuilding: 'Integration world',
    tone: 'Integration tone',
  });

  return {
    ...base,
    ...overrides,
  };
}

function buildRootPage(overrides?: Partial<Page>): Page {
  return createPage({
    id: parsePageId(1),
    narrativeText: 'Root page',
    choices: [createChoice('Choice A'), createChoice('Choice B')],
    stateChanges: { added: ['root-change'], removed: [] },
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
    ...overrides,
  });
}

describe('page-repository integration', () => {
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

  it('save/load round-trip preserves all page fields', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} round-trip` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const root = buildRootPage({
      narrativeText: 'Round-trip root',
      stateChanges: { added: ['event-1', 'event-2'], removed: [] },
    });

    await savePage(story.id, root);

    const loaded = await loadPage(story.id, root.id);
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(root);
  });

  it('save/load preserves accumulatedStructureState progression details', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} structure state` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const root = buildRootPage({
      accumulatedStructureState: {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Found the hidden key' },
          { beatId: '1.2', status: 'active' },
          { beatId: '1.3', status: 'pending' },
        ],
      },
    });

    await savePage(story.id, root);

    const loaded = await loadPage(story.id, root.id);
    expect(loaded?.accumulatedStructureState).toEqual(root.accumulatedStructureState);
  });

  it('multiple pages in a story are all loadable and report the max id', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} multiple pages` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page1 = buildRootPage();
    const page2 = createPage({
      id: parsePageId(2),
      narrativeText: 'Second page',
      choices: [createChoice('A'), createChoice('B')],
      stateChanges: { added: ['second'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedState: page1.accumulatedState,
    });
    const page3 = createPage({
      id: parsePageId(3),
      narrativeText: 'Third page',
      choices: [],
      stateChanges: { added: ['third'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(2),
      parentChoiceIndex: 1,
      parentAccumulatedState: page2.accumulatedState,
    });

    await savePage(story.id, page1);
    await savePage(story.id, page2);
    await savePage(story.id, page3);

    const pages = await loadAllPages(story.id);
    expect(pages.size).toBe(3);
    expect([...pages.keys()].sort((a, b) => a - b)).toEqual([
      parsePageId(1),
      parsePageId(2),
      parsePageId(3),
    ]);
    await expect(getMaxPageId(story.id)).resolves.toBe(3);
  });

  it('choice linking workflow persists after reload', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} linking` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page1 = buildRootPage();
    const page2 = createPage({
      id: parsePageId(2),
      narrativeText: 'Child of first choice',
      choices: [createChoice('Continue'), createChoice('Stop')],
      stateChanges: { added: ['linked'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedState: page1.accumulatedState,
    });

    await savePage(story.id, page1);
    await savePage(story.id, page2);
    await updateChoiceLink(story.id, parsePageId(1), 0, parsePageId(2));

    const reloaded = await loadPage(story.id, parsePageId(1));
    expect(reloaded?.choices[0]?.nextPageId).toBe(parsePageId(2));
    expect(reloaded?.choices[1]?.nextPageId).toBeNull();
  });

  it('findEndingPages returns only ending page ids', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} endings` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page1 = buildRootPage();
    const page2 = createPage({
      id: parsePageId(2),
      narrativeText: 'Middle',
      choices: [createChoice('Left'), createChoice('Right')],
      stateChanges: { added: ['middle'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedState: page1.accumulatedState,
    });
    const endingA = createPage({
      id: parsePageId(3),
      narrativeText: 'Ending A',
      choices: [],
      stateChanges: { added: ['ending-a'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(2),
      parentChoiceIndex: 0,
      parentAccumulatedState: page2.accumulatedState,
    });
    const endingB = createPage({
      id: parsePageId(4),
      narrativeText: 'Ending B',
      choices: [],
      stateChanges: { added: ['ending-b'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(2),
      parentChoiceIndex: 1,
      parentAccumulatedState: page2.accumulatedState,
    });

    await savePage(story.id, page1);
    await savePage(story.id, page2);
    await savePage(story.id, endingA);
    await savePage(story.id, endingB);

    await expect(findEndingPages(story.id)).resolves.toEqual([parsePageId(3), parsePageId(4)]);
  });

  it('persists branch-divergent accumulatedStructureState across sibling pages', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} divergent structure branches` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const root = buildRootPage();
    const branchA = createPage({
      id: parsePageId(2),
      narrativeText: 'Branch A advances the first beat.',
      choices: [createChoice('Continue A'), createChoice('Fallback A')],
      stateChanges: { added: ['A advanced'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedState: root.accumulatedState,
      parentAccumulatedStructureState: {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'A resolved the opener.' },
          { beatId: '1.2', status: 'active' },
          { beatId: '1.3', status: 'pending' },
        ],
      },
    });
    const branchB = createPage({
      id: parsePageId(3),
      narrativeText: 'Branch B keeps the opener active.',
      choices: [createChoice('Continue B'), createChoice('Fallback B')],
      stateChanges: { added: ['B observed'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 1,
      parentAccumulatedState: root.accumulatedState,
      parentAccumulatedStructureState: {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'active' },
          { beatId: '1.2', status: 'pending' },
          { beatId: '1.3', status: 'pending' },
        ],
      },
    });

    await savePage(story.id, root);
    await savePage(story.id, branchA);
    await savePage(story.id, branchB);

    const loadedBranchA = await loadPage(story.id, branchA.id);
    const loadedBranchB = await loadPage(story.id, branchB.id);

    expect(loadedBranchA?.accumulatedStructureState).toEqual(branchA.accumulatedStructureState);
    expect(loadedBranchB?.accumulatedStructureState).toEqual(branchB.accumulatedStructureState);
    expect(loadedBranchA?.accumulatedStructureState.currentBeatIndex).toBe(1);
    expect(loadedBranchB?.accumulatedStructureState.currentBeatIndex).toBe(0);
  });
});
