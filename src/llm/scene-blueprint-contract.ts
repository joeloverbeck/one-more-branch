export const SCENE_FUNCTION_VALUES = [
  'GOAL',
  'CONFLICT',
  'DISASTER',
  'REACTION',
  'DILEMMA',
  'DECISION',
  'SETUP',
  'TURN',
] as const;

export const MRU_TYPE_VALUES = ['MOTIVATION', 'REACTION', 'MIXED'] as const;

export const SCENE_BLUEPRINT_REQUIRED_FIELDS = [
  'units',
  'emotionalArc',
  'mandateMapping',
] as const;

export const NARRATIVE_UNIT_REQUIRED_FIELDS = [
  'action',
  'emotionalRegister',
  'sceneFunction',
  'mruType',
  'sensoryAnchor',
  'paragraphWeight',
] as const;

export const SCENE_BLUEPRINT_UNIT_COUNT = { min: 2, normalMax: 8, endingMax: 4 } as const;
export const SCENE_BLUEPRINT_PARAGRAPH_WEIGHT = {
  unitMin: 1,
  unitMax: 3,
  normalSum: { min: 6, max: 12 },
  endingSum: { min: 4, max: 8 },
} as const;
