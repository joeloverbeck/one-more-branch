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

export {
  createStoryStructure,
  createInitialStructureState,
  advanceStructureState,
  applyStructureProgression,
} from './structure-manager';
export type { StructureProgressionResult, StructureGenerationResult } from './structure-manager';

export {
  computeAccumulatedState,
  getParentAccumulatedState,
  mergeStateChanges,
  formatStateForDisplay,
  getRecentChanges,
} from './state-manager';

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
  StartStoryResult,
  MakeChoiceResult,
  PlaySession,
  StartStoryOptions,
  MakeChoiceOptions,
  EngineErrorCode,
} from './types';
