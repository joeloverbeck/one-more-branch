/**
 * State management module barrel export.
 * Re-exports all state-related types and functions from individual modules.
 */

// General state
export {
  StateChange,
  StateChanges,
  AccumulatedState,
  createEmptyAccumulatedState,
  createEmptyStateChanges,
  applyStateChanges,
  accumulateState,
} from './general-state.js';

// Canon
export { CanonFact, GlobalCanon, addCanonFact, mergeCanonFacts } from './canon.js';

// Character canon
export {
  CharacterCanonFact,
  CharacterCanon,
  GlobalCharacterCanon,
} from './character-canon.js';

// Inventory
export {
  InventoryItem,
  Inventory,
  InventoryChanges,
  createEmptyInventoryChanges,
  applyInventoryChanges,
} from './inventory.js';

// Health
export {
  HealthEntry,
  Health,
  HealthChanges,
  createEmptyHealthChanges,
  applyHealthChanges,
} from './health.js';

// Character state
export {
  CharacterStateEntry,
  CharacterState,
  SingleCharacterStateChanges,
  CharacterStateChanges,
  AccumulatedCharacterState,
  createEmptyCharacterStateChanges,
  createEmptyAccumulatedCharacterState,
  applyCharacterStateChanges,
} from './character-state.js';
