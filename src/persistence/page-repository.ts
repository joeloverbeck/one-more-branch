import { Page, PageId, StoryId } from '../models';
import {
  fileExists,
  getPageFilePath,
  getStoryDir,
  listFiles,
  readJsonFile,
  writeJsonFile,
} from './file-utils';
import { withLock } from './lock-manager';
import {
  deserializePage,
  PageFileData,
  parsePageIdFromFileName,
  serializePage,
} from './page-serializer';

export async function savePage(storyId: StoryId, page: Page): Promise<void> {
  await withLock(storyId, async () => {
    await writeJsonFile(getPageFilePath(storyId, page.id), serializePage(page));
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

  return deserializePage(data);
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

    await writeJsonFile(getPageFilePath(storyId, pageId), serializePage(updatedPage));
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
