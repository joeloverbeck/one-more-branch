import { generateOpeningPage, mergePageWriterAndReconciledStateWithAnalystResults } from '../llm';
import type { GenerationPipelineMetrics } from '../llm';
import { randomUUID } from 'node:crypto';
import {
  createEmptyActiveState,
  createEmptyAccumulatedStructureState,
  generatePageId,
  getLatestStructureVersion,
  Page,
  Story,
} from '../models';
import { storage } from '../persistence';
import { collectAncestorContext } from './ancestor-collector';
import { updateStoryWithAllCanon } from './canon-manager';
import { buildContinuationContext, buildRemovableIds } from './continuation-context-builder';
import { createContinuationWriterWithLorekeeper } from './lorekeeper-writer-pipeline';
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
import { buildContinuationPage, buildFirstPage } from './page-builder';
import {
  collectParentState,
  createOpeningPreviousStateSnapshot,
  createContinuationPreviousStateSnapshot,
} from './parent-state-collector';
import { createInitialStructureState } from './structure-state';
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

export async function generateFirstPage(
  story: Story,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback
): Promise<{ page: Page; updatedStory: Story; metrics: GenerationPipelineMetrics }> {
  validateFirstPageStructureVersion(story);

  const requestId = createGenerationRequestId();
  const openingPreviousState = createOpeningPreviousStateSnapshot();
  const {
    writerResult,
    reconciliation: openingReconciliation,
    metrics,
  } = await generateWithReconciliationRetry({
    mode: 'opening',
    storyId: story.id,
    requestId,
    apiKey,
    previousState: openingPreviousState,
    buildPlanContext: (failureReasons) => ({
      mode: 'opening',
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      npcs: story.npcs,
      startingSituation: story.startingSituation,
      structure: story.structure ?? undefined,
      initialNpcAgendas: story.initialNpcAgendas,
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
          initialNpcAgendas: story.initialNpcAgendas,
          pagePlan,
          reconciliationFailureReasons: failureReasons,
        },
        {
          apiKey,
          observability: {
            storyId: story.id,
            requestId,
          },
        }
      ),
    onGenerationStage,
  });
  const result = mergePageWriterAndReconciledStateWithAnalystResults(
    writerResult,
    openingReconciliation,
    null
  );

  const initialStructureState = story.structure
    ? createInitialStructureState(story.structure)
    : createEmptyAccumulatedStructureState();

  const latestVersion = getLatestStructureVersion(story);
  const page = buildFirstPage(result, {
    structureState: initialStructureState,
    structureVersionId: latestVersion?.id ?? null,
    initialNpcAgendas: story.initialNpcAgendas,
  });

  const updatedStory = updateStoryWithAllCanon(
    story,
    result.newCanonFacts,
    result.newCharacterCanonFacts
  );

  return { page, updatedStory, metrics };
}

