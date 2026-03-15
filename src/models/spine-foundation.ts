import type { ConflictAxis, ConflictType } from './conflict-taxonomy.js';
import type {
  CharacterArcType,
  StorySpineType,
  ProtagonistNeedVsWant,
} from './story-spine.js';

export interface SpineFoundation {
  readonly conflictAxis: ConflictAxis;
  readonly characterArcType: CharacterArcType;
  readonly protagonistDeepestFear: string;
  readonly toneFeel: readonly string[];
  readonly toneAvoid: readonly string[];
  readonly thematicPremise: string;
}

export interface SpineArcEngine extends SpineFoundation {
  readonly storySpineType: StorySpineType;
  readonly conflictType: ConflictType;
  readonly protagonistNeedVsWant: ProtagonistNeedVsWant;
}
