import { AccumulatedState, Page, PageId, StoryId } from '../models';
import { loadAllPages } from './page-repository';

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
