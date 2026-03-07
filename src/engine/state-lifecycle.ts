import type { AnalystResult, DetectedPromise } from '../llm/analyst-types.js';
import type { KnowledgeAsymmetry } from '../models/state/knowledge-state.js';
import type { TrackedPromise, ThreadEntry } from '../models/state/index.js';
import { getMaxIdNumber } from '../models/index.js';
import {
  augmentThreadsResolvedFromAnalyst,
  computeContinuationThreadAges,
  computeFirstPageThreadAges,
} from './thread-lifecycle.js';
import { computeAccumulatedPromises, getMaxPromiseIdNumber } from './promise-lifecycle.js';

export interface NarrativeStateLifecycleInput {
  readonly isOpening: boolean;
  readonly parentOpenThreads: readonly ThreadEntry[];
  readonly parentThreadAges: Readonly<Record<string, number>>;
  readonly parentPromiseAgeEpoch: number;
  readonly currentPromiseAgeEpoch: number;
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
}

export interface KnowledgeStateLifecycleInput {
  readonly parentAccumulatedKnowledgeState: readonly KnowledgeAsymmetry[];
  readonly detectedKnowledgeAsymmetry: readonly KnowledgeAsymmetry[];
}

/**
 * Single orchestration point for narrative lifecycle progression.
 * Keeps per-subsystem lifecycle rules localized while exposing one output contract to page assembly.
 */
export function computeNarrativeStateLifecycle(
  input: NarrativeStateLifecycleInput
): NarrativeStateLifecycleOutput {
  const currentPromiseAgeEpoch =
    input.currentPromiseAgeEpoch ??
    (input.isOpening ? 0 : (input.parentPromiseAgeEpoch ?? 0) + 1);
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
    getMaxPromiseIdNumber(parentPromises),
    currentPromiseAgeEpoch
  );

  const accumulatedFulfilledPremisePromises = (() : readonly string[] => {
    const inherited = input.isOpening ? [] : input.parentAccumulatedFulfilledPremisePromises;
    const fulfilledNow = (input.isOpening ? null : input.analystPremisePromiseFulfilled)?.trim() ?? '';
    if (fulfilledNow.length === 0 || inherited.includes(fulfilledNow)) {
      return inherited;
    }
    return [...inherited, fulfilledNow];
  })();

  return {
    effectiveThreadsResolved,
    threadAges,
    accumulatedPromises,
    accumulatedFulfilledPremisePromises,
  };
}

/**
 * Computes accumulated knowledge asymmetry for the next page.
 * Latest detected observation wins per character, while preserving untouched parent entries.
 */
export function computeAccumulatedKnowledgeState(
  input: KnowledgeStateLifecycleInput
): readonly KnowledgeAsymmetry[] {
  const byCharacter = new Map<string, KnowledgeAsymmetry>();
  for (const entry of input.parentAccumulatedKnowledgeState) {
    byCharacter.set(entry.characterName, entry);
  }
  for (const entry of input.detectedKnowledgeAsymmetry) {
    byCharacter.set(entry.characterName, entry);
  }
  return Array.from(byCharacter.values());
}
