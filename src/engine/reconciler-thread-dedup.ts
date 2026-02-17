import type { ThreadAdd } from '../llm/writer-types.js';
import { ThreadType } from '../models/state/index.js';
import type {
  ReconciledThreadAdd,
  StateReconciliationPreviousState,
} from './state-reconciler-types.js';
import {
  dedupeByKey,
  normalizeIntentText,
  intentComparisonKey,
  normalizeEvidenceText,
} from './reconciler-text-utils.js';

export interface ThreadDedupResult {
  accepted: ReconciledThreadAdd[];
  autoResolvedThreadIds: string[];
}

export const THREAD_JACCARD_THRESHOLDS: Record<ThreadType, number> = {
  [ThreadType.RELATIONSHIP]: 0.58,
  [ThreadType.MORAL]: 0.58,
  [ThreadType.MYSTERY]: 0.62,
  [ThreadType.INFORMATION]: 0.62,
  [ThreadType.QUEST]: 0.66,
  [ThreadType.RESOURCE]: 0.66,
  [ThreadType.DANGER]: 0.66,
};

const THREAD_STOP_PHRASES = ['currently', 'right now', 'at this point', 'for now'] as const;

export function normalizeThreadAdds(additions: readonly ThreadAdd[]): ReconciledThreadAdd[] {
  return dedupeByKey(
    additions
      .map((entry) => ({
        text: normalizeIntentText(entry.text),
        threadType: entry.threadType,
        urgency: entry.urgency,
      }))
      .filter((entry) => entry.text),
    (entry) => `${intentComparisonKey(entry.text)}|${entry.threadType}|${entry.urgency}`
  );
}

function normalizeThreadSimilarityText(value: string): string {
  let normalized = normalizeEvidenceText(value);

  for (const phrase of THREAD_STOP_PHRASES) {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`\\b${escapedPhrase}\\b`, 'g'), ' ');
  }

  return normalized.replace(/\s+/g, ' ').trim();
}

function tokenizeThreadSimilarityText(value: string): ReadonlySet<string> {
  const normalized = normalizeThreadSimilarityText(value);
  if (!normalized) {
    return new Set();
  }

  return new Set(normalized.split(/\s+/).filter((token) => token.length >= 2));
}

function jaccardSimilarity(
  leftTokens: ReadonlySet<string>,
  rightTokens: ReadonlySet<string>
): number {
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  const smaller = leftTokens.size <= rightTokens.size ? leftTokens : rightTokens;
  const larger = leftTokens.size <= rightTokens.size ? rightTokens : leftTokens;

  for (const token of smaller) {
    if (larger.has(token)) {
      intersectionSize += 1;
    }
  }

  const unionSize = leftTokens.size + rightTokens.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

function dedupAgainstPreviousThreads(
  candidates: readonly ReconciledThreadAdd[],
  previousThreads: StateReconciliationPreviousState['threads'],
  resolvedThreadIds: readonly string[]
): ThreadDedupResult {
  const resolvedThreadIdSet = new Set(resolvedThreadIds);
  const accepted: ReconciledThreadAdd[] = [];
  const autoResolvedThreadIds: string[] = [];

  for (const candidate of candidates) {
    const threshold = THREAD_JACCARD_THRESHOLDS[candidate.threadType];
    const candidateTokens = tokenizeThreadSimilarityText(candidate.text);
    const equivalentPreviousThreads = previousThreads.filter((previousThread) => {
      if (previousThread.threadType !== candidate.threadType) {
        return false;
      }
      const similarity = jaccardSimilarity(
        candidateTokens,
        tokenizeThreadSimilarityText(previousThread.text)
      );
      return similarity >= threshold;
    });

    if (equivalentPreviousThreads.length > 0) {
      const unresolvedEquivalentThread = equivalentPreviousThreads.find(
        (previousThread) => !resolvedThreadIdSet.has(previousThread.id)
      );

      if (unresolvedEquivalentThread) {
        autoResolvedThreadIds.push(unresolvedEquivalentThread.id);
        resolvedThreadIdSet.add(unresolvedEquivalentThread.id);
      }
    }

    accepted.push(candidate);
  }

  return { accepted, autoResolvedThreadIds };
}

function dedupWithinBatch(candidates: readonly ReconciledThreadAdd[]): ReconciledThreadAdd[] {
  const accepted: ReconciledThreadAdd[] = [];

  for (const candidate of candidates) {
    const threshold = THREAD_JACCARD_THRESHOLDS[candidate.threadType];
    const candidateTokens = tokenizeThreadSimilarityText(candidate.text);

    const duplicateAcceptedThread = accepted.find((existing) => {
      if (existing.threadType !== candidate.threadType) {
        return false;
      }

      const similarity = jaccardSimilarity(
        candidateTokens,
        tokenizeThreadSimilarityText(existing.text)
      );
      return similarity >= threshold;
    });

    if (duplicateAcceptedThread) {
      continue;
    }

    accepted.push(candidate);
  }

  return accepted;
}

export function applyThreadDedupAndContradictionRules(
  candidateAdds: readonly ReconciledThreadAdd[],
  previousThreads: StateReconciliationPreviousState['threads'],
  resolvedThreadIds: readonly string[]
): ThreadDedupResult {
  const afterPrevious = dedupAgainstPreviousThreads(
    candidateAdds,
    previousThreads,
    resolvedThreadIds
  );
  const accepted = dedupWithinBatch(afterPrevious.accepted);
  return { accepted, autoResolvedThreadIds: afterPrevious.autoResolvedThreadIds };
}
