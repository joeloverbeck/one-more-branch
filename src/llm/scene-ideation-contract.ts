import type { SceneIdeaLane } from '../models/scene-direction-taxonomy.js';

export const DEFAULT_SCENE_IDEA_COUNT = 5;
export const MIN_SCENE_IDEA_COUNT = 4;
export const MAX_SCENE_IDEA_COUNT = 6;

export const DEFAULT_OPENING_SCENE_IDEA_LANES = [
  'ESCALATION',
  'REVELATION',
  'RELATIONAL_REALIGNMENT',
  'TEMPTATION_OR_OPPORTUNITY',
  'CONSEQUENCE_OR_PAYOFF',
] as const satisfies readonly SceneIdeaLane[];

export const DEFAULT_CONTINUATION_SCENE_IDEA_LANES = [
  'REVELATION',
  'RELATIONAL_REALIGNMENT',
  'TEMPTATION_OR_OPPORTUNITY',
  'CONSEQUENCE_OR_PAYOFF',
  'ESCALATION',
] as const satisfies readonly SceneIdeaLane[];

export const IDENTITY_REPLACEMENT_LANE_ORDER = [
  'TEMPTATION_OR_OPPORTUNITY',
  'ESCALATION',
] as const satisfies readonly SceneIdeaLane[];
