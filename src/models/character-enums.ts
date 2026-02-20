/**
 * Enum definitions for the character-building pipeline.
 *
 * These taxonomies constrain LLM generation at each pipeline stage,
 * ensuring consistent downstream behavior.
 */

export enum StoryFunction {
  ANTAGONIST = 'ANTAGONIST',
  RIVAL = 'RIVAL',
  ALLY = 'ALLY',
  MENTOR = 'MENTOR',
  CATALYST = 'CATALYST',
  OBSTACLE = 'OBSTACLE',
  FOIL = 'FOIL',
  TRICKSTER = 'TRICKSTER',
  INNOCENT = 'INNOCENT',
}

export enum CharacterDepth {
  FLAT = 'FLAT',
  ROUND = 'ROUND',
}

export enum ReplanningPolicy {
  NEVER = 'NEVER',
  ON_FAILURE = 'ON_FAILURE',
  ON_NEW_INFORMATION = 'ON_NEW_INFORMATION',
  PERIODIC = 'PERIODIC',
}

export enum EmotionSalience {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum PipelineRelationshipType {
  KIN = 'KIN',
  ALLY = 'ALLY',
  RIVAL = 'RIVAL',
  PATRON = 'PATRON',
  CLIENT = 'CLIENT',
  MENTOR = 'MENTOR',
  SUBORDINATE = 'SUBORDINATE',
  ROMANTIC = 'ROMANTIC',
  EX_ROMANTIC = 'EX_ROMANTIC',
  INFORMANT = 'INFORMANT',
}

export enum RelationshipValence {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  AMBIVALENT = 'AMBIVALENT',
}

export enum VoiceRegister {
  FORMAL = 'FORMAL',
  NEUTRAL = 'NEUTRAL',
  COLLOQUIAL = 'COLLOQUIAL',
  CEREMONIAL = 'CEREMONIAL',
  TECHNICAL = 'TECHNICAL',
  VULGAR = 'VULGAR',
  POETIC = 'POETIC',
}

export const STORY_FUNCTION_VALUES: readonly StoryFunction[] = Object.values(StoryFunction);
export const CHARACTER_DEPTH_VALUES: readonly CharacterDepth[] = Object.values(CharacterDepth);
export const REPLANNING_POLICY_VALUES: readonly ReplanningPolicy[] = Object.values(ReplanningPolicy);
export const EMOTION_SALIENCE_VALUES: readonly EmotionSalience[] = Object.values(EmotionSalience);
export const PIPELINE_RELATIONSHIP_TYPE_VALUES: readonly PipelineRelationshipType[] =
  Object.values(PipelineRelationshipType);
export const RELATIONSHIP_VALENCE_VALUES: readonly RelationshipValence[] =
  Object.values(RelationshipValence);
export const VOICE_REGISTER_VALUES: readonly VoiceRegister[] = Object.values(VoiceRegister);

export function isStoryFunction(value: unknown): value is StoryFunction {
  return typeof value === 'string' && STORY_FUNCTION_VALUES.includes(value as StoryFunction);
}

export function isCharacterDepth(value: unknown): value is CharacterDepth {
  return typeof value === 'string' && CHARACTER_DEPTH_VALUES.includes(value as CharacterDepth);
}

export function isReplanningPolicy(value: unknown): value is ReplanningPolicy {
  return typeof value === 'string' && REPLANNING_POLICY_VALUES.includes(value as ReplanningPolicy);
}

export function isEmotionSalience(value: unknown): value is EmotionSalience {
  return typeof value === 'string' && EMOTION_SALIENCE_VALUES.includes(value as EmotionSalience);
}

export function isPipelineRelationshipType(value: unknown): value is PipelineRelationshipType {
  return (
    typeof value === 'string' &&
    PIPELINE_RELATIONSHIP_TYPE_VALUES.includes(value as PipelineRelationshipType)
  );
}

export function isRelationshipValence(value: unknown): value is RelationshipValence {
  return (
    typeof value === 'string' &&
    RELATIONSHIP_VALENCE_VALUES.includes(value as RelationshipValence)
  );
}

export function isVoiceRegister(value: unknown): value is VoiceRegister {
  return typeof value === 'string' && VOICE_REGISTER_VALUES.includes(value as VoiceRegister);
}
