import { mergePageWriterAndReconciledStateWithAnalystResults } from '../llm';
import type {
  GenerationPipelineMetrics,
  PagePlanContext,
  ReconciliationFailureReason,
} from '../llm';
import { randomUUID } from 'node:crypto';
import {
  createBeatDeviation,
  createEmptyAccumulatedStructureState,
  generatePageId,
  getLatestStructureVersion,
  isDeviation,
  Page,
  parsePageId,
  Story,
} from '../models';
import { createInitialStructureState } from '../models/story-arc';
import type { NpcAgenda } from '../models/state/npc-agenda';
import type { NpcRelationship, AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import { createEmptyAccumulatedNpcRelationships } from '../models/state/npc-relationship';
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';
import { storage } from '../persistence';
import { collectAncestorContext } from './ancestor-collector';
import { updateStoryWithAllCanon } from './canon-manager';
import { buildContinuationContext, buildRemovableIds } from './continuation-context-builder';
import { createWriterWithLorekeeper } from './lorekeeper-writer-pipeline';
import { resolveNpcAgendas } from './npc-agenda-pipeline';
import {
  runAnalystEvaluation,
  handleDeviationIfDetected,
  handleSpineDeviationIfDetected,
  collectRemainingBeatIds,
  resolveBeatConclusion,
  applyPacingResponse,
  resolveStructureProgression,
  resolveActiveBeat,
} from './continuation-post-processing';
import { generateWithReconciliationRetry } from './reconciliation-retry-pipeline';
import { buildPage } from './page-builder';
import {
  collectParentState,
  createOpeningPreviousStateSnapshot,
  createContinuationPreviousStateSnapshot,
} from './parent-state-collector';
import {
  resolveActiveStructureVersion,
  validateContinuationStructureVersion,
  validateFirstPageStructureVersion,
} from './structure-version-validator';
import type { GenerationStageCallback } from './types';
import { DeviationInfo, EngineError } from './types';

function createGenerationRequestId(): string {
  return randomUUID();
}

export interface GeneratePageContinuationParams {
  readonly parentPage: Page;
  readonly choiceIndex: number;
  readonly protagonistGuidance?: ProtagonistGuidance;
}

export async function generatePage(
  mode: 'opening' | 'continuation',
  story: Story,
  apiKey: string,
  continuationParams?: GeneratePageContinuationParams,
  onGenerationStage?: GenerationStageCallback
): Promise<{
  page: Page;
  updatedStory: Story;
  metrics: GenerationPipelineMetrics;
  deviationInfo?: DeviationInfo;
}> {
  const isOpening = mode === 'opening';

  // --- Validate structure version ---
  if (isOpening) {
    validateFirstPageStructureVersion(story);
  } else {
    if (!continuationParams) {
      throw new EngineError(
        'Continuation params required for continuation mode',
        'VALIDATION_FAILED'
      );
    }
    validateContinuationStructureVersion(story, continuationParams.parentPage);
  }

  const requestId = createGenerationRequestId();
  const parentPage = continuationParams?.parentPage;
  const choiceIndex = continuationParams?.choiceIndex;
  const choice = parentPage && choiceIndex !== undefined ? parentPage.choices[choiceIndex] : null;

  if (!isOpening && !choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage?.id}`,
      'INVALID_CHOICE'
    );
  }

  const logContext = {
    mode,
    storyId: story.id,
    pageId: parentPage?.id,
    requestId,
  };

  // --- Collect parent state ---
  const parentState = parentPage ? collectParentState(parentPage) : null;
  const currentStructureVersion =
    parentPage && parentState
      ? resolveActiveStructureVersion(story, parentPage)
      : null;
  const ancestorContext = parentPage
    ? await collectAncestorContext(story.id, parentPage)
    : null;
  const maxPageId = parentPage ? await storage.getMaxPageId(story.id) : null;

  // --- Build previous state for reconciler ---
  const previousState = isOpening
    ? createOpeningPreviousStateSnapshot()
    : createContinuationPreviousStateSnapshot(parentState!);

  // --- Guard: decomposed data must exist ---
  if (!story.decomposedCharacters || !story.decomposedWorld) {
    throw new EngineError(
      'Story decomposed data is missing — story has not been fully prepared',
      'STORY_NOT_PREPARED'
    );
  }

  // --- Build lorekeeper + writer pipeline ---
  const writerWithLorekeeper = isOpening
    ? createWriterWithLorekeeper({
        mode: 'opening',
        openingContext: {
          tone: story.tone,
          toneFeel: story.toneFeel,
          toneAvoid: story.toneAvoid,
          startingSituation: story.startingSituation,
          structure: story.structure ?? undefined,
          spine: story.spine,
          initialNpcAgendas: story.initialNpcAgendas,
          decomposedCharacters: story.decomposedCharacters,
          decomposedWorld: story.decomposedWorld,
        },
        storyId: story.id,
        requestId,
        apiKey,
        onGenerationStage,
      })
    : (() : ReturnType<typeof createWriterWithLorekeeper> => {
        const continuationContext = buildContinuationContext(
          story,
          parentPage!,
          choice!.text,
          parentState!,
          ancestorContext!,
          currentStructureVersion,
          continuationParams!.protagonistGuidance
        );
        const removableIds = buildRemovableIds(parentState!);
        return createWriterWithLorekeeper({
          mode: 'continuation',
          continuationContext,
          storyId: story.id,
          parentPageId: parentPage!.id,
          requestId,
          apiKey,
          removableIds,
          onGenerationStage,
        });
      })();

  // --- Plan context builder ---
  const buildPlanContext = isOpening
    ? (failureReasons?: readonly ReconciliationFailureReason[]): PagePlanContext =>
        ({
          mode: 'opening' as const,
          tone: story.tone,
          toneFeel: story.toneFeel,
          toneAvoid: story.toneAvoid,
          startingSituation: story.startingSituation,
          structure: story.structure ?? undefined,
          spine: story.spine,
          initialNpcAgendas: story.initialNpcAgendas,
          decomposedCharacters: story.decomposedCharacters!,
          decomposedWorld: story.decomposedWorld!,
          reconciliationFailureReasons: failureReasons,
        })
    : (() => {
        const continuationContext = buildContinuationContext(
          story,
          parentPage!,
          choice!.text,
          parentState!,
          ancestorContext!,
          currentStructureVersion,
          continuationParams!.protagonistGuidance
        );
        return (failureReasons?: readonly ReconciliationFailureReason[]): PagePlanContext => ({
          ...continuationContext,
          mode: 'continuation' as const,
          reconciliationFailureReasons: failureReasons,
        });
      })();

  // --- Run reconciliation retry loop (planner -> writer -> reconciler) ---
  const {
    writerResult,
    reconciliation,
    metrics,
  } = await generateWithReconciliationRetry({
    mode,
    storyId: story.id,
    pageId: parentPage?.id,
    requestId,
    apiKey,
    previousState,
    buildPlanContext,
    generateWriter: writerWithLorekeeper.generateWriter,
    onGenerationStage,
  });

  // --- NPC agendas (computed early for analyst context) ---
  const parentAccumulatedNpcAgendas = isOpening
    ? buildInitialNpcAgendaRecord(story.initialNpcAgendas)
    : parentState!.accumulatedNpcAgendas;

  // --- NPC relationships (computed early for analyst context) ---
  const parentAccumulatedNpcRelationships: AccumulatedNpcRelationships = isOpening
    ? buildInitialNpcRelationshipRecord(story.initialNpcRelationships)
    : parentState!.accumulatedNpcRelationships;

  // --- Run analyst evaluation ---
  const parentStructureState = isOpening
    ? (story.structure
        ? createInitialStructureState(story.structure)
        : createEmptyAccumulatedStructureState())
    : parentState!.structureState;

  const activeStructureForAnalyst = currentStructureVersion?.structure ?? story.structure;
  const analystResult =
    activeStructureForAnalyst && parentStructureState
      ? await runAnalystEvaluation({
          writerNarrative: writerResult.narrative,
          activeStructure: activeStructureForAnalyst,
          parentStructureState,
          parentActiveState: isOpening
            ? {
                currentLocation: '',
                activeThreats: [],
                activeConstraints: [],
                openThreads: [],
              }
            : parentState!.accumulatedActiveState,
          threadsResolved: reconciliation.threadsResolved,
          threadAges: parentPage?.threadAges ?? {},
          activeTrackedPromises: parentPage?.accumulatedPromises ?? [],
          accumulatedNpcAgendas: parentAccumulatedNpcAgendas,
          accumulatedNpcRelationships: parentAccumulatedNpcRelationships,
          tone: story.tone,
          toneFeel: story.toneFeel,
          toneAvoid: story.toneAvoid,
          spine: story.spine,
          apiKey,
          logContext,
          onGenerationStage,
        })
      : null;

  // --- Merge results ---
  let result = mergePageWriterAndReconciledStateWithAnalystResults(
    writerResult,
    reconciliation,
    analystResult
  );

  // --- Handle spine deviation (two-tier: spine then beats) ---
  const spineDeviationResult = await handleSpineDeviationIfDetected({
    analystResult,
    story,
    apiKey,
    logContext,
  });
  const storyAfterSpine = spineDeviationResult.updatedStory;

  // If spine was rewritten but no beat deviation was detected, force a
  // structure rewrite by injecting a synthetic deviation with all remaining
  // beat IDs invalidated.
  if (
    spineDeviationResult.spineRewritten &&
    !isDeviation(result.deviation) &&
    currentStructureVersion &&
    parentStructureState
  ) {
    const remainingBeatIds = collectRemainingBeatIds(
      currentStructureVersion.structure,
      parentStructureState
    );
    if (remainingBeatIds.length > 0) {
      result = {
        ...result,
        deviation: createBeatDeviation(
          `Spine rewritten (${spineDeviationResult.spineInvalidatedElement ?? 'unknown'} invalidated) — all remaining beats need restructuring`,
          remainingBeatIds,
          analystResult?.narrativeSummary ?? ''
        ),
      };
    }
  }

  // --- Handle deviation ---
  const newPageId = isOpening ? parsePageId(1) : generatePageId(maxPageId!);

  const { storyForPage, activeStructureVersion, deviationInfo: rawDeviationInfo } =
    await handleDeviationIfDetected({
      result,
      story: storyAfterSpine,
      currentStructureVersion,
      parentStructureState,
      newPageId,
      apiKey,
      logContext,
      onGenerationStage,
    });

  // Enrich deviation info with spine rewrite metadata
  const deviationInfo: DeviationInfo | undefined = rawDeviationInfo
    ? {
        ...rawDeviationInfo,
        spineRewritten: spineDeviationResult.spineRewritten || undefined,
        spineInvalidatedElement: spineDeviationResult.spineInvalidatedElement,
      }
    : spineDeviationResult.spineRewritten
      ? {
          detected: true,
          reason: `Spine rewritten: ${spineDeviationResult.spineInvalidatedElement ?? 'unknown'} invalidated`,
          beatsInvalidated: 0,
          spineRewritten: true,
          spineInvalidatedElement: spineDeviationResult.spineInvalidatedElement,
        }
      : undefined;

  // --- Resolve beat conclusion ---
  const activeBeat = resolveActiveBeat(
    activeStructureVersion,
    story.structure,
    parentStructureState
  );
  const { beatConcluded, beatResolution } = resolveBeatConclusion({
    result,
    activeBeat,
    analystResult,
    storyId: story.id,
    parentPageId: parentPage?.id ?? parsePageId(1),
  });

  // --- Structure progression ---
  const progressedState = resolveStructureProgression({
    activeStructureVersion,
    storyStructure: story.structure,
    parentStructureState,
    beatConcluded,
    beatResolution,
  });

  // --- Pacing response ---
  const newStructureState = applyPacingResponse({
    deviationInfo,
    structureState: progressedState,
    recommendedAction: result.recommendedAction ?? 'none',
    pacingIssueReason: result.pacingIssueReason ?? '',
  });

  // --- NPC agenda resolver ---
  const agendaResolverResult = await resolveNpcAgendas({
    decomposedCharacters: story.decomposedCharacters,
    writerNarrative: writerResult.narrative,
    writerSceneSummary: writerResult.sceneSummary,
    parentAccumulatedNpcAgendas,
    currentStructureVersion: activeStructureVersion ?? currentStructureVersion,
    storyStructure: story.structure,
    spine: story.spine,
    parentActiveState: isOpening
      ? {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        }
      : parentState!.accumulatedActiveState,
    analystNpcCoherenceIssues: analystResult?.npcCoherenceIssues,
    parentAccumulatedNpcRelationships,
    analystRelationshipShifts: analystResult?.relationshipShiftsDetected,
    deviationContext:
      deviationInfo?.detected && activeStructureVersion
        ? {
            reason: deviationInfo.reason,
            newBeats: activeStructureVersion.structure.acts.flatMap((act) =>
              act.beats.map((beat) => ({
                name: beat.name,
                objective: beat.objective,
                role: beat.role,
              }))
            ),
          }
        : undefined,
    tone: story.tone,
    toneFeel: story.toneFeel,
    toneAvoid: story.toneAvoid,
    apiKey,
    onGenerationStage,
  });

  // --- Build page ---
  const latestVersion = getLatestStructureVersion(storyForPage);

  const page = buildPage(result, {
    pageId: newPageId,
    parentPageId: parentPage?.id ?? null,
    parentChoiceIndex: choiceIndex ?? null,
    parentAccumulatedActiveState: isOpening
      ? {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        }
      : parentState!.accumulatedActiveState,
    parentAccumulatedInventory: isOpening ? [] : parentState!.accumulatedInventory,
    parentAccumulatedHealth: isOpening ? [] : parentState!.accumulatedHealth,
    parentAccumulatedCharacterState: isOpening ? {} : parentState!.accumulatedCharacterState,
    structureState: newStructureState,
    structureVersionId: activeStructureVersion?.id ?? latestVersion?.id ?? null,
    storyBible: writerWithLorekeeper.getLastStoryBible(),
    analystResult,
    parentThreadAges: parentPage?.threadAges ?? {},
    parentAccumulatedPromises: parentPage?.accumulatedPromises ?? [],
    analystPromisesDetected: analystResult?.promisesDetected ?? [],
    analystPromisesResolved: analystResult?.promisesResolved ?? [],
    parentAccumulatedNpcAgendas,
    npcAgendaUpdates: agendaResolverResult?.updatedAgendas,
    parentAccumulatedNpcRelationships,
    npcRelationshipUpdates: agendaResolverResult?.updatedRelationships,
    pageActIndex: parentStructureState.currentActIndex,
    pageBeatIndex: parentStructureState.currentBeatIndex,
  });

  // --- Update canon ---
  const updatedStory = updateStoryWithAllCanon(
    storyForPage,
    result.newCanonFacts,
    result.newCharacterCanonFacts
  );

  return { page, updatedStory, metrics, deviationInfo };
}

function buildInitialNpcAgendaRecord(
  initialNpcAgendas: readonly NpcAgenda[] | undefined
): Record<string, NpcAgenda> {
  const agendas = initialNpcAgendas ?? [];
  const record: Record<string, NpcAgenda> = {};
  for (const agenda of agendas) {
    record[agenda.npcName] = agenda;
  }
  return record;
}

function buildInitialNpcRelationshipRecord(
  initialNpcRelationships: readonly NpcRelationship[] | undefined
): AccumulatedNpcRelationships {
  if (!initialNpcRelationships || initialNpcRelationships.length === 0) {
    return createEmptyAccumulatedNpcRelationships();
  }
  const record: Record<string, NpcRelationship> = {};
  for (const rel of initialNpcRelationships) {
    record[rel.npcName] = rel;
  }
  return record;
}

/**
 * @deprecated Use generatePage('opening', ...) instead
 */
export async function generateFirstPage(
  story: Story,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback
): Promise<{ page: Page; updatedStory: Story; metrics: GenerationPipelineMetrics }> {
  return generatePage('opening', story, apiKey, undefined, onGenerationStage);
}

/**
 * @deprecated Use generatePage('continuation', ...) instead
 */
export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback
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
      'INVALID_CHOICE'
    );
  }

  return generatePage('continuation', story, apiKey, {
    parentPage,
    choiceIndex,
  }, onGenerationStage);
}

export async function getOrGeneratePage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey?: string,
  onGenerationStage?: GenerationStageCallback,
  protagonistGuidance?: ProtagonistGuidance
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
      'INVALID_CHOICE'
    );
  }

  if (choice.nextPageId !== null) {
    const page = await storage.loadPage(story.id, choice.nextPageId);
    if (!page) {
      throw new EngineError(
        `Page ${choice.nextPageId} referenced by choice but not found`,
        'PAGE_NOT_FOUND'
      );
    }

    return { page, story, wasGenerated: false };
  }

  if (!apiKey) {
    throw new EngineError('API key is required to generate new pages', 'VALIDATION_FAILED');
  }

  const { page, updatedStory, metrics, deviationInfo } = await generatePage(
    'continuation',
    story,
    apiKey,
    { parentPage, choiceIndex, protagonistGuidance },
    onGenerationStage
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
