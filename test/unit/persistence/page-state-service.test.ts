import { Page, Story, StoryId, createChoice, createPage, createStory, parsePageId } from '@/models';
import { computeAccumulatedState } from '@/persistence/page-state-service';
import { deleteStory, saveStory } from '@/persistence/story-repository';
import { savePage } from '@/persistence/page-repository';

const TEST_PREFIX = 'TEST: PAGE-STATE-001';

function buildTestStory(overrides?: Partial<Story>): Story {
  const baseStory = createStory({
    title: `${TEST_PREFIX} title`,
    characterConcept: `${TEST_PREFIX} character`,
    worldbuilding: 'Test world',
    tone: 'Test tone',
  });

  return {
    ...baseStory,
    ...overrides,
  };
}

function buildRootPage(overrides?: Partial<Page>): Page {
  return createPage({
    id: parsePageId(1),
    narrativeText: 'Root narrative',
    choices: [createChoice('Choice A'), createChoice('Choice B')],
    stateChanges: { added: ['root-change'], removed: [] },
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
    ...overrides,
  });
}

function buildChildPage(overrides?: Partial<Page>): Page {
  const parentState = overrides?.accumulatedState ?? {
    changes: ['root-change'],
  };

  return createPage({
    id: parsePageId(2),
    narrativeText: 'Child narrative',
    choices: [createChoice('Choice C'), createChoice('Choice D')],
    stateChanges: { added: ['child-change'], removed: [] },
    isEnding: false,
    parentPageId: parsePageId(1),
    parentChoiceIndex: 0,
    parentAccumulatedState: parentState,
    ...overrides,
  });
}

describe('page-state-service', () => {
  const createdStoryIds = new Set<StoryId>();

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      await deleteStory(storyId);
    }
    createdStoryIds.clear();
  });

  it('computeAccumulatedState accumulates root and ancestor state changes', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const root = buildRootPage({
      stateChanges: { added: ['root-a'], removed: [] },
      accumulatedState: { changes: ['root-a'] },
    });
    const child = buildChildPage({
      id: parsePageId(2),
      parentPageId: root.id,
      parentChoiceIndex: 0,
      stateChanges: { added: ['child-b'], removed: [] },
      accumulatedState: { changes: ['root-a', 'child-b'] },
      parentAccumulatedState: root.accumulatedState,
    });
    const grandchild = createPage({
      id: parsePageId(3),
      narrativeText: 'Grandchild',
      choices: [],
      stateChanges: { added: ['grandchild-c'], removed: [] },
      isEnding: true,
      parentPageId: child.id,
      parentChoiceIndex: 1,
      parentAccumulatedState: child.accumulatedState,
    });

    await savePage(story.id, root);
    await savePage(story.id, child);
    await savePage(story.id, grandchild);

    await expect(computeAccumulatedState(story.id, root.id)).resolves.toEqual({
      changes: ['root-a'],
    });
    await expect(computeAccumulatedState(story.id, child.id)).resolves.toEqual({
      changes: ['root-a', 'child-b'],
    });
    await expect(computeAccumulatedState(story.id, grandchild.id)).resolves.toEqual({
      changes: ['root-a', 'child-b', 'grandchild-c'],
    });
  });

  it('computeAccumulatedState throws for non-existent page', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    await expect(computeAccumulatedState(story.id, parsePageId(99))).rejects.toThrow(
      `Page 99 not found in story ${story.id}`
    );
  });

  it('computeAccumulatedState throws for broken parent chain', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    // Create a page with a parentPageId that doesn't exist
    const orphanPage = createPage({
      id: parsePageId(5),
      narrativeText: 'Orphan page',
      choices: [],
      stateChanges: { added: ['orphan'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(99), // Non-existent parent
      parentChoiceIndex: 0,
      parentAccumulatedState: { changes: [] },
    });

    await savePage(story.id, orphanPage);

    await expect(computeAccumulatedState(story.id, orphanPage.id)).rejects.toThrow(
      `Broken parent chain for page 5: missing parent page 99`
    );
  });
});
