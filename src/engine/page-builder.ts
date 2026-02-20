import {
  AccumulatedCharacterState,
  AccumulatedStructureState,
  ActiveState,
  createChoice,
  createEmptyAccumulatedStructureState,
  createPage,
  getMaxIdNumber,
  Health,
  Inventory,
  Page,
  PageId,
  parsePageId,
  StructureVersionId,
} from '../models';
import type { TrackedPromise } from '../models/state/index.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { NpcRelationship, AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import { createEmptyAccumulatedNpcRelationships } from '../models/state/npc-relationship';
import type { AnalystResult, DetectedPromise } from '../llm/analyst-types';
import type { StoryBible } from '../llm/lorekeeper-types';
import { createCharacterStateChanges } from './character-state-manager';
import { createHealthChanges } from './health-manager';
import { createInventoryChanges } from './inventory-manager';
import {
  computeFirstPageThreadAges,
  computeContinuationThreadAges,
  augmentThreadsResolvedFromAnalyst,
  buildResolvedThreadMeta,
} from './thread-lifecycle';
import {
  computeAccumulatedPromises,
  getMaxPromiseIdNumber,
  buildResolvedPromiseMeta,
} from './promise-lifecycle';
import type { PageBuildResult } from './state-change-mapper';
import { mapToActiveStateChanges } from './state-change-mapper';

// Re-export for backward compatibility
export { computeContinuationThreadAges, augmentThreadsResolvedFromAnalyst } from './thread-lifecycle';
export { computeAccumulatedPromises, getMaxPromiseIdNumber } from './promise-lifecycle';

/**
 * Unified context for building any page (opening or continuation).
 * For opening pages: parentPageId is null, parent accumulated states are empty/defaults.
 * For continuation pages: all parent state is inherited from parent page.
 */
export interface PageBuildContext {
  readonly pageId: PageId;
  readonly parentPageId: PageId | null;
  readonly parentChoiceIndex: number | null;
  readonly parentAccumulatedActiveState: ActiveState;
  readonly parentAccumulatedInventory: Inventory;
  readonly parentAccumulatedHealth: Health;
  readonly parentAccumulatedCharacterState: AccumulatedCharacterState;
  readonly structureState: AccumulatedStructureState;
  readonly structureVersionId: StructureVersionId | null;
  readonly storyBible: StoryBible | null;
  readonly analystResult: AnalystResult | null;
  readonly parentThreadAges: Readonly<Record<string, number>>;
  readonly parentAccumulatedPromises: readonly TrackedPromise[];
  readonly analystPromisesDetected: readonly DetectedPromise[];
  readonly analystPromisesResolved: readonly string[];
  readonly parentAccumulatedNpcAgendas: AccumulatedNpcAgendas;
  readonly npcAgendaUpdates?: readonly NpcAgenda[];
  readonly parentAccumulatedNpcRelationships: AccumulatedNpcRelationships;
  readonly npcRelationshipUpdates?: readonly NpcRelationship[];
  readonly pageActIndex: number;
  readonly pageBeatIndex: number;
}

/**
 * @deprecated Use PageBuildContext instead
 */
export interface FirstPageBuildContext {
  readonly structureState: AccumulatedStructureState;
  readonly structureVersionId: StructureVersionId | null;
  readonly initialNpcAgendas?: readonly NpcAgenda[];
}

/**
 * @deprecated Use PageBuildContext instead
 */
export interface ContinuationPageBuildContext {
  readonly pageId: PageId;
  readonly parentPageId: PageId;
  readonly parentChoiceIndex: number;
  readonly parentAccumulatedActiveState: ActiveState;
  readonly parentAccumulatedInventory: Inventory;
  readonly parentAccumulatedHealth: Health;
  readonly parentAccumulatedCharacterState: AccumulatedCharacterState;
  readonly structureState: AccumulatedStructureState;
  readonly structureVersionId: StructureVersionId | null;
  readonly storyBible: StoryBible | null;
  readonly analystResult: AnalystResult | null;
  readonly parentThreadAges: Readonly<Record<string, number>>;
  readonly parentAccumulatedPromises: readonly TrackedPromise[];
  readonly analystPromisesDetected: readonly DetectedPromise[];
  readonly analystPromisesResolved: readonly string[];
  readonly parentAccumulatedNpcAgendas?: AccumulatedNpcAgendas;
  readonly npcAgendaUpdates?: readonly NpcAgenda[];
}

/**
 * Builds any page (opening or continuation) from LLM generation result.
 */
