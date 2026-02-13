import type {
  GenerationPipelineMetrics,
  PagePlanGenerationResult,
  PagePlanContext,
  PageWriterResult,
  ReconciliationFailureReason,
} from '../llm';
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
    pagePlan: PagePlanGenerationResult,
    failureReasons?: readonly ReconciliationFailureReason[]
  ) => Promise<PageWriterResult>;
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
  accountantDurationMs: number,
  writerDurationMs: number,
  reconcilerDurationMs: number,
  plannerValidationIssueCount: number,
  accountantValidationIssueCount: number,
  writerValidationIssueCount: number,
  reconcilerIssueCount: number,
  reconcilerRetried: boolean,
  finalStatus: 'success' | 'hard_error'
): GenerationPipelineMetrics {
  return {
    plannerDurationMs,
    accountantDurationMs,
    writerDurationMs,
    reconcilerDurationMs,
    plannerValidationIssueCount,
    accountantValidationIssueCount,
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
