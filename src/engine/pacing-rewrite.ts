import type { Page } from '../models/page';
import {
  addStructureVersion,
  createRewrittenVersionedStructure,
  Story,
  VersionedStoryStructure,
} from '../models';
import { updateStory } from '../persistence';
import { buildPacingRewriteContext } from './structure-rewrite-support';
import { createStructureRewriter } from './structure-rewriter';

export interface PacingRewriteResult {
  readonly updatedStory: Story;
  readonly newVersion: VersionedStoryStructure;
}

/**
 * Orchestrates a player-triggered structure rewrite in response to a pacing issue.
 *
 * Follows the same pattern as `handleDeviation` in `deviation-handler.ts`:
 * 1. Build rewrite context from the page's accumulated structure state
 * 2. Call the structure rewriter LLM
 * 3. Create a new versioned structure
 * 4. Update and persist the story
 */
export async function rewriteStructureForPacing(
  story: Story,
  page: Page,
  apiKey: string
): Promise<PacingRewriteResult> {
  const versions = story.structureVersions ?? [];
  if (versions.length === 0) {
    throw new Error('Story has no structure versions');
  }

  const currentVersion = versions[versions.length - 1]!;
  const structureState = page.accumulatedStructureState;
  const analystResult = page.analystResult;

  if (!analystResult || analystResult.recommendedAction !== 'rewrite') {
    throw new Error('Page does not have a pacing rewrite recommendation');
  }

  const context = buildPacingRewriteContext(
    story,
    currentVersion,
    structureState,
    analystResult.pacingIssueReason,
    analystResult.narrativeSummary
  );

  const rewriter = createStructureRewriter();
  const rewriteResult = await rewriter.rewriteStructure(context, apiKey);

  const newVersion = createRewrittenVersionedStructure(
    currentVersion,
    rewriteResult.structure,
    rewriteResult.preservedBeatIds,
    `Pacing issue: ${analystResult.pacingIssueReason}`,
    page.id
  );

  const updatedStory = addStructureVersion(story, newVersion);
  await updateStory(updatedStory);

  return { updatedStory, newVersion };
}
