import type { AnalystResult } from '../llm/analyst-types';
import type { ContinuationGenerationResult } from '../llm/generation-pipeline-types';
import { logger } from '../logging/index.js';
import type { PageId, StoryMilestone } from '../models';

export interface MilestoneConclusionContext {
  readonly result: ContinuationGenerationResult;
  readonly activeMilestone: StoryMilestone | undefined;
  readonly analystResult: AnalystResult | null;
  readonly storyId: string;
  readonly parentPageId: PageId;
}

export interface MilestoneConclusionResult {
  readonly milestoneConcluded: boolean;
  readonly milestoneResolution: string;
}

export function resolveMilestoneConclusion(context: MilestoneConclusionContext): MilestoneConclusionResult {
  let milestoneConcluded =
    'milestoneConcluded' in context.result && typeof context.result.milestoneConcluded === 'boolean'
      ? context.result.milestoneConcluded
      : false;
  const milestoneResolution =
    'milestoneResolution' in context.result && typeof context.result.milestoneResolution === 'string'
      ? context.result.milestoneResolution
      : '';

  if (
    context.activeMilestone?.role === 'turning_point' &&
    context.analystResult?.milestoneConcluded === true &&
    context.analystResult.completionGateSatisfied === false &&
    milestoneConcluded
  ) {
    milestoneConcluded = false;
    logger.warn('Turning point completion gate mismatch; forcing milestoneConcluded=false', {
      storyId: context.storyId,
      parentPageId: context.parentPageId,
      milestoneId: context.activeMilestone.id,
      milestoneRole: context.activeMilestone.role,
      completionGateFailureReason:
        context.analystResult.completionGateFailureReason || 'Completion gate not satisfied',
    });
  }

  return { milestoneConcluded, milestoneResolution };
}
