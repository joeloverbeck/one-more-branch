import {
  generateLorekeeperBible,
  generateOpeningPage,
  generatePageWriterOutput,
} from '../llm';
import type { ContinuationContext, LorekeeperContext, OpeningContext } from '../llm/context-types';
import type {
  ReconciliationFailureReason,
  WriterValidationContext,
} from '../llm/generation-pipeline-types';
import type { StoryBible } from '../llm/lorekeeper-types';
import type { PagePlanGenerationResult } from '../llm/planner-types';
import type { WriterResult } from '../llm/writer-types';
import { logger } from '../logging/index.js';
import { emitGenerationStage } from './generation-pipeline-helpers.js';
import type { GenerationStageCallback } from './types';

interface BaseWriterContext {
  readonly storyId: string;
  readonly requestId: string;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface OpeningWriterContext extends BaseWriterContext {
  readonly mode: 'opening';
  readonly openingContext: OpeningContext;
}

export interface ContinuationWriterContext extends BaseWriterContext {
  readonly mode: 'continuation';
  readonly continuationContext: ContinuationContext;
  readonly parentPageId: number;
  readonly removableIds: WriterValidationContext['removableIds'];
}

export type WriterWithLorekeeperContext = OpeningWriterContext | ContinuationWriterContext;

/**
 * @deprecated Use createWriterWithLorekeeper instead
 */
export interface LorekeeperWriterContext {
  readonly continuationContext: ContinuationContext;
  readonly storyId: string;
  readonly parentPageId: number;
  readonly requestId: string;
  readonly apiKey: string;
  readonly removableIds: WriterValidationContext['removableIds'];
  readonly onGenerationStage?: GenerationStageCallback;
}

function buildLorekeeperContext(
  ctx: WriterWithLorekeeperContext,
  pagePlan: PagePlanGenerationResult
): LorekeeperContext {
  if (ctx.mode === 'opening') {
    const oc = ctx.openingContext;
    return {
      characterConcept: oc.characterConcept,
      worldbuilding: oc.worldbuilding,
      tone: oc.tone,
      toneKeywords: oc.toneKeywords,
      toneAntiKeywords: oc.toneAntiKeywords,
      npcs: oc.npcs,
      decomposedCharacters: oc.decomposedCharacters,
      decomposedWorld: oc.decomposedWorld,
      globalCanon: [],
      globalCharacterCanon: {},
      accumulatedCharacterState: {},
      activeState: {
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
      structure: oc.structure,
      ancestorSummaries: [],
      grandparentNarrative: null,
      previousNarrative: '',
      pagePlan,
      startingSituation: oc.startingSituation,
    };
  }

  const cc = ctx.continuationContext;
  return {
    characterConcept: cc.characterConcept,
    worldbuilding: cc.worldbuilding,
    tone: cc.tone,
    toneKeywords: cc.toneKeywords,
    toneAntiKeywords: cc.toneAntiKeywords,
    npcs: cc.npcs,
    decomposedCharacters: cc.decomposedCharacters,
    decomposedWorld: cc.decomposedWorld,
    globalCanon: cc.globalCanon,
    globalCharacterCanon: cc.globalCharacterCanon,
    accumulatedCharacterState: cc.accumulatedCharacterState,
    activeState: cc.activeState,
    structure: cc.structure,
    accumulatedStructureState: cc.accumulatedStructureState,
    accumulatedNpcAgendas: cc.accumulatedNpcAgendas,
    ancestorSummaries: cc.ancestorSummaries,
    grandparentNarrative: cc.grandparentNarrative,
    previousNarrative: cc.previousNarrative,
    pagePlan,
  };
}

function resolveLogPageId(ctx: WriterWithLorekeeperContext): number | undefined {
  return ctx.mode === 'continuation' ? ctx.parentPageId : undefined;
}

export function createWriterWithLorekeeper(context: WriterWithLorekeeperContext): {
  generateWriter: (
    pagePlan: PagePlanGenerationResult,
    failureReasons?: readonly ReconciliationFailureReason[]
  ) => Promise<WriterResult>;
  getLastStoryBible: () => StoryBible | null;
} {
  let lastStoryBible: StoryBible | null = null;
  const logPageId = resolveLogPageId(context);

  const generateWriter = async (
    pagePlan: PagePlanGenerationResult,
    failureReasons?: readonly ReconciliationFailureReason[]
  ): Promise<WriterResult> => {
    emitGenerationStage(context.onGenerationStage, 'CURATING_CONTEXT', 'started', 1);

    const lorekeeperContext = buildLorekeeperContext(context, pagePlan);

    let storyBible: StoryBible | null = null;
    try {
      const lorekeeperResult = await generateLorekeeperBible(lorekeeperContext, {
        apiKey: context.apiKey,
        observability: {
          storyId: context.storyId,
          pageId: logPageId,
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
        pageId: logPageId,
        mode: context.mode,
        characterCount: storyBible.relevantCharacters.length,
        canonFactCount: storyBible.relevantCanonFacts.length,
      });
    } catch (error) {
      logger.warn('Lorekeeper failed, proceeding without story bible', {
        storyId: context.storyId,
        pageId: logPageId,
        mode: context.mode,
        error,
      });
    }
    emitGenerationStage(context.onGenerationStage, 'CURATING_CONTEXT', 'completed', 1);

    if (context.mode === 'opening') {
      emitGenerationStage(context.onGenerationStage, 'WRITING_OPENING_PAGE', 'started', 1);
      return generateOpeningPage(
        {
          ...context.openingContext,
          pagePlan,
          storyBible: storyBible ?? undefined,
          reconciliationFailureReasons: failureReasons,
        },
        {
          apiKey: context.apiKey,
          observability: {
            storyId: context.storyId,
            requestId: context.requestId,
          },
        }
      );
    }

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
      }
    );
  };

  return {
    generateWriter,
    getLastStoryBible: () => lastStoryBible,
  };
}

/**
 * @deprecated Use createWriterWithLorekeeper instead
 */
export function createContinuationWriterWithLorekeeper(context: LorekeeperWriterContext): {
  generateWriter: (
    pagePlan: PagePlanGenerationResult,
    failureReasons?: readonly ReconciliationFailureReason[]
  ) => Promise<WriterResult>;
  getLastStoryBible: () => StoryBible | null;
} {
  return createWriterWithLorekeeper({
    mode: 'continuation',
    continuationContext: context.continuationContext,
    storyId: context.storyId,
    parentPageId: context.parentPageId,
    requestId: context.requestId,
    apiKey: context.apiKey,
    removableIds: context.removableIds,
    onGenerationStage: context.onGenerationStage,
  });
}
