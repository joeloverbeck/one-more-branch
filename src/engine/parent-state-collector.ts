import {
  AccumulatedCharacterState,
  AccumulatedState,
  AccumulatedStructureState,
  Health,
  Inventory,
  Page,
} from '../models';
import { getParentAccumulatedCharacterState } from './character-state-manager';
import { getParentAccumulatedHealth } from './health-manager';
import { getParentAccumulatedInventory } from './inventory-manager';
import { getParentAccumulatedState } from './state-manager';

/**
 * Contains all accumulated state from a parent page.
 * Used as context for building continuation pages.
 */
export interface CollectedParentState {
  readonly accumulatedState: AccumulatedState;
  readonly accumulatedInventory: Inventory;
  readonly accumulatedHealth: Health;
  readonly accumulatedCharacterState: AccumulatedCharacterState;
  readonly structureState: AccumulatedStructureState;
}

/**
 * Collects all accumulated state from a parent page.
 * Aggregates state, inventory, health, character state, and structure state.
 */
export function collectParentState(parentPage: Page): CollectedParentState {
  return {
    accumulatedState: getParentAccumulatedState(parentPage),
    accumulatedInventory: getParentAccumulatedInventory(parentPage),
    accumulatedHealth: getParentAccumulatedHealth(parentPage),
    accumulatedCharacterState: getParentAccumulatedCharacterState(parentPage),
    structureState: parentPage.accumulatedStructureState,
  };
}
