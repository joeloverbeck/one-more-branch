import type { AnalystResult, DetectedPromise } from '../llm/analyst-types.js';
import type { TrackedPromise, ThreadEntry } from '../models/state/index.js';
import { getMaxIdNumber } from '../models/index.js';
import {
  augmentThreadsResolvedFromAnalyst,
  buildResolvedThreadMeta,
  computeContinuationThreadAges,
  computeFirstPageThreadAges,
} from './thread-lifecycle.js';
import {
  buildResolvedPromiseMeta,
  computeAccumulatedPromises,
  getMaxPromiseIdNumber,
} from './promise-lifecycle.js';

export interface NarrativeStateLifecycleInput {
  readonly isOpening: boolean;
  readonly parentOpenThreads: readonly ThreadEntry[];
  readonly parentThreadAges: Readonly<Record<string, number>>;
  readonly parentAccumulatedPromises: readonly TrackedPromise[];
  readonly parentAccumulatedFulfilledPremisePromises: readonly string[];
  readonly threadsAdded: readonly { text: string }[];
  readonly threadsResolved: readonly string[];
  readonly analystResult: AnalystResult | null;
  readonly analystPromisesDetected: readonly DetectedPromise[];
  readonly analystPromisesResolved: readonly string[];
  readonly analystPremisePromiseFulfilled: string | null;
}

export interface NarrativeStateLifecycleOutput {
  readonly effectiveThreadsResolved: readonly string[];
  readonly threadAges: Readonly<Record<string, number>>;
  readonly accumulatedPromises: readonly TrackedPromise[];
  readonly accumulatedFulfilledPremisePromises: readonly string[];
  readonly resolvedThreadMeta: Readonly<Record<string, { threadType: string; urgency: string }>>;
  readonly resolvedPromiseMeta: Readonly<Record<string, { promiseType: string; scope: string; urgency: string }>>;
}

/**
 * Single orchestration point for narrative lifecycle progression.
 * Keeps per-subsystem lifecycle rules localized while exposing one output contract to page assembly.
 */
export function computeNarrativeStateLifecycle(
  input: NarrativeStateLifecycleInput
): NarrativeStateLifecycleOutput {
  const effectiveThreadsResolved = input.isOpening
    ? input.threadsResolved
    : augmentThreadsResolvedFromAnalyst(
        input.threadsResolved,
        input.analystResult,
        input.parentOpenThreads
      );

  const threadAges = input.isOpening
    ? computeFirstPageThreadAges(input.threadsAdded)
    : computeContinuationThreadAges(
        input.parentThreadAges,
        input.parentOpenThreads.map((thread) => thread.id),
        input.threadsAdded,
        effectiveThreadsResolved,
        getMaxIdNumber(input.parentOpenThreads, 'td')
      );

  const parentPromises = input.isOpening ? [] : input.parentAccumulatedPromises;
  const accumulatedPromises = computeAccumulatedPromises(
    parentPromises,
    input.isOpening ? [] : input.analystPromisesResolved,
    input.analystPromisesDetected,
    getMaxPromiseIdNumber(parentPromises)
  );

  const accumulatedFulfilledPremisePromises = (() : readonly string[] => {
    const inherited = input.isOpening ? [] : input.parentAccumulatedFulfilledPremisePromises;
    const fulfilledNow = (input.isOpening ? null : input.analystPremisePromiseFulfilled)?.trim() ?? '';
    if (fulfilledNow.length === 0 || inherited.includes(fulfilledNow)) {
      return inherited;
    }
    return [...inherited, fulfilledNow];
  })();

  const resolvedThreadMeta = buildResolvedThreadMeta(
    effectiveThreadsResolved,
    input.parentOpenThreads
  );

  const resolvedPromiseMeta = buildResolvedPromiseMeta(
    input.isOpening ? [] : input.analystPromisesResolved,
    parentPromises
  );

  return {
    effectiveThreadsResolved,
    threadAges,
    accumulatedPromises,
    accumulatedFulfilledPremisePromises,
    resolvedThreadMeta,
    resolvedPromiseMeta,
  };
}
