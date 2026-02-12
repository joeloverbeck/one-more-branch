import type { ThreadAdd } from '../llm/types.js';
import { ThreadType } from '../models/state/index.js';
import type {
  ReconciledThreadAdd,
  StateReconciliationDiagnostic,
  StateReconciliationPreviousState,
} from './state-reconciler-types.js';
import {
  dedupeByKey,
  normalizeIntentText,
  intentComparisonKey,
  normalizeEvidenceText,
} from './reconciler-text-utils.js';

export const THREAD_DUPLICATE_LIKE_ADD = 'THREAD_DUPLICATE_LIKE_ADD';
export const THREAD_MISSING_EQUIVALENT_RESOLVE = 'THREAD_MISSING_EQUIVALENT_RESOLVE';
export const THREAD_DANGER_IMMEDIATE_HAZARD = 'THREAD_DANGER_IMMEDIATE_HAZARD';

export const THREAD_JACCARD_THRESHOLDS: Record<ThreadType, number> = {
  [ThreadType.RELATIONSHIP]: 0.58,
  [ThreadType.MORAL]: 0.58,
  [ThreadType.MYSTERY]: 0.62,
  [ThreadType.INFORMATION]: 0.62,
  [ThreadType.QUEST]: 0.66,
  [ThreadType.RESOURCE]: 0.66,
  [ThreadType.DANGER]: 0.66,
};

const THREAD_STOP_PHRASES = [
  'currently',
  'right now',
  'at this point',
  'for now',
] as const;

export function normalizeThreadAdds(additions: readonly ThreadAdd[]): ReconciledThreadAdd[] {
  return dedupeByKey(
    additions
      .map(entry => ({
        text: normalizeIntentText(entry.text),
        threadType: entry.threadType,
        urgency: entry.urgency,
      }))
      .filter(entry => entry.text),
    entry => `${intentComparisonKey(entry.text)}|${entry.threadType}|${entry.urgency}`,
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

  return new Set(normalized.split(/\s+/).filter(token => token.length >= 2));
}

function jaccardSimilarity(
  leftTokens: ReadonlySet<string>,
  rightTokens: ReadonlySet<string>,
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

function isImmediateDangerHazardText(value: string): boolean {
  const normalized = normalizeThreadSimilarityText(value);
  if (!normalized) {
    return false;
  }

  if (
    /\b(right now|currently|immediately|this scene|this moment|at once)\b/.test(normalized)
  ) {
    return true;
  }

  return /\b(is|are)\b.*\b(burning|collapsing|flooding|exploding|attacking|choking|spreading)\b/.test(
    normalized,
  );
}

function rejectImmediateHazards(
  candidates: readonly ReconciledThreadAdd[],
  diagnostics: StateReconciliationDiagnostic[],
): ReconciledThreadAdd[] {
  const accepted: ReconciledThreadAdd[] = [];

  for (const candidate of candidates) {
    if (
      candidate.threadType === ThreadType.DANGER &&
      isImmediateDangerHazardText(candidate.text)
    ) {
      diagnostics.push({
        code: THREAD_DANGER_IMMEDIATE_HAZARD,
        field: 'threadsAdded',
        message: `DANGER thread "${candidate.text}" describes an immediate scene hazard and must be tracked as a threat/constraint instead.`,
      });
      continue;
    }
    accepted.push(candidate);
  }

  return accepted;
}

function dedupAgainstPreviousThreads(
  candidates: readonly ReconciledThreadAdd[],
  previousThreads: StateReconciliationPreviousState['threads'],
  resolvedThreadIds: readonly string[],
  diagnostics: StateReconciliationDiagnostic[],
): ReconciledThreadAdd[] {
  const resolvedThreadIdSet = new Set(resolvedThreadIds);
  const accepted: ReconciledThreadAdd[] = [];

  for (const candidate of candidates) {
    const threshold = THREAD_JACCARD_THRESHOLDS[candidate.threadType];
    const candidateTokens = tokenizeThreadSimilarityText(candidate.text);
    const equivalentPreviousThreads = previousThreads.filter(previousThread => {
      if (previousThread.threadType !== candidate.threadType) {
        return false;
      }
      const similarity = jaccardSimilarity(
        candidateTokens,
        tokenizeThreadSimilarityText(previousThread.text),
      );
      return similarity >= threshold;
    });

    if (equivalentPreviousThreads.length > 0) {
      const unresolvedEquivalentThread = equivalentPreviousThreads.find(
        previousThread => !resolvedThreadIdSet.has(previousThread.id),
      );

      if (unresolvedEquivalentThread) {
        diagnostics.push({
          code: THREAD_DUPLICATE_LIKE_ADD,
          field: 'threadsAdded',
          message: `Thread add "${candidate.text}" is near-duplicate of existing thread "${unresolvedEquivalentThread.id}".`,
        });
        diagnostics.push({
          code: THREAD_MISSING_EQUIVALENT_RESOLVE,
          field: 'threadsAdded',
          message: `Near-duplicate thread add "${candidate.text}" requires resolving "${unresolvedEquivalentThread.id}" in the same payload.`,
        });
        continue;
      }
    }

    accepted.push(candidate);
  }

  return accepted;
}

function dedupWithinBatch(
  candidates: readonly ReconciledThreadAdd[],
  diagnostics: StateReconciliationDiagnostic[],
): ReconciledThreadAdd[] {
  const accepted: ReconciledThreadAdd[] = [];

  for (const candidate of candidates) {
    const threshold = THREAD_JACCARD_THRESHOLDS[candidate.threadType];
    const candidateTokens = tokenizeThreadSimilarityText(candidate.text);

    const duplicateAcceptedThread = accepted.find(existing => {
      if (existing.threadType !== candidate.threadType) {
        return false;
      }

      const similarity = jaccardSimilarity(
        candidateTokens,
        tokenizeThreadSimilarityText(existing.text),
      );
      return similarity >= threshold;
    });

    if (duplicateAcceptedThread) {
      diagnostics.push({
        code: THREAD_DUPLICATE_LIKE_ADD,
        field: 'threadsAdded',
        message: `Thread add "${candidate.text}" is near-duplicate of another added thread "${duplicateAcceptedThread.text}".`,
      });
      continue;
    }

    accepted.push(candidate);
  }

  return accepted;
}

export function applyThreadDedupAndContradictionRules(
  candidateAdds: readonly ReconciledThreadAdd[],
  previousThreads: StateReconciliationPreviousState['threads'],
  resolvedThreadIds: readonly string[],
  diagnostics: StateReconciliationDiagnostic[],
): ReconciledThreadAdd[] {
  const afterHazards = rejectImmediateHazards(candidateAdds, diagnostics);
  const afterPrevious = dedupAgainstPreviousThreads(
    afterHazards,
    previousThreads,
    resolvedThreadIds,
    diagnostics,
  );
  return dedupWithinBatch(afterPrevious, diagnostics);
}
