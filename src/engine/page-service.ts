import { mergePageWriterAndReconciledStateWithAnalystResults } from '../llm';
import type {
  GenerationPipelineMetrics,
  PagePlanContext,
  ReconciliationFailureReason,
} from '../llm';
import { randomUUID } from 'node:crypto';
import {
  createEmptyAccumulatedStructureState,
  generatePageId,
  getLatestStructureVersion,
  Page,
  parsePageId,
  Story,
} from '../models';
import { createInitialStructureState } from '../models/story-arc';
import type { NpcAgenda } from '../models/state/npc-agenda';
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

  // --- Build lorekeeper + writer pipeline ---
  const writerWithLorekeeper = isOpening
    ? createWriterWithLorekeeper({
        mode: 'opening',
        openingContext: {
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
          toneKeywords: story.toneKeywords,
          toneAntiKeywords: story.toneAntiKeywords,
          npcs: story.npcs,
          startingSituation: story.startingSituation,
          structure: story.structure ?? undefined,
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
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
          toneKeywords: story.toneKeywords,
          toneAntiKeywords: story.toneAntiKeywords,
          npcs: story.npcs,
          startingSituation: story.startingSituation,
          structure: story.structure ?? undefined,
          initialNpcAgendas: story.initialNpcAgendas,
          decomposedCharacters: story.decomposedCharacters,
          decomposedWorld: story.decomposedWorld,
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
          tone: story.tone,
          toneKeywords: story.toneKeywords,
          toneAntiKeywords: story.toneAntiKeywords,
          apiKey,
          logContext,
          onGenerationStage,
        })
      : null;

  // --- Merge results ---
  const result = mergePageWriterAndReconciledStateWithAnalystResults(
    writerResult,
    reconciliation,
    analystResult
  );

  // --- Handle deviation ---
  const newPageId = isOpening ? parsePageId(1) : generatePageId(maxPageId!);

  const { storyForPage, activeStructureVersion, deviationInfo } =
    await handleDeviationIfDetected({
      result,
      story,
      currentStructureVersion,
      parentStructureState,
      newPageId,
      apiKey,
      logContext,
      onGenerationStage,
    });

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

  // --- NPC agendas ---
  const parentAccumulatedNpcAgendas = isOpening
    ? buildInitialNpcAgendaRecord(story.initialNpcAgendas)
    : parentState!.accumulatedNpcAgendas;

  const agendaResolverResult = await resolveNpcAgendas({
    npcs: story.npcs,
    decomposedCharacters: story.decomposedCharacters,
    writerNarrative: writerResult.narrative,
    writerSceneSummary: writerResult.sceneSummary,
    parentAccumulatedNpcAgendas,
    currentStructureVersion,
    storyStructure: story.structure,
    parentActiveState: isOpening
      ? {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        }
      : parentState!.accumulatedActiveState,
    tone: story.tone,
    toneKeywords: story.toneKeywords,
    toneAntiKeywords: story.toneAntiKeywords,
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
    parentAccumulatedNpcAgendas,
    npcAgendaUpdates: agendaResolverResult?.updatedAgendas,
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
