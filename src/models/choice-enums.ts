/**
 * Enum definitions for structured choice classification.
 *
 * ChoiceType describes what the choice is ABOUT (player intent).
 * PrimaryDelta describes what the choice CHANGES in the world.
 *
 * Together, these act as a structured self-check for the LLM,
 * enforcing divergent choices by requiring distinct labels.
 */

export enum ChoiceType {
  TACTICAL_APPROACH = 'TACTICAL_APPROACH',
  MORAL_DILEMMA = 'MORAL_DILEMMA',
  IDENTITY_EXPRESSION = 'IDENTITY_EXPRESSION',
  RELATIONSHIP_SHIFT = 'RELATIONSHIP_SHIFT',
  RESOURCE_COMMITMENT = 'RESOURCE_COMMITMENT',
  INVESTIGATION = 'INVESTIGATION',
  PATH_DIVERGENCE = 'PATH_DIVERGENCE',
  CONFRONTATION = 'CONFRONTATION',
  AVOIDANCE_RETREAT = 'AVOIDANCE_RETREAT',
}

export enum PrimaryDelta {
  LOCATION_CHANGE = 'LOCATION_CHANGE',
  GOAL_SHIFT = 'GOAL_SHIFT',
  RELATIONSHIP_CHANGE = 'RELATIONSHIP_CHANGE',
  URGENCY_CHANGE = 'URGENCY_CHANGE',
  ITEM_CONTROL = 'ITEM_CONTROL',
  EXPOSURE_CHANGE = 'EXPOSURE_CHANGE',
  CONDITION_CHANGE = 'CONDITION_CHANGE',
  INFORMATION_REVEALED = 'INFORMATION_REVEALED',
  THREAT_SHIFT = 'THREAT_SHIFT',
  CONSTRAINT_CHANGE = 'CONSTRAINT_CHANGE',
}

export const CHOICE_TYPE_VALUES: readonly ChoiceType[] = Object.values(ChoiceType);
export const PRIMARY_DELTA_VALUES: readonly PrimaryDelta[] = Object.values(PrimaryDelta);

export const CHOICE_TYPE_COLORS: Record<ChoiceType, { bg: string; text: string; label: string }> = {
  [ChoiceType.TACTICAL_APPROACH]: { bg: '#1a5276', text: '#ffffff', label: 'Method/Tactic' },
  [ChoiceType.MORAL_DILEMMA]: { bg: '#7d3c98', text: '#ffffff', label: 'Moral Choice' },
  [ChoiceType.IDENTITY_EXPRESSION]: { bg: '#b7950b', text: '#000000', label: 'Define Yourself' },
  [ChoiceType.RELATIONSHIP_SHIFT]: { bg: '#c0392b', text: '#ffffff', label: 'Relationship' },
  [ChoiceType.RESOURCE_COMMITMENT]: { bg: '#d4ac0d', text: '#000000', label: 'Spend/Risk' },
  [ChoiceType.INVESTIGATION]: { bg: '#148f77', text: '#ffffff', label: 'Investigate' },
  [ChoiceType.PATH_DIVERGENCE]: { bg: '#d35400', text: '#ffffff', label: 'Change Direction' },
  [ChoiceType.CONFRONTATION]: { bg: '#922b21', text: '#ffffff', label: 'Confront/Fight' },
  [ChoiceType.AVOIDANCE_RETREAT]: { bg: '#1a5253', text: '#ffffff', label: 'Avoid/Flee' },
};

export const PRIMARY_DELTA_LABELS: Record<PrimaryDelta, string> = {
  [PrimaryDelta.LOCATION_CHANGE]: 'Location',
  [PrimaryDelta.GOAL_SHIFT]: 'Goal',
  [PrimaryDelta.RELATIONSHIP_CHANGE]: 'Relationship',
  [PrimaryDelta.URGENCY_CHANGE]: 'Time Pressure',
  [PrimaryDelta.ITEM_CONTROL]: 'Item',
  [PrimaryDelta.EXPOSURE_CHANGE]: 'Attention',
  [PrimaryDelta.CONDITION_CHANGE]: 'Condition',
  [PrimaryDelta.INFORMATION_REVEALED]: 'Information',
  [PrimaryDelta.THREAT_SHIFT]: 'Danger',
  [PrimaryDelta.CONSTRAINT_CHANGE]: 'Limitation',
};
