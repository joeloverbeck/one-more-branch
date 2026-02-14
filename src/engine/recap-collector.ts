import type { Page, PageId, StoryId } from '../models';
import { storage } from '../persistence';

export interface RecapEntry {
  readonly pageId: PageId;
  readonly summary: string;
}

/**
 * Walk the current branch from the provided page back to page 1 and return
 * scene summaries in chronological order (oldest first).
 */
export async function collectRecapSummaries(
  storyId: StoryId,
  currentPage: Page
): Promise<readonly RecapEntry[]> {
  const entries: RecapEntry[] = [];

  if (currentPage.sceneSummary.length > 0) {
    entries.push({ pageId: currentPage.id, summary: currentPage.sceneSummary });
  }

  let currentPageId: PageId | null = currentPage.parentPageId;
  while (currentPageId !== null) {
    const page = await storage.loadPage(storyId, currentPageId);
    if (!page) {
      break;
    }

    if (page.sceneSummary.length > 0) {
      entries.push({ pageId: page.id, summary: page.sceneSummary });
    }
    currentPageId = page.parentPageId;
  }

  return entries.reverse();
}
