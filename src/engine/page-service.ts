import {
  generateAnalystEvaluation,
  generatePagePlan,
  generatePageWriterOutput,
  generateOpeningPage,
  mergePageWriterAndReconciledStateWithAnalystResults,
} from '../llm';
import type {
  AnalystResult,
  GenerationPipelineMetrics,
  PagePlanContext,
  ReconciliationFailureReason,
  WriterResult,
} from '../llm';
import { randomUUID } from 'node:crypto';
import { logger } from '../logging/index.js';
import {
  AccumulatedStructureState,
  createEmptyActiveState,
  createEmptyAccumulatedStructureState,
  generatePageId,
  getCurrentBeat,
  getLatestStructureVersion,
  isDeviation,
  Page,
  Story,
} from '../models';
import { storage } from '../persistence';
import { collectAncestorContext } from './ancestor-collector';
import { updateStoryWithAllCanon } from './canon-manager';
import { handleDeviation, isActualDeviation } from './deviation-handler';
import { buildContinuationPage, buildFirstPage } from './page-builder';
import { collectParentState } from './parent-state-collector';
import type { CollectedParentState } from './parent-state-collector';
import { StateReconciliationError } from './state-reconciler-errors';
import { reconcileState } from './state-reconciler';
import type { StateReconciliationPreviousState, StateReconciliationResult } from './state-reconciler-types';
import { applyStructureProgression, createInitialStructureState } from './structure-state';
import {
  resolveActiveStructureVersion,
  validateContinuationStructureVersion,
  validateFirstPageStructureVersion,
} from './structure-version-validator';
import type { GenerationStage, GenerationStageCallback } from './types';
import { DeviationInfo, EngineError } from './types';

function createGenerationRequestId(): string {
  return randomUUID();
}

function createOpeningPreviousStateSnapshot(): StateReconciliationPreviousState {
  return {
    currentLocation: '',
    threats: [],
    constraints: [],
    threads: [],
    inventory: [],
    health: [],
    characterState: [],
  };
}

function createContinuationPreviousStateSnapshot(
  parentState: CollectedParentState,
): StateReconciliationPreviousState {
  return {
    currentLocation: parentState.accumulatedActiveState.currentLocation,
    threats: parentState.accumulatedActiveState.activeThreats,
    constraints: parentState.accumulatedActiveState.activeConstraints,
    threads: parentState.accumulatedActiveState.openThreads,
    inventory: parentState.accumulatedInventory,
    health: parentState.accumulatedHealth,
    characterState: Object.values(parentState.accumulatedCharacterState).flatMap(entries => entries),
  };
}

function toReconciliationFailureReasons(
  reconciliation: StateReconciliationResult,
): ReconciliationFailureReason[] {
  return reconciliation.reconciliationDiagnostics.map(diagnostic => ({
    code: diagnostic.code,
    field: diagnostic.field,
    message: diagnostic.message,
  }));
}

interface ReconciliationRetryGenerationOptions {
  mode: PagePlanContext['mode'];
  storyId: string;
  pageId?: number;
  requestId: string;
  apiKey: string;
  previousState: StateReconciliationPreviousState;
  buildPlanContext: (
    failureReasons?: readonly ReconciliationFailureReason[],
  ) => PagePlanContext;
  generateWriter: (
    pagePlan: Awaited<ReturnType<typeof generatePagePlan>>,
    failureReasons?: readonly ReconciliationFailureReason[],
  ) => Promise<WriterResult>;
  onGenerationStage?: GenerationStageCallback;
}

function emitGenerationStage(
  onGenerationStage: GenerationStageCallback | undefined,
  stage: GenerationStage,
  status: 'started' | 'completed',
  attempt: number,
): void {
  onGenerationStage?.({ stage, status, attempt });
}

function resolveWriterStage(mode: PagePlanContext['mode']): GenerationStage {
  return mode === 'opening' ? 'WRITING_OPENING_PAGE' : 'WRITING_CONTINUING_PAGE';
}

