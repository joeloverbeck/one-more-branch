/**
 * Enum definitions for structured choice classification.
 *
 * ChoiceType answers "What is the protagonist mainly doing?" (pure action families).
 * PrimaryDelta answers "What dimension of the world does this choice primarily change?"
 * ChoiceShape answers "What kind of pressure does this choice create?"
 *
 * Together, these act as a structured self-check for the LLM,
 * enforcing divergent choices by requiring distinct labels.
 */

export enum ChoiceType {
  INVESTIGATE = 'INVESTIGATE',
  REVEAL = 'REVEAL',
  PERSUADE = 'PERSUADE',
  CONNECT = 'CONNECT',
  DECEIVE = 'DECEIVE',
  CONTEST = 'CONTEST',
  COMMIT = 'COMMIT',
  INTERVENE = 'INTERVENE',
  NAVIGATE = 'NAVIGATE',
  WITHDRAW = 'WITHDRAW',
  SUBMIT = 'SUBMIT',
}

export enum PrimaryDelta {
  LOCATION_ACCESS_CHANGE = 'LOCATION_ACCESS_CHANGE',
  GOAL_PRIORITY_CHANGE = 'GOAL_PRIORITY_CHANGE',
  RELATIONSHIP_ALIGNMENT_CHANGE = 'RELATIONSHIP_ALIGNMENT_CHANGE',
  TIME_PRESSURE_CHANGE = 'TIME_PRESSURE_CHANGE',
  RESOURCE_CONTROL_CHANGE = 'RESOURCE_CONTROL_CHANGE',
  INFORMATION_STATE_CHANGE = 'INFORMATION_STATE_CHANGE',
  SECRECY_EXPOSURE_CHANGE = 'SECRECY_EXPOSURE_CHANGE',
  CONDITION_STATUS_CHANGE = 'CONDITION_STATUS_CHANGE',
  THREAT_LEVEL_CHANGE = 'THREAT_LEVEL_CHANGE',
  OBLIGATION_RULE_CHANGE = 'OBLIGATION_RULE_CHANGE',
  POWER_AUTHORITY_CHANGE = 'POWER_AUTHORITY_CHANGE',
  IDENTITY_REPUTATION_CHANGE = 'IDENTITY_REPUTATION_CHANGE',
}

export enum ChoiceShape {
  RELAXED = 'RELAXED',
  OBVIOUS = 'OBVIOUS',
  TRADEOFF = 'TRADEOFF',
  DILEMMA = 'DILEMMA',
  GAMBLE = 'GAMBLE',
  TEMPTATION = 'TEMPTATION',
  SACRIFICE = 'SACRIFICE',
  FLAVOR = 'FLAVOR',
}

export const CHOICE_TYPE_VALUES: readonly ChoiceType[] = Object.values(ChoiceType);
export const PRIMARY_DELTA_VALUES: readonly PrimaryDelta[] = Object.values(PrimaryDelta);
export const CHOICE_SHAPE_VALUES: readonly ChoiceShape[] = Object.values(ChoiceShape);

export const CHOICE_TYPE_COLORS: Record<ChoiceType, { bg: string; text: string; label: string }> = {
  [ChoiceType.INVESTIGATE]: { bg: '#148f77', text: '#ffffff', label: 'Investigate' },
  [ChoiceType.REVEAL]: { bg: '#b7950b', text: '#000000', label: 'Reveal' },
  [ChoiceType.PERSUADE]: { bg: '#2874a6', text: '#ffffff', label: 'Persuade' },
  [ChoiceType.CONNECT]: { bg: '#c0392b', text: '#ffffff', label: 'Connect' },
  [ChoiceType.DECEIVE]: { bg: '#6c3483', text: '#ffffff', label: 'Deceive' },
  [ChoiceType.CONTEST]: { bg: '#922b21', text: '#ffffff', label: 'Contest' },
  [ChoiceType.COMMIT]: { bg: '#d4ac0d', text: '#000000', label: 'Commit' },
  [ChoiceType.INTERVENE]: { bg: '#1a5276', text: '#ffffff', label: 'Intervene' },
  [ChoiceType.NAVIGATE]: { bg: '#d35400', text: '#ffffff', label: 'Navigate' },
  [ChoiceType.WITHDRAW]: { bg: '#1a5253', text: '#ffffff', label: 'Withdraw' },
  [ChoiceType.SUBMIT]: { bg: '#5d6d7e', text: '#ffffff', label: 'Submit' },
};

export const PRIMARY_DELTA_LABELS: Record<PrimaryDelta, string> = {
  [PrimaryDelta.LOCATION_ACCESS_CHANGE]: 'Location',
  [PrimaryDelta.GOAL_PRIORITY_CHANGE]: 'Goal',
  [PrimaryDelta.RELATIONSHIP_ALIGNMENT_CHANGE]: 'Relationship',
  [PrimaryDelta.TIME_PRESSURE_CHANGE]: 'Time Pressure',
  [PrimaryDelta.RESOURCE_CONTROL_CHANGE]: 'Resource',
  [PrimaryDelta.INFORMATION_STATE_CHANGE]: 'Information',
  [PrimaryDelta.SECRECY_EXPOSURE_CHANGE]: 'Exposure',
  [PrimaryDelta.CONDITION_STATUS_CHANGE]: 'Condition',
  [PrimaryDelta.THREAT_LEVEL_CHANGE]: 'Danger',
  [PrimaryDelta.OBLIGATION_RULE_CHANGE]: 'Obligation',
  [PrimaryDelta.POWER_AUTHORITY_CHANGE]: 'Power',
  [PrimaryDelta.IDENTITY_REPUTATION_CHANGE]: 'Identity',
};

export const CHOICE_SHAPE_LABELS: Record<ChoiceShape, string> = {
  [ChoiceShape.RELAXED]: 'Relaxed',
  [ChoiceShape.OBVIOUS]: 'Obvious',
  [ChoiceShape.TRADEOFF]: 'Tradeoff',
  [ChoiceShape.DILEMMA]: 'Dilemma',
  [ChoiceShape.GAMBLE]: 'Gamble',
  [ChoiceShape.TEMPTATION]: 'Temptation',
  [ChoiceShape.SACRIFICE]: 'Sacrifice',
  [ChoiceShape.FLAVOR]: 'Flavor',
};
