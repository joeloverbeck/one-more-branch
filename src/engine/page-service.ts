import type { GenerationPipelineMetrics } from '../llm';
import type { Page, Story } from '../models';
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';
import { storage } from '../persistence';
import { assembleGenerationContext } from './generation-context-assembler';
import { processPostGeneration } from './post-generation-processor';
import { generateWithReconciliationRetry } from './reconciliation-retry-pipeline';
import type { GenerationStageCallback } from './types';
import { DeviationInfo, EngineError } from './types';

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
  // --- Phase 1: Assemble generation context ---
  const ctx = await assembleGenerationContext(
    mode,
    story,
    apiKey,
    continuationParams,
    onGenerationStage
  );

  // --- Phase 2: Run reconciliation retry loop (planner -> writer -> reconciler) ---
  const {
    writerResult,
    reconciliation,
    metrics,
  } = await generateWithReconciliationRetry({
    mode,
    storyId: story.id,
    pageId: ctx.parentPage?.id,
    requestId: ctx.requestId,
    apiKey,
    previousState: ctx.previousState,
    buildPlanContext: ctx.buildPlanContext,
    generateWriter: ctx.writerWithLorekeeper.generateWriter,
    onGenerationStage,
  });

  // --- Phase 3: Post-generation processing ---
  const { page, updatedStory, deviationInfo } = await processPostGeneration({
    mode,
    story,
    apiKey,
    logContext: ctx.logContext,
    parentPage: ctx.parentPage,
    parentState: ctx.parentState,
    currentStructureVersion: ctx.currentStructureVersion,
    writerResult,
    reconciliation,
    getLastStoryBible: ctx.writerWithLorekeeper.getLastStoryBible,
    maxPageId: ctx.maxPageId,
    choiceIndex: ctx.choiceIndex,
    onGenerationStage,
  });

  return { page, updatedStory, metrics, deviationInfo };
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
