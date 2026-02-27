import type { AnalystResult } from '../llm/analyst-types';
import type { ContinuationGenerationResult } from '../llm/generation-pipeline-types';
import { logger } from '../logging/index.js';
import type { PageId, StoryBeat } from '../models';

export interface BeatConclusionContext {
  readonly result: ContinuationGenerationResult;
  readonly activeBeat: StoryBeat | undefined;
  readonly analystResult: AnalystResult | null;
  readonly storyId: string;
  readonly parentPageId: PageId;
}

export interface BeatConclusionResult {
  readonly beatConcluded: boolean;
  readonly beatResolution: string;
}

export function resolveBeatConclusion(context: BeatConclusionContext): BeatConclusionResult {
  let beatConcluded =
    'beatConcluded' in context.result && typeof context.result.beatConcluded === 'boolean'
      ? context.result.beatConcluded
      : false;
  const beatResolution =
    'beatResolution' in context.result && typeof context.result.beatResolution === 'string'
      ? context.result.beatResolution
      : '';

  if (
    context.activeBeat?.role === 'turning_point' &&
    context.analystResult?.beatConcluded === true &&
    context.analystResult.completionGateSatisfied === false &&
    beatConcluded
  ) {
    beatConcluded = false;
    logger.warn('Turning point completion gate mismatch; forcing beatConcluded=false', {
      storyId: context.storyId,
      parentPageId: context.parentPageId,
      beatId: context.activeBeat.id,
      beatRole: context.activeBeat.role,
      completionGateFailureReason:
        context.analystResult.completionGateFailureReason || 'Completion gate not satisfied',
    });
  }

  return { beatConcluded, beatResolution };
}
