import * as fsPromises from 'fs/promises';
import { Page, Story, StoryId, createChoice, createPage, createStory, parsePageId } from '@/models';
import { getPageFilePath, writeJsonFile } from '@/persistence/file-utils';
import {
  findEndingPages,
  getMaxPageId,
  loadAllPages,
  loadPage,
  pageExists,
  savePage,
  updateChoiceLink,
  updatePage,
} from '@/persistence/page-repository';
import { deleteStory, saveStory } from '@/persistence/story-repository';

const TEST_PREFIX = 'TEST: PERLAY-004';

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

describe('page-repository', () => {
  const createdStoryIds = new Set<StoryId>();

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      await deleteStory(storyId);
    }
    createdStoryIds.clear();
  });

  it('savePage/loadPage preserves all fields and round-trips persisted JSON shape', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const basePage = buildRootPage({
      stateChanges: { added: ['root-change', 'extra-change'], removed: [] },
      accumulatedState: { changes: ['root-change', 'extra-change'] },
    });
    const page: Page = {
      ...basePage,
      accumulatedStructureState: {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Reached the portal' },
          { beatId: '1.2', status: 'active' },
        ],
      },
    };

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(page.id);
    expect(loaded?.narrativeText).toBe(page.narrativeText);
    expect(loaded?.choices).toEqual(page.choices);
    expect(loaded?.stateChanges).toEqual(page.stateChanges);
    expect(loaded?.accumulatedState).toEqual(page.accumulatedState);
    expect(loaded?.accumulatedStructureState).toEqual(page.accumulatedStructureState);
    expect(loaded?.isEnding).toBe(page.isEnding);
    expect(loaded?.parentPageId).toBe(page.parentPageId);
    expect(loaded?.parentChoiceIndex).toBe(page.parentChoiceIndex);

    const persistedJson = await fsPromises.readFile(getPageFilePath(story.id, page.id), 'utf-8');
    const parsed = JSON.parse(persistedJson) as Record<string, unknown>;
    expect(parsed['accumulatedStructureState']).toEqual({
      currentActIndex: 1,
      currentBeatIndex: 0,
      beatProgressions: [
        { beatId: '1.1', status: 'concluded', resolution: 'Reached the portal' },
        { beatId: '1.2', status: 'active' },
      ],
    });

    const persisted = await loadPage(story.id, page.id);
    expect(persisted).toEqual(page);
  });

  it('loadPage returns null for non-existent page', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    await expect(loadPage(story.id, parsePageId(99))).resolves.toBeNull();
  });

  it('pageExists returns true for existing page and false for non-existent page', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildRootPage();
    await savePage(story.id, page);

    await expect(pageExists(story.id, page.id)).resolves.toBe(true);
    await expect(pageExists(story.id, parsePageId(99))).resolves.toBe(false);
  });

  it('loadAllPages returns all pages and empty map when none exist', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    await expect(loadAllPages(story.id)).resolves.toEqual(new Map());

    const page1 = buildRootPage();
    const page2 = buildChildPage();

    await savePage(story.id, page1);
    await savePage(story.id, page2);

    const pages = await loadAllPages(story.id);
    expect(pages.size).toBe(2);
    expect(pages.has(parsePageId(1))).toBe(true);
    expect(pages.has(parsePageId(2))).toBe(true);
    expect(pages.get(parsePageId(1))?.narrativeText).toBe('Root narrative');
    expect(pages.get(parsePageId(2))?.narrativeText).toBe('Child narrative');
  });

  it('getMaxPageId returns 0 for empty story and highest id for existing pages', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    await expect(getMaxPageId(story.id)).resolves.toBe(0);

    await savePage(story.id, buildRootPage());
    await savePage(
      story.id,
      buildChildPage({
        id: parsePageId(3),
        parentPageId: parsePageId(1),
      }),
    );

    await expect(getMaxPageId(story.id)).resolves.toBe(3);
  });

  it('updateChoiceLink updates only the targeted choice', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildRootPage();
    await savePage(story.id, page);

    await updateChoiceLink(story.id, page.id, 0, parsePageId(2));

    const updated = await loadPage(story.id, page.id);
    expect(updated?.choices[0]?.nextPageId).toBe(parsePageId(2));
    expect(updated?.choices[1]).toEqual(page.choices[1]);
    expect(updated?.choices).not.toBe(page.choices);
  });

  it('updateChoiceLink throws for invalid page or invalid choice index', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildRootPage();
    await savePage(story.id, page);

    await expect(
      updateChoiceLink(story.id, parsePageId(99), 0, parsePageId(2)),
    ).rejects.toThrow(`Page 99 not found in story ${story.id}`);
    await expect(updateChoiceLink(story.id, page.id, -1, parsePageId(2))).rejects.toThrow(
      `Invalid choice index -1 for page ${page.id}`,
    );
    await expect(updateChoiceLink(story.id, page.id, 2, parsePageId(2))).rejects.toThrow(
      `Invalid choice index 2 for page ${page.id}`,
    );
  });

  it('findEndingPages returns ending page ids and empty when none are endings', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    await savePage(story.id, buildRootPage());
    await savePage(story.id, buildChildPage());
    await expect(findEndingPages(story.id)).resolves.toEqual([]);

    const endingPage = createPage({
      id: parsePageId(3),
      narrativeText: 'Ending',
      choices: [],
      stateChanges: { added: ['ending-change'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(2),
      parentChoiceIndex: 1,
      parentAccumulatedState: { changes: ['root-change', 'child-change'] },
    });
    await savePage(story.id, endingPage);

    await expect(findEndingPages(story.id)).resolves.toEqual([parsePageId(3)]);
  });

  it('loadPage throws when persisted page id does not match requested id', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const expectedPageId = parsePageId(4);
    const mismatchedPageId = parsePageId(5);

    await writeJsonFile(getPageFilePath(story.id, expectedPageId), {
      id: mismatchedPageId,
      narrativeText: 'Mismatch',
      choices: [],
      stateChanges: { added: [], removed: [] },
      accumulatedState: { changes: [] },
      isEnding: true,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    await expect(loadPage(story.id, expectedPageId)).rejects.toThrow(
      `Page ID mismatch: expected ${expectedPageId}, found ${mismatchedPageId}`,
    );
  });

  it('loadPage throws when persisted page data is missing accumulatedStructureState', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const pageId = parsePageId(6);
    await writeJsonFile(getPageFilePath(story.id, pageId), {
      id: pageId,
      narrativeText: 'Missing structure state',
      choices: [],
      stateChanges: { added: [], removed: [] },
      accumulatedState: { changes: [] },
      isEnding: true,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    await expect(loadPage(story.id, pageId)).rejects.toThrow(
      `Invalid page data: missing accumulatedStructureState for page ${pageId}`,
    );
  });

  it('updatePage overwrites an existing page', async () => {
    const story = buildTestStory();
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildRootPage();
    await savePage(story.id, page);

    const updatedPage = buildRootPage({
      narrativeText: 'Updated narrative',
      choices: [createChoice('Updated choice A'), createChoice('Updated choice B')],
      stateChanges: { added: ['updated-change'], removed: [] },
      accumulatedState: { changes: ['updated-change'] },
    });
    await updatePage(story.id, updatedPage);

    const loaded = await loadPage(story.id, page.id);
    expect(loaded?.narrativeText).toBe('Updated narrative');
    expect(loaded?.choices.map((choice) => choice.text)).toEqual([
      'Updated choice A',
      'Updated choice B',
    ]);
    expect(loaded?.stateChanges).toEqual({ added: ['updated-change'], removed: [] });
  });
});
