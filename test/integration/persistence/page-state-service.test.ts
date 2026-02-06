import {
  Page,
  Story,
  StoryId,
  createChoice,
  createPage,
  createStory,
  parsePageId,
} from '@/models';
import { savePage } from '@/persistence/page-repository';
import { computeAccumulatedState } from '@/persistence/page-state-service';
import { deleteStory, listStories, saveStory } from '@/persistence/story-repository';

const TEST_PREFIX = 'TEST: PAGE-STATE-002 integration';

function buildStory(overrides?: Partial<Story>): Story {
  const base = createStory({
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
    stateChanges: ['root-change'],
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
    ...overrides,
  });
}

describe('page-state-service integration', () => {
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

  it('computeAccumulatedState for a chain includes all ancestor state changes', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} accumulated` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page1 = buildRootPage({ stateChanges: ['p1'] });
    const page2 = createPage({
      id: parsePageId(2),
      narrativeText: 'P2',
      choices: [createChoice('A'), createChoice('B')],
      stateChanges: ['p2'],
      isEnding: false,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 1,
      parentAccumulatedState: page1.accumulatedState,
    });
    const page3 = createPage({
      id: parsePageId(3),
      narrativeText: 'P3 ending',
      choices: [],
      stateChanges: ['p3'],
      isEnding: true,
      parentPageId: parsePageId(2),
      parentChoiceIndex: 0,
      parentAccumulatedState: page2.accumulatedState,
    });

    await savePage(story.id, page1);
    await savePage(story.id, page2);
    await savePage(story.id, page3);

    await expect(computeAccumulatedState(story.id, parsePageId(3))).resolves.toEqual({
      changes: ['p1', 'p2', 'p3'],
    });
  });

  it('computeAccumulatedState for root page returns only root state changes', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} root only` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page1 = buildRootPage({ stateChanges: ['root-event-1', 'root-event-2'] });
    await savePage(story.id, page1);

    await expect(computeAccumulatedState(story.id, parsePageId(1))).resolves.toEqual({
      changes: ['root-event-1', 'root-event-2'],
    });
  });
});