export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback,
  suggestedProtagonistSpeech?: string
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

  validateContinuationStructureVersion(story, parentPage);

  const requestId = createGenerationRequestId();
  const continuationLogContext = {
    mode: 'continuation' as const,
    storyId: story.id,
    pageId: parentPage.id,
    requestId,
  };
  const maxPageId = await storage.getMaxPageId(story.id);
  const parentState = collectParentState(parentPage);
  const currentStructureVersion = resolveActiveStructureVersion(story, parentPage);
  const ancestorContext = await collectAncestorContext(story.id, parentPage);

  const continuationContext = buildContinuationContext(
    story,
    parentPage,
    choice.text,
    parentState,
    ancestorContext,
    currentStructureVersion,
    suggestedProtagonistSpeech
  );
  const continuationPreviousState = createContinuationPreviousStateSnapshot(parentState);
  const removableIds = buildRemovableIds(parentState);

  const { generateWriter, getLastStoryBible } = createContinuationWriterWithLorekeeper({
    continuationContext,
    storyId: story.id,
    parentPageId: parentPage.id,
    requestId,
    apiKey,
    removableIds,
    onGenerationStage,
  });

  const {
    writerResult,
    reconciliation: continuationReconciliation,
    metrics,
  } = await generateWithReconciliationRetry({
    mode: 'continuation',
    storyId: story.id,
    pageId: parentPage.id,
    requestId,
    apiKey,
    previousState: continuationPreviousState,
    buildPlanContext: (failureReasons) => ({
      ...continuationContext,
      mode: 'continuation',
      reconciliationFailureReasons: failureReasons,
    }),
    generateWriter,
    onGenerationStage,
  });

  // Analyst call (only when structure exists)
  const activeStructureForAnalyst = currentStructureVersion?.structure ?? story.structure;
  const analystResult =
    activeStructureForAnalyst && parentState.structureState
      ? await runAnalystEvaluation({
          writerNarrative: writerResult.narrative,
          activeStructure: activeStructureForAnalyst,
          parentStructureState: parentState.structureState,
          parentActiveState: parentState.accumulatedActiveState,
          threadsResolved: continuationReconciliation.threadsResolved,
          threadAges: parentPage.threadAges,
          apiKey,
          logContext: continuationLogContext,
          onGenerationStage,
        })
      : null;

  // Merge into ContinuationGenerationResult
  const result = mergePageWriterAndReconciledStateWithAnalystResults(
    writerResult,
    continuationReconciliation,
    analystResult
  );

  const newPageId = generatePageId(maxPageId);

  // Handle deviation if detected - triggers structure rewrite
  const { storyForPage, activeStructureVersion, deviationInfo } = await handleDeviationIfDetected({
    result,
    story,
    currentStructureVersion,
    parentStructureState: parentState.structureState,
    newPageId,
    apiKey,
    logContext: continuationLogContext,
    onGenerationStage,
  });

  // Resolve beat conclusion with turning point gate logic
  const activeBeat = resolveActiveBeat(
    activeStructureVersion,
    story.structure,
    parentState.structureState
  );
  const { beatConcluded, beatResolution } = resolveBeatConclusion({
    result,
    activeBeat,
    analystResult,
    storyId: story.id,
    parentPageId: parentPage.id,
  });

  // Apply structure progression
  const progressedState = resolveStructureProgression({
    activeStructureVersion,
    storyStructure: story.structure,
    parentStructureState: parentState.structureState,
    beatConcluded,
    beatResolution,
  });

  // Apply pacing response
  const newStructureState = applyPacingResponse({
    deviationInfo,
    structureState: progressedState,
    recommendedAction: result.recommendedAction ?? 'none',
    pacingIssueReason: result.pacingIssueReason ?? '',
  });

  const agendaResolverResult = await resolveNpcAgendas({
    npcs: story.npcs,
    writerNarrative: writerResult.narrative,
    writerSceneSummary: writerResult.sceneSummary,
    parentAccumulatedNpcAgendas: parentState.accumulatedNpcAgendas,
    currentStructureVersion,
    storyStructure: story.structure,
    parentStructureState: parentState.structureState,
    parentActiveState: parentState.accumulatedActiveState,
    apiKey,
    onGenerationStage,
  });

  const parentAnalystPromises = parentPage.analystResult?.narrativePromises ?? [];

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
    storyBible: getLastStoryBible(),
    analystResult,
    parentThreadAges: parentPage.threadAges,
    parentInheritedNarrativePromises: parentPage.inheritedNarrativePromises,
    parentAnalystNarrativePromises: parentAnalystPromises,
    parentAccumulatedNpcAgendas: parentState.accumulatedNpcAgendas,
    npcAgendaUpdates: agendaResolverResult?.updatedAgendas,
  });

  const updatedStory = updateStoryWithAllCanon(
    storyForPage,
    result.newCanonFacts,
    result.newCharacterCanonFacts
  );

  return { page, updatedStory, metrics, deviationInfo };
}

export async function getOrGeneratePage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey?: string,
  onGenerationStage?: GenerationStageCallback,
  suggestedProtagonistSpeech?: string
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

  const { page, updatedStory, metrics, deviationInfo } = await generateNextPage(
    story,
    parentPage,
    choiceIndex,
    apiKey,
    onGenerationStage,
    suggestedProtagonistSpeech
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
