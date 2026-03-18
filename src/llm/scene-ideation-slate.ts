import { THREAD_PACING } from '../config/thread-pacing-config.js';
import { getCurrentMilestone } from '../models/story-arc.js';
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';
import { Urgency } from '../models/state/index.js';
import type { SceneIdeatorContext, SceneIdeatorContinuationContext } from './scene-ideator-types.js';
import {
  DEFAULT_CONTINUATION_SCENE_IDEA_LANES,
  DEFAULT_OPENING_SCENE_IDEA_LANES,
  DEFAULT_SCENE_IDEA_COUNT,
  IDENTITY_REPLACEMENT_LANE_ORDER,
  type SceneIdeaLane,
} from './scene-ideation-contract.js';

export interface SceneIdeationSlot {
  readonly index: number;
  readonly lane: SceneIdeaLane;
  readonly rationale: string;
  readonly requiredSignals?: readonly string[];
  readonly discouragedSignals?: readonly string[];
}

export interface SceneIdeationSlate {
  readonly targetOptionCount: number;
  readonly slots: readonly SceneIdeationSlot[];
}

interface ContinuationSignals {
  readonly hasOverdueThreads: boolean;
  readonly hasAgedPromises: boolean;
  readonly hasSpeechPressure: boolean;
  readonly hasIdentityTurn: boolean;
  readonly hasIdentityGuidance: boolean;
  readonly hasActiveThreats: boolean;
}

const OVERDUE_THREAD_AGE_BY_URGENCY: Readonly<Record<Urgency, number>> = {
  [Urgency.HIGH]: THREAD_PACING.HIGH_URGENCY_OVERDUE_PAGES,
  [Urgency.MEDIUM]: THREAD_PACING.MEDIUM_URGENCY_OVERDUE_PAGES,
  [Urgency.LOW]: THREAD_PACING.LOW_URGENCY_OVERDUE_PAGES,
};

const IDENTITY_GUIDANCE_PATTERN =
  /\b(identity|self|who\s+am\s+i|who\s+i\s+am|become|becoming|transform|transformation|role|name|mask|taboo|ritual|initiation|corruption)\b/i;

const OPENING_RATIONALES: Readonly<Record<(typeof DEFAULT_OPENING_SCENE_IDEA_LANES)[number], string>> = {
  ESCALATION: 'Front-load pressure so the opening slate includes a world-facing source of urgency.',
  REVELATION: 'Keep one opening path centered on discovery or reframing rather than pressure alone.',
  RELATIONAL_REALIGNMENT:
    'Reserve one opening path for the protagonist’s social position, alliance, or leverage.',
  TEMPTATION_OR_OPPORTUNITY:
    'Leave room for an attractive opening move that advances desire at a cost.',
  CONSEQUENCE_OR_PAYOFF:
    'Include a lane that cashes out premise-implied fallout instead of only introducing more setup.',
};

export function buildSceneIdeationSlate(context: SceneIdeatorContext): SceneIdeationSlate {
  if (context.mode === 'opening') {
    return {
      targetOptionCount: DEFAULT_SCENE_IDEA_COUNT,
      slots: DEFAULT_OPENING_SCENE_IDEA_LANES.map((lane, index) => ({
        index,
        lane,
        rationale: OPENING_RATIONALES[lane],
      })),
    };
  }

  const signals = detectContinuationSignals(context);
  const lanes = planContinuationLanes(signals);

  return {
    targetOptionCount: DEFAULT_SCENE_IDEA_COUNT,
    slots: lanes.map((lane, index) => buildContinuationSlot(lane, index, signals)),
  };
}

function detectContinuationSignals(context: SceneIdeatorContinuationContext): ContinuationSignals {
  const hasOverdueThreads =
    !!context.threadAges &&
    context.activeState.openThreads.some((thread) => {
      const age = context.threadAges?.[thread.id];
      if (age === undefined) {
        return false;
      }
      return age >= OVERDUE_THREAD_AGE_BY_URGENCY[thread.urgency];
    });

  const hasAgedPromises = context.accumulatedPromises.some(
    (promise) =>
      promise.suggestedUrgency === Urgency.HIGH ||
      promise.age >= THREAD_PACING.PROMISE_AGING_NOTICE_PAGES
  );

  const hasSpeechPressure = hasText(context.protagonistGuidance?.suggestedSpeech);
  const hasIdentityGuidance = guidanceMentionsIdentity(context.protagonistGuidance);

  const currentMilestone =
    context.structure && context.accumulatedStructureState
      ? getCurrentMilestone(context.structure, context.accumulatedStructureState)
      : undefined;

  const hasIdentityTurn =
    currentMilestone?.role === 'reflection' ||
    currentMilestone?.role === 'turning_point' ||
    currentMilestone?.isMidpoint === true;

  return {
    hasOverdueThreads,
    hasAgedPromises,
    hasSpeechPressure,
    hasIdentityTurn,
    hasIdentityGuidance,
    hasActiveThreats: context.activeState.activeThreats.length > 0,
  };
}

