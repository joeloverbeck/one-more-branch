import { BEAT_ALIGNMENT_CONFIG } from '../config/thread-pacing-config';
import type { AnalystResult } from '../llm/analyst-types';
import { logger } from '../logging/index.js';
import type { AccumulatedStructureState } from '../models';
import { computeNextSequentialBeatId, isBeatIdAhead } from './beat-utils';

export function resolveBeatAlignmentSkip(
  analystResult: AnalystResult | null,
  beatConcluded: boolean,
  parentStructureState: AccumulatedStructureState
): { targetBeatId: string; bridgedResolution: string } | undefined {
  if (
    !BEAT_ALIGNMENT_CONFIG.enableBeatAlignmentSkip ||
    !beatConcluded ||
    !analystResult?.alignedBeatId ||
    analystResult.beatAlignmentConfidence !== 'HIGH'
  ) {
    return undefined;
  }

  // Check if the aligned beat is past the next sequential beat
  const nextBeatId = computeNextSequentialBeatId(parentStructureState);
  if (!nextBeatId || analystResult.alignedBeatId === nextBeatId) {
    return undefined; // Normal progression, no skip needed
  }

  // Verify the aligned beat is actually ahead (not behind or equal)
  if (!isBeatIdAhead(analystResult.alignedBeatId, nextBeatId)) {
    return undefined;
  }

  logger.info('Beat alignment skip detected', {
    alignedBeatId: analystResult.alignedBeatId,
    nextSequentialBeatId: nextBeatId,
    confidence: analystResult.beatAlignmentConfidence,
    reason: analystResult.beatAlignmentReason,
  });

  return {
    targetBeatId: analystResult.alignedBeatId,
    bridgedResolution: BEAT_ALIGNMENT_CONFIG.bridgedBeatResolution,
  };
}
