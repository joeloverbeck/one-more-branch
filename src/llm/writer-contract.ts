import { CHOICE_TYPE_VALUES, PRIMARY_DELTA_VALUES } from '../models/choice-enums.js';

export const WRITER_REQUIRED_FIELDS = [
  'narrative',
  'choices',
  'protagonistAffect',
  'sceneSummary',
  'isEnding',
] as const;

export const WRITER_CHOICE_REQUIRED_FIELDS = ['text', 'choiceType', 'primaryDelta'] as const;

export const WRITER_CHOICE_TYPE_ENUM = [...CHOICE_TYPE_VALUES];
export const WRITER_PRIMARY_DELTA_ENUM = [...PRIMARY_DELTA_VALUES];

export const WRITER_EMOTION_INTENSITY_ENUM = [
  'mild',
  'moderate',
  'strong',
  'overwhelming',
] as const;

export const WRITER_PROTAGONIST_AFFECT_REQUIRED_FIELDS = [
  'primaryEmotion',
  'primaryIntensity',
  'primaryCause',
  'secondaryEmotions',
  'dominantMotivation',
] as const;

export const WRITER_SECONDARY_EMOTION_REQUIRED_FIELDS = ['emotion', 'cause'] as const;

export const WRITER_DEFAULT_PROTAGONIST_AFFECT = {
  primaryEmotion: 'neutral',
  primaryIntensity: 'mild' as const,
  primaryCause: 'No specific emotional driver',
  secondaryEmotions: [],
  dominantMotivation: 'Continue forward',
};
