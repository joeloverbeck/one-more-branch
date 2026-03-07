import {
  AccumulatedCharacterState,
  AccumulatedStructureState,
  ActiveState,
  createChoice,
  createEmptyAccumulatedStructureState,
  createPage,
  Health,
  Inventory,
  Page,
  PageId,
  parsePageId,
  StructureVersionId,
  type DelayedConsequence,
} from '../models';
import {
  applyTriggeredDelayedConsequences,
  incrementDelayedConsequenceAges,
} from './consequence-lifecycle.js';
import type { TrackedPromise } from '../models/state/index.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { NpcRelationship, AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import { createEmptyAccumulatedNpcRelationships } from '../models/state/npc-relationship';
import type { KnowledgeAsymmetry } from '../models/state/knowledge-state.js';
import type { AnalystResult, DetectedPromise } from '../llm/analyst-types';
import type { DelayedConsequenceDraft } from '../llm/writer-types';
import type { StoryBible } from '../llm/lorekeeper-types';
import { createCharacterStateChanges } from './character-state-manager';
import { createHealthChanges } from './health-manager';
import { createInventoryChanges } from './inventory-manager';
import { computeNarrativeStateLifecycle } from './state-lifecycle';
import { computeAccumulatedKnowledgeState } from './state-lifecycle';
import type { PageBuildResult } from './state-change-mapper';
import { mapToActiveStateChanges } from './state-change-mapper';

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
  readonly parentPromiseAgeEpoch: number;
  readonly parentAccumulatedPromises: readonly TrackedPromise[];
  readonly parentAccumulatedDelayedConsequences: readonly DelayedConsequence[];
  readonly parentAccumulatedKnowledgeState: readonly KnowledgeAsymmetry[];
  readonly parentAccumulatedFulfilledPremisePromises: readonly string[];
  readonly analystPromisesDetected: readonly DetectedPromise[];
  readonly analystPromisesResolved: readonly string[];
  readonly analystPremisePromiseFulfilled: string | null;
  readonly storyPremisePromises?: readonly string[];
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
  readonly parentPromiseAgeEpoch?: number;
  readonly parentAccumulatedPromises: readonly TrackedPromise[];
  readonly parentAccumulatedDelayedConsequences?: readonly DelayedConsequence[];
  readonly parentAccumulatedKnowledgeState?: readonly KnowledgeAsymmetry[];
  readonly parentAccumulatedFulfilledPremisePromises?: readonly string[];
  readonly analystPromisesDetected: readonly DetectedPromise[];
  readonly analystPromisesResolved: readonly string[];
  readonly analystPremisePromiseFulfilled?: string | null;
  readonly parentAccumulatedNpcAgendas?: AccumulatedNpcAgendas;
  readonly npcAgendaUpdates?: readonly NpcAgenda[];
}

/**
 * Builds any page (opening or continuation) from LLM generation result.
 */
