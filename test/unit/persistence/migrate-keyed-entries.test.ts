import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { migrateStoriesToKeyedEntries } from '../../../src/persistence/migrate-keyed-entries';

type JsonObject = Record<string, unknown>;

function createLegacyPage(overrides: Partial<JsonObject>): JsonObject {
  return {
    id: 1,
    narrativeText: 'n',
    sceneSummary: 's',
    choices: [],
    activeStateChanges: {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    },
    accumulatedActiveState: {
      currentLocation: 'Village',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    inventoryChanges: { added: [], removed: [] },
    accumulatedInventory: [],
    healthChanges: { added: [], removed: [] },
    accumulatedHealth: [],
    characterStateChanges: [],
    accumulatedCharacterState: {},
    accumulatedStructureState: {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    },
    protagonistAffect: {
      primaryEmotion: 'focus',
      primaryIntensity: 'mild',
      primaryCause: 'test',
      secondaryEmotions: [],
      dominantMotivation: 'test',
    },
    structureVersionId: null,
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
    ...overrides,
  };
}

describe('migrateStoriesToKeyedEntries', () => {
  let tempRoot: string;
  let storiesDir: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'keyed-migrate-test-'));
    storiesDir = path.join(tempRoot, 'stories');
    await fs.mkdir(storiesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('migrates legacy pages, maps parent removals to IDs, and is idempotent', async () => {
    const storyDir = path.join(storiesDir, 'story-a');
    await fs.mkdir(storyDir, { recursive: true });

    const page1 = createLegacyPage({
      id: 1,
      activeStateChanges: {
        newLocation: 'Square',
        threatsAdded: ['THREAT_GUARD: Guard patrol'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      },
      accumulatedActiveState: {
        currentLocation: 'Square',
        activeThreats: [
          {
            prefix: 'THREAT_GUARD',
            description: 'Guard patrol',
            raw: 'THREAT_GUARD: Guard patrol',
          },
        ],
        activeConstraints: [],
        openThreads: [],
      },
      inventoryChanges: { added: ['Sword'], removed: [] },
      accumulatedInventory: ['Sword'],
      healthChanges: { added: ['Bruise'], removed: [] },
      accumulatedHealth: ['Bruise'],
      characterStateChanges: [{ characterName: 'Mira', added: ['Wary'], removed: [] }],
      accumulatedCharacterState: { Mira: ['Wary'] },
      parentPageId: null,
      parentChoiceIndex: null,
    });

    const page2 = createLegacyPage({
      id: 2,
      parentPageId: 1,
      parentChoiceIndex: 0,
      activeStateChanges: {
        newLocation: 'Forest',
        threatsAdded: [],
        threatsRemoved: ['THREAT_GUARD'],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      },
      accumulatedActiveState: {
        currentLocation: 'Forest',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
      inventoryChanges: { added: [], removed: ['Sword', 'Unknown item'] },
      accumulatedInventory: [],
      healthChanges: { added: [], removed: ['Bruise', 'Unknown condition'] },
      accumulatedHealth: [],
      characterStateChanges: [{ characterName: 'Mira', added: [], removed: ['Wary', 'Ghost'] }],
      accumulatedCharacterState: {},
    });

    await fs.writeFile(path.join(storyDir, 'page_1.json'), `${JSON.stringify(page1, null, 2)}\n`, 'utf-8');
    await fs.writeFile(path.join(storyDir, 'page_2.json'), `${JSON.stringify(page2, null, 2)}\n`, 'utf-8');

    const warnings: string[] = [];
    const report = await migrateStoriesToKeyedEntries(storiesDir, {
      logger: {
        log: () => undefined,
        warn: (message: string) => warnings.push(message),
        error: () => undefined,
      },
    });

    expect(report.storiesProcessed).toBe(1);
    expect(report.pagesVisited).toBe(2);
    expect(report.pagesMigrated).toBe(2);
    expect(report.pagesFailed).toBe(0);

    const migratedPage1 = JSON.parse(
      await fs.readFile(path.join(storyDir, 'page_1.json'), 'utf-8'),
    ) as JsonObject;
    const migratedPage2 = JSON.parse(
      await fs.readFile(path.join(storyDir, 'page_2.json'), 'utf-8'),
    ) as JsonObject;

    expect(migratedPage1['accumulatedInventory']).toEqual([{ id: 'inv-1', text: 'Sword' }]);
    expect(migratedPage1['accumulatedHealth']).toEqual([{ id: 'hp-1', text: 'Bruise' }]);
    expect(migratedPage1['accumulatedCharacterState']).toEqual({
      Mira: [{ id: 'cs-1', text: 'Wary' }],
    });
    expect((migratedPage1['activeStateChanges'] as JsonObject)['threatsAdded']).toEqual(['Guard patrol']);

    expect((migratedPage2['inventoryChanges'] as JsonObject)['removed']).toEqual([
      'inv-1',
      'Unknown item',
    ]);
    expect((migratedPage2['healthChanges'] as JsonObject)['removed']).toEqual([
      'hp-1',
      'Unknown condition',
    ]);
    expect(migratedPage2['characterStateChanges']).toEqual({
      added: [],
      removed: ['cs-1'],
    });
    expect((migratedPage2['activeStateChanges'] as JsonObject)['threatsRemoved']).toEqual(['th-1']);

    expect(warnings.some(message => message.includes('Ghost'))).toBe(true);

    await expect(fs.stat(path.join(storyDir, 'page_1.json.bak'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(storyDir, 'page_2.json.bak'))).resolves.toBeDefined();

    const secondRun = await migrateStoriesToKeyedEntries(storiesDir, {
      logger: {
        log: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });
    expect(secondRun.pagesMigrated).toBe(0);
  });

  it('converts legacy open thread strings to typed thread entries with deterministic defaults', async () => {
    const storyDir = path.join(storiesDir, 'story-threads');
    await fs.mkdir(storyDir, { recursive: true });

    const page1 = createLegacyPage({
      id: 1,
      accumulatedActiveState: {
        currentLocation: 'Square',
        activeThreats: [],
        activeConstraints: [],
        openThreads: ['  Mystery in the bell tower  '],
      },
      activeStateChanges: {
        newLocation: 'Square',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: ['  Follow the strange footsteps  '],
        threadsResolved: [],
      },
    });

    await fs.writeFile(path.join(storyDir, 'page_1.json'), `${JSON.stringify(page1, null, 2)}\n`, 'utf-8');

    const report = await migrateStoriesToKeyedEntries(storiesDir, {
      logger: {
        log: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    expect(report.pagesMigrated).toBe(1);
    expect(report.pagesFailed).toBe(0);

    const migratedPage = JSON.parse(
      await fs.readFile(path.join(storyDir, 'page_1.json'), 'utf-8'),
    ) as JsonObject;

    expect((migratedPage['accumulatedActiveState'] as JsonObject)['openThreads']).toEqual([
      {
        id: 'td-1',
        text: 'Mystery in the bell tower',
        threadType: 'INFORMATION',
        urgency: 'MEDIUM',
      },
    ]);
    expect((migratedPage['activeStateChanges'] as JsonObject)['threadsAdded']).toEqual([
      'Follow the strange footsteps',
    ]);
  });

  it('fails page migration for unsupported openThreads shape and reports page failure', async () => {
    const storyDir = path.join(storiesDir, 'story-invalid-threads');
    await fs.mkdir(storyDir, { recursive: true });

    const page1 = createLegacyPage({
      id: 1,
      accumulatedActiveState: {
        currentLocation: 'Square',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [123],
      },
    });

    await fs.writeFile(path.join(storyDir, 'page_1.json'), `${JSON.stringify(page1, null, 2)}\n`, 'utf-8');

    const errors: Array<{ message: string; context?: unknown }> = [];
    const report = await migrateStoriesToKeyedEntries(storiesDir, {
      logger: {
        log: () => undefined,
        warn: () => undefined,
        error: (message: string, context?: unknown) => errors.push({ message, context }),
      } as unknown as Pick<Console, 'log' | 'warn' | 'error'>,
    });

    expect(report.pagesMigrated).toBe(0);
    expect(report.pagesFailed).toBe(1);
    expect(errors.some(entry => entry.message === 'Page migration failed')).toBe(true);
    const failureContext = errors.find(entry => entry.message === 'Page migration failed')?.context as
      | Record<string, unknown>
      | undefined;
    expect(failureContext?.storyId).toBe('story-invalid-threads');
    expect(failureContext?.pageId).toBe(1);
  });

  it('fails page migration when migrated thread text is empty after trim', async () => {
    const storyDir = path.join(storiesDir, 'story-empty-thread');
    await fs.mkdir(storyDir, { recursive: true });

    const page1 = createLegacyPage({
      id: 1,
      accumulatedActiveState: {
        currentLocation: 'Square',
        activeThreats: [],
        activeConstraints: [],
        openThreads: ['   '],
      },
    });

    await fs.writeFile(path.join(storyDir, 'page_1.json'), `${JSON.stringify(page1, null, 2)}\n`, 'utf-8');

    const report = await migrateStoriesToKeyedEntries(storiesDir, {
      logger: {
        log: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    expect(report.pagesMigrated).toBe(0);
    expect(report.pagesFailed).toBe(1);
  });
});
