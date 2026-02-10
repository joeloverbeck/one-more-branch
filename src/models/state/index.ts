/**
 * State management module barrel export.
 * Re-exports all state-related types and functions from individual modules.
 */

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
  Inventory,
  InventoryChanges,
  createEmptyInventoryChanges,
  applyInventoryChanges,
} from './inventory.js';

// Health
export {
  Health,
  HealthChanges,
  createEmptyHealthChanges,
  applyHealthChanges,
} from './health.js';

// Character state
export {
  CharacterState,
  CharacterStateAddition,
  CharacterStateChanges,
  AccumulatedCharacterState,
  createEmptyCharacterStateChanges,
  createEmptyAccumulatedCharacterState,
  applyCharacterStateChanges,
} from './character-state.js';

// Keyed state entries
export {
  KeyedEntry,
  ThreadEntry,
  ThreadType,
  Urgency,
  StateIdPrefix,
  isThreadType,
  isUrgency,
  extractIdNumber,
  getMaxIdNumber,
  nextId,
  assignIds,
  removeByIds,
} from './keyed-entry.js';

// Active state
export {
  ActiveState,
  ActiveStateChanges,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  isActiveState,
  isActiveStateChanges,
} from './active-state.js';

export { applyActiveStateChanges } from './active-state-apply.js';
