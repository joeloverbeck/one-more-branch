import {
  AccumulatedCharacterState,
  AccumulatedStructureState,
  ActiveState,
  ActiveStateChanges,
  createChoice,
  createEmptyAccumulatedStructureState,
  createPage,
  Health,
  Inventory,
  Page,
  PageId,
  parsePageId,
  StructureVersionId,
} from '../models';
import type { PageWriterResult } from '../llm/types';
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
 * Context for building the first page of a story.
 * Contains the initial structure state and version.
 */
export interface FirstPageBuildContext {
  readonly structureState: AccumulatedStructureState;
  readonly structureVersionId: StructureVersionId | null;
}

/**
 * Context for building a continuation page.
 * Contains page ID, parent linkage, and all accumulated state from parent.
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
    threadsAdded: result.threadsAdded.map(thread => ({
      text: thread.text,
      threadType: thread.threadType,
      urgency: thread.urgency,
    })),
    threadsResolved: result.threadsResolved,
  };
}

/**
 * Builds the first page of a story from LLM generation result.
 * Handles page assembly with initial structure state.
 */
export function buildFirstPage(
  result: PageBuildResult,
  context: FirstPageBuildContext,
): Page {
  return createPage({
    id: parsePageId(1),
    narrativeText: result.narrative,
    sceneSummary: result.sceneSummary,
    choices: result.choices.map(c => createChoice(c.text, null, c.choiceType, c.primaryDelta)),
    activeStateChanges: mapToActiveStateChanges(result),
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    healthChanges: createHealthChanges(result.healthAdded, result.healthRemoved),
    characterStateChanges: createCharacterStateChanges(
      result.characterStateChangesAdded,
      result.characterStateChangesRemoved,
    ),
    protagonistAffect: result.protagonistAffect,
    isEnding: result.isEnding,
    parentPageId: null,
    parentChoiceIndex: null,
    parentAccumulatedStructureState: context.structureState,
    structureVersionId: context.structureVersionId,
  });
}

/**
 * Builds a continuation page from LLM generation result.
 * Handles page assembly with parent state inheritance.
 */
export function buildContinuationPage(
  result: PageBuildResult,
  context: ContinuationPageBuildContext,
): Page {
  return createPage({
    id: context.pageId,
    narrativeText: result.narrative,
    sceneSummary: result.sceneSummary,
    choices: result.choices.map(c => createChoice(c.text, null, c.choiceType, c.primaryDelta)),
    activeStateChanges: mapToActiveStateChanges(result),
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    healthChanges: createHealthChanges(result.healthAdded, result.healthRemoved),
    characterStateChanges: createCharacterStateChanges(
      result.characterStateChangesAdded,
      result.characterStateChangesRemoved,
    ),
    protagonistAffect: result.protagonistAffect,
    isEnding: result.isEnding,
    parentPageId: context.parentPageId,
    parentChoiceIndex: context.parentChoiceIndex,
    parentAccumulatedActiveState: context.parentAccumulatedActiveState,
    parentAccumulatedInventory: context.parentAccumulatedInventory,
    parentAccumulatedHealth: context.parentAccumulatedHealth,
    parentAccumulatedCharacterState: context.parentAccumulatedCharacterState,
    parentAccumulatedStructureState: context.structureState,
    structureVersionId: context.structureVersionId,
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
