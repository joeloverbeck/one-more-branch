export { StoryEngine, storyEngine } from './story-engine';

export {
  startNewStory,
  loadStory,
  getPage,
  getStartingPage,
  listAllStories,
  deleteStory,
  getStoryStats,
} from './story-service';

export { generateFirstPage, generateNextPage, getOrGeneratePage } from './page-service';

// NPC agenda resolution pipeline
export { resolveNpcAgendas } from './npc-agenda-pipeline';
export type { NpcAgendaContext } from './npc-agenda-pipeline';

// Lorekeeper + writer pipeline
export { createContinuationWriterWithLorekeeper } from './lorekeeper-writer-pipeline';
export type { LorekeeperWriterContext } from './lorekeeper-writer-pipeline';

// Ancestor context collection
export { collectAncestorContext } from './ancestor-collector';
export type { AncestorContext } from './ancestor-collector';

// Page building
export { buildFirstPage, buildContinuationPage, createEmptyStructureContext } from './page-builder';
export type { FirstPageBuildContext, ContinuationPageBuildContext } from './page-builder';

// Structure version validation
export {
  validateFirstPageStructureVersion,
  validateContinuationStructureVersion,
  resolveActiveStructureVersion,
} from './structure-version-validator';

// Parent state collection
export {
  collectParentState,
  createOpeningPreviousStateSnapshot,
  createContinuationPreviousStateSnapshot,
} from './parent-state-collector';
export type { CollectedParentState } from './parent-state-collector';

// Continuation context assembly
export { buildContinuationContext, buildRemovableIds } from './continuation-context-builder';

// Deviation handling
export { isActualDeviation, handleDeviation } from './deviation-handler';
export type { DeviationContext, DeviationHandlingResult } from './deviation-handler';

// Structure types
export type { StructureProgressionResult, StructureGenerationResult } from './structure-types';

// Beat utilities
export { parseBeatIndices, getBeatOrThrow, upsertBeatProgression } from './beat-utils';

// Structure factory
export { createStoryStructure } from './structure-factory';

// Structure state machine
export {
  createInitialStructureState,
  advanceStructureState,
  applyStructureProgression,
} from './structure-state';

// Structure rewrite support
export {
  extractCompletedBeats,
  buildRewriteContext,
  getPreservedBeatIds,
  validatePreservedBeats,
} from './structure-rewrite-support';
export { createStructureRewriter, mergePreservedWithRegenerated } from './structure-rewriter';
export type { StructureRewriter, StructureRewriteGenerator } from './structure-rewriter';

// State reconciler contracts
export type {
  StateReconciliationDiagnostic,
  ReconciledThreadAdd,
  ReconciledCharacterStateAdd,
  StateReconciliationResult,
} from './state-reconciler-types';
export { StateReconciliationError } from './state-reconciler-errors';
export type {
  StateReconciliationErrorCode,
  StateReconciliationFailure,
} from './state-reconciler-errors';

export {
  updateStoryWithNewCanon,
  updateStoryWithNewCharacterCanon,
  updateStoryWithAllCanon,
  formatCanonForPrompt,
  mightContradictCanon,
  validateNewFacts,
} from './canon-manager';

export {
  normalizeCharacterName,
  addCharacterFact,
  mergeCharacterCanonFacts,
  getCharacterFacts,
  formatCharacterCanonForPrompt,
} from './character-canon-manager';

export {
  normalizeItemName,
  addInventoryItem,
  removeInventoryItem,
  applyInventoryChanges,
  formatInventoryForPrompt,
  createInventoryChanges,
  hasInventoryItem,
  countInventoryItem,
  getParentAccumulatedInventory,
  createEmptyInventoryChanges,
} from './inventory-manager';

export {
  normalizeHealthEntry,
  addHealthEntry,
  removeHealthEntry,
  applyHealthChanges,
  formatHealthForPrompt,
  createHealthChanges,
  hasHealthCondition,
  getParentAccumulatedHealth,
  createEmptyHealthChanges,
} from './health-manager';

export {
  normalizeCharacterNameForState,
  createCharacterStateChanges,
  applyCharacterStateChanges,
  formatCharacterStateForPrompt,
  getCharacterState,
  hasCharacterState,
  getParentAccumulatedCharacterState,
  createEmptyAccumulatedCharacterState,
} from './character-state-manager';

export { EngineError } from './types';
export type {
  GenerationStage,
  GenerationStageStatus,
  GenerationStageEvent,
  GenerationStageCallback,
  StartStoryResult,
  MakeChoiceResult,
  PlaySession,
  StartStoryOptions,
  MakeChoiceOptions,
  EngineErrorCode,
} from './types';
