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
  attempt: number,
  durationMs?: number
): void {
  const event: { stage: GenerationStage; status: 'started' | 'completed'; attempt: number; durationMs?: number } =
    { stage, status, attempt };
  if (durationMs !== undefined) {
    event.durationMs = durationMs;
  }
  onGenerationStage?.(event);
}

export async function runGenerationStage<T>(
  onGenerationStage: GenerationStageCallback | undefined,
  stage: GenerationStage,
  operation: () => Promise<T>,
  attempt = 1
): Promise<T> {
  const startedAt = Date.now();
  emitGenerationStage(onGenerationStage, stage, 'started', attempt);
  const result = await operation();
  emitGenerationStage(onGenerationStage, stage, 'completed', attempt, Date.now() - startedAt);
  return result;
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
