import {
  AccumulatedStructureState,
  AccumulatedCharacterState,
  CharacterStateChanges,
  Health,
  HealthChanges,
  Inventory,
  InventoryChanges,
  Page,
  PageId,
  StateChanges,
  StoryId,
  parsePageId,
} from '../models';
import {
  fileExists,
  getPageFilePath,
  getStoryDir,
  listFiles,
  readJsonFile,
  writeJsonFile,
} from './file-utils';
import { withLock } from './lock-manager';

interface BeatProgressionFileData {
  beatId: string;
  status: 'pending' | 'active' | 'concluded';
  resolution?: string;
}

interface AccumulatedStructureStateFileData {
  currentActIndex: number;
  currentBeatIndex: number;
  beatProgressions: BeatProgressionFileData[];
}

interface PageFileData {
  id: number;
  narrativeText: string;
  choices: Array<{
    text: string;
    nextPageId: number | null;
  }>;
  stateChanges: {
    added: string[];
    removed: string[];
  };
  accumulatedState: {
    changes: string[];
  };
  // Inventory fields (optional for migration from older pages)
  inventoryChanges?: {
    added: string[];
    removed: string[];
  };
  accumulatedInventory?: string[];
  // Health fields (optional for migration from older pages)
  healthChanges?: {
    added: string[];
    removed: string[];
  };
  accumulatedHealth?: string[];
  // Character state fields (optional for migration from older pages)
  characterStateChanges?: Array<{
    characterName: string;
    added: string[];
    removed: string[];
  }>;
  accumulatedCharacterState?: Record<string, string[]>;
  accumulatedStructureState: AccumulatedStructureStateFileData;
  isEnding: boolean;
  parentPageId: number | null;
  parentChoiceIndex: number | null;
}

function structureStateToFileData(
  state: AccumulatedStructureState
): AccumulatedStructureStateFileData {
  return {
    currentActIndex: state.currentActIndex,
    currentBeatIndex: state.currentBeatIndex,
    beatProgressions: state.beatProgressions.map((beatProgression) => ({
      beatId: beatProgression.beatId,
      status: beatProgression.status,
      resolution: beatProgression.resolution,
    })),
  };
}

function fileDataToStructureState(
  data: AccumulatedStructureStateFileData
): AccumulatedStructureState {
  return {
    currentActIndex: data.currentActIndex,
    currentBeatIndex: data.currentBeatIndex,
    beatProgressions: data.beatProgressions.map((beatProgression) => ({
      beatId: beatProgression.beatId,
      status: beatProgression.status,
      resolution: beatProgression.resolution,
    })),
  };
}

function pageToFileData(page: Page): PageFileData {
  // Convert CharacterStateChanges to file format
  const characterStateChanges = page.characterStateChanges.map((change) => ({
    characterName: change.characterName,
    added: [...change.added],
    removed: [...change.removed],
  }));

  // Convert AccumulatedCharacterState to file format
  const accumulatedCharacterState: Record<string, string[]> = {};
  for (const [name, state] of Object.entries(page.accumulatedCharacterState)) {
    accumulatedCharacterState[name] = [...state];
  }

  return {
    id: page.id,
    narrativeText: page.narrativeText,
    choices: page.choices.map((choice) => ({
      text: choice.text,
      nextPageId: choice.nextPageId,
    })),
    stateChanges: {
      added: [...page.stateChanges.added],
      removed: [...page.stateChanges.removed],
    },
    accumulatedState: {
      changes: [...page.accumulatedState.changes],
    },
    inventoryChanges: {
      added: [...page.inventoryChanges.added],
      removed: [...page.inventoryChanges.removed],
    },
    accumulatedInventory: [...page.accumulatedInventory],
    healthChanges: {
      added: [...page.healthChanges.added],
      removed: [...page.healthChanges.removed],
    },
    accumulatedHealth: [...page.accumulatedHealth],
    characterStateChanges,
    accumulatedCharacterState,
    accumulatedStructureState: structureStateToFileData(page.accumulatedStructureState),
    isEnding: page.isEnding,
    parentPageId: page.parentPageId,
    parentChoiceIndex: page.parentChoiceIndex,
  };
}

