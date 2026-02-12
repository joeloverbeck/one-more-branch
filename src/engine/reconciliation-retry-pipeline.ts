import { generatePagePlan } from '../llm';
import type {
  GenerationPipelineMetrics,
  ReconciliationFailureReason,
  WriterResult,
} from '../llm';
import { logger } from '../logging/index.js';
import {
  emitGenerationStage,
  createSuccessPipelineMetrics,
  resolveWriterStage,
  toReconciliationFailureReasons,
} from './generation-pipeline-helpers';
import type { ReconciliationRetryGenerationOptions } from './generation-pipeline-helpers';
import { StateReconciliationError } from './state-reconciler-errors';
import { reconcileState } from './state-reconciler';
import type { StateReconciliationResult } from './state-reconciler-types';

function countValidationIssues(error: unknown): number {
  if (typeof error !== 'object' || error === null || !('context' in error)) {
    return 0;
  }

  const context = (error as { context?: Record<string, unknown> }).context;
  const issues = context?.['validationIssues'];
  return Array.isArray(issues) ? issues.length : 0;
}

export async function generateWithReconciliationRetry({
  mode,
  storyId,
  pageId,
  requestId,
  apiKey,
  previousState,
  buildPlanContext,
  generateWriter,
  onGenerationStage,
}: ReconciliationRetryGenerationOptions): Promise<{
  writerResult: WriterResult;
  reconciliation: StateReconciliationResult;
  metrics: GenerationPipelineMetrics;
}> {
  const baseLogContext = {
    mode,
    storyId,
    pageId,
    requestId,
  };

  let failureReasons: readonly ReconciliationFailureReason[] | undefined;
  let plannerDurationMs = 0;
  let writerDurationMs = 0;
  let reconcilerDurationMs = 0;
  let plannerValidationIssueCount = 0;
  let writerValidationIssueCount = 0;
  let reconcilerIssueCount = 0;
  let reconcilerRetried = false;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    emitGenerationStage(onGenerationStage, 'PLANNING_PAGE', 'started', attempt);
    logger.info('Generation stage started', { ...baseLogContext, attempt, stage: 'planner' });
    const plannerStart = Date.now();
    let pagePlan: Awaited<ReturnType<typeof generatePagePlan>>;
    try {
      pagePlan = await generatePagePlan(
        buildPlanContext(failureReasons),
        {
          apiKey,
          observability: {
            storyId,
            pageId,
            requestId,
          },
        },
      );
    } catch (error) {
      const durationMs = Date.now() - plannerStart;
      plannerDurationMs += durationMs;
      plannerValidationIssueCount += countValidationIssues(error);
      const metrics = createSuccessPipelineMetrics(
        plannerDurationMs,
        0,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error',
      );
      logger.error('Generation stage failed', {
        ...baseLogContext,
        attempt,
        stage: 'planner',
        durationMs,
        validationIssueCount: countValidationIssues(error),
        error,
      });
      logger.error('Generation pipeline failed', { ...baseLogContext, metrics });
      throw error;
    }
    const plannerDuration = Date.now() - plannerStart;
    plannerDurationMs += plannerDuration;
    emitGenerationStage(onGenerationStage, 'PLANNING_PAGE', 'completed', attempt);
    logger.info('Generation stage completed', {
      ...baseLogContext,
      attempt,
      stage: 'planner',
      durationMs: plannerDuration,
    });

    const writerStage = resolveWriterStage(mode);
    emitGenerationStage(onGenerationStage, writerStage, 'started', attempt);
    logger.info('Generation stage started', { ...baseLogContext, attempt, stage: 'writer' });
    const writerStart = Date.now();
    let writerResult: WriterResult;
    try {
      writerResult = await generateWriter(pagePlan, failureReasons);
    } catch (error) {
      const durationMs = Date.now() - writerStart;
      writerDurationMs += durationMs;
      writerValidationIssueCount += countValidationIssues(error);
      const metrics = createSuccessPipelineMetrics(
        plannerDurationMs,
        0,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error',
      );
      logger.error('Generation stage failed', {
        ...baseLogContext,
        attempt,
        stage: 'writer',
        durationMs,
        validationIssueCount: countValidationIssues(error),
        error,
      });
      logger.error('Generation pipeline failed', { ...baseLogContext, metrics });
      throw error;
    }
    const writerDuration = Date.now() - writerStart;
    writerDurationMs += writerDuration;
    emitGenerationStage(onGenerationStage, writerStage, 'completed', attempt);
    logger.info('Generation stage completed', {
      ...baseLogContext,
      attempt,
      stage: 'writer',
      durationMs: writerDuration,
    });

    logger.info('Generation stage started', { ...baseLogContext, attempt, stage: 'reconciler' });
    const reconcilerStart = Date.now();
    let reconciliation: StateReconciliationResult;
    try {
      reconciliation = reconcileState(pagePlan, writerResult, previousState);
    } catch (error) {
      const durationMs = Date.now() - reconcilerStart;
      reconcilerDurationMs += durationMs;
      const metrics = createSuccessPipelineMetrics(
        plannerDurationMs,
        0,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error',
      );
      logger.error('Generation stage failed', {
        ...baseLogContext,
        attempt,
        stage: 'reconciler',
        durationMs,
        error,
      });
      logger.error('Generation pipeline failed', { ...baseLogContext, metrics });
      throw error;
    }
    const reconcilerDuration = Date.now() - reconcilerStart;
    reconcilerDurationMs += reconcilerDuration;

    if (reconciliation.reconciliationDiagnostics.length === 0) {
      logger.info('Generation stage completed', {
        ...baseLogContext,
        attempt,
        stage: 'reconciler',
        durationMs: reconcilerDuration,
      });
      const metrics = createSuccessPipelineMetrics(
        plannerDurationMs,
        0,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'success',
      );
      logger.info('Generation pipeline completed', { ...baseLogContext, metrics });
      return {
        writerResult,
        reconciliation,
        metrics,
      };
    }

    reconcilerIssueCount += reconciliation.reconciliationDiagnostics.length;
    reconcilerRetried = true;

    logger.error('Generation stage failed', {
      ...baseLogContext,
      attempt,
      stage: 'reconciler',
      durationMs: reconcilerDuration,
      diagnostics: reconciliation.reconciliationDiagnostics,
    });
    logger.warn('State reconciliation failed during page generation attempt', {
      ...baseLogContext,
      attempt,
      diagnostics: reconciliation.reconciliationDiagnostics,
    });
    logger.error('State reconciliation diagnostics', {
      ...baseLogContext,
      attempt,
      diagnostics: reconciliation.reconciliationDiagnostics,
    });

    if (attempt === 2) {
      const metrics = createSuccessPipelineMetrics(
        plannerDurationMs,
        0,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error',
      );
      logger.error('Generation pipeline failed', { ...baseLogContext, metrics });
      throw new StateReconciliationError(
        'State reconciliation failed after retry',
        'RECONCILIATION_FAILED',
        reconciliation.reconciliationDiagnostics,
        false,
      );
    }

    failureReasons = toReconciliationFailureReasons(reconciliation);
    logger.warn('Retrying generation after reconciliation failure', {
      ...baseLogContext,
      attempt,
      failureReasons,
    });
  }

  throw new StateReconciliationError(
    'State reconciliation failed after retry',
    'RECONCILIATION_FAILED',
    [],
    false,
  );
}
