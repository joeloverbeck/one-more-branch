import type { Page, PageId, StoryId } from '../models';
import type { AncestorSummary } from '../llm/types';
import { storage } from '../persistence';

const MAX_ANCESTORS = 10;

export interface AncestorContext {
  readonly parentNarrative: string;
  readonly grandparentNarrative: string | null;
  readonly ancestorSummaries: readonly AncestorSummary[];
}

/**
 * Walks the ancestor chain from a parent page and collects hierarchical context:
 * - Full text for parent (always available as parentPage.narrativeText)
 * - Full text for grandparent (if exists)
 * - Structured summaries for ancestors 3-10 (oldest-first order)
 *
 * The parent's full narrative is always included. The grandparent (if it exists)
 * provides full text for style continuity. Older ancestors provide only their
 * sceneSummary for factual/thematic continuity.
 */
export async function collectAncestorContext(
  storyId: StoryId,
  parentPage: Page,
): Promise<AncestorContext> {
  const parentNarrative = parentPage.narrativeText;

  if (!parentPage.parentPageId) {
    return {
      parentNarrative,
      grandparentNarrative: null,
      ancestorSummaries: [],
    };
  }

  // Walk up the chain collecting ancestors (grandparent first, then older)
  // We need up to MAX_ANCESTORS - 1 more ancestors (parent is already known)
  const ancestors: Page[] = [];
  let currentPageId: PageId | null = parentPage.parentPageId;

  while (currentPageId !== null && ancestors.length < MAX_ANCESTORS - 1) {
    const page = await storage.loadPage(storyId, currentPageId);
    if (!page) {
      break;
    }
    ancestors.push(page);
    currentPageId = page.parentPageId;
  }

  // ancestors[0] = grandparent, ancestors[1..] = older ancestors
  const grandparentPage = ancestors[0] ?? null;
  const grandparentNarrative = grandparentPage?.narrativeText ?? null;

  // Collect summaries from ancestors older than grandparent (index 1+)
  // Reverse for chronological (oldest-first) order
  const summaryAncestors = ancestors.slice(1).reverse();
  const ancestorSummaries: AncestorSummary[] = summaryAncestors
    .filter((page) => page.sceneSummary)
    .map((page) => ({
      pageId: page.id,
      summary: page.sceneSummary,
    }));

  return {
    parentNarrative,
    grandparentNarrative,
    ancestorSummaries,
  };
}
