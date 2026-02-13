import { generateLorekeeperBible, generatePageWriterOutput } from '../llm';
import type {
  ContinuationContext,
  LorekeeperContext,
  ReconciliationFailureReason,
  StoryBible,
  WriterResult,
  PagePlanGenerationResult,
  WriterValidationContext,
} from '../llm/types';
import { logger } from '../logging/index.js';
import { emitGenerationStage } from './generation-pipeline-helpers.js';
import type { GenerationStageCallback } from './types';

export interface LorekeeperWriterContext {
  readonly continuationContext: ContinuationContext;
  readonly storyId: string;
  readonly parentPageId: number;
  readonly requestId: string;
  readonly apiKey: string;
  readonly removableIds: WriterValidationContext['removableIds'];
  readonly onGenerationStage?: GenerationStageCallback;
}

export function createContinuationWriterWithLorekeeper(context: LorekeeperWriterContext): {
  generateWriter: (
    pagePlan: PagePlanGenerationResult,
    failureReasons?: readonly ReconciliationFailureReason[],
  ) => Promise<WriterResult>;
  getLastStoryBible: () => StoryBible | null;
} {
  let lastStoryBible: StoryBible | null = null;

  const generateWriter = async (
    pagePlan: PagePlanGenerationResult,
    failureReasons?: readonly ReconciliationFailureReason[],
  ): Promise<WriterResult> => {
    emitGenerationStage(context.onGenerationStage, 'CURATING_CONTEXT', 'started', 1);
    const lorekeeperContext: LorekeeperContext = {
      characterConcept: context.continuationContext.characterConcept,
      worldbuilding: context.continuationContext.worldbuilding,
      tone: context.continuationContext.tone,
      npcs: context.continuationContext.npcs,
      globalCanon: context.continuationContext.globalCanon,
      globalCharacterCanon: context.continuationContext.globalCharacterCanon,
      accumulatedCharacterState: context.continuationContext.accumulatedCharacterState,
      activeState: context.continuationContext.activeState,
      structure: context.continuationContext.structure,
      accumulatedStructureState: context.continuationContext.accumulatedStructureState,
      accumulatedNpcAgendas: context.continuationContext.accumulatedNpcAgendas,
      ancestorSummaries: context.continuationContext.ancestorSummaries,
      grandparentNarrative: context.continuationContext.grandparentNarrative,
      previousNarrative: context.continuationContext.previousNarrative,
      pagePlan,
    };

    let storyBible: StoryBible | null = null;
    try {
      const lorekeeperResult = await generateLorekeeperBible(lorekeeperContext, {
        apiKey: context.apiKey,
        observability: {
          storyId: context.storyId,
          pageId: context.parentPageId,
          requestId: context.requestId,
        },
      });
      storyBible = {
        sceneWorldContext: lorekeeperResult.sceneWorldContext,
        relevantCharacters: lorekeeperResult.relevantCharacters,
        relevantCanonFacts: lorekeeperResult.relevantCanonFacts,
        relevantHistory: lorekeeperResult.relevantHistory,
      };
      lastStoryBible = storyBible;
      logger.info('Lorekeeper bible generated', {
        storyId: context.storyId,
        pageId: context.parentPageId,
        characterCount: storyBible.relevantCharacters.length,
        canonFactCount: storyBible.relevantCanonFacts.length,
      });
    } catch (error) {
      logger.warn('Lorekeeper failed, proceeding without story bible', {
        storyId: context.storyId,
        pageId: context.parentPageId,
        error,
      });
    }
    emitGenerationStage(context.onGenerationStage, 'CURATING_CONTEXT', 'completed', 1);
    emitGenerationStage(context.onGenerationStage, 'WRITING_CONTINUING_PAGE', 'started', 1);

    return generatePageWriterOutput(
      {
        ...context.continuationContext,
        storyBible: storyBible ?? undefined,
        reconciliationFailureReasons: failureReasons,
      },
      pagePlan,
      {
        apiKey: context.apiKey,
        observability: {
          storyId: context.storyId,
          pageId: context.parentPageId,
          requestId: context.requestId,
        },
        writerValidationContext: { removableIds: context.removableIds },
      },
    );
  };

  return {
    generateWriter,
    getLastStoryBible: () => lastStoryBible,
  };
}