function planContinuationLanes(signals: ContinuationSignals): readonly SceneIdeaLane[] {
  const lanes: SceneIdeaLane[] = [...DEFAULT_CONTINUATION_SCENE_IDEA_LANES];

  if (shouldUseIdentityLane(signals)) {
    const replacementLane =
      IDENTITY_REPLACEMENT_LANE_ORDER.find((lane) => lanes.includes(lane)) ??
      lanes[lanes.length - 1]!;
    const replacementIndex = lanes.indexOf(replacementLane);
    lanes.splice(replacementIndex, 1, 'IDENTITY_OR_TRANSFORMATION');
  }

  return lanes.sort((left, right) => scoreLane(right, signals) - scoreLane(left, signals));
}

function shouldUseIdentityLane(signals: ContinuationSignals): boolean {
  return signals.hasIdentityTurn || signals.hasIdentityGuidance;
}

function scoreLane(lane: SceneIdeaLane, signals: ContinuationSignals): number {
  const baseScores: Readonly<Record<SceneIdeaLane, number>> = {
    REVELATION: 50,
    RELATIONAL_REALIGNMENT: 40,
    CONSEQUENCE_OR_PAYOFF: 30,
    TEMPTATION_OR_OPPORTUNITY: 20,
    ESCALATION: 10,
    IDENTITY_OR_TRANSFORMATION: 15,
  };

  let score = baseScores[lane];

  if (lane === 'CONSEQUENCE_OR_PAYOFF' && (signals.hasOverdueThreads || signals.hasAgedPromises)) {
    score += 35;
  }

  if (lane === 'RELATIONAL_REALIGNMENT' && signals.hasSpeechPressure) {
    score += 25;
  }

  if (lane === 'IDENTITY_OR_TRANSFORMATION' && shouldUseIdentityLane(signals)) {
    score += 30;
  }

  if (lane === 'ESCALATION' && signals.hasActiveThreats) {
    score += 20;
  }

  return score;
}

function buildContinuationSlot(
  lane: SceneIdeaLane,
  index: number,
  signals: ContinuationSignals
): SceneIdeationSlot {
  switch (lane) {
    case 'CONSEQUENCE_OR_PAYOFF':
      return {
        index,
        lane,
        rationale:
          signals.hasOverdueThreads || signals.hasAgedPromises
            ? 'Prioritize fallout and payoff because the current continuation context is carrying overdue story pressure.'
            : 'Keep one continuation lane available for fallout, payoff, or cashing out prior setup.',
        requiredSignals: consequenceRequiredSignals(signals),
      };
    case 'RELATIONAL_REALIGNMENT':
      return {
        index,
        lane,
        rationale: signals.hasSpeechPressure
          ? 'Promote a relationship-shift lane because the protagonist guidance implies spoken confrontation, confession, or negotiation pressure.'
          : 'Keep one continuation lane focused on alliance, trust, leverage, or intimacy shifts.',
        requiredSignals: signals.hasSpeechPressure ? ['protagonistSuggestedSpeech'] : undefined,
      };
    case 'IDENTITY_OR_TRANSFORMATION':
      return {
        index,
        lane,
        rationale:
          'Replace one default lane with an identity turn because the current continuation context points toward reflection, becoming, or self-definition pressure.',
        requiredSignals: identityRequiredSignals(signals),
      };
    case 'ESCALATION':
      return {
        index,
        lane,
        rationale: signals.hasActiveThreats
          ? 'Keep a pressure lane in the slate because the current state already carries active threat energy.'
          : 'Preserve an escalation lane so one option intensifies pressure instead of only reframing it.',
      };
    case 'TEMPTATION_OR_OPPORTUNITY':
      return {
        index,
        lane,
        rationale:
          'Keep one lane for advancement-through-cost so the slate still offers an attractive but compromising path.',
        discouragedSignals:
          signals.hasOverdueThreads || signals.hasAgedPromises ? ['duplicatePressure'] : undefined,
      };
    case 'REVELATION':
      return {
        index,
        lane,
        rationale:
          'Reserve one lane for disclosure or recontextualization so the slate does not collapse into pure pressure management.',
      };
  }
}

function consequenceRequiredSignals(signals: ContinuationSignals): readonly string[] | undefined {
  const requiredSignals: string[] = [];

  if (signals.hasOverdueThreads) {
    requiredSignals.push('overdueThreads');
  }

  if (signals.hasAgedPromises) {
    requiredSignals.push('agedPromises');
  }

  return requiredSignals.length > 0 ? requiredSignals : undefined;
}

function identityRequiredSignals(signals: ContinuationSignals): readonly string[] {
  const requiredSignals: string[] = [];

  if (signals.hasIdentityTurn) {
    requiredSignals.push('structureIdentityTurn');
  }

  if (signals.hasIdentityGuidance) {
    requiredSignals.push('identityGuidance');
  }

  return requiredSignals;
}

function guidanceMentionsIdentity(guidance: ProtagonistGuidance | undefined): boolean {
  if (!guidance) {
    return false;
  }

  return [guidance.suggestedThoughts, guidance.suggestedSpeech].some(
    (value) => hasText(value) && IDENTITY_GUIDANCE_PATTERN.test(value)
  );
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
