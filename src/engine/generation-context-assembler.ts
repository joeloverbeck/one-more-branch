import { randomUUID } from 'node:crypto';
import type {
  PagePlanContext,
  ReconciliationFailureReason,
} from '../llm';
import type {
  Page,
  Story,
  VersionedStoryStructure,
} from '../models';
import { storage } from '../persistence';
import type { AncestorContext } from './ancestor-collector';
import { collectAncestorContext } from './ancestor-collector';
import { buildContinuationContext, buildRemovableIds } from './continuation-context-builder';
import { createWriterWithLorekeeper } from './lorekeeper-writer-pipeline';
import type { CollectedParentState } from './parent-state-collector';
import {
  collectParentState,
  createOpeningPreviousStateSnapshot,
  createContinuationPreviousStateSnapshot,
} from './parent-state-collector';
import type { StateReconciliationPreviousState } from './state-reconciler-types';
import {
  resolveActiveStructureVersion,
  validateContinuationStructureVersion,
  validateFirstPageStructureVersion,
} from './structure-version-validator';
import type { GenerationStageCallback } from './types';
import { EngineError } from './types';
import type { GeneratePageContinuationParams } from './page-service';

export interface GenerationContextAssemblyResult {
  readonly requestId: string;
  readonly parentPage: Page | undefined;
  readonly choiceIndex: number | undefined;
  readonly choice: { readonly text: string } | null;
  readonly logContext: Record<string, unknown>;
  readonly parentState: CollectedParentState | null;
  readonly currentStructureVersion: VersionedStoryStructure | null;
  readonly ancestorContext: AncestorContext | null;
  readonly maxPageId: number | null;
  readonly previousState: StateReconciliationPreviousState;
  readonly writerWithLorekeeper: ReturnType<typeof createWriterWithLorekeeper>;
  readonly buildPlanContext: (
    failureReasons?: readonly ReconciliationFailureReason[]
  ) => PagePlanContext;
}

export async function assembleGenerationContext(
  mode: 'opening' | 'continuation',
  story: Story,
  apiKey: string,
  continuationParams?: GeneratePageContinuationParams,
  onGenerationStage?: GenerationStageCallback
): Promise<GenerationContextAssemblyResult> {
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

  const requestId = randomUUID();
  const parentPage = continuationParams?.parentPage;
  const choiceIndex = continuationParams?.choiceIndex;
  const choice =
    parentPage && choiceIndex !== undefined ? parentPage.choices[choiceIndex] : null;

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

  return {
    requestId,
    parentPage,
    choiceIndex,
    choice: choice ?? null,
    logContext,
    parentState,
    currentStructureVersion,
    ancestorContext,
    maxPageId,
    previousState,
    writerWithLorekeeper,
    buildPlanContext,
  };
}
