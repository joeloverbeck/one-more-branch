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
  readonly canonicalPremisePromises?: readonly string[];
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
    const canonicalByTrimmed = new Map<string, string>();
    for (const promise of input.canonicalPremisePromises ?? []) {
      const trimmed = promise.trim();
      if (trimmed.length > 0 && !canonicalByTrimmed.has(trimmed)) {
        canonicalByTrimmed.set(trimmed, promise);
      }
    }

    const inherited = input.isOpening ? [] : (input.parentAccumulatedFulfilledPremisePromises ?? []);
    const inheritedCanonical: string[] = [];
    const inheritedSeen = new Set<string>();
    for (const fulfilled of inherited) {
      const trimmed = fulfilled.trim();
      if (trimmed.length === 0) {
        continue;
      }
      const canonical = canonicalByTrimmed.get(trimmed);
      if (!canonical || inheritedSeen.has(trimmed)) {
        continue;
      }
      inheritedCanonical.push(canonical);
      inheritedSeen.add(trimmed);
    }

    const fulfilledNow = (input.isOpening ? null : input.analystPremisePromiseFulfilled)?.trim() ?? '';
    if (fulfilledNow.length === 0 || inheritedSeen.has(fulfilledNow)) {
      return inheritedCanonical;
    }
    const canonicalFulfilledNow = canonicalByTrimmed.get(fulfilledNow);
    if (!canonicalFulfilledNow) {
      return inheritedCanonical;
    }
    return [...inheritedCanonical, canonicalFulfilledNow];
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
  return Array.from(byCharacter.values()).filter(
    (entry) => entry.falseBeliefs.length > 0 || entry.secrets.length > 0
  );
}
