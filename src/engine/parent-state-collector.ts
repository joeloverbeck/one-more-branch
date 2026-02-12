import {
  AccumulatedCharacterState,
  AccumulatedStructureState,
  ActiveState,
  Health,
  Inventory,
  Page,
} from '../models';
import { getParentAccumulatedCharacterState } from './character-state-manager';
import { getParentAccumulatedHealth } from './health-manager';
import { getParentAccumulatedInventory } from './inventory-manager';
import type { StateReconciliationPreviousState } from './state-reconciler-types';

/**
 * Contains all accumulated state from a parent page.
 * Used as context for building continuation pages.
 */
export interface CollectedParentState {
  readonly accumulatedActiveState: ActiveState;
  readonly accumulatedInventory: Inventory;
  readonly accumulatedHealth: Health;
  readonly accumulatedCharacterState: AccumulatedCharacterState;
  readonly structureState: AccumulatedStructureState;
}

/**
 * Collects all accumulated state from a parent page.
 * Aggregates inventory, health, character state, structure state, and active state.
 */
export function collectParentState(parentPage: Page): CollectedParentState {
  return {
    accumulatedActiveState: parentPage.accumulatedActiveState,
    accumulatedInventory: getParentAccumulatedInventory(parentPage),
    accumulatedHealth: getParentAccumulatedHealth(parentPage),
    accumulatedCharacterState: getParentAccumulatedCharacterState(parentPage),
    structureState: parentPage.accumulatedStructureState,
  };
}

/**
 * Creates an empty previous state snapshot for opening page generation.
 * No prior state exists for the first page.
 */
export function createOpeningPreviousStateSnapshot(): StateReconciliationPreviousState {
  return {
    currentLocation: '',
    threats: [],
    constraints: [],
    threads: [],
    inventory: [],
    health: [],
    characterState: [],
  };
}

/**
 * Maps collected parent state into the shape expected by the state reconciler.
 */
export function createContinuationPreviousStateSnapshot(
  parentState: CollectedParentState,
): StateReconciliationPreviousState {
  return {
    currentLocation: parentState.accumulatedActiveState.currentLocation,
    threats: parentState.accumulatedActiveState.activeThreats,
    constraints: parentState.accumulatedActiveState.activeConstraints,
    threads: parentState.accumulatedActiveState.openThreads,
    inventory: parentState.accumulatedInventory,
    health: parentState.accumulatedHealth,
    characterState: Object.values(parentState.accumulatedCharacterState).flatMap(entries => entries),
  };
}
