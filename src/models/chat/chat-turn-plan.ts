import type { ChatBlockType } from './chat-turn.js';

export const SPEECH_ACT_VALUES = [
  'ASSERT',
  'DEFLECT',
  'PROBE',
  'CONCEDE',
  'CHALLENGE',
  'COMFORT',
  'THREATEN',
  'REVEAL',
  'DECEIVE',
  'WITHDRAW',
] as const;

export type SpeechAct = (typeof SPEECH_ACT_VALUES)[number];

export const HONESTY_MODE_VALUES = ['FULL', 'PARTIAL', 'EVASIVE', 'DECEPTIVE'] as const;

export type HonestyMode = (typeof HONESTY_MODE_VALUES)[number];

export const ACTION_PLAN_KIND_VALUES = [
  'GESTURE',
  'POSTURE_SHIFT',
  'OBJECT_INTERACTION',
  'MOVEMENT',
  'EXPRESSION',
] as const;

export type ActionPlanKind = (typeof ACTION_PLAN_KIND_VALUES)[number];

export const TURN_TARGET_LENGTH_VALUES = ['SHORT', 'MEDIUM', 'LONG'] as const;

export type TurnTargetLength = (typeof TURN_TARGET_LENGTH_VALUES)[number];

export interface TurnPlannerInternalSelfCheck {
  readonly whatDoIWant: string;
  readonly whatDoIKnow: string;
  readonly whatAmIHiding: string;
  readonly howHonestAmI: string;
}

export interface ActionPlanItem {
  readonly kind: ActionPlanKind;
  readonly text: string;
  readonly changesPhysicalState: boolean;
}

export interface TurnPlannerExpectedImpact {
  readonly relationshipDeltaHint: number;
  readonly tensionDeltaHint: number;
  readonly revealsSecret: boolean;
}

export interface TurnPlannerOutput {
  readonly internalSelfCheck: TurnPlannerInternalSelfCheck;
  readonly responseGoal: string;
  readonly speechAct: SpeechAct;
  readonly honestyMode: HonestyMode;
  readonly surfaceEmotion: string;
  readonly suppressedEmotion: string | null;
  readonly subtext: string;
  readonly mustAddress: readonly string[];
  readonly mustAvoid: readonly string[];
  readonly blockPlan: readonly ChatBlockType[];
  readonly actionPlan: readonly ActionPlanItem[];
  readonly questionBack: string | null;
  readonly targetLength: TurnTargetLength;
  readonly expectedImpact: TurnPlannerExpectedImpact;
}
