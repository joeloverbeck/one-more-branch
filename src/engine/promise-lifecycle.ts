import type { TrackedPromise } from '../models/state/index.js';
import { PromiseScope } from '../models/state/index.js';
import { THREAD_PACING } from '../config/thread-pacing-config.js';
import type { DetectedPromise } from '../llm/analyst-types';

/**
 * Computes accumulated tracked promises for the new page.
 * Parent promises are resolved/aged and new detections are assigned IDs.
 */
export function computeAccumulatedPromises(
  parentPromises: readonly TrackedPromise[],
  resolvedIds: readonly string[],
  detected: readonly DetectedPromise[],
  maxExistingId: number
): readonly TrackedPromise[] {
  const resolvedSet = new Set(resolvedIds);
  const sceneExpiryThreshold = THREAD_PACING.PROMISE_SCOPE_EXPIRY.SCENE;
  const survivingAgedPromises = parentPromises
    .filter((promise) => !resolvedSet.has(promise.id))
    .map((promise) => ({ ...promise, age: promise.age + 1 }))
    .filter((promise) => {
      if (
        promise.scope === PromiseScope.SCENE &&
        sceneExpiryThreshold !== null &&
        promise.age > sceneExpiryThreshold
      ) {
        return false;
      }
      return true;
    });

  let nextPromiseId = maxExistingId;
  const newlyTrackedPromises = detected
    .filter((promise) => promise.description.trim().length > 0)
    .map((promise) => {
      nextPromiseId += 1;
      return {
        id: `pr-${nextPromiseId}`,
        description: promise.description.trim(),
        promiseType: promise.promiseType,
        scope: promise.scope,
        resolutionHint: promise.resolutionHint,
        suggestedUrgency: promise.suggestedUrgency,
        age: 0,
      };
    });

  return [...survivingAgedPromises, ...newlyTrackedPromises];
}

export function getMaxPromiseIdNumber(promises: readonly TrackedPromise[]): number {
  let max = 0;
  for (const promise of promises) {
    const match = /^pr-(\d+)$/.exec(promise.id);
    if (!match?.[1]) {
      continue;
    }
    const value = Number.parseInt(match[1], 10);
    if (!Number.isNaN(value) && value > max) {
      max = value;
    }
  }
  return max;
}

/**
 * Builds a lookup of metadata for promises resolved on this page.
 * Cross-references resolved promise IDs with the parent page's accumulated promises
 * to preserve promiseType and suggestedUrgency for display purposes (e.g. payoff card badges).
 */
export function buildResolvedPromiseMeta(
  resolvedIds: readonly string[],
  parentPromises: readonly TrackedPromise[]
): Readonly<Record<string, { promiseType: string; scope: string; urgency: string }>> {
  if (resolvedIds.length === 0) {
    return {};
  }
  const meta: Record<string, { promiseType: string; scope: string; urgency: string }> = {};
  const promiseMap = new Map(parentPromises.map((p) => [p.id, p]));
  for (const id of resolvedIds) {
    const promise = promiseMap.get(id);
    if (promise) {
      meta[id] = {
        promiseType: promise.promiseType,
        scope: promise.scope,
        urgency: promise.suggestedUrgency,
      };
    }
  }
  return meta;
}
