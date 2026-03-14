import { generatePagePlan, generateStateAccountant } from '../llm';
import type {
  GenerationPipelineMetrics,
  PagePlanGenerationResult,
  PageWriterResult,
  ReconciliationFailureReason,
  ReducedPagePlanGenerationResult,
  StateAccountantGenerationResult,
} from '../llm';
import { logger } from '../logging/index.js';
import {
  createSuccessPipelineMetrics,
  EngineStageAttemptError,
  resolveWriterStage,
  runEngineStageAttempt,
  toReconciliationFailureReasons,
} from './generation-pipeline-helpers';
import type { ReconciliationRetryGenerationOptions } from './generation-pipeline-helpers';
import { StateReconciliationError } from './state-reconciler-errors';
import { reconcileState } from './state-reconciler';
import type { StateReconciliationResult } from './state-reconciler-types';

function mergeReducedPlanAndAccountant(
  reducedPlan: ReducedPagePlanGenerationResult,
  accountant: StateAccountantGenerationResult
): PagePlanGenerationResult {
  return {
    sceneIntent: reducedPlan.sceneIntent,
    continuityAnchors: reducedPlan.continuityAnchors,
    stateIntents: accountant.stateIntents,
    writerBrief: reducedPlan.writerBrief,
    dramaticQuestion: reducedPlan.dramaticQuestion,
    isEnding: reducedPlan.isEnding,
    rawResponse: `planner:${reducedPlan.rawResponse}\naccountant:${accountant.rawResponse}`,
  };
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
  writerResult: PageWriterResult;
  reconciliation: StateReconciliationResult;
  pagePlan: PagePlanGenerationResult;
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
  let accountantDurationMs = 0;
  let writerDurationMs = 0;
  let reconcilerDurationMs = 0;
  let plannerValidationIssueCount = 0;
  let accountantValidationIssueCount = 0;
  let writerValidationIssueCount = 0;
  let reconcilerIssueCount = 0;
  let reconcilerRetried = false;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let reducedPlan: Awaited<ReturnType<typeof generatePagePlan>>;
    try {
      const plannerAttempt = await runEngineStageAttempt(
        {
          publicStage: 'PLANNING_PAGE',
          logStage: 'planner',
          attempt,
          onGenerationStage,
          logContext: baseLogContext,
        },
        () =>
          generatePagePlan(buildPlanContext(failureReasons), {
            apiKey,
            observability: {
              storyId,
              pageId,
              requestId,
            },
          })
      );
      reducedPlan = plannerAttempt.result;
      plannerDurationMs += plannerAttempt.durationMs;
    } catch (error) {
      if (error instanceof EngineStageAttemptError) {
        plannerDurationMs += error.durationMs;
        plannerValidationIssueCount += error.validationIssueCount;
      }
      const metrics = createSuccessPipelineMetrics(
        plannerDurationMs,
        accountantDurationMs,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        accountantValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error'
      );
      logger.error('Generation pipeline failed', { ...baseLogContext, metrics });
      throw error instanceof EngineStageAttemptError ? error.cause : error;
    }

    let accountantResult: Awaited<ReturnType<typeof generateStateAccountant>>;
    try {
      const accountantAttempt = await runEngineStageAttempt(
        {
          publicStage: 'ACCOUNTING_STATE',
          logStage: 'accountant',
          attempt,
          onGenerationStage,
          logContext: baseLogContext,
        },
        () =>
          generateStateAccountant(buildPlanContext(failureReasons), reducedPlan, {
            apiKey,
            observability: {
              storyId,
              pageId,
              requestId,
            },
          })
      );
      accountantResult = accountantAttempt.result;
      accountantDurationMs += accountantAttempt.durationMs;
    } catch (error) {
      if (error instanceof EngineStageAttemptError) {
        accountantDurationMs += error.durationMs;
        accountantValidationIssueCount += error.validationIssueCount;
      }
      const metrics = createSuccessPipelineMetrics(
        plannerDurationMs,
        accountantDurationMs,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        accountantValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error'
      );
      logger.error('Generation pipeline failed', { ...baseLogContext, metrics });
      throw error instanceof EngineStageAttemptError ? error.cause : error;
    }

    const pagePlan = mergeReducedPlanAndAccountant(reducedPlan, accountantResult);

    const writerStage = resolveWriterStage(mode);
    let writerResult: PageWriterResult;
    try {
      const writerAttempt = await runEngineStageAttempt(
        {
          publicStage: writerStage,
          logStage: 'writer',
          attempt,
          onGenerationStage,
          logContext: baseLogContext,
        },
        () => generateWriter(pagePlan, failureReasons)
      );
      writerResult = writerAttempt.result;
      writerDurationMs += writerAttempt.durationMs;
    } catch (error) {
      if (error instanceof EngineStageAttemptError) {
        writerDurationMs += error.durationMs;
        writerValidationIssueCount += error.validationIssueCount;
      }
      const metrics = createSuccessPipelineMetrics(
        plannerDurationMs,
        accountantDurationMs,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        accountantValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error'
      );
      logger.error('Generation pipeline failed', { ...baseLogContext, metrics });
      throw error instanceof EngineStageAttemptError ? error.cause : error;
    }

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
        accountantDurationMs,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        accountantValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error'
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
        accountantDurationMs,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        accountantValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'success'
      );
      logger.info('Generation pipeline completed', { ...baseLogContext, metrics });
      return {
        writerResult,
        reconciliation,
        pagePlan,
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
        accountantDurationMs,
        writerDurationMs,
        reconcilerDurationMs,
        plannerValidationIssueCount,
        accountantValidationIssueCount,
        writerValidationIssueCount,
        reconcilerIssueCount,
        reconcilerRetried,
        'hard_error'
      );
      logger.error('Generation pipeline failed', { ...baseLogContext, metrics });
      throw new StateReconciliationError(
        'State reconciliation failed after retry',
        'RECONCILIATION_FAILED',
        reconciliation.reconciliationDiagnostics,
        false
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
    false
  );
}
