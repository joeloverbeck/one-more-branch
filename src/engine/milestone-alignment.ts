import { MILESTONE_ALIGNMENT_CONFIG } from '../config/thread-pacing-config';
import type { AnalystResult } from '../llm/analyst-types';
import { logger } from '../logging/index.js';
import type { AccumulatedStructureState } from '../models';
import { computeNextSequentialMilestoneId, isMilestoneIdAhead } from './milestone-utils';

export function resolveMilestoneAlignmentSkip(
  analystResult: AnalystResult | null,
  milestoneConcluded: boolean,
  parentStructureState: AccumulatedStructureState
): { targetMilestoneId: string; bridgedResolution: string } | undefined {
  if (
    !MILESTONE_ALIGNMENT_CONFIG.enableMilestoneAlignmentSkip ||
    !milestoneConcluded ||
    !analystResult?.alignedMilestoneId ||
    analystResult.milestoneAlignmentConfidence !== 'HIGH'
  ) {
    return undefined;
  }

  // Check if the aligned milestone is past the next sequential milestone
  const nextMilestoneId = computeNextSequentialMilestoneId(parentStructureState);
  if (!nextMilestoneId || analystResult.alignedMilestoneId === nextMilestoneId) {
    return undefined; // Normal progression, no skip needed
  }

  // Verify the aligned milestone is actually ahead (not behind or equal)
  if (!isMilestoneIdAhead(analystResult.alignedMilestoneId, nextMilestoneId)) {
    return undefined;
  }

  logger.info('Milestone alignment skip detected', {
    alignedMilestoneId: analystResult.alignedMilestoneId,
    nextSequentialMilestoneId: nextMilestoneId,
    confidence: analystResult.milestoneAlignmentConfidence,
    reason: analystResult.milestoneAlignmentReason,
  });

  return {
    targetMilestoneId: analystResult.alignedMilestoneId,
    bridgedResolution: MILESTONE_ALIGNMENT_CONFIG.bridgedMilestoneResolution,
  };
}
