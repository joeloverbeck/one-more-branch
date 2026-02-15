/**
 * State management module barrel export.
 * Re-exports all state-related types and functions from individual modules.
 */

// Canon
export {
  CanonFact,
  TaggedCanonFact,
  GlobalCanon,
  WorldFactType,
  isTaggedCanonFact,
  canonFactText,
  canonFactType,
  addCanonFact,
  mergeCanonFacts,
} from './canon.js';

// Character canon
export { CharacterCanonFact, CharacterCanon, GlobalCharacterCanon } from './character-canon.js';

// Inventory
export {
  Inventory,
  InventoryChanges,
  createEmptyInventoryChanges,
  applyInventoryChanges,
} from './inventory.js';

// Health
export { Health, HealthChanges, createEmptyHealthChanges, applyHealthChanges } from './health.js';

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
  ThreatEntry,
  ConstraintEntry,
  ThreadEntry,
  ThreatType,
  ConstraintType,
  ThreadType,
  Urgency,
  StateIdPrefix,
  isThreatType,
  isConstraintType,
  isThreadType,
  isUrgency,
  isTrackedPromise,
  extractIdNumber,
  getMaxIdNumber,
  nextId,
  assignIds,
  removeByIds,
} from './keyed-entry.js';

// Narrative promise types
export {
  PromiseType,
  PROMISE_TYPE_VALUES,
  isPromiseType,
} from './keyed-entry.js';

export type {
  TrackedPromise,
  SatisfactionLevel,
  ThreadPayoffAssessment,
  PromisePayoffAssessment,
} from './keyed-entry.js';

// Active state
export {
  ActiveState,
  ActiveStateChanges,
  ThreatAddition,
  ConstraintAddition,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  isActiveState,
  isActiveStateChanges,
} from './active-state.js';

export { applyActiveStateChanges } from './active-state-apply.js';

// NPC agendas
export {
  NpcAgenda,
  AccumulatedNpcAgendas,
  createEmptyAccumulatedNpcAgendas,
  applyAgendaUpdates,
} from './npc-agenda.js';

// NPC relationships
export {
  NpcRelationship,
  AccumulatedNpcRelationships,
  createEmptyAccumulatedNpcRelationships,
  applyRelationshipUpdates,
  buildInitialNpcRelationships,
} from './npc-relationship.js';
