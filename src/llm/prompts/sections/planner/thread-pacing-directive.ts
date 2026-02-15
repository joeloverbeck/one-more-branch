import type {
  ThreadEntry,
  TrackedPromise,
  ThreadPayoffAssessment,
} from '../../../../models/state/index.js';
import { THREAD_PACING } from '../../../../config/thread-pacing-config.js';

const URGENCY_THRESHOLDS: Record<string, number> = {
  HIGH: THREAD_PACING.HIGH_URGENCY_OVERDUE_PAGES,
  MEDIUM: THREAD_PACING.MEDIUM_URGENCY_OVERDUE_PAGES,
  LOW: THREAD_PACING.LOW_URGENCY_OVERDUE_PAGES,
};

function getOverdueThreads(
  openThreads: readonly ThreadEntry[],
  threadAges: Readonly<Record<string, number>>
): readonly ThreadEntry[] {
  return openThreads.filter((thread) => {
    const age = threadAges[thread.id];
    if (age === undefined) return false;
    const threshold = URGENCY_THRESHOLDS[thread.urgency] ?? THREAD_PACING.LOW_URGENCY_OVERDUE_PAGES;
    return age >= threshold;
  });
}

export function buildThreadAgingSection(
  openThreads: readonly ThreadEntry[],
  threadAges: Readonly<Record<string, number>>
): string {
  if (openThreads.length === 0) {
    return '';
  }

  const overdueThreads = getOverdueThreads(openThreads, threadAges);

  if (overdueThreads.length === 0) {
    return '';
  }

  const lines = [
    '=== THREAD PACING PRESSURE ===',
    'The following threads are overdue and should be prioritized:',
  ];

  for (const thread of overdueThreads) {
    const age = threadAges[thread.id] ?? 0;
    lines.push(
      `- [${thread.id}] (${thread.threadType}/${thread.urgency}, ${age} pages old): ${thread.text}`
    );
  }

  lines.push('');
  lines.push(
    'Prioritize paying off or meaningfully escalating at least one overdue thread per scene.'
  );
  lines.push('');

  return lines.join('\n') + '\n';
}

export function buildTrackedPromisesSection(
  accumulatedPromises: readonly TrackedPromise[]
): string {
  if (accumulatedPromises.length === 0) {
    return '';
  }

  const sortedByAge = [...accumulatedPromises].sort((a, b) => b.age - a.age);
  const agingPromises = sortedByAge.filter(
    (promise) => promise.age >= THREAD_PACING.PROMISE_AGING_NOTICE_PAGES
  );
  const recentPromises = sortedByAge.filter(
    (promise) => promise.age < THREAD_PACING.PROMISE_AGING_NOTICE_PAGES
  );

  const lines = ['=== TRACKED PROMISES (implicit foreshadowing not yet captured as threads) ==='];

  if (agingPromises.length > 0) {
    lines.push('Aging promises:');
    lines.push(
      'These represent opportunities for reincorporation. Consider whether any fit naturally into the upcoming scene.'
    );
    for (const promise of agingPromises) {
      lines.push(
        `- [${promise.id}] (${promise.promiseType}/${promise.suggestedUrgency}, ${promise.age} pages) ${promise.description}`
      );
    }
    lines.push('');
  }

  if (recentPromises.length > 0) {
    lines.push('Recent promises:');
    for (const promise of recentPromises) {
      lines.push(
        `- [${promise.id}] (${promise.promiseType}/${promise.suggestedUrgency}, ${promise.age} pages) ${promise.description}`
      );
    }
    lines.push('');
  }

  lines.push('All promises are opportunities for reincorporation, not mandatory beats.');
  lines.push('');

  return lines.join('\n') + '\n';
}

export function buildPayoffFeedbackSection(
  parentPayoffAssessments: readonly ThreadPayoffAssessment[]
): string {
  const rushedPayoffs = parentPayoffAssessments.filter((a) => a.satisfactionLevel === 'RUSHED');
  if (rushedPayoffs.length === 0) {
    return '';
  }

  return `=== PAYOFF QUALITY FEEDBACK ===
Previous thread resolution was assessed as rushed. Ensure future resolutions develop through action and consequence, not exposition.
Rushed payoffs: ${rushedPayoffs.map((a) => `[${a.threadId}] ${a.threadText}`).join('; ')}

`;
}
