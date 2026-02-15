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
  ChoiceType,
  PrimaryDelta,
  CHOICE_TYPE_VALUES,
  PRIMARY_DELTA_VALUES,
  CHOICE_TYPE_COLORS,
  PRIMARY_DELTA_LABELS,
} from './choice-enums';

export {
  CanonFact,
  TaggedCanonFact,
  GlobalCanon,
  WorldFactType,
  CharacterCanonFact,
  CharacterCanon,
  GlobalCharacterCanon,
  Inventory,
  InventoryChanges,
  Health,
  HealthChanges,
  CharacterState,
  CharacterStateAddition,
  CharacterStateChanges,
  AccumulatedCharacterState,
  KeyedEntry,
  ThreatEntry,
  ConstraintEntry,
  ThreadEntry,
  ThreatType,
  ConstraintType,
  ThreadType,
  Urgency,
  PromiseType,
  PROMISE_TYPE_VALUES,
  StateIdPrefix,
  isThreatType,
  isConstraintType,
  isThreadType,
  isUrgency,
  isPromiseType,
  isTrackedPromise,
  extractIdNumber,
  getMaxIdNumber,
  nextId,
  assignIds,
  removeByIds,
  ActiveState,
  ActiveStateChanges,
  ThreatAddition,
  ConstraintAddition,
  addCanonFact,
  mergeCanonFacts,
  createEmptyInventoryChanges,
  applyInventoryChanges,
  createEmptyHealthChanges,
  applyHealthChanges,
  createEmptyCharacterStateChanges,
  createEmptyAccumulatedCharacterState,
  applyCharacterStateChanges,
  applyActiveStateChanges,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  isActiveState,
  isActiveStateChanges,
  NpcAgenda,
  AccumulatedNpcAgendas,
  createEmptyAccumulatedNpcAgendas,
  applyAgendaUpdates,
} from './state/index.js';

export type { TrackedPromise, PromisePayoffAssessment } from './state/index.js';

export { normalizeCharacterName, normalizeForComparison } from './normalize.js';

export {
  BeatStatus,
  BeatRole,
  PacingBudget,
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

export { ProtagonistGuidance, isProtagonistGuidanceEmpty } from './protagonist-guidance';

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

export { Npc, formatNpcsForPrompt, isNpcArray } from './npc';

export { setModelLogger, getModelLogger, modelWarn } from './model-logger';

export type { SpeechFingerprint, DecomposedCharacter } from './decomposed-character';
export {
  formatDecomposedCharacterForPrompt,
  formatSpeechFingerprintForWriter,
} from './decomposed-character';

export type { WorldFactDomain, WorldFact, DecomposedWorld } from './decomposed-world';
export { formatDecomposedWorldForPrompt } from './decomposed-world';
