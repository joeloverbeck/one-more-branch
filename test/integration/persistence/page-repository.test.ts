import {
  ActiveState,
  ActiveStateChanges,
  ThreadType,
  Urgency,
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
    sceneSummary: 'Test summary of the scene events and consequences.',
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
      sceneSummary: 'Test summary of the scene events and consequences.',
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('A'), createChoice('B')],
      stateChanges: { added: ['second'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedActiveState: page1.accumulatedActiveState,
    });
    const page3 = createPage({
      id: parsePageId(3),
      narrativeText: 'Third page',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [],
      stateChanges: { added: ['third'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(2),
      parentChoiceIndex: 1,
      parentAccumulatedActiveState: page2.accumulatedActiveState,
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
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('Continue'), createChoice('Stop')],
      stateChanges: { added: ['linked'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedActiveState: page1.accumulatedActiveState,
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
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('Left'), createChoice('Right')],
      stateChanges: { added: ['middle'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedActiveState: page1.accumulatedActiveState,
    });
    const endingA = createPage({
      id: parsePageId(3),
      narrativeText: 'Ending A',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [],
      stateChanges: { added: ['ending-a'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(2),
      parentChoiceIndex: 0,
      parentAccumulatedActiveState: page2.accumulatedActiveState,
    });
    const endingB = createPage({
      id: parsePageId(4),
      narrativeText: 'Ending B',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [],
      stateChanges: { added: ['ending-b'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(2),
      parentChoiceIndex: 1,
      parentAccumulatedActiveState: page2.accumulatedActiveState,
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
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('Continue A'), createChoice('Fallback A')],
      stateChanges: { added: ['A advanced'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedActiveState: root.accumulatedActiveState,
      parentAccumulatedStructureState: {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'A resolved the opener.' },
          { beatId: '1.2', status: 'active' },
          { beatId: '1.3', status: 'pending' },
        ],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      },
    });
    const branchB = createPage({
      id: parsePageId(3),
      narrativeText: 'Branch B keeps the opener active.',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('Continue B'), createChoice('Fallback B')],
      stateChanges: { added: ['B observed'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 1,
      parentAccumulatedActiveState: root.accumulatedActiveState,
      parentAccumulatedStructureState: {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'active' },
          { beatId: '1.2', status: 'pending' },
          { beatId: '1.3', status: 'pending' },
        ],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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

  it('save/load round-trip preserves active state fields with keyed entries', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} active state persistence` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const activeStateChanges: ActiveStateChanges = {
      newLocation: 'Abandoned temple',
      threatsAdded: ['THREAT_GUARDIAN: Stone guardian awakened', 'THREAT_TRAP: Pressure plates detected'],
      threatsRemoved: ['th-1'],
      constraintsAdded: ['CONSTRAINT_DARKNESS: No natural light'],
      constraintsRemoved: [],
      threadsAdded: ['THREAD_RELIC: Ancient relic rumored to be here'],
      threadsResolved: ['td-1'],
    };

    const accumulatedActiveState: ActiveState = {
      currentLocation: 'Abandoned temple',
      activeThreats: [
        { id: 'th-2', text: 'THREAT_GUARDIAN: Stone guardian awakened' },
        { id: 'th-3', text: 'THREAT_TRAP: Pressure plates detected' },
      ],
      activeConstraints: [
        { id: 'cn-1', text: 'CONSTRAINT_DARKNESS: No natural light' },
      ],
      openThreads: [
        {
          id: 'td-2',
          text: 'THREAD_RELIC: Ancient relic rumored to be here',
          threadType: ThreadType.INFORMATION,
          urgency: Urgency.MEDIUM,
        },
      ],
    };

    const page = createPage({
      id: parsePageId(1),
      narrativeText: 'You enter the abandoned temple...',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('Proceed carefully'), createChoice('Search for traps')],
      stateChanges: { added: ['entered temple'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
      activeStateChanges,
      parentAccumulatedActiveState: {
        currentLocation: 'Forest edge',
        activeThreats: [{ id: 'th-1', text: 'THREAT_STORM: Storm approaching' }],
        activeConstraints: [],
        openThreads: [
          {
            id: 'td-1',
            text: 'THREAD_MAP: Following old map',
            threadType: ThreadType.MYSTERY,
            urgency: Urgency.MEDIUM,
          },
        ],
      },
    });

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.activeStateChanges).toEqual(activeStateChanges);
    expect(loaded!.accumulatedActiveState).toEqual(accumulatedActiveState);

    // Explicitly verify keyed entry structure survived file I/O
    expect(loaded!.accumulatedActiveState.activeThreats[0]).toEqual({
      id: 'th-2',
      text: 'THREAT_GUARDIAN: Stone guardian awakened',
    });

    // Verify all arrays have correct lengths
    expect(loaded!.accumulatedActiveState.activeThreats).toHaveLength(2);
    expect(loaded!.accumulatedActiveState.activeConstraints).toHaveLength(1);
    expect(loaded!.accumulatedActiveState.openThreads).toHaveLength(1);
  });

  it('save/load preserves branch-divergent active state across sibling pages', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} divergent active state branches` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const root = buildRootPage();
    await savePage(story.id, root);

    // Branch A: Resolves a threat, adds new constraint
    const branchA = createPage({
      id: parsePageId(2),
      narrativeText: 'Branch A: You defeat the wolf...',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('Continue'), createChoice('Rest')],
      stateChanges: { added: ['wolf defeated'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      activeStateChanges: {
        newLocation: 'Forest clearing - safe',
        threatsAdded: [],
        threatsRemoved: ['th-1'],
        constraintsAdded: ['CONSTRAINT_TIRED: Exhausted from fight'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      },
      parentAccumulatedActiveState: {
        currentLocation: 'Forest path',
        activeThreats: [{ id: 'th-1', text: 'THREAT_WOLF: Hungry wolf stalking' }],
        activeConstraints: [],
        openThreads: [],
      },
    });

    // Branch B: Avoids wolf, different location
    const branchB = createPage({
      id: parsePageId(3),
      narrativeText: 'Branch B: You climb a tree to escape...',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('Wait'), createChoice('Call for help')],
      stateChanges: { added: ['climbed tree'], removed: [] },
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 1,
      activeStateChanges: {
        newLocation: 'Tree canopy - elevated',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: ['CONSTRAINT_STUCK: Cannot descend safely'],
        constraintsRemoved: [],
        threadsAdded: ['THREAD_RESCUE: Must find another way down'],
        threadsResolved: [],
      },
      parentAccumulatedActiveState: {
        currentLocation: 'Forest path',
        activeThreats: [{ id: 'th-1', text: 'THREAT_WOLF: Hungry wolf stalking' }],
        activeConstraints: [],
        openThreads: [],
      },
    });

    await savePage(story.id, branchA);
    await savePage(story.id, branchB);

    const loadedA = await loadPage(story.id, branchA.id);
    const loadedB = await loadPage(story.id, branchB.id);

    // Branch A resolved threat, has constraint
    expect(loadedA!.accumulatedActiveState.currentLocation).toBe('Forest clearing - safe');
    expect(loadedA!.accumulatedActiveState.activeThreats).toHaveLength(0);
    expect(loadedA!.accumulatedActiveState.activeConstraints).toHaveLength(1);
    expect(loadedA!.accumulatedActiveState.activeConstraints[0].id).toBe('cn-1');

    // Branch B still has threat, different location and constraint
    expect(loadedB!.accumulatedActiveState.currentLocation).toBe('Tree canopy - elevated');
    expect(loadedB!.accumulatedActiveState.activeThreats).toHaveLength(1);
    expect(loadedB!.accumulatedActiveState.activeThreats[0].id).toBe('th-1');
    expect(loadedB!.accumulatedActiveState.openThreads).toHaveLength(1);
    expect(loadedB!.accumulatedActiveState.openThreads[0].id).toBe('td-1');
  });
});
