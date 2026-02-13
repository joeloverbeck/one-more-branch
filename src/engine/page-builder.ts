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
} from '../models';
import type { NarrativePromise } from '../models/state/keyed-entry';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { AnalystResult } from '../llm/analyst-types';
import type { StoryBible } from '../llm/lorekeeper-types';
import type { PageWriterResult } from '../llm/writer-types';
import type { StateReconciliationResult } from './state-reconciler-types';
import { createCharacterStateChanges } from './character-state-manager';
import { createHealthChanges } from './health-manager';
import { createInventoryChanges } from './inventory-manager';
import { THREAD_PACING } from '../config/thread-pacing-config.js';

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
  readonly parentInheritedNarrativePromises: readonly NarrativePromise[];
  readonly parentAnalystNarrativePromises: readonly NarrativePromise[];
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
  readonly parentInheritedNarrativePromises: readonly NarrativePromise[];
  readonly parentAnalystNarrativePromises: readonly NarrativePromise[];
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
 * Computes inherited narrative promises for a continuation page.
 * Carries forward parent's inherited + parent's analyst-detected promises,
 * respecting the cap and age-out limits.
 */
export function computeInheritedNarrativePromises(
  parentInherited: readonly NarrativePromise[],
  parentAnalystDetected: readonly NarrativePromise[],
  threadsAddedTexts: readonly string[]
): readonly NarrativePromise[] {
  // Combine parent's inherited + parent's analyst-detected
  const combined = [...parentInherited, ...parentAnalystDetected];

  // Simple heuristic to detect if a promise "became" a thread:
  // if any newly added thread text contains substantial overlap with a promise description
  const threadTextsLower = threadsAddedTexts.map((t) => t.toLowerCase());
  const filtered = combined.filter((promise) => {
    const descLower = promise.description.toLowerCase();
    // Check if any new thread text has significant word overlap
    return !threadTextsLower.some((threadText) => {
      const promiseWords = descLower.split(/\s+/).filter((w) => w.length > 3);
      if (promiseWords.length === 0) return false;
      const matchCount = promiseWords.filter((word) => threadText.includes(word)).length;
      return matchCount / promiseWords.length >= 0.3;
    });
  });

  // Cap at max inherited promises (drop oldest = earliest in array)
  return filtered.slice(-THREAD_PACING.MAX_INHERITED_PROMISES);
}

/**
 * Maps WriterResult fields to ActiveStateChanges.
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
 * For opening pages (parentPageId === null): uses first-page thread ages, empty narrative promises.
 * For continuation pages: computes thread ages from parent, inherits narrative promises.
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

  const inheritedNarrativePromises = isOpening
    ? []
    : computeInheritedNarrativePromises(
        context.parentInheritedNarrativePromises,
        context.parentAnalystNarrativePromises,
        result.threadsAdded.map((t) => t.text)
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
    inheritedNarrativePromises,
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
    parentInheritedNarrativePromises: [],
    parentAnalystNarrativePromises: [],
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
    parentInheritedNarrativePromises: context.parentInheritedNarrativePromises,
    parentAnalystNarrativePromises: context.parentAnalystNarrativePromises,
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
