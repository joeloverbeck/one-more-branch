import type {
  GenerationPipelineMetrics,
  PagePlanGenerationResult,
  PagePlanContext,
  PageWriterResult,
  ReconciliationFailureReason,
} from '../llm';
import { logger } from '../logging/index.js';
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

export interface EngineStageAttemptContext {
  readonly publicStage: GenerationStage;
  readonly logStage: string;
  readonly attempt: number;
  readonly onGenerationStage?: GenerationStageCallback;
  readonly logContext: Record<string, unknown>;
}

export class EngineStageAttemptError extends Error {
  readonly cause: unknown;
  readonly durationMs: number;
  readonly validationIssueCount: number;

  constructor(cause: unknown, durationMs: number, validationIssueCount: number) {
    super('Engine stage attempt failed');
    this.name = 'EngineStageAttemptError';
    this.cause = cause;
    this.durationMs = durationMs;
    this.validationIssueCount = validationIssueCount;
  }
}

function countValidationIssues(error: unknown): number {
  if (typeof error !== 'object' || error === null || !('context' in error)) {
    return 0;
  }

  const context = (error as { context?: Record<string, unknown> }).context;
  const issues = context?.['validationIssues'];
  return Array.isArray(issues) ? issues.length : 0;
}

export async function runEngineStageAttempt<T>(
  context: EngineStageAttemptContext,
  operation: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  emitGenerationStage(
    context.onGenerationStage,
    context.publicStage,
    'started',
    context.attempt
  );
  logger.info('Generation stage started', {
    ...context.logContext,
    attempt: context.attempt,
    stage: context.logStage,
  });

  const startedAt = Date.now();

  try {
    const result = await operation();
    const durationMs = Date.now() - startedAt;
    emitGenerationStage(
      context.onGenerationStage,
      context.publicStage,
      'completed',
      context.attempt,
      durationMs
    );
    logger.info('Generation stage completed', {
      ...context.logContext,
      attempt: context.attempt,
      stage: context.logStage,
      durationMs,
    });
    return { result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const validationIssueCount = countValidationIssues(error);
    logger.error('Generation stage failed', {
      ...context.logContext,
      attempt: context.attempt,
      stage: context.logStage,
      durationMs,
      validationIssueCount,
      error,
    });
    throw new EngineStageAttemptError(error, durationMs, validationIssueCount);
  }
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
