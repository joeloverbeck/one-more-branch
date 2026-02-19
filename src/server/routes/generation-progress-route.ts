import type { GenerationStageEvent } from '../../engine';
import type { GenerationFlowType } from '../services/index.js';
import { generationProgressService } from '../services/index.js';
import { parseProgressId } from '../utils/index.js';

export interface RouteGenerationProgress {
  readonly progressId?: string;
  readonly onGenerationStage?: (event: GenerationStageEvent) => void;
  complete(): void;
  fail(publicMessage?: string): void;
}

export function createRouteGenerationProgress(
  progressInput: unknown,
  flowType: GenerationFlowType,
): RouteGenerationProgress {
  const progressId = parseProgressId(progressInput);

  if (!progressId) {
    return {
      progressId: undefined,
      onGenerationStage: undefined,
      complete: (): void => {},
      fail: (): void => {},
    };
  }

  generationProgressService.start(progressId, flowType);

  return {
    progressId,
    onGenerationStage: (event: GenerationStageEvent): void => {
      if (event.status === 'started') {
        generationProgressService.markStageStarted(progressId, event.stage, event.attempt);
      } else {
        generationProgressService.markStageCompleted(progressId, event.stage, event.attempt);
      }
    },
    complete: (): void => {
      generationProgressService.complete(progressId);
    },
    fail: (publicMessage?: string): void => {
      generationProgressService.fail(progressId, publicMessage);
    },
  };
}
