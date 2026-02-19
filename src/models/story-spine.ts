import type { ConflictAxis, ConflictType } from './conflict-taxonomy.js';
import {
  CONFLICT_AXES,
  CONFLICT_TYPE_VALUES,
  isConflictAxis,
  isConflictType,
} from './conflict-taxonomy.js';

export type { ConflictAxis, ConflictType };
export { CONFLICT_AXES, CONFLICT_TYPE_VALUES, isConflictAxis, isConflictType };

export type StorySpineType =
  | 'QUEST'
  | 'SURVIVAL'
  | 'ESCAPE'
  | 'REVENGE'
  | 'RESCUE'
  | 'RIVALRY'
  | 'MYSTERY'
  | 'TEMPTATION'
  | 'TRANSFORMATION'
  | 'FORBIDDEN_LOVE'
  | 'SACRIFICE'
  | 'FALL_FROM_GRACE'
  | 'RISE_TO_POWER'
  | 'COMING_OF_AGE'
  | 'REBELLION';

export type CharacterArcType =
  | 'POSITIVE_CHANGE'
  | 'FLAT'
  | 'DISILLUSIONMENT'
  | 'FALL'
  | 'CORRUPTION';

export type NeedWantDynamic = 'CONVERGENT' | 'DIVERGENT' | 'SUBSTITUTIVE' | 'IRRECONCILABLE';

export const STORY_SPINE_TYPE_VALUES: readonly StorySpineType[] = [
  'QUEST',
  'SURVIVAL',
  'ESCAPE',
  'REVENGE',
  'RESCUE',
  'RIVALRY',
  'MYSTERY',
  'TEMPTATION',
  'TRANSFORMATION',
  'FORBIDDEN_LOVE',
  'SACRIFICE',
  'FALL_FROM_GRACE',
  'RISE_TO_POWER',
  'COMING_OF_AGE',
  'REBELLION',
] as const;

export const CHARACTER_ARC_TYPE_VALUES: readonly CharacterArcType[] = [
  'POSITIVE_CHANGE',
  'FLAT',
  'DISILLUSIONMENT',
  'FALL',
  'CORRUPTION',
] as const;

export const NEED_WANT_DYNAMIC_VALUES: readonly NeedWantDynamic[] = [
  'CONVERGENT',
  'DIVERGENT',
  'SUBSTITUTIVE',
  'IRRECONCILABLE',
] as const;

export interface ProtagonistNeedVsWant {
  readonly need: string;
  readonly want: string;
  readonly dynamic: NeedWantDynamic;
}

export interface PrimaryAntagonisticForce {
  readonly description: string;
  readonly pressureMechanism: string;
}

export interface StorySpine {
  readonly centralDramaticQuestion: string;
  readonly protagonistNeedVsWant: ProtagonistNeedVsWant;
  readonly primaryAntagonisticForce: PrimaryAntagonisticForce;
  readonly storySpineType: StorySpineType;
  readonly conflictAxis: ConflictAxis;
  readonly conflictType: ConflictType;
  readonly characterArcType: CharacterArcType;
  readonly toneFeel: readonly string[];
  readonly toneAvoid: readonly string[];
}

export function isStorySpineType(value: unknown): value is StorySpineType {
  return typeof value === 'string' && (STORY_SPINE_TYPE_VALUES as readonly string[]).includes(value);
}

export function isCharacterArcType(value: unknown): value is CharacterArcType {
  return (
    typeof value === 'string' && (CHARACTER_ARC_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function isNeedWantDynamic(value: unknown): value is NeedWantDynamic {
  return (
    typeof value === 'string' && (NEED_WANT_DYNAMIC_VALUES as readonly string[]).includes(value)
  );
}
