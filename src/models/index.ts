export {
  StoryId,
  PageId,
  ChoiceIndex,
  generateStoryId,
  generatePageId,
  isStoryId,
  isPageId,
  parseStoryId,
  parsePageId,
} from './id';

export { Choice, createChoice, isChoice, isChoiceExplored } from './choice';

export {
  StateChange,
  StateChanges,
  CanonFact,
  GlobalCanon,
  CharacterCanonFact,
  CharacterCanon,
  GlobalCharacterCanon,
  AccumulatedState,
  InventoryItem,
  Inventory,
  InventoryChanges,
  HealthEntry,
  Health,
  HealthChanges,
  CharacterStateEntry,
  CharacterState,
  SingleCharacterStateChanges,
  CharacterStateChanges,
  AccumulatedCharacterState,
  ActiveState,
  ActiveStateChanges,
  createEmptyAccumulatedState,
  createEmptyStateChanges,
  accumulateState,
  applyStateChanges,
  addCanonFact,
  mergeCanonFacts,
  createEmptyInventoryChanges,
  applyInventoryChanges,
  createEmptyHealthChanges,
  applyHealthChanges,
  createEmptyCharacterStateChanges,
  createEmptyAccumulatedCharacterState,
  applyCharacterStateChanges,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  isActiveState,
  isActiveStateChanges,
} from './state/index.js';

export { normalizeCharacterName, normalizeForComparison } from './normalize.js';

export {
  BeatStatus,
  StoryBeat,
  StoryAct,
  StoryStructure,
  BeatProgression,
  AccumulatedStructureState,
  BeatDeviation,
  NoDeviation,
  DeviationResult,
  createEmptyAccumulatedStructureState,
  getCurrentAct,
  getCurrentBeat,
  getBeatProgression,
  isLastBeatOfAct,
  isLastAct,
  isDeviation,
  isNoDeviation,
  createBeatDeviation,
  createNoDeviation,
  validateDeviationTargets,
} from './story-arc';

export {
  StructureVersionId,
  VersionedStoryStructure,
  createStructureVersionId,
  isStructureVersionId,
  parseStructureVersionId,
  createInitialVersionedStructure,
  createRewrittenVersionedStructure,
  isVersionedStoryStructure,
} from './structure-version';

export {
  EmotionIntensity,
  SecondaryEmotion,
  ProtagonistAffect,
  isEmotionIntensity,
  isSecondaryEmotion,
  isProtagonistAffect,
  createDefaultProtagonistAffect,
  formatProtagonistAffect,
} from './protagonist-affect';

export {
  Page,
  CreatePageData,
  createPage,
  isPage,
  isPageFullyExplored,
  getUnexploredChoiceIndices,
} from './page';

export {
  Story,
  StoryTone,
  StoryMetadata,
  CreateStoryData,
  createStory,
  isStory,
  isStoryStructure,
  getLatestStructureVersion,
  getStructureVersion,
  addStructureVersion,
  updateStoryCanon,
  updateStoryStructure,
} from './story';

export {
  ValidationResult,
  validateStory,
  validatePage,
  validateNoCycle,
  validateStoryIntegrity,
} from './validation';

export { setModelLogger, getModelLogger, modelWarn } from './model-logger';