function fileDataToPage(data: PageFileData): Page {
  // Handle state changes (new format with added/removed)
  const stateChanges: StateChanges = {
    added: [...data.stateChanges.added],
    removed: [...data.stateChanges.removed],
  };

  // Migration: handle existing pages without inventory fields
  const inventoryChanges: InventoryChanges = data.inventoryChanges
    ? {
        added: [...data.inventoryChanges.added],
        removed: [...data.inventoryChanges.removed],
      }
    : { added: [], removed: [] };

  const accumulatedInventory: Inventory = data.accumulatedInventory
    ? [...data.accumulatedInventory]
    : [];

  // Migration: handle existing pages without health fields
  const healthChanges: HealthChanges = data.healthChanges
    ? {
        added: [...data.healthChanges.added],
        removed: [...data.healthChanges.removed],
      }
    : { added: [], removed: [] };

  const accumulatedHealth: Health = data.accumulatedHealth
    ? [...data.accumulatedHealth]
    : [];

  // Migration: handle existing pages without character state fields
  const characterStateChanges: CharacterStateChanges = data.characterStateChanges
    ? data.characterStateChanges.map((change) => ({
        characterName: change.characterName,
        added: [...change.added],
        removed: [...change.removed],
      }))
    : [];

  const accumulatedCharacterState: AccumulatedCharacterState = data.accumulatedCharacterState
    ? Object.fromEntries(
        Object.entries(data.accumulatedCharacterState).map(([name, state]) => [name, [...state]])
      )
    : {};
  if (!data.accumulatedStructureState) {
    throw new Error(`Invalid page data: missing accumulatedStructureState for page ${data.id}`);
  }

  const accumulatedStructureState: AccumulatedStructureState = fileDataToStructureState(
    data.accumulatedStructureState
  );

  return {
    id: parsePageId(data.id),
    narrativeText: data.narrativeText,
    choices: data.choices.map((choice) => ({
      text: choice.text,
      nextPageId: choice.nextPageId === null ? null : parsePageId(choice.nextPageId),
    })),
    stateChanges,
    accumulatedState: {
      changes: [...data.accumulatedState.changes],
    },
    inventoryChanges,
    accumulatedInventory,
    healthChanges,
    accumulatedHealth,
    characterStateChanges,
    accumulatedCharacterState,
    accumulatedStructureState,
    isEnding: data.isEnding,
    parentPageId: data.parentPageId === null ? null : parsePageId(data.parentPageId),
    parentChoiceIndex: data.parentChoiceIndex,
  };
}

function parsePageIdFromFileName(fileName: string): PageId | null {
  const match = fileName.match(/^page_(\d+)\.json$/);
  if (!match?.[1]) {
    return null;
  }

  return parsePageId(parseInt(match[1], 10));
}

export async function savePage(storyId: StoryId, page: Page): Promise<void> {
  await withLock(storyId, async () => {
    await writeJsonFile(getPageFilePath(storyId, page.id), pageToFileData(page));
  });
}

export async function updatePage(storyId: StoryId, page: Page): Promise<void> {
  await savePage(storyId, page);
}

export async function loadPage(storyId: StoryId, pageId: PageId): Promise<Page | null> {
  const filePath = getPageFilePath(storyId, pageId);
  const data = await readJsonFile<PageFileData>(filePath);

  if (!data) {
    return null;
  }

  if (data.id !== pageId) {
    throw new Error(`Page ID mismatch: expected ${pageId}, found ${data.id}`);
  }

  return fileDataToPage(data);
}

export async function pageExists(storyId: StoryId, pageId: PageId): Promise<boolean> {
  return fileExists(getPageFilePath(storyId, pageId));
}

export async function loadAllPages(storyId: StoryId): Promise<Map<PageId, Page>> {
  const pageFiles = await listFiles(getStoryDir(storyId), /^page_\d+\.json$/);
  const pages = new Map<PageId, Page>();

  for (const pageFile of pageFiles) {
    const pageId = parsePageIdFromFileName(pageFile);
    if (pageId === null) {
      continue;
    }

    const page = await loadPage(storyId, pageId);
    if (page) {
      pages.set(pageId, page);
    }
  }

  return pages;
}

export async function getMaxPageId(storyId: StoryId): Promise<number> {
  const pageFiles = await listFiles(getStoryDir(storyId), /^page_\d+\.json$/);

  let maxPageId = 0;

  for (const pageFile of pageFiles) {
    const pageId = parsePageIdFromFileName(pageFile);
    if (pageId !== null && pageId > maxPageId) {
      maxPageId = pageId;
    }
  }

  return maxPageId;
}

export async function updateChoiceLink(
  storyId: StoryId,
  pageId: PageId,
  choiceIndex: number,
  nextPageId: PageId
): Promise<void> {
  await withLock(storyId, async () => {
    const page = await loadPage(storyId, pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found in story ${storyId}`);
    }

    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= page.choices.length) {
      throw new Error(`Invalid choice index ${choiceIndex} for page ${pageId}`);
    }

    const updatedChoices = [...page.choices];
    const existingChoice = updatedChoices[choiceIndex];

    if (!existingChoice) {
      throw new Error(`Choice at index ${choiceIndex} not found on page ${pageId}`);
    }

    updatedChoices[choiceIndex] = {
      ...existingChoice,
      nextPageId,
    };

    const updatedPage: Page = {
      ...page,
      choices: updatedChoices,
    };

    await writeJsonFile(getPageFilePath(storyId, pageId), pageToFileData(updatedPage));
  });
}

export async function findEndingPages(storyId: StoryId): Promise<PageId[]> {
  const pages = await loadAllPages(storyId);
  const endingPageIds = [...pages.entries()]
    .filter(([, page]) => page.isEnding)
    .map(([pageId]) => pageId)
    .sort((a, b) => a - b);

  return endingPageIds;
}
