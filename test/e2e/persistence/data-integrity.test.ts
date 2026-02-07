import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { StoryId, createChoice, createPage, createStory, parsePageId } from '@/models';

describe('Data Integrity E2E', () => {
  let originalCwd = process.cwd();
  let tempRootDir = '';
  let storage: import('@/persistence/storage').Storage;
  let StorageClass: typeof import('@/persistence/storage').Storage;
  const createdStoryIds = new Set<StoryId>();

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'one-more-branch-e2e-'));
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
    StorageClass = persistence.Storage;
    storage = new StorageClass();
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

  it('completes story creation workflow with correct page linking', async () => {
    const story = createStory({
      title: 'E2E TEST: Workflow Story',
      characterConcept: 'E2E TEST: Full workflow character',
      worldbuilding: 'Workflow world',
      tone: 'workflow tone',
    });
    createdStoryIds.add(story.id);

    await storage.saveStory(story);

    const page1 = createPage({
      id: parsePageId(1),
      narrativeText: 'Page 1 narrative',
      choices: [createChoice('Option A'), createChoice('Option B')],
      stateChanges: { added: ['root-event'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await storage.savePage(story.id, page1);

    const page2 = createPage({
      id: parsePageId(2),
      narrativeText: 'Page 2 narrative',
      choices: [],
      stateChanges: { added: ['branch-a-event'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedState: page1.accumulatedState,
    });
    await storage.savePage(story.id, page2);

    const page3 = createPage({
      id: parsePageId(3),
      narrativeText: 'Page 3 narrative',
      choices: [],
      stateChanges: { added: ['branch-b-event'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 1,
      parentAccumulatedState: page1.accumulatedState,
    });
    await storage.savePage(story.id, page3);

    await storage.updateChoiceLink(story.id, parsePageId(1), 0, parsePageId(2));
    await storage.updateChoiceLink(story.id, parsePageId(1), 1, parsePageId(3));

    const loadedPage1 = await storage.loadPage(story.id, parsePageId(1));
    const loadedPage2 = await storage.loadPage(story.id, parsePageId(2));
    const loadedPage3 = await storage.loadPage(story.id, parsePageId(3));

    expect(loadedPage1?.choices[0]?.nextPageId).toBe(parsePageId(2));
    expect(loadedPage1?.choices[1]?.nextPageId).toBe(parsePageId(3));
    expect(loadedPage2?.accumulatedState.changes).toEqual(['root-event', 'branch-a-event']);
    expect(loadedPage3?.accumulatedState.changes).toEqual(['root-event', 'branch-b-event']);
  });

  it('maintains branching integrity with distinct accumulated states', async () => {
    const story = createStory({
      title: 'E2E TEST: Branching Story',
      characterConcept: 'E2E TEST: Branching integrity character',
      worldbuilding: 'Branching world',
      tone: 'branching tone',
    });
    createdStoryIds.add(story.id);

    await storage.saveStory(story);

    const page1 = createPage({
      id: parsePageId(1),
      narrativeText: 'Root page',
      choices: [createChoice('Path A'), createChoice('Path B'), createChoice('Path C')],
      stateChanges: { added: ['root'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await storage.savePage(story.id, page1);

    const branchPages = [
      {
        id: parsePageId(2),
        text: 'Branch A',
        stateChange: 'branch-a',
        choiceIndex: 0,
      },
      {
        id: parsePageId(3),
        text: 'Branch B',
        stateChange: 'branch-b',
        choiceIndex: 1,
      },
      {
        id: parsePageId(4),
        text: 'Branch C',
        stateChange: 'branch-c',
        choiceIndex: 2,
      },
    ] as const;

    for (const branch of branchPages) {
      const page = createPage({
        id: branch.id,
        narrativeText: branch.text,
        choices: [],
        stateChanges: { added: [branch.stateChange], removed: [] },
        isEnding: true,
        parentPageId: parsePageId(1),
        parentChoiceIndex: branch.choiceIndex,
        parentAccumulatedState: page1.accumulatedState,
      });

      await storage.savePage(story.id, page);
      await storage.updateChoiceLink(story.id, parsePageId(1), branch.choiceIndex, branch.id);
    }

    const loadedPage1 = await storage.loadPage(story.id, parsePageId(1));
    expect(loadedPage1?.choices.map((choice) => choice.nextPageId)).toEqual([
      parsePageId(2),
      parsePageId(3),
      parsePageId(4),
    ]);

    const loadedBranchStates = await Promise.all(
      branchPages.map(async (branch) => {
        const loaded = await storage.loadPage(story.id, branch.id);
        return loaded?.accumulatedState.changes;
      }),
    );

    expect(loadedBranchStates).toEqual([
      ['root', 'branch-a'],
      ['root', 'branch-b'],
      ['root', 'branch-c'],
    ]);
  });

  it('reloads cleanly from disk with a new storage instance', async () => {
    const story = createStory({
      title: 'E2E TEST: Reload Story',
      characterConcept: 'E2E TEST: Reload persistence character',
      worldbuilding: 'Reload world',
      tone: 'reload tone',
    });
    createdStoryIds.add(story.id);

    await storage.saveStory(story);

    const page1 = createPage({
      id: parsePageId(1),
      narrativeText: 'Reload root',
      choices: [createChoice('Go left'), createChoice('Go right')],
      stateChanges: { added: ['reload-root'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    const page2 = createPage({
      id: parsePageId(2),
      narrativeText: 'Reload ending',
      choices: [],
      stateChanges: { added: ['reload-ending'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedState: page1.accumulatedState,
    });

    await storage.savePage(story.id, page1);
    await storage.savePage(story.id, page2);
    await storage.updateChoiceLink(story.id, parsePageId(1), 0, parsePageId(2));

    const reloadedStorage = new StorageClass();
    reloadedStorage.init();

    const loadedStory = await reloadedStorage.loadStory(story.id);
    const loadedPage1 = await reloadedStorage.loadPage(story.id, parsePageId(1));
    const loadedPage2 = await reloadedStorage.loadPage(story.id, parsePageId(2));

    expect(loadedStory).not.toBeNull();
    expect(loadedStory?.id).toBe(story.id);
    expect(loadedStory?.title).toBe(story.title);
    expect(loadedStory?.characterConcept).toBe(story.characterConcept);
    expect(loadedStory?.worldbuilding).toBe(story.worldbuilding);
    expect(loadedStory?.tone).toBe(story.tone);
    expect(loadedStory?.globalCanon).toEqual(story.globalCanon);
    expect(loadedStory?.globalCharacterCanon).toEqual(story.globalCharacterCanon);
    expect(loadedStory?.structure).toEqual(story.structure);
    expect(loadedStory?.createdAt).toEqual(story.createdAt);
    expect(loadedStory?.updatedAt).toEqual(story.updatedAt);
    // structureVersions persistence is introduced in STRREWSYS-009/010.
    expect(loadedStory?.structureVersions).toBeUndefined();
    expect(loadedPage1?.choices[0]?.nextPageId).toBe(parsePageId(2));
    expect(loadedPage2?.accumulatedState.changes).toEqual(['reload-root', 'reload-ending']);
  });

  it('deletes stories with cascading cleanup of page files and story directory', async () => {
    const story = createStory({
      title: 'E2E TEST: Delete Story',
      characterConcept: 'E2E TEST: Delete cascade character',
      worldbuilding: 'Delete world',
      tone: 'delete tone',
    });
    createdStoryIds.add(story.id);

    await storage.saveStory(story);

    const page1 = createPage({
      id: parsePageId(1),
      narrativeText: 'Delete root',
      choices: [createChoice('A'), createChoice('B')],
      stateChanges: { added: ['delete-root'], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    const page2 = createPage({
      id: parsePageId(2),
      narrativeText: 'Delete child',
      choices: [],
      stateChanges: { added: ['delete-child'], removed: [] },
      isEnding: true,
      parentPageId: parsePageId(1),
      parentChoiceIndex: 0,
      parentAccumulatedState: page1.accumulatedState,
    });

    await storage.savePage(story.id, page1);
    await storage.savePage(story.id, page2);

    const storyDir = path.join(tempRootDir, 'stories', story.id);
    await expect(fs.stat(storyDir)).resolves.toBeDefined();

    await storage.deleteStory(story.id);
    createdStoryIds.delete(story.id);

    await expect(storage.loadStory(story.id)).resolves.toBeNull();
    await expect(storage.loadAllPages(story.id)).resolves.toEqual(new Map());
    await expect(fs.stat(storyDir)).rejects.toThrow();
  });
});
