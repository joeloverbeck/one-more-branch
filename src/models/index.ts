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
  ChoiceShape,
  CHOICE_TYPE_VALUES,
  PRIMARY_DELTA_VALUES,
  CHOICE_SHAPE_VALUES,
  CHOICE_TYPE_COLORS,
  PRIMARY_DELTA_LABELS,
  CHOICE_SHAPE_LABELS,
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
  isDelayedConsequence,
  isKnowledgeAsymmetry,
  isTrackedPromise,
  extractIdNumber,
  getMaxIdNumber,
  nextId,
  assignIds,
  computePromiseAge,
  removeByIds,
  withPromiseAge,
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

export type {
  TrackedPromise,
  AgedTrackedPromise,
  PromisePayoffAssessment,
  DelayedConsequence,
  KnowledgeAsymmetry,
} from './state/index.js';

export { normalizeCharacterName, normalizeForComparison } from './normalize.js';

export {
  ApproachVector,
  BeatStatus,
  BeatRole,
  ESCALATION_TYPES,
  CRISIS_TYPES,
  APPROACH_VECTORS,
  EscalationType,
  CrisisType,
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
export type {
  GeneratedBeat,
  GeneratedAct,
  StructureGenerationResult,
} from './structure-generation';

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

export type {
  StorySpineType,
  ConflictType,
  CharacterArcType,
  NeedWantDynamic,
  ProtagonistNeedVsWant,
  PrimaryAntagonisticForce,
  StorySpine,
} from './story-spine';
export {
  STORY_SPINE_TYPE_VALUES,
  CONFLICT_TYPE_VALUES,
  CHARACTER_ARC_TYPE_VALUES,
  NEED_WANT_DYNAMIC_VALUES,
  isStorySpineType,
  isConflictType,
  isCharacterArcType,
  isNeedWantDynamic,
} from './story-spine';

export type { SpeechFingerprint, DecomposedCharacter } from './decomposed-character';
export {
  formatDecomposedCharacterForPrompt,
  formatSpeechFingerprintForWriter,
} from './decomposed-character';

export type { WorldFactDomain, WorldFact, DecomposedWorld } from './decomposed-world';
export { formatDecomposedWorldForPrompt } from './decomposed-world';

export type {
  GenreFrame,
  ConflictAxis,
  SettingScale,
  DriftRiskMitigationType,
  ConceptSeedInput,
  ConceptSpec,
  ConceptSeedFields,
  ConceptCharacterWorldFields,
  ConceptEngineFields,
  ConceptSeederContext,
  ConceptSeederResult,
  ConceptEvolverSeederContext,
  ConceptEvolverSeederResult,
  ConceptArchitectContext,
  ConceptArchitectResult,
  ConceptEngineerContext,
  ConceptEngineerResult,
  ConceptDimensionScores,
  ConceptScoreEvidence,
  ScoredConcept,
  EvaluatedConcept,
  ConceptContext,
  DriftRisk,
  PlayerBreak,
  ConceptIdeatorContext,
  ConceptIdeationResult,
  ConceptEvolverContext,
  ConceptEvolutionResult,
  ConceptEvaluatorContext,
  ConceptEvaluationResult,
  ConceptStressTesterContext,
  ConceptStressTestResult,
  LoadBearingCheck,
  KernelFidelityCheck,
  ConceptVerification,
  ConceptVerifierContext,
  ConceptVerificationResult,
} from './concept-generator';
export {
  GENRE_FRAMES,
  CONFLICT_AXES,
  SETTING_SCALES,
  DRIFT_RISK_MITIGATION_TYPES,
  CONCEPT_VERIFICATION_CONSTRAINTS,
  CONCEPT_SCORING_WEIGHTS,
  CONCEPT_PASS_THRESHOLDS,
  MIN_UNBANNED_GENRES,
  isGenreFrame,
  isConflictAxis,
  isSettingScale,
  isDriftRiskMitigationType,
  isConceptSpec,
  computeOverallScore,
  passesConceptThresholds,
  filterGenreFrames,
} from './concept-generator';
export {
  GENRE_OBLIGATION_TAGS_BY_GENRE,
  isGenreObligationTag,
  getGenreObligationTags,
} from './genre-obligations';
export type {
  GenreObligationTagsByGenre,
  GenreObligationTag,
  GenreObligationEntry,
} from './genre-obligations';
export {
  GENRE_CONVENTIONS_BY_GENRE,
  isGenreConventionTag,
  getGenreConventions,
} from './genre-conventions';
export type {
  GenreConventionEntry,
  GenreConventionsByGenre,
  GenreConventionTag,
} from './genre-conventions';

export type {
  DirectionOfChange,
  DramaticStance,
  StoryKernel,
  KernelSeedInput,
  KernelIdeatorContext,
  KernelIdeationResult,
  KernelEvaluatorContext,
  KernelEvolverContext,
  KernelEvolverUserSeeds,
  KernelEvolutionResult,
  KernelDimensionScores,
  KernelScoreEvidence,
  ScoredKernel,
  EvaluatedKernel,
  KernelEvaluationResult,
} from './story-kernel';
export {
  DIRECTION_OF_CHANGE_VALUES,
  DRAMATIC_STANCE_VALUES,
  KERNEL_SCORING_WEIGHTS,
  KERNEL_PASS_THRESHOLDS,
  isDirectionOfChange,
  isDramaticStance,
  isStoryKernel,
  computeKernelOverallScore,
  passesKernelThresholds,
} from './story-kernel';

export type { ConceptSeeds, SavedConcept, GeneratedConceptBatch } from './saved-concept';
export { isSavedConcept, isGeneratedConceptBatch } from './saved-concept';
export type { ConceptSeed } from './concept-seed';
export { isConceptSeed, parseConceptSeedEntity } from './concept-seed';

export type { SavedKernel, GeneratedKernelBatch } from './saved-kernel';
export { isSavedKernel, isGeneratedKernelBatch } from './saved-kernel';

export type {
  ScenePurpose,
  ValuePolarityShift,
  PacingMode,
} from './scene-direction-taxonomy';
export {
  SCENE_PURPOSE_VALUES,
  VALUE_POLARITY_SHIFT_VALUES,
  PACING_MODE_VALUES,
  isScenePurpose,
  isValuePolarityShift,
  isPacingMode,
  SCENE_PURPOSE_LABELS,
  VALUE_POLARITY_SHIFT_LABELS,
  PACING_MODE_LABELS,
} from './scene-direction-taxonomy';

export type { SceneDirectionOption, SelectedSceneDirection } from './scene-direction';

export type {
  ContentKind,
  ContentPacketRole,
  RiskAppetite,
  TasteProfile,
  ContentSpark,
  ContentPacket,
  ContentEvaluationScores,
  ContentEvaluation,
} from './content-packet';
export {
  CONTENT_KIND_VALUES,
  CONTENT_PACKET_ROLE_VALUES,
  RISK_APPETITE_VALUES,
  isContentKind,
  isContentPacketRole,
  isRiskAppetite,
} from './content-packet';

export type { SavedContentPacket, SavedTasteProfile } from './saved-content-packet';
export { isSavedContentPacket, isSavedTasteProfile } from './saved-content-packet';
