import {
  AccumulatedCharacterState,
  AccumulatedStructureState,
  ActiveState,
  ActiveStateChanges,
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
  ThreadEntry,
} from '../models';
import type { TrackedPromise } from '../models/state/index.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { AnalystResult, DetectedPromise } from '../llm/analyst-types';
import type { StoryBible } from '../llm/lorekeeper-types';
import type { PageWriterResult } from '../llm/writer-types';
import type { StateReconciliationResult } from './state-reconciler-types';
import { createCharacterStateChanges } from './character-state-manager';
import { createHealthChanges } from './health-manager';
import { createInventoryChanges } from './inventory-manager';

type PageBuildResult = PageWriterResult &
  Pick<
    StateReconciliationResult,
    | 'currentLocation'
    | 'threatsAdded'
    | 'threatsRemoved'
    | 'constraintsAdded'
    | 'constraintsRemoved'
    | 'threadsAdded'
    | 'threadsResolved'
    | 'inventoryAdded'
    | 'inventoryRemoved'
    | 'healthAdded'
    | 'healthRemoved'
    | 'characterStateChangesAdded'
    | 'characterStateChangesRemoved'
  >;

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
 * Computes thread ages for a first page.
 * All threads are new on the opening page, so all get age 0.
 */
function computeFirstPageThreadAges(
  threadsAdded: readonly { text: string }[]
): Readonly<Record<string, number>> {
  const ages: Record<string, number> = {};
  for (let i = 0; i < threadsAdded.length; i++) {
    ages[`td-${i + 1}`] = 0;
  }
  return ages;
}

/**
 * Computes thread ages for a continuation page.
 * Inherited threads: parentAge + 1, new threads: 0, resolved threads: removed.
 */
export function computeContinuationThreadAges(
  parentThreadAges: Readonly<Record<string, number>>,
  parentOpenThreadIds: readonly string[],
  threadsAdded: readonly { text: string }[],
  threadsResolved: readonly string[],
  newThreadStartId: number
): Readonly<Record<string, number>> {
  const ages: Record<string, number> = {};
  const resolvedSet = new Set(threadsResolved);

  // Increment ages for inherited threads that weren't resolved
  for (const threadId of parentOpenThreadIds) {
    if (!resolvedSet.has(threadId)) {
      const parentAge = parentThreadAges[threadId] ?? 0;
      ages[threadId] = parentAge + 1;
    }
  }

  // New threads get age 0 (IDs are assigned sequentially by the reconciler)
  for (let i = 0; i < threadsAdded.length; i++) {
    const newId = `td-${newThreadStartId + i + 1}`;
    ages[newId] = 0;
  }

  return ages;
}

/**
 * Computes accumulated tracked promises for the new page.
 * Parent promises are resolved/aged and new detections are assigned IDs.
 */
export function computeAccumulatedPromises(
  parentPromises: readonly TrackedPromise[],
  resolvedIds: readonly string[],
  detected: readonly DetectedPromise[],
  maxExistingId: number
): readonly TrackedPromise[] {
  const resolvedSet = new Set(resolvedIds);
  const survivingAgedPromises = parentPromises
    .filter((promise) => !resolvedSet.has(promise.id))
    .map((promise) => ({ ...promise, age: promise.age + 1 }));

  let nextPromiseId = maxExistingId;
  const newlyTrackedPromises = detected
    .filter((promise) => promise.description.trim().length > 0)
    .map((promise) => {
      nextPromiseId += 1;
      return {
        id: `pr-${nextPromiseId}`,
        description: promise.description.trim(),
        promiseType: promise.promiseType,
        suggestedUrgency: promise.suggestedUrgency,
        age: 0,
      };
    });

  return [...survivingAgedPromises, ...newlyTrackedPromises];
}

export function getMaxPromiseIdNumber(promises: readonly TrackedPromise[]): number {
  let max = 0;
  for (const promise of promises) {
    const match = /^pr-(\d+)$/.exec(promise.id);
    if (!match?.[1]) {
      continue;
    }
    const value = Number.parseInt(match[1], 10);
    if (!Number.isNaN(value) && value > max) {
      max = value;
    }
  }
  return max;
}

/**
 * Builds a lookup of metadata for threads resolved on this page.
 * Cross-references resolved thread IDs with the parent page's open threads
 * to preserve threadType and urgency for display purposes (e.g. payoff card badges).
 */
function buildResolvedThreadMeta(
  threadsResolved: readonly string[],
  parentOpenThreads: readonly ThreadEntry[]
): Readonly<Record<string, { threadType: string; urgency: string }>> {
  if (threadsResolved.length === 0) {
    return {};
  }
  const meta: Record<string, { threadType: string; urgency: string }> = {};
  const threadMap = new Map(parentOpenThreads.map((t) => [t.id, t]));
  for (const id of threadsResolved) {
    const thread = threadMap.get(id);
    if (thread) {
      meta[id] = { threadType: thread.threadType, urgency: thread.urgency };
    }
  }
  return meta;
}

/**
 * Builds a lookup of metadata for promises resolved on this page.
 * Cross-references resolved promise IDs with the parent page's accumulated promises
 * to preserve promiseType and suggestedUrgency for display purposes (e.g. payoff card badges).
 */
function buildResolvedPromiseMeta(
  resolvedIds: readonly string[],
  parentPromises: readonly TrackedPromise[]
): Readonly<Record<string, { promiseType: string; urgency: string }>> {
  if (resolvedIds.length === 0) {
    return {};
  }
  const meta: Record<string, { promiseType: string; urgency: string }> = {};
  const promiseMap = new Map(parentPromises.map((p) => [p.id, p]));
  for (const id of resolvedIds) {
    const promise = promiseMap.get(id);
    if (promise) {
      meta[id] = { promiseType: promise.promiseType, urgency: promise.suggestedUrgency };
    }
  }
  return meta;
}

/**
 * Maps reconciled state fields to ActiveStateChanges.
 * Handles the conversion from LLM output format to the typed change structure.
 */
function mapToActiveStateChanges(result: PageBuildResult): ActiveStateChanges {
  return {
    newLocation: result.currentLocation || null,
    threatsAdded: result.threatsAdded,
    threatsRemoved: result.threatsRemoved,
    constraintsAdded: result.constraintsAdded,
    constraintsRemoved: result.constraintsRemoved,
    threadsAdded: result.threadsAdded.map((thread) => ({
      text: thread.text,
      threadType: thread.threadType,
      urgency: thread.urgency,
    })),
    threadsResolved: result.threadsResolved,
  };
}

/**
 * Builds any page (opening or continuation) from LLM generation result.
 */
export function buildPage(result: PageBuildResult, context: PageBuildContext): Page {
  const isOpening = context.parentPageId === null;

  const threadAges = isOpening
    ? computeFirstPageThreadAges(result.threadsAdded)
    : computeContinuationThreadAges(
        context.parentThreadAges,
        context.parentAccumulatedActiveState.openThreads.map((t) => t.id),
        result.threadsAdded,
        result.threadsResolved,
        getMaxIdNumber(context.parentAccumulatedActiveState.openThreads, 'td')
      );

  const accumulatedPromises = computeAccumulatedPromises(
    isOpening ? [] : context.parentAccumulatedPromises,
    isOpening ? [] : context.analystPromisesResolved,
    isOpening ? [] : context.analystPromisesDetected,
    getMaxPromiseIdNumber(isOpening ? [] : context.parentAccumulatedPromises)
  );

  const resolvedThreadMeta = buildResolvedThreadMeta(
    result.threadsResolved,
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
    activeStateChanges: mapToActiveStateChanges(result),
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
