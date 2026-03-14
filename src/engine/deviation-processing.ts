import type { ContinuationGenerationResult } from '../llm/generation-pipeline-types';
import { logger } from '../logging/index.js';
import type {
  AccumulatedStructureState,
  MilestoneDeviation,
  PageId,
  Story,
  VersionedStoryStructure,
} from '../models';
import { isDeviation } from '../models';
import { handleDeviation, isActualDeviation } from './deviation-handler';
import { emitGenerationStage } from './generation-pipeline-helpers';
import type { DeviationInfo, GenerationStageCallback } from './types';

export interface DeviationProcessingContext {
  readonly result: ContinuationGenerationResult;
  readonly story: Story;
  readonly currentStructureVersion: VersionedStoryStructure | null;
  readonly parentStructureState: AccumulatedStructureState;
  readonly newPageId: PageId;
  readonly apiKey: string;
  readonly logContext: Record<string, unknown>;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface DeviationProcessingResult {
  readonly storyForPage: Story;
  readonly activeStructureVersion: VersionedStoryStructure | null;
  readonly deviationInfo?: DeviationInfo;
  readonly structureRewriteDurationMs: number | null;
}

export async function handleDeviationIfDetected(
  context: DeviationProcessingContext
): Promise<DeviationProcessingResult> {
  if (
    !isActualDeviation(context.result, context.story, context.currentStructureVersion) ||
    !isDeviation(context.result.deviation)
  ) {
    return {
      storyForPage: context.story,
      activeStructureVersion: context.currentStructureVersion,
      structureRewriteDurationMs: null,
    };
  }

  const deviation: MilestoneDeviation = context.result.deviation;
  const rewriteAttempt = 1;
  logger.info('Generation stage started', {
    ...context.logContext,
    attempt: rewriteAttempt,
    stage: 'structure-rewrite',
  });
  emitGenerationStage(context.onGenerationStage, 'RESTRUCTURING_STORY', 'started', rewriteAttempt);
  const rewriteStart = Date.now();
  let devResult: Awaited<ReturnType<typeof handleDeviation>>;
  try {
    devResult = await handleDeviation(
      {
        story: context.story,
        currentVersion: context.currentStructureVersion!,
        parentStructureState: context.parentStructureState,
        deviation,
        newPageId: context.newPageId,
      },
      context.apiKey
    );
  } catch (error) {
    const rewriteDurationMs = Date.now() - rewriteStart;
    logger.error('Generation stage failed', {
      ...context.logContext,
      attempt: rewriteAttempt,
      stage: 'structure-rewrite',
      durationMs: rewriteDurationMs,
      error,
    });
    throw error;
  }
  const rewriteDurationMs = Date.now() - rewriteStart;
  emitGenerationStage(
    context.onGenerationStage,
    'RESTRUCTURING_STORY',
    'completed',
    rewriteAttempt,
    rewriteDurationMs
  );
  logger.info('Generation stage completed', {
    ...context.logContext,
    attempt: rewriteAttempt,
    stage: 'structure-rewrite',
    durationMs: rewriteDurationMs,
  });

  return {
    storyForPage: devResult.updatedStory,
    activeStructureVersion: devResult.activeVersion,
    deviationInfo: devResult.deviationInfo,
    structureRewriteDurationMs: rewriteDurationMs,
  };
}
