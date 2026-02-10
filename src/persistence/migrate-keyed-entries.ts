import * as fs from 'fs/promises';
import * as path from 'path';
import { KeyedEntry, StateIdPrefix, extractIdNumber } from '../models/state/keyed-entry.js';

interface TaggedEntryLike {
  readonly prefix: string;
  readonly description: string;
  readonly raw?: string;
}

interface ParentContext {
  readonly inventory: readonly KeyedEntry[];
  readonly health: readonly KeyedEntry[];
  readonly characterState: Readonly<Record<string, readonly KeyedEntry[]>>;
  readonly activeThreats: readonly KeyedEntry[];
  readonly activeConstraints: readonly KeyedEntry[];
  readonly openThreads: readonly KeyedEntry[];
  readonly threatAliases: Readonly<Record<string, string>>;
  readonly constraintAliases: Readonly<Record<string, string>>;
  readonly threadAliases: Readonly<Record<string, string>>;
  readonly counters: Readonly<Record<StateIdPrefix, number>>;
}

type MigratedPageContext = ParentContext;

interface MigrationOptions {
  readonly logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

export interface MigrationReport {
  readonly storiesProcessed: number;
  readonly pagesVisited: number;
  readonly pagesMigrated: number;
  readonly warnings: number;
}

const PAGE_FILE_RE = /^page_(\d+)\.json$/;

const EMPTY_CONTEXT: ParentContext = {
  inventory: [],
  health: [],
  characterState: {},
  activeThreats: [],
  activeConstraints: [],
  openThreads: [],
  threatAliases: {},
  constraintAliases: {},
  threadAliases: {},
  counters: {
    inv: 0,
    hp: 0,
    cs: 0,
    th: 0,
    cn: 0,
    td: 0,
  },
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isKeyedEntry(value: unknown): value is KeyedEntry {
  return isObject(value) && typeof value['id'] === 'string' && typeof value['text'] === 'string';
}

function isTaggedEntryLike(value: unknown): value is TaggedEntryLike {
  return (
    isObject(value) &&
    typeof value['prefix'] === 'string' &&
    typeof value['description'] === 'string'
  );
}

function getIdNumberIfValid(id: string, prefix: StateIdPrefix): number | null {
  if (!id.startsWith(`${prefix}-`)) {
    return null;
  }

  try {
    return extractIdNumber(id);
  } catch {
    return null;
  }
}

function nextId(prefix: StateIdPrefix, counter: number): string {
  return `${prefix}-${counter + 1}`;
}

function consumeByText(
  candidates: readonly KeyedEntry[],
  text: string,
  consumed: Set<number>,
): KeyedEntry | null {
  for (let index = 0; index < candidates.length; index += 1) {
    if (consumed.has(index)) {
      continue;
    }
    const candidate = candidates[index];
    if (candidate?.text === text) {
      consumed.add(index);
      return candidate;
    }
  }
  return null;
}

function normalizeActiveAddition(raw: string): string {
  const trimmed = raw.trim();
  const separatorIndex = trimmed.indexOf(':');
  if (separatorIndex <= 0) {
    return trimmed;
  }

  const maybePrefix = trimmed.slice(0, separatorIndex).trim();
  if (!/^(THREAT|CONSTRAINT|THREAD)_[^:\s]+$/.test(maybePrefix)) {
    return trimmed;
  }

  const description = trimmed.slice(separatorIndex + 1).trim();
  return description || trimmed;
}

function mapRemovalToId(
  value: string,
  prefix: StateIdPrefix,
  parentEntries: readonly KeyedEntry[],
  currentEntries: readonly KeyedEntry[],
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (getIdNumberIfValid(trimmed, prefix) !== null) {
    return trimmed;
  }

  for (const source of [parentEntries, currentEntries]) {
    const match = source.find(entry => entry.text === trimmed);
    if (match) {
      return match.id;
    }
  }

  return null;
}

function buildTextMap(entries: readonly KeyedEntry[]): Record<string, string> {
  const byText: Record<string, string> = {};
  for (const entry of entries) {
    byText[entry.text] ??= entry.id;
  }
  return byText;
}

interface ConvertEntriesResult {
  readonly entries: KeyedEntry[];
  readonly aliases: Record<string, string>;
  readonly counter: number;
}

function convertEntries(
  legacyEntries: unknown,
  parentEntries: readonly KeyedEntry[],
  inheritedAliases: Readonly<Record<string, string>>,
  prefix: StateIdPrefix,
  initialCounter: number,
): ConvertEntriesResult {
  const items = Array.isArray(legacyEntries) ? legacyEntries : [];
  const consumedParent = new Set<number>();
  const entries: KeyedEntry[] = [];
  const aliases: Record<string, string> = {};
  let counter = initialCounter;

  for (const item of items) {
    if (isKeyedEntry(item)) {
      const idNumber = getIdNumberIfValid(item.id, prefix);
      if (idNumber !== null && idNumber > counter) {
        counter = idNumber;
      }
      entries.push({ id: item.id, text: item.text });
      aliases[item.id] = item.id;
      continue;
    }

    let text: string | null = null;
    let aliasKey: string | null = null;

    if (isTaggedEntryLike(item)) {
      text = item.description.trim();
      aliasKey = item.prefix.trim();
    } else if (typeof item === 'string') {
      text = item;
    }

    if (!text) {
      continue;
    }

    const fromParent = consumeByText(parentEntries, text, consumedParent);
    const id = fromParent ? fromParent.id : nextId(prefix, counter);
    if (!fromParent) {
      counter += 1;
    }

    entries.push({ id, text });
    aliases[id] = id;
    if (aliasKey) {
      aliases[aliasKey] = id;
    }
  }

  for (const [alias, id] of Object.entries(inheritedAliases)) {
    if (!aliases[alias] && entries.some(entry => entry.id === id)) {
      aliases[alias] = id;
    }
  }

  return { entries, aliases, counter };
}

function convertCharacterState(
  legacyCharacterState: unknown,
  parentCharacterState: Readonly<Record<string, readonly KeyedEntry[]>>,
  initialCounter: number,
): {
  readonly state: Record<string, KeyedEntry[]>;
  readonly lookupByCharacterText: Record<string, Record<string, string>>;
  readonly counter: number;
} {
  const source = isObject(legacyCharacterState) ? legacyCharacterState : {};
  const state: Record<string, KeyedEntry[]> = {};
  const lookupByCharacterText: Record<string, Record<string, string>> = {};
  let counter = initialCounter;

  for (const [characterName, rawEntries] of Object.entries(source)) {
    const parentEntries = parentCharacterState[characterName] ?? [];
    const consumedParent = new Set<number>();
    const entries: KeyedEntry[] = [];

    const items = Array.isArray(rawEntries) ? rawEntries : [];
    for (const rawEntry of items) {
      if (isKeyedEntry(rawEntry)) {
        const idNumber = getIdNumberIfValid(rawEntry.id, 'cs');
        if (idNumber !== null && idNumber > counter) {
          counter = idNumber;
        }
        entries.push({ id: rawEntry.id, text: rawEntry.text });
        continue;
      }

      if (typeof rawEntry !== 'string') {
        continue;
      }

      const fromParent = consumeByText(parentEntries, rawEntry, consumedParent);
      const id = fromParent ? fromParent.id : nextId('cs', counter);
      if (!fromParent) {
        counter += 1;
      }

      entries.push({ id, text: rawEntry });
    }

    state[characterName] = entries;
    lookupByCharacterText[characterName] = buildTextMap(entries);
  }

  return { state, lookupByCharacterText, counter };
}

function convertCharacterStateChanges(
  legacyChanges: unknown,
  parentCharacterState: Readonly<Record<string, readonly KeyedEntry[]>>,
  currentCharacterStateLookup: Readonly<Record<string, Record<string, string>>>,
  warn: (message: string) => void,
): { added: Array<{ characterName: string; states: string[] }>; removed: string[] } {
  if (isObject(legacyChanges) && Array.isArray(legacyChanges['added']) && Array.isArray(legacyChanges['removed'])) {
    const added = (legacyChanges['added'] as unknown[])
      .filter(isObject)
      .map(change => ({
        characterName: typeof change['characterName'] === 'string' ? change['characterName'] : '',
        states: asStringArray(change['states']),
      }))
      .filter(change => change.characterName);

    const removed = asStringArray(legacyChanges['removed']);
    return { added, removed };
  }

  const legacyArray = Array.isArray(legacyChanges) ? legacyChanges : [];
  const added: Array<{ characterName: string; states: string[] }> = [];
  const removed: string[] = [];

  for (const rawChange of legacyArray) {
    if (!isObject(rawChange)) {
      continue;
    }

    const characterName = rawChange['characterName'];
    if (typeof characterName !== 'string' || !characterName.trim()) {
      continue;
    }

    const statesAdded = asStringArray(rawChange['added']);
    if (statesAdded.length > 0) {
      added.push({ characterName, states: statesAdded });
    }

    for (const rawRemoval of asStringArray(rawChange['removed'])) {
      const trimmed = rawRemoval.trim();
      if (!trimmed) {
        continue;
      }

      if (getIdNumberIfValid(trimmed, 'cs') !== null) {
        removed.push(trimmed);
        continue;
      }

      const parentMatch = parentCharacterState[characterName]?.find(
        entry => entry.text === trimmed,
      );
      if (parentMatch) {
        removed.push(parentMatch.id);
        continue;
      }

      const currentMatch = currentCharacterStateLookup[characterName]?.[trimmed];
      if (currentMatch) {
        removed.push(currentMatch);
        continue;
      }

      warn(
        `Unmatched character removal "${trimmed}" for ${characterName}; dropped from migrated change set`,
      );
    }
  }

  return { added, removed };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createWarn(logger: Pick<Console, 'warn'>, counter: { value: number }) {
  return (message: string): void => {
    counter.value += 1;
    logger.warn(message);
  };
}

function getPageIdFromFileName(fileName: string): number | null {
  const match = PAGE_FILE_RE.exec(fileName);
  if (!match?.[1]) {
    return null;
  }
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortedNumeric(values: Iterable<number>): number[] {
  return [...values].sort((a, b) => a - b);
}

function buildPageTraversalOrder(
  pagesById: Readonly<Map<number, Record<string, unknown>>>,
): number[] {
  const childrenByParent = new Map<number, number[]>();
  const roots = new Set<number>();

  for (const [id, page] of pagesById.entries()) {
    const parentIdValue = page['parentPageId'];
    const parentId = typeof parentIdValue === 'number' ? parentIdValue : null;
    if (parentId === null || !pagesById.has(parentId)) {
      roots.add(id);
      continue;
    }
    const children = childrenByParent.get(parentId) ?? [];
    children.push(id);
    childrenByParent.set(parentId, children);
  }

  const orderedRoots = sortedNumeric(roots);
  if (orderedRoots.includes(1)) {
    orderedRoots.splice(orderedRoots.indexOf(1), 1);
    orderedRoots.unshift(1);
  }

  const visited = new Set<number>();
  const queue = [...orderedRoots];
  const order: number[] = [];

  while (queue.length > 0) {
    const pageId = queue.shift();
    if (pageId === undefined || visited.has(pageId)) {
      continue;
    }
    visited.add(pageId);
    order.push(pageId);

    const children = childrenByParent.get(pageId);
    if (children) {
      for (const childId of sortedNumeric(children)) {
        queue.push(childId);
      }
    }
  }

  for (const pageId of sortedNumeric(pagesById.keys())) {
    if (!visited.has(pageId)) {
      order.push(pageId);
    }
  }

  return order;
}

async function readPageJson(filePath: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(content);
  if (!isObject(parsed)) {
    throw new Error(`Invalid page JSON object: ${filePath}`);
  }
  return parsed;
}

function makeParentContextCopy(parent: ParentContext): ParentContext {
  return {
    inventory: [...parent.inventory],
    health: [...parent.health],
    characterState: Object.fromEntries(
      Object.entries(parent.characterState).map(([name, entries]) => [name, [...entries]]),
    ),
    activeThreats: [...parent.activeThreats],
    activeConstraints: [...parent.activeConstraints],
    openThreads: [...parent.openThreads],
    threatAliases: { ...parent.threatAliases },
    constraintAliases: { ...parent.constraintAliases },
    threadAliases: { ...parent.threadAliases },
    counters: { ...parent.counters },
  };
}

async function writePageWithBackupIfChanged(
  filePath: string,
  original: Record<string, unknown>,
  migrated: Record<string, unknown>,
): Promise<boolean> {
  const originalCanonical = JSON.stringify(original);
  const migratedCanonical = JSON.stringify(migrated);
  if (originalCanonical === migratedCanonical) {
    return false;
  }

  const backupPath = `${filePath}.bak`;
  try {
    await fs.access(backupPath);
  } catch {
    const originalContent = `${JSON.stringify(original, null, 2)}\n`;
    await fs.writeFile(backupPath, originalContent, 'utf-8');
  }

  await fs.writeFile(filePath, `${JSON.stringify(migrated, null, 2)}\n`, 'utf-8');
  return true;
}

function resolveActiveRemoval(
  value: string,
  prefix: StateIdPrefix,
  parentAliases: Readonly<Record<string, string>>,
  parentEntries: readonly KeyedEntry[],
  currentEntries: readonly KeyedEntry[],
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (getIdNumberIfValid(trimmed, prefix) !== null) {
    return trimmed;
  }

  const aliasMatch = parentAliases[trimmed];
  if (aliasMatch) {
    return aliasMatch;
  }

  const byText = mapRemovalToId(trimmed, prefix, parentEntries, currentEntries);
  return byText ?? trimmed;
}

function maxCounterFromEntries(entries: readonly KeyedEntry[], prefix: StateIdPrefix): number {
  let max = 0;
  for (const entry of entries) {
    const idNumber = getIdNumberIfValid(entry.id, prefix);
    if (idNumber !== null && idNumber > max) {
      max = idNumber;
    }
  }
  return max;
}

function migratePageData(
  originalPage: Record<string, unknown>,
  parent: ParentContext,
  warn: (message: string) => void,
): { migrated: Record<string, unknown>; context: MigratedPageContext } {
  const page = deepClone(originalPage);
  const counters = { ...parent.counters };

  const inventory = convertEntries(
    page['accumulatedInventory'],
    parent.inventory,
    {},
    'inv',
    counters.inv,
  );
  counters.inv = inventory.counter;
  page['accumulatedInventory'] = inventory.entries;

  const health = convertEntries(
    page['accumulatedHealth'],
    parent.health,
    {},
    'hp',
    counters.hp,
  );
  counters.hp = health.counter;
  page['accumulatedHealth'] = health.entries;

  const characterState = convertCharacterState(
    page['accumulatedCharacterState'],
    parent.characterState,
    counters.cs,
  );
  counters.cs = characterState.counter;
  page['accumulatedCharacterState'] = characterState.state;

  const accumulatedActiveState = isObject(page['accumulatedActiveState'])
    ? page['accumulatedActiveState']
    : {};

  const threats = convertEntries(
    accumulatedActiveState['activeThreats'],
    parent.activeThreats,
    parent.threatAliases,
    'th',
    counters.th,
  );
  counters.th = threats.counter;
  accumulatedActiveState['activeThreats'] = threats.entries;

  const constraints = convertEntries(
    accumulatedActiveState['activeConstraints'],
    parent.activeConstraints,
    parent.constraintAliases,
    'cn',
    counters.cn,
  );
  counters.cn = constraints.counter;
  accumulatedActiveState['activeConstraints'] = constraints.entries;

  const threads = convertEntries(
    accumulatedActiveState['openThreads'],
    parent.openThreads,
    parent.threadAliases,
    'td',
    counters.td,
  );
  counters.td = threads.counter;
  accumulatedActiveState['openThreads'] = threads.entries;
  page['accumulatedActiveState'] = accumulatedActiveState;

  const inventoryChanges = isObject(page['inventoryChanges']) ? page['inventoryChanges'] : {};
  inventoryChanges['added'] = asStringArray(inventoryChanges['added']);
  inventoryChanges['removed'] = asStringArray(inventoryChanges['removed']).map(raw => {
    const mapped = mapRemovalToId(raw, 'inv', parent.inventory, inventory.entries);
    if (mapped) {
      return mapped;
    }
    warn(`Unmatched inventory removal "${raw}" retained as-is`);
    return raw;
  });
  page['inventoryChanges'] = inventoryChanges;

  const healthChanges = isObject(page['healthChanges']) ? page['healthChanges'] : {};
  healthChanges['added'] = asStringArray(healthChanges['added']);
  healthChanges['removed'] = asStringArray(healthChanges['removed']).map(raw => {
    const mapped = mapRemovalToId(raw, 'hp', parent.health, health.entries);
    if (mapped) {
      return mapped;
    }
    warn(`Unmatched health removal "${raw}" retained as-is`);
    return raw;
  });
  page['healthChanges'] = healthChanges;

  const convertedCharacterChanges = convertCharacterStateChanges(
    page['characterStateChanges'],
    parent.characterState,
    characterState.lookupByCharacterText,
    warn,
  );
  page['characterStateChanges'] = convertedCharacterChanges;

  const activeStateChanges = isObject(page['activeStateChanges']) ? page['activeStateChanges'] : {};
  activeStateChanges['threatsAdded'] = asStringArray(activeStateChanges['threatsAdded']).map(
    normalizeActiveAddition,
  );
  activeStateChanges['constraintsAdded'] = asStringArray(
    activeStateChanges['constraintsAdded'],
  ).map(normalizeActiveAddition);
  activeStateChanges['threadsAdded'] = asStringArray(activeStateChanges['threadsAdded']).map(
    normalizeActiveAddition,
  );

  activeStateChanges['threatsRemoved'] = asStringArray(activeStateChanges['threatsRemoved']).map(
    raw =>
      resolveActiveRemoval(raw, 'th', parent.threatAliases, parent.activeThreats, threats.entries),
  );
  activeStateChanges['constraintsRemoved'] = asStringArray(
    activeStateChanges['constraintsRemoved'],
  ).map(raw =>
    resolveActiveRemoval(
      raw,
      'cn',
      parent.constraintAliases,
      parent.activeConstraints,
      constraints.entries,
    ),
  );
  activeStateChanges['threadsResolved'] = asStringArray(activeStateChanges['threadsResolved']).map(
    raw => resolveActiveRemoval(raw, 'td', parent.threadAliases, parent.openThreads, threads.entries),
  );
  page['activeStateChanges'] = activeStateChanges;

  counters.inv = Math.max(counters.inv, maxCounterFromEntries(inventory.entries, 'inv'));
  counters.hp = Math.max(counters.hp, maxCounterFromEntries(health.entries, 'hp'));
  counters.cs = Math.max(
    counters.cs,
    ...Object.values(characterState.state).map(entries => maxCounterFromEntries(entries, 'cs')),
  );
  counters.th = Math.max(counters.th, maxCounterFromEntries(threats.entries, 'th'));
  counters.cn = Math.max(counters.cn, maxCounterFromEntries(constraints.entries, 'cn'));
  counters.td = Math.max(counters.td, maxCounterFromEntries(threads.entries, 'td'));

  return {
    migrated: page,
    context: {
      inventory: inventory.entries,
      health: health.entries,
      characterState: characterState.state,
      activeThreats: threats.entries,
      activeConstraints: constraints.entries,
      openThreads: threads.entries,
      threatAliases: threats.aliases,
      constraintAliases: constraints.aliases,
      threadAliases: threads.aliases,
      counters,
    },
  };
}

async function migrateStoryDirectory(
  storyDir: string,
  options: {
    readonly logger: Pick<Console, 'log' | 'warn'>;
    readonly warningCounter: { value: number };
  },
): Promise<{ visitedPages: number; migratedPages: number }> {
  const logger = options.logger;
  const warningCounter = options.warningCounter;
  const files = await fs.readdir(storyDir, { withFileTypes: true });
  const pageFiles = files
    .filter(entry => entry.isFile() && PAGE_FILE_RE.test(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => {
      const aId = getPageIdFromFileName(a) ?? 0;
      const bId = getPageIdFromFileName(b) ?? 0;
      return aId - bId;
    });

  if (pageFiles.length === 0) {
    return { visitedPages: 0, migratedPages: 0 };
  }

  const pagesById = new Map<number, Record<string, unknown>>();
  const pathById = new Map<number, string>();
  for (const fileName of pageFiles) {
    const pageId = getPageIdFromFileName(fileName);
    if (pageId === null) {
      continue;
    }
    const filePath = path.join(storyDir, fileName);
    const page = await readPageJson(filePath);
    pagesById.set(pageId, page);
    pathById.set(pageId, filePath);
  }

  const traversalOrder = buildPageTraversalOrder(pagesById);
  const contextsById = new Map<number, MigratedPageContext>();
  let migratedPages = 0;

  for (const pageId of traversalOrder) {
    const originalPage = pagesById.get(pageId);
    const filePath = pathById.get(pageId);
    if (!originalPage || !filePath) {
      continue;
    }

    const parentIdRaw = originalPage['parentPageId'];
    const parentId = typeof parentIdRaw === 'number' ? parentIdRaw : null;
    const parentContext = parentId !== null ? contextsById.get(parentId) ?? EMPTY_CONTEXT : EMPTY_CONTEXT;
    const warn = createWarn(options.logger, warningCounter);
    const { migrated, context } = migratePageData(originalPage, makeParentContextCopy(parentContext), warn);

    const changed = await writePageWithBackupIfChanged(filePath, originalPage, migrated);
    if (changed) {
      migratedPages += 1;
      logger.log(`  Page ${pageId}: migrated`);
    } else {
      logger.log(`  Page ${pageId}: unchanged`);
    }

    contextsById.set(pageId, context);
  }

  return { visitedPages: traversalOrder.length, migratedPages };
}

export async function migrateStoriesToKeyedEntries(
  storiesDir: string,
  options: MigrationOptions = {},
): Promise<MigrationReport> {
  const logger = options.logger ?? console;
  const warningCounter = { value: 0 };

  const dirEntries = await fs.readdir(storiesDir, { withFileTypes: true });
  const storyDirs = dirEntries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));

  let pagesVisited = 0;
  let pagesMigrated = 0;

  for (const storyId of storyDirs) {
    logger.log(`Processing story ${storyId}...`);
    const storyDir = path.join(storiesDir, storyId);
    const result = await migrateStoryDirectory(storyDir, { logger, warningCounter });
    pagesVisited += result.visitedPages;
    pagesMigrated += result.migratedPages;
  }

  return {
    storiesProcessed: storyDirs.length,
    pagesVisited,
    pagesMigrated,
    warnings: warningCounter.value,
  };
}
