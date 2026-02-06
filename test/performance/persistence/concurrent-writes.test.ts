import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { StoryId, createChoice, createPage, createStory, parsePageId } from '@/models';

describe('Concurrent Write Performance', () => {
  let originalCwd = process.cwd();
  let tempRootDir = '';
  let storage: import('@/persistence/storage').Storage;
  const createdStoryIds = new Set<StoryId>();

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'one-more-branch-perf-'));
    process.chdir(tempRootDir);

    jest.resetModules();
    let persistence!: typeof import('@/persistence');
    let configModule!: typeof import('@/config/index');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      configModule = require('@/config/index') as typeof import('@/config/index');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      persistence = require('@/persistence') as typeof import('@/persistence');
    });
    // Load config before using persistence
    configModule.loadConfig();
    storage = new persistence.Storage();
    storage.init();
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      await storage.deleteStory(storyId);
    }
    createdStoryIds.clear();
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    if (tempRootDir.length > 0) {
      await fs.rm(tempRootDir, { recursive: true, force: true });
    }
  });

  it('handles concurrent page saves in the same story without corruption', async () => {
    const story = createStory({
      title: 'PERF TEST: Concurrent Pages',
      characterConcept: 'PERF TEST: Concurrent same-story page writes',
      worldbuilding: 'Performance world',
      tone: 'performance tone',
    });
    createdStoryIds.add(story.id);

    await storage.saveStory(story);

    const root = createPage({
      id: parsePageId(1),
      narrativeText: 'Root',
      choices: [createChoice('A'), createChoice('B'), createChoice('C'), createChoice('D')],
      stateChanges: { added: ['root'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    await storage.savePage(story.id, root);

    const writePromises = Array.from({ length: 10 }, (_, index) => {
      const pageId = parsePageId(index + 2);
      return storage.savePage(
        story.id,
        createPage({
          id: pageId,
          narrativeText: `Page ${pageId} content`,
          choices: [],
          stateChanges: { added: [`event-${pageId}`], removed: [] },
          isEnding: true,
          parentPageId: parsePageId(1),
          parentChoiceIndex: index % 4,
          parentAccumulatedState: root.accumulatedState,
        }),
      );
    });

    await Promise.all(writePromises);

    const pages = await storage.loadAllPages(story.id);
    expect(pages.size).toBe(11);

    for (let pageNumber = 2; pageNumber <= 11; pageNumber += 1) {
      const page = pages.get(parsePageId(pageNumber));
      expect(page?.narrativeText).toBe(`Page ${pageNumber} content`);
      expect(page?.accumulatedState.changes).toEqual(['root', `event-${pageNumber}`]);
    }
  }, 30000);

  it('handles concurrent story saves for different stories without interference', async () => {
    const stories = Array.from({ length: 10 }, (_, index) =>
      createStory({
        title: `PERF TEST: Concurrent Story ${index + 1}`,
        characterConcept: `PERF TEST: Concurrent story ${index + 1}`,
        worldbuilding: `world-${index + 1}`,
        tone: `tone-${index + 1}`,
      }),
    );

    for (const story of stories) {
      createdStoryIds.add(story.id);
    }

    await Promise.all(stories.map((story) => storage.saveStory(story)));

    const loadedStories = await Promise.all(stories.map((story) => storage.loadStory(story.id)));

    expect(loadedStories).toHaveLength(10);
    for (let i = 0; i < stories.length; i += 1) {
      expect(loadedStories[i]).toEqual(stories[i]);
    }
  }, 30000);

  it('allows concurrent reads while writes are in progress and converges to full visibility', async () => {
    const story = createStory({
      title: 'PERF TEST: Read/Write Concurrency',
      characterConcept: 'PERF TEST: Read/write concurrency',
      worldbuilding: 'Concurrency world',
      tone: 'concurrency tone',
    });
    createdStoryIds.add(story.id);

    await storage.saveStory(story);

    const root = createPage({
      id: parsePageId(1),
      narrativeText: 'Read/write root',
      choices: [createChoice('A'), createChoice('B'), createChoice('C'), createChoice('D')],
      stateChanges: { added: ['root-read-write'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await storage.savePage(story.id, root);

    const writerPromises = Array.from({ length: 10 }, (_, index) => {
      const pageId = parsePageId(index + 2);
      return storage.savePage(
        story.id,
        createPage({
          id: pageId,
          narrativeText: `RW Page ${pageId}`,
          choices: [],
          stateChanges: { added: [`rw-${pageId}`], removed: [] },
          isEnding: true,
          parentPageId: parsePageId(1),
          parentChoiceIndex: index % 4,
          parentAccumulatedState: root.accumulatedState,
        }),
      );
    });

    const readErrors: Error[] = [];
    const readerPromise = (async (): Promise<void> => {
      for (let pass = 0; pass < 25; pass += 1) {
        for (let pageNumber = 1; pageNumber <= 11; pageNumber += 1) {
          try {
            await storage.loadPage(story.id, parsePageId(pageNumber));
          } catch (error) {
            readErrors.push(error as Error);
          }
        }
      }
    })();

    await Promise.all([...writerPromises, readerPromise]);

    expect(readErrors).toEqual([]);

    const pages = await storage.loadAllPages(story.id);
    expect(pages.size).toBe(11);
    expect(pages.get(parsePageId(11))?.narrativeText).toBe('RW Page 11');
  }, 30000);

  it('handles lock contention on repeated writes without deadlocks and keeps serialized consistency', async () => {
    const story = createStory({
      title: 'PERF TEST: Lock Contention',
      characterConcept: 'PERF TEST: Lock contention',
      worldbuilding: 'Lock world',
      tone: 'lock tone',
    });
    createdStoryIds.add(story.id);

    await storage.saveStory(story);

    const page1 = createPage({
      id: parsePageId(1),
      narrativeText: 'Lock root',
      choices: [createChoice('A'), createChoice('B')],
      stateChanges: { added: ['lock-root'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await storage.savePage(story.id, page1);

    const nextPageIds = Array.from({ length: 20 }, (_, index) => parsePageId(index + 2));

    const contentionWrites = nextPageIds.map((nextPageId) =>
      storage.updateChoiceLink(story.id, parsePageId(1), 0, nextPageId),
    );

    await Promise.all(contentionWrites);

    const reloaded = await storage.loadPage(story.id, parsePageId(1));
    expect(reloaded?.choices[0]?.nextPageId).toBe(parsePageId(21));
    expect(reloaded?.choices[1]?.nextPageId).toBeNull();
  }, 30000);
});