function createSuccessPipelineMetrics(
  plannerDurationMs: number,
  writerDurationMs: number,
  reconcilerDurationMs: number,
  plannerValidationIssueCount: number,
  writerValidationIssueCount: number,
  reconcilerIssueCount: number,
  reconcilerRetried: boolean,
  finalStatus: 'success' | 'hard_error',
): GenerationPipelineMetrics {
  return {
    plannerDurationMs,
    writerDurationMs,
    reconcilerDurationMs,
    plannerValidationIssueCount,
    writerValidationIssueCount,
    reconcilerIssueCount,
    reconcilerRetried,
    finalStatus,
  };
}

async function generateWithReconciliationRetry({
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
  const countValidationIssues = (error: unknown): number => {
    if (typeof error !== 'object' || error === null || !('context' in error)) {
      return 0;
    }

    const context = (error as { context?: Record<string, unknown> }).context;
    const issues = context?.['validationIssues'];
    return Array.isArray(issues) ? issues.length : 0;
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

export async function generateFirstPage(
  story: Story,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback,
): Promise<{ page: Page; updatedStory: Story; metrics: GenerationPipelineMetrics }> {
  validateFirstPageStructureVersion(story);

  const requestId = createGenerationRequestId();
  const openingPreviousState = createOpeningPreviousStateSnapshot();
  const { writerResult, reconciliation: openingReconciliation, metrics } =
    await generateWithReconciliationRetry({
      mode: 'opening',
      storyId: story.id,
      requestId,
      apiKey,
      previousState: openingPreviousState,
      buildPlanContext: failureReasons => ({
        mode: 'opening',
        characterConcept: story.characterConcept,
        worldbuilding: story.worldbuilding,
        tone: story.tone,
        npcs: story.npcs,
        startingSituation: story.startingSituation,
        structure: story.structure ?? undefined,
        globalCanon: story.globalCanon,
        globalCharacterCanon: story.globalCharacterCanon,
        accumulatedInventory: [],
        accumulatedHealth: [],
        accumulatedCharacterState: {},
        activeState: createEmptyActiveState(),
        reconciliationFailureReasons: failureReasons,
      }),
      generateWriter: async (pagePlan, failureReasons) =>
        generateOpeningPage(
          {
            characterConcept: story.characterConcept,
            worldbuilding: story.worldbuilding,
            tone: story.tone,
            npcs: story.npcs,
            startingSituation: story.startingSituation,
            structure: story.structure ?? undefined,
            pagePlan,
            reconciliationFailureReasons: failureReasons,
          },
          {
            apiKey,
            observability: {
              storyId: story.id,
              requestId,
            },
          },
        ),
      onGenerationStage,
    });
  const result = mergePageWriterAndReconciledStateWithAnalystResults(
    writerResult,
    openingReconciliation,
    null,
  );

  const initialStructureState = story.structure
    ? createInitialStructureState(story.structure)
    : createEmptyAccumulatedStructureState();

  const latestVersion = getLatestStructureVersion(story);
  const page = buildFirstPage(result, {
    structureState: initialStructureState,
    structureVersionId: latestVersion?.id ?? null,
  });

  const updatedStory = updateStoryWithAllCanon(story, result.newCanonFacts, result.newCharacterCanonFacts);

  return { page, updatedStory, metrics };
}

export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback,
): Promise<{
  page: Page;
  updatedStory: Story;
  metrics: GenerationPipelineMetrics;
  deviationInfo?: DeviationInfo;
}> {
  const choice = parentPage.choices[choiceIndex];
  if (!choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage.id}`,
      'INVALID_CHOICE',
    );
  }

  validateContinuationStructureVersion(story, parentPage);

  const requestId = createGenerationRequestId();
  const maxPageId = await storage.getMaxPageId(story.id);
  const parentState = collectParentState(parentPage);
  const currentStructureVersion = resolveActiveStructureVersion(story, parentPage);

  // Collect hierarchical ancestor context (full text for 2 nearest, summaries for older)
  const ancestorContext = await collectAncestorContext(story.id, parentPage);

  const continuationContext = {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    npcs: story.npcs,
    globalCanon: story.globalCanon,
    globalCharacterCanon: story.globalCharacterCanon,
    structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
    accumulatedStructureState: parentState.structureState,
    previousNarrative: parentPage.narrativeText,
    selectedChoice: choice.text,
    accumulatedInventory: parentState.accumulatedInventory,
    accumulatedHealth: parentState.accumulatedHealth,
    accumulatedCharacterState: parentState.accumulatedCharacterState,
    parentProtagonistAffect: parentPage.protagonistAffect,
    activeState: parentState.accumulatedActiveState,
    grandparentNarrative: ancestorContext.grandparentNarrative,
    ancestorSummaries: ancestorContext.ancestorSummaries,
  };
  const continuationPreviousState = createContinuationPreviousStateSnapshot(parentState);
  const { writerResult, reconciliation: continuationReconciliation, metrics } =
    await generateWithReconciliationRetry({
      mode: 'continuation',
      storyId: story.id,
      pageId: parentPage.id,
      requestId,
      apiKey,
      previousState: continuationPreviousState,
      buildPlanContext: failureReasons => ({
        ...continuationContext,
        mode: 'continuation',
        reconciliationFailureReasons: failureReasons,
      }),
      generateWriter: async (pagePlan, failureReasons) =>
        generatePageWriterOutput(
          {
            ...continuationContext,
            reconciliationFailureReasons: failureReasons,
          },
          pagePlan,
          {
            apiKey,
            observability: {
              storyId: story.id,
              pageId: parentPage.id,
              requestId,
            },
            writerValidationContext: {
              removableIds: {
                threats: parentState.accumulatedActiveState.activeThreats.map(entry => entry.id),
                constraints: parentState.accumulatedActiveState.activeConstraints.map(entry => entry.id),
                threads: parentState.accumulatedActiveState.openThreads.map(entry => entry.id),
                inventory: parentState.accumulatedInventory.map(entry => entry.id),
                health: parentState.accumulatedHealth.map(entry => entry.id),
                characterState: Object.values(parentState.accumulatedCharacterState)
                  .flatMap(entries => entries.map(entry => entry.id)),
              },
            },
          },
        ),
      onGenerationStage,
    });

  // Analyst call (only when structure exists)
  let analystResult: AnalystResult | null = null;
  const activeStructureForAnalyst = currentStructureVersion?.structure ?? story.structure;
  if (activeStructureForAnalyst && parentState.structureState) {
    const analystStructureState: AccumulatedStructureState = {
      ...parentState.structureState,
      pagesInCurrentBeat: parentState.structureState.pagesInCurrentBeat + 1,
    };
    try {
      emitGenerationStage(onGenerationStage, 'ANALYZING_SCENE', 'started', 1);
      analystResult = await generateAnalystEvaluation(
        {
          narrative: writerResult.narrative,
          structure: activeStructureForAnalyst,
          accumulatedStructureState: analystStructureState,
          activeState: parentState.accumulatedActiveState,
        },
        { apiKey },
      );
      emitGenerationStage(onGenerationStage, 'ANALYZING_SCENE', 'completed', 1);
    } catch (error) {
      // Graceful degradation: log warning, continue without analyst data
      logger.warn('Analyst evaluation failed, continuing with defaults', { error });
    }
  }

  // Merge into ContinuationGenerationResult
  const result = mergePageWriterAndReconciledStateWithAnalystResults(
    writerResult,
    continuationReconciliation,
    analystResult,
  );

  const newPageId = generatePageId(maxPageId);

  // Handle deviation if detected - triggers structure rewrite
  let storyForPage = story;
  let activeStructureVersion = currentStructureVersion;
  let deviationInfo: DeviationInfo | undefined;

  // Check for deviation - isActualDeviation confirms conditions, isDeviation narrows the type
  if (
    isActualDeviation(result, story, currentStructureVersion) &&
    isDeviation(result.deviation)
  ) {
    const devResult = await handleDeviation(
      {
        story,
        currentVersion: currentStructureVersion!,
        parentStructureState: parentState.structureState,
        deviation: result.deviation,
        newPageId,
      },
      apiKey,
    );
    storyForPage = devResult.updatedStory;
    activeStructureVersion = devResult.activeVersion;
    deviationInfo = devResult.deviationInfo;
  }

  // Use the active structure (original or rewritten) for progression
  const activeStructure = activeStructureVersion?.structure ?? story.structure;
  const activeBeat =
    activeStructure && parentState.structureState
      ? getCurrentBeat(activeStructure, parentState.structureState)
      : undefined;

  let beatConcluded =
    'beatConcluded' in result && typeof result.beatConcluded === 'boolean'
      ? result.beatConcluded
      : false;
  const beatResolution =
    'beatResolution' in result && typeof result.beatResolution === 'string'
      ? result.beatResolution
      : '';

  if (
    activeBeat?.role === 'turning_point' &&
    analystResult?.beatConcluded === true &&
    analystResult.completionGateSatisfied === false &&
    beatConcluded
  ) {
    beatConcluded = false;
    logger.warn('Turning point completion gate mismatch; forcing beatConcluded=false', {
      storyId: story.id,
      parentPageId: parentPage.id,
      beatId: activeBeat.id,
      beatRole: activeBeat.role,
      completionGateFailureReason:
        analystResult.completionGateFailureReason || 'Completion gate not satisfied',
    });
  }

  let newStructureState = activeStructure
    ? applyStructureProgression(
        activeStructure,
        parentState.structureState,
        beatConcluded,
        beatResolution,
      )
    : parentState.structureState;

  // Pacing response: only when no deviation was triggered
  if (!deviationInfo && newStructureState) {
    if (result.recommendedAction === 'rewrite') {
      logger.warn('Pacing issue detected: rewrite recommended (deferred)', {
        pacingIssueReason: result.pacingIssueReason,
        pagesInCurrentBeat: newStructureState.pagesInCurrentBeat,
      });
      newStructureState = { ...newStructureState, pacingNudge: null };
    } else if (result.recommendedAction === 'nudge') {
      logger.info('Pacing nudge applied', {
        pacingIssueReason: result.pacingIssueReason,
        pagesInCurrentBeat: newStructureState.pagesInCurrentBeat,
      });
      newStructureState = { ...newStructureState, pacingNudge: result.pacingIssueReason };
    } else {
      newStructureState = { ...newStructureState, pacingNudge: null };
    }
  }

  const page = buildContinuationPage(result, {
    pageId: newPageId,
    parentPageId: parentPage.id,
    parentChoiceIndex: choiceIndex,
    parentAccumulatedActiveState: parentState.accumulatedActiveState,
    parentAccumulatedInventory: parentState.accumulatedInventory,
    parentAccumulatedHealth: parentState.accumulatedHealth,
    parentAccumulatedCharacterState: parentState.accumulatedCharacterState,
    structureState: newStructureState,
    structureVersionId: activeStructureVersion?.id ?? null,
  });

  const updatedStory = updateStoryWithAllCanon(
    storyForPage,
    result.newCanonFacts,
    result.newCharacterCanonFacts,
  );

  return { page, updatedStory, metrics, deviationInfo };
}

export async function getOrGeneratePage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey?: string,
  onGenerationStage?: GenerationStageCallback,
): Promise<{
  page: Page;
  story: Story;
  wasGenerated: boolean;
  metrics?: GenerationPipelineMetrics;
  deviationInfo?: DeviationInfo;
}> {
  const choice = parentPage.choices[choiceIndex];
  if (!choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage.id}`,
      'INVALID_CHOICE',
    );
  }

  if (choice.nextPageId !== null) {
    const page = await storage.loadPage(story.id, choice.nextPageId);
    if (!page) {
      throw new EngineError(
        `Page ${choice.nextPageId} referenced by choice but not found`,
        'PAGE_NOT_FOUND',
      );
    }

    return { page, story, wasGenerated: false };
  }

  if (!apiKey) {
    throw new EngineError(
      'API key is required to generate new pages',
      'VALIDATION_FAILED',
    );
  }

  const { page, updatedStory, metrics, deviationInfo } = await generateNextPage(
    story,
    parentPage,
    choiceIndex,
    apiKey,
    onGenerationStage,
  );

  await storage.savePage(story.id, page);
  await storage.updateChoiceLink(story.id, parentPage.id, choiceIndex, page.id);

  if (updatedStory !== story) {
    await storage.updateStory(updatedStory);
  }

  return {
    page,
    story: updatedStory,
    wasGenerated: true,
    metrics,
    deviationInfo,
  };
}
