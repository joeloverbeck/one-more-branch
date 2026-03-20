import type { SceneIdeaLane } from '../models/scene-direction-taxonomy.js';

export const DEFAULT_SCENE_IDEA_COUNT = 5;
export const MIN_SCENE_IDEA_COUNT = 4;
export const MAX_SCENE_IDEA_COUNT = 6;

export const DEFAULT_OPENING_SCENE_IDEA_LANES = [
  'EXTERNAL_FORCE',
  'EPISTEMIC_SHIFT',
  'INTERPERSONAL_TENSION',
  'MORAL_CRUCIBLE',
  'CAUSAL_HARVEST',
] as const satisfies readonly SceneIdeaLane[];

export const DEFAULT_CONTINUATION_SCENE_IDEA_LANES = [
  'EPISTEMIC_SHIFT',
  'INTERPERSONAL_TENSION',
  'MORAL_CRUCIBLE',
  'CAUSAL_HARVEST',
  'EXTERNAL_FORCE',
] as const satisfies readonly SceneIdeaLane[];

export const IDENTITY_REPLACEMENT_LANE_ORDER = [
  'MORAL_CRUCIBLE',
  'EXTERNAL_FORCE',
] as const satisfies readonly SceneIdeaLane[];
