import type {
  GenerationPipelineMetrics,
  PagePlanContext,
  ReconciliationFailureReason,
  WriterResult,
} from '../llm';
import type { generatePagePlan } from '../llm';
import type { StateReconciliationResult } from './state-reconciler-types';
import type { GenerationStage, GenerationStageCallback } from './types';

export interface ReconciliationRetryGenerationOptions {
  mode: PagePlanContext['mode'];
  storyId: string;
  pageId?: number;
  requestId: string;
  apiKey: string;
  previousState: import('./state-reconciler-types').StateReconciliationPreviousState;
  buildPlanContext: (failureReasons?: readonly ReconciliationFailureReason[]) => PagePlanContext;
  generateWriter: (
    pagePlan: Awaited<ReturnType<typeof generatePagePlan>>,
    failureReasons?: readonly ReconciliationFailureReason[]
  ) => Promise<WriterResult>;
  onGenerationStage?: GenerationStageCallback;
}

export function emitGenerationStage(
  onGenerationStage: GenerationStageCallback | undefined,
  stage: GenerationStage,
  status: 'started' | 'completed',
  attempt: number
): void {
  onGenerationStage?.({ stage, status, attempt });
}

export function resolveWriterStage(mode: PagePlanContext['mode']): GenerationStage {
  return mode === 'opening' ? 'WRITING_OPENING_PAGE' : 'WRITING_CONTINUING_PAGE';
}

export function createSuccessPipelineMetrics(
  plannerDurationMs: number,
  lorekeeperDurationMs: number,
  writerDurationMs: number,
  reconcilerDurationMs: number,
  plannerValidationIssueCount: number,
  writerValidationIssueCount: number,
  reconcilerIssueCount: number,
  reconcilerRetried: boolean,
  finalStatus: 'success' | 'hard_error'
): GenerationPipelineMetrics {
  return {
    plannerDurationMs,
    lorekeeperDurationMs,
    writerDurationMs,
    reconcilerDurationMs,
    plannerValidationIssueCount,
    writerValidationIssueCount,
    reconcilerIssueCount,
    reconcilerRetried,
    finalStatus,
  };
}

export function toReconciliationFailureReasons(
  reconciliation: StateReconciliationResult
): ReconciliationFailureReason[] {
  return reconciliation.reconciliationDiagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    field: diagnostic.field,
    message: diagnostic.message,
  }));
}
