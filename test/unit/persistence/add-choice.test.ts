import { Page, Story, StoryId, createChoice, createPage, createStory, parsePageId } from '@/models';
import { addChoice, loadPage, savePage } from '@/persistence/page-repository';
import { deleteStory, saveStory } from '@/persistence/story-repository';

const TEST_PREFIX = 'TEST: ADD-CHOICE';

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
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
    ...overrides,
  });
}

describe('addChoice', () => {
  const createdStoryIds = new Set<StoryId>();

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      await deleteStory(storyId);
    }
    createdStoryIds.clear();
  });

  it('appends a new choice to an existing page', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildRootPage();
    await savePage(story.id, page);

    const updated = await addChoice(story.id, page.id, 'Custom choice');

    expect(updated.choices).toHaveLength(3);
    expect(updated.choices[2]?.text).toBe('Custom choice');
    expect(updated.choices[2]?.nextPageId).toBeNull();

    // Verify original choices are preserved
    expect(updated.choices[0]?.text).toBe('Choice A');
    expect(updated.choices[1]?.text).toBe('Choice B');
  });

  it('persists the added choice to disk', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildRootPage();
    await savePage(story.id, page);

    await addChoice(story.id, page.id, 'Persisted choice');

    const loaded = await loadPage(story.id, page.id);
    expect(loaded?.choices).toHaveLength(3);
    expect(loaded?.choices[2]?.text).toBe('Persisted choice');
    expect(loaded?.choices[2]?.nextPageId).toBeNull();
  });

  it('trims whitespace from choice text', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildRootPage();
    await savePage(story.id, page);

    const updated = await addChoice(story.id, page.id, '  Trimmed choice  ');

    expect(updated.choices[2]?.text).toBe('Trimmed choice');
  });

  it('throws for non-existent page', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    await expect(
      addChoice(story.id, parsePageId(99), 'Nope'),
    ).rejects.toThrow(`Page 99 not found in story ${story.id}`);
  });

  it('throws for ending pages', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const endingPage = createPage({
      id: parsePageId(1),
      narrativeText: 'The end',
      choices: [],
      isEnding: true,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await savePage(story.id, endingPage);

    await expect(
      addChoice(story.id, endingPage.id, 'Should fail'),
    ).rejects.toThrow(`Cannot add choices to ending page ${endingPage.id}`);
  });

  it('allows adding multiple custom choices', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildRootPage();
    await savePage(story.id, page);

    await addChoice(story.id, page.id, 'Custom 1');
    await addChoice(story.id, page.id, 'Custom 2');
    const updated = await addChoice(story.id, page.id, 'Custom 3');

    expect(updated.choices).toHaveLength(5);
    expect(updated.choices[2]?.text).toBe('Custom 1');
    expect(updated.choices[3]?.text).toBe('Custom 2');
    expect(updated.choices[4]?.text).toBe('Custom 3');
  });
});