export function buildPage(result: PageBuildResult, context: PageBuildContext): Page {
  const isOpening = context.parentPageId === null;
  const currentPromiseAgeEpoch = isOpening ? 0 : (context.parentPromiseAgeEpoch ?? 0) + 1;
  const lifecycle = computeNarrativeStateLifecycle({
    isOpening,
    parentOpenThreads: context.parentAccumulatedActiveState.openThreads,
    parentThreadAges: context.parentThreadAges,
    parentPromiseAgeEpoch: context.parentPromiseAgeEpoch,
    currentPromiseAgeEpoch,
    parentAccumulatedPromises: context.parentAccumulatedPromises,
    parentAccumulatedFulfilledPremisePromises: context.parentAccumulatedFulfilledPremisePromises,
    threadsAdded: result.threadsAdded,
    threadsResolved: result.threadsResolved,
    analystResult: context.analystResult,
    analystPromisesDetected: context.analystPromisesDetected,
    analystPromisesResolved: context.analystPromisesResolved,
    analystPremisePromiseFulfilled: context.analystPremisePromiseFulfilled,
    canonicalPremisePromises: context.storyPremisePromises ?? [],
  });
  const agedDelayedConsequences = incrementDelayedConsequenceAges(
    context.parentAccumulatedDelayedConsequences ?? []
  );
  const accumulatedKnowledgeState = computeAccumulatedKnowledgeState({
    parentAccumulatedKnowledgeState: context.parentAccumulatedKnowledgeState ?? [],
    detectedKnowledgeAsymmetry: context.analystResult?.knowledgeAsymmetryDetected ?? [],
  });
  const triggeredDelayedConsequences = applyTriggeredDelayedConsequences(
    agedDelayedConsequences,
    context.analystResult?.delayedConsequencesTriggered ?? []
  );
  const pendingDelayedConsequences = triggeredDelayedConsequences.filter(
    (consequence) => !consequence.triggered
  );
  const createdDelayedConsequences = materializeDelayedConsequenceDrafts(
    context.analystResult?.delayedConsequencesCreated ?? [],
    context.pageId,
    getMaxDelayedConsequenceIdNumber(triggeredDelayedConsequences)
  );

  return createPage({
    id: context.pageId,
    narrativeText: result.narrative,
    sceneSummary: result.sceneSummary,
    choices: result.choices.map((c) =>
      createChoice(c.text, null, c.choiceType, c.primaryDelta, c.choiceSubtype, c.choiceShape)
    ),
    activeStateChanges: mapToActiveStateChanges(result, lifecycle.effectiveThreadsResolved),
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
    threadAges: lifecycle.threadAges,
    promiseAgeEpoch: currentPromiseAgeEpoch,
    parentPromiseAgeEpoch: isOpening ? undefined : context.parentPromiseAgeEpoch,
    accumulatedPromises: lifecycle.accumulatedPromises,
    accumulatedDelayedConsequences: [...pendingDelayedConsequences, ...createdDelayedConsequences],
    accumulatedKnowledgeState,
    accumulatedFulfilledPremisePromises: lifecycle.accumulatedFulfilledPremisePromises,
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
    parentPromiseAgeEpoch: 0,
    parentAccumulatedPromises: [],
    parentAccumulatedDelayedConsequences: [],
    parentAccumulatedKnowledgeState: [],
    parentAccumulatedFulfilledPremisePromises: [],
    analystPromisesDetected: [],
    analystPromisesResolved: [],
    analystPremisePromiseFulfilled: null,
    storyPremisePromises: [],
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
    parentPromiseAgeEpoch: context.parentPromiseAgeEpoch ?? 0,
    parentAccumulatedPromises: context.parentAccumulatedPromises,
    parentAccumulatedDelayedConsequences: context.parentAccumulatedDelayedConsequences ?? [],
    parentAccumulatedKnowledgeState: context.parentAccumulatedKnowledgeState ?? [],
    parentAccumulatedFulfilledPremisePromises:
      context.parentAccumulatedFulfilledPremisePromises ?? [],
    analystPromisesDetected: context.analystPromisesDetected,
    analystPromisesResolved: context.analystPromisesResolved,
    analystPremisePromiseFulfilled: context.analystPremisePromiseFulfilled ?? null,
    storyPremisePromises: [],
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

function getMaxDelayedConsequenceIdNumber(
  consequences: readonly DelayedConsequence[]
): number {
  let maxId = 0;
  for (const consequence of consequences) {
    const match = /^dc-(\d+)$/.exec(consequence.id);
    const numericId = match?.[1] ? Number.parseInt(match[1], 10) : NaN;
    if (Number.isFinite(numericId) && numericId > maxId) {
      maxId = numericId;
    }
  }
  return maxId;
}

function materializeDelayedConsequenceDrafts(
  drafts: readonly DelayedConsequenceDraft[],
  sourcePageId: PageId,
  currentMaxId: number
): readonly DelayedConsequence[] {
  return drafts.map((draft, index) => ({
    id: `dc-${currentMaxId + index + 1}`,
    description: draft.description,
    triggerCondition: draft.triggerCondition,
    minPagesDelay: draft.minPagesDelay,
    maxPagesDelay: draft.maxPagesDelay,
    currentAge: 0,
    triggered: false,
    sourcePageId,
  }));
}
