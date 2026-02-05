import { AccumulatedState, Page, PageId, StoryId, parsePageId } from '../models';
import {
  fileExists,
  getPageFilePath,
  getStoryDir,
  listFiles,
  readJsonFile,
  writeJsonFile,
} from './file-utils';
import { withLock } from './lock-manager';

interface PageFileData {
  id: number;
  narrativeText: string;
  choices: Array<{
    text: string;
    nextPageId: number | null;
  }>;
  stateChanges: string[];
  accumulatedState: {
    changes: string[];
  };
  isEnding: boolean;
  parentPageId: number | null;
  parentChoiceIndex: number | null;
}

function pageToFileData(page: Page): PageFileData {
  return {
    id: page.id,
    narrativeText: page.narrativeText,
    choices: page.choices.map((choice) => ({
      text: choice.text,
      nextPageId: choice.nextPageId,
    })),
    stateChanges: [...page.stateChanges],
    accumulatedState: {
      changes: [...page.accumulatedState.changes],
    },
    isEnding: page.isEnding,
    parentPageId: page.parentPageId,
    parentChoiceIndex: page.parentChoiceIndex,
  };
}

function fileDataToPage(data: PageFileData): Page {
  return {
    id: parsePageId(data.id),
    narrativeText: data.narrativeText,
    choices: data.choices.map((choice) => ({
      text: choice.text,
      nextPageId: choice.nextPageId === null ? null : parsePageId(choice.nextPageId),
    })),
    stateChanges: [...data.stateChanges],
    accumulatedState: {
      changes: [...data.accumulatedState.changes],
    },
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

export async function computeAccumulatedState(
  storyId: StoryId,
  pageId: PageId
): Promise<AccumulatedState> {
  const pages = await loadAllPages(storyId);
  const page = pages.get(pageId);

  if (!page) {
    throw new Error(`Page ${pageId} not found in story ${storyId}`);
  }

  const visited = new Set<PageId>();
  const path: Page[] = [];
  let current: Page | undefined = page;

  while (current) {
    if (visited.has(current.id)) {
      throw new Error(`Cycle detected while computing accumulated state for page ${pageId}`);
    }

    visited.add(current.id);
    path.unshift(current);

    if (current.parentPageId === null) {
      break;
    }

    current = pages.get(current.parentPageId);

    if (!current) {
      throw new Error(
        `Broken parent chain for page ${pageId}: missing parent page ${path[0]?.parentPageId}`
      );
    }
  }

  return {
    changes: path.flatMap((pathPage) => pathPage.stateChanges),
  };
}
