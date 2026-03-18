import { THREAD_PACING } from '../config/thread-pacing-config.js';
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';
import type { AgedTrackedPromise, ThreadEntry } from '../models/state/index.js';
import { Urgency } from '../models/state/index.js';
import { getCurrentMilestone } from '../models/story-arc.js';
import type { SceneIdeatorContinuationContext } from './scene-ideator-types.js';

export interface SceneIdeationContextSignals {
  readonly overdueThreads: readonly ThreadEntry[];
  readonly pendingPromises: readonly AgedTrackedPromise[];
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

export function buildSceneIdeationContextSignals(
  context: SceneIdeatorContinuationContext
): SceneIdeationContextSignals {
  const overdueThreads = getSceneIdeationOverdueThreads(
    context.activeState.openThreads,
    context.threadAges
  );
  const pendingPromises = getSceneIdeationPendingPromises(context.accumulatedPromises);
  const currentMilestone =
    context.structure && context.accumulatedStructureState
      ? getCurrentMilestone(context.structure, context.accumulatedStructureState)
      : undefined;

  const hasIdentityTurn =
    currentMilestone?.role === 'reflection' ||
    currentMilestone?.role === 'turning_point' ||
    currentMilestone?.isMidpoint === true;

  return {
    overdueThreads,
    pendingPromises,
    hasOverdueThreads: overdueThreads.length > 0,
    hasAgedPromises: pendingPromises.length > 0,
    hasSpeechPressure: hasText(context.protagonistGuidance?.suggestedSpeech),
    hasIdentityTurn,
    hasIdentityGuidance: guidanceMentionsIdentity(context.protagonistGuidance),
    hasActiveThreats: context.activeState.activeThreats.length > 0,
  };
}

export function getSceneIdeationOverdueThreads(
  openThreads: readonly ThreadEntry[],
  threadAges: Readonly<Record<string, number>> | undefined
): readonly ThreadEntry[] {
  if (!threadAges) {
    return [];
  }

  return openThreads.filter((thread) => {
    const age = threadAges[thread.id];
    if (age === undefined) {
      return false;
    }

    return age >= OVERDUE_THREAD_AGE_BY_URGENCY[thread.urgency];
  });
}

export function getSceneIdeationPendingPromises(
  accumulatedPromises: readonly AgedTrackedPromise[]
): readonly AgedTrackedPromise[] {
  return accumulatedPromises.filter(
    (promise) =>
      promise.suggestedUrgency === Urgency.HIGH ||
      promise.age >= THREAD_PACING.PROMISE_AGING_NOTICE_PAGES
  );
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
