import {
  AccumulatedStructureState,
  addStructureVersion,
  BeatDeviation,
  createRewrittenVersionedStructure,
  isDeviation,
  PageId,
  Story,
  VersionedStoryStructure,
} from '../models';
import { ContinuationGenerationResult } from '../llm/generation-pipeline-types';
import { buildRewriteContext } from './structure-rewrite-support';
import { createStructureRewriter } from './structure-rewriter';
import { DeviationInfo } from './types';

/**
 * Context needed to handle a detected deviation.
 */
export interface DeviationContext {
  readonly story: Story;
  readonly currentVersion: VersionedStoryStructure;
  readonly parentStructureState: AccumulatedStructureState;
  readonly deviation: BeatDeviation;
  readonly newPageId: PageId;
}

/**
 * Result of handling a deviation, including updated story and version info.
 */
export interface DeviationHandlingResult {
  readonly updatedStory: Story;
  readonly activeVersion: VersionedStoryStructure;
  readonly deviationInfo: DeviationInfo;
}

/**
 * Checks if a continuation result contains an actual deviation that requires handling.
 */
export function isActualDeviation(
  result: ContinuationGenerationResult,
  story: Story,
  currentVersion: VersionedStoryStructure | null
): boolean {
  return (
    story.structure !== null &&
    currentVersion !== null &&
    'deviation' in result &&
    isDeviation(result.deviation)
  );
}

/**
 * Handles a detected deviation by triggering structure rewrite.
 * Creates a new structure version and updates the story.
 */
export async function handleDeviation(
  context: DeviationContext,
  apiKey: string
): Promise<DeviationHandlingResult> {
  const rewriteContext = buildRewriteContext(
    context.story,
    context.currentVersion,
    context.parentStructureState,
    context.deviation
  );

  const rewriter = createStructureRewriter();
  const rewriteResult = await rewriter.rewriteStructure(rewriteContext, apiKey);

  const newVersion = createRewrittenVersionedStructure(
    context.currentVersion,
    rewriteResult.structure,
    rewriteResult.preservedBeatIds,
    context.deviation.reason,
    context.newPageId
  );

  const updatedStory = addStructureVersion(context.story, newVersion);

  const deviationInfo: DeviationInfo = {
    detected: true,
    reason: context.deviation.reason,
    beatsInvalidated: context.deviation.invalidatedBeatIds.length,
  };

  return {
    updatedStory,
    activeVersion: newVersion,
    deviationInfo,
  };
}
