import type { PacingRecommendedAction } from '../llm/analyst-types';
import { logger } from '../logging/index.js';
import type { AccumulatedStructureState } from '../models';
import type { DeviationInfo } from './types';

export interface PacingContext {
  readonly deviationInfo: DeviationInfo | undefined;
  readonly structureState: AccumulatedStructureState;
  readonly recommendedAction: PacingRecommendedAction;
  readonly pacingIssueReason: string;
}

export function applyPacingResponse(context: PacingContext): AccumulatedStructureState {
  if (context.deviationInfo) {
    return context.structureState;
  }

  if (context.recommendedAction === 'rewrite') {
    logger.warn('Pacing issue detected: rewrite recommended (deferred)', {
      pacingIssueReason: context.pacingIssueReason,
      pagesInCurrentBeat: context.structureState.pagesInCurrentBeat,
    });
    return { ...context.structureState, pacingNudge: null };
  }

  if (context.recommendedAction === 'nudge') {
    logger.info('Pacing nudge applied', {
      pacingIssueReason: context.pacingIssueReason,
      pagesInCurrentBeat: context.structureState.pagesInCurrentBeat,
    });
    return { ...context.structureState, pacingNudge: context.pacingIssueReason };
  }

  return { ...context.structureState, pacingNudge: null };
}