export function buildPage(result: PageBuildResult, context: PageBuildContext): Page {
  const isOpening = context.parentPageId === null;

  const effectiveThreadsResolved = isOpening
    ? result.threadsResolved
    : augmentThreadsResolvedFromAnalyst(
        result.threadsResolved,
        context.analystResult,
        context.parentAccumulatedActiveState.openThreads
      );

  const threadAges = isOpening
    ? computeFirstPageThreadAges(result.threadsAdded)
    : computeContinuationThreadAges(
        context.parentThreadAges,
        context.parentAccumulatedActiveState.openThreads.map((t) => t.id),
        result.threadsAdded,
        effectiveThreadsResolved,
        getMaxIdNumber(context.parentAccumulatedActiveState.openThreads, 'td')
      );

  const accumulatedPromises = computeAccumulatedPromises(
    isOpening ? [] : context.parentAccumulatedPromises,
    isOpening ? [] : context.analystPromisesResolved,
    context.analystPromisesDetected,
    getMaxPromiseIdNumber(isOpening ? [] : context.parentAccumulatedPromises)
  );

  const resolvedThreadMeta = buildResolvedThreadMeta(
    effectiveThreadsResolved,
    context.parentAccumulatedActiveState.openThreads
  );

  const resolvedPromiseMeta = buildResolvedPromiseMeta(
    isOpening ? [] : context.analystPromisesResolved,
    isOpening ? [] : context.parentAccumulatedPromises
  );

  return createPage({
    id: context.pageId,
    narrativeText: result.narrative,
    sceneSummary: result.sceneSummary,
    choices: result.choices.map((c) => createChoice(c.text, null, c.choiceType, c.primaryDelta)),
    activeStateChanges: mapToActiveStateChanges(result, effectiveThreadsResolved),
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    healthChanges: createHealthChanges(result.healthAdded, result.healthRemoved),
    characterStateChanges: createCharacterStateChanges(
      result.characterStateChangesAdded,
      result.characterStateChangesRemoved
    ),
    protagonistAffect: result.protagonistAffect,
    isEnding: result.isEnding,
    parentPageId: context.parentPageId,
    parentChoiceIndex: context.parentChoiceIndex,
    parentAccumulatedActiveState: isOpening ? undefined : context.parentAccumulatedActiveState,
    parentAccumulatedInventory: isOpening ? undefined : context.parentAccumulatedInventory,
    parentAccumulatedHealth: isOpening ? undefined : context.parentAccumulatedHealth,
    parentAccumulatedCharacterState: isOpening
      ? undefined
      : context.parentAccumulatedCharacterState,
    parentAccumulatedStructureState: context.structureState,
    structureVersionId: context.structureVersionId,
    storyBible: context.storyBible,
    analystResult: context.analystResult,
    threadAges,
    accumulatedPromises,
    resolvedThreadMeta,
    resolvedPromiseMeta,
    npcAgendaUpdates: context.npcAgendaUpdates,
    parentAccumulatedNpcAgendas: context.parentAccumulatedNpcAgendas,
    npcRelationshipUpdates: context.npcRelationshipUpdates,
    parentAccumulatedNpcRelationships: context.parentAccumulatedNpcRelationships,
    pageActIndex: context.pageActIndex,
    pageBeatIndex: context.pageBeatIndex,
  });
}

/**
 * @deprecated Use buildPage instead
 */
export function buildFirstPage(result: PageBuildResult, context: FirstPageBuildContext): Page {
  const initialAgendas = context.initialNpcAgendas ?? [];
  const agendaRecord: Record<string, NpcAgenda> = {};
  for (const agenda of initialAgendas) {
    agendaRecord[agenda.npcName] = agenda;
  }

  return buildPage(result, {
    pageId: parsePageId(1),
    parentPageId: null,
    parentChoiceIndex: null,
    parentAccumulatedActiveState: {
      currentLocation: '',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    parentAccumulatedInventory: [],
    parentAccumulatedHealth: [],
    parentAccumulatedCharacterState: {},
    structureState: context.structureState,
    structureVersionId: context.structureVersionId,
    storyBible: null,
    analystResult: null,
    parentThreadAges: {},
    parentAccumulatedPromises: [],
    analystPromisesDetected: [],
    analystPromisesResolved: [],
    parentAccumulatedNpcAgendas: agendaRecord,
    parentAccumulatedNpcRelationships: createEmptyAccumulatedNpcRelationships(),
    pageActIndex: 0,
    pageBeatIndex: 0,
  });
}

/**
 * @deprecated Use buildPage instead
 */
export function buildContinuationPage(
  result: PageBuildResult,
  context: ContinuationPageBuildContext
): Page {
  return buildPage(result, {
    pageId: context.pageId,
    parentPageId: context.parentPageId,
    parentChoiceIndex: context.parentChoiceIndex,
    parentAccumulatedActiveState: context.parentAccumulatedActiveState,
    parentAccumulatedInventory: context.parentAccumulatedInventory,
    parentAccumulatedHealth: context.parentAccumulatedHealth,
    parentAccumulatedCharacterState: context.parentAccumulatedCharacterState,
    structureState: context.structureState,
    structureVersionId: context.structureVersionId,
    storyBible: context.storyBible,
    analystResult: context.analystResult,
    parentThreadAges: context.parentThreadAges,
    parentAccumulatedPromises: context.parentAccumulatedPromises,
    analystPromisesDetected: context.analystPromisesDetected,
    analystPromisesResolved: context.analystPromisesResolved,
    parentAccumulatedNpcAgendas: context.parentAccumulatedNpcAgendas ?? {},
    npcAgendaUpdates: context.npcAgendaUpdates,
    parentAccumulatedNpcRelationships: createEmptyAccumulatedNpcRelationships(),
    pageActIndex: context.structureState.currentActIndex,
    pageBeatIndex: context.structureState.currentBeatIndex,
  });
}

/**
 * Creates an empty structure state for unstructured stories.
 */
export function createEmptyStructureContext(): FirstPageBuildContext {
  return {
    structureState: createEmptyAccumulatedStructureState(),
    structureVersionId: null,
  };
}
