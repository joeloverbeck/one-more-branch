import type { AnalystResult } from '../llm/analyst-types';

/**
 * Computes thread ages for a first page.
 * All threads are new on the opening page, so all get age 0.
 */
export function computeFirstPageThreadAges(
  threadsAdded: readonly { text: string }[]
): Readonly<Record<string, number>> {
  const ages: Record<string, number> = {};
  for (let i = 0; i < threadsAdded.length; i++) {
    ages[`td-${i + 1}`] = 0;
  }
  return ages;
}

/**
 * Computes thread ages for a continuation page.
 * Inherited threads: parentAge + 1, new threads: 0, resolved threads: removed.
 */
export function computeContinuationThreadAges(
  parentThreadAges: Readonly<Record<string, number>>,
  parentOpenThreadIds: readonly string[],
  threadsAdded: readonly { text: string }[],
  threadsResolved: readonly string[],
  newThreadStartId: number
): Readonly<Record<string, number>> {
  const ages: Record<string, number> = {};
  const resolvedSet = new Set(threadsResolved);

  // Increment ages for inherited threads that weren't resolved
  for (const threadId of parentOpenThreadIds) {
    if (!resolvedSet.has(threadId)) {
      const parentAge = parentThreadAges[threadId] ?? 0;
      ages[threadId] = parentAge + 1;
    }
  }

  // New threads get age 0 (IDs are assigned sequentially by the reconciler)
  for (let i = 0; i < threadsAdded.length; i++) {
    const newId = `td-${newThreadStartId + i + 1}`;
    ages[newId] = 0;
  }

  return ages;
}

/**
 * Augments the reconciler's threadsResolved with thread IDs from the analyst's
 * threadPayoffAssessments. The analyst acts as a safety net — if it assessed
 * a thread payoff but the accountant missed including that thread in
 * resolveIds, we add it here. Only IDs that exist in parentOpenThreads are
 * added (validation guard).
 */
export function augmentThreadsResolvedFromAnalyst(
  reconcilerThreadsResolved: readonly string[],
  analystResult: AnalystResult | null,
  parentOpenThreads: readonly { id: string }[]
): readonly string[] {
  if (!analystResult || analystResult.threadPayoffAssessments.length === 0) {
    return reconcilerThreadsResolved;
  }
  const existing = new Set(reconcilerThreadsResolved);
  const parentIds = new Set(parentOpenThreads.map((t) => t.id));
  const additional = analystResult.threadPayoffAssessments
    .filter((a) => !existing.has(a.threadId) && parentIds.has(a.threadId))
    .map((a) => a.threadId);
  if (additional.length === 0) {
    return reconcilerThreadsResolved;
  }
  return [...reconcilerThreadsResolved, ...additional];
}
