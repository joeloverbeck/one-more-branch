import type {
  ThreadEntry,
  TrackedPromise,
  ThreadPayoffAssessment,
  PromisePayoffAssessment,
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

function formatPromiseLine(promise: TrackedPromise, includeId: boolean = true): string {
  const prefix = includeId ? `[${promise.id}] ` : '';
  return `- ${prefix}(${promise.promiseType}/${promise.scope}/${promise.suggestedUrgency}, ${promise.age} pages) ${promise.description}\n  Question: ${promise.resolutionHint}`;
}

const SCOPE_ORDER: Record<string, number> = { STORY: 0, ACT: 1, BEAT: 2, SCENE: 3 };

export function buildTrackedPromisesSection(
  accumulatedPromises: readonly TrackedPromise[],
  options: { includePromiseIds?: boolean } = {}
): string {
  if (accumulatedPromises.length === 0) {
    return '';
  }

  const includeId = options.includePromiseIds !== false;

  const sorted = [...accumulatedPromises].sort((a, b) => {
    const scopeDelta = (SCOPE_ORDER[a.scope] ?? 4) - (SCOPE_ORDER[b.scope] ?? 4);
    if (scopeDelta !== 0) return scopeDelta;
    return b.age - a.age;
  });

  const lines = ['=== TRACKED PROMISES ==='];

  if (accumulatedPromises.length >= THREAD_PACING.MAX_ACTIVE_PROMISES) {
    lines.push(
      `WARNING: ${accumulatedPromises.length} active promises (limit: ${THREAD_PACING.MAX_ACTIVE_PROMISES}). Prioritize resolving existing promises over detecting new ones.`
    );
    lines.push('');
  }

  const agingPromises = sorted.filter(
    (promise) => promise.age >= THREAD_PACING.PROMISE_AGING_NOTICE_PAGES
  );
  const recentPromises = sorted.filter(
    (promise) => promise.age < THREAD_PACING.PROMISE_AGING_NOTICE_PAGES
  );

  if (agingPromises.length > 0) {
    lines.push('Aging promises (opportunities for reincorporation):');
    for (const promise of agingPromises) {
      lines.push(formatPromiseLine(promise, includeId));
    }
    lines.push('');
  }

  if (recentPromises.length > 0) {
    lines.push('Recent promises:');
    for (const promise of recentPromises) {
      lines.push(formatPromiseLine(promise, includeId));
    }
    lines.push('');
  }

  lines.push(
    'SCENE-scoped promises auto-expire after 4 pages if unresolved. All promises are opportunities for reincorporation, not mandatory beats.'
  );
  lines.push('');

  return lines.join('\n') + '\n';
}

export function buildPayoffFeedbackSection(
  parentPayoffAssessments: readonly ThreadPayoffAssessment[],
  parentPromisePayoffAssessments?: readonly PromisePayoffAssessment[],
  options: { includePromiseIds?: boolean } = {}
): string {
  const includePromiseIds = options.includePromiseIds !== false;

  const rushedThreadPayoffs = parentPayoffAssessments.filter(
    (a) => a.satisfactionLevel === 'RUSHED'
  );
  const rushedPromisePayoffs = (parentPromisePayoffAssessments ?? []).filter(
    (a) => a.satisfactionLevel === 'RUSHED'
  );

  if (rushedThreadPayoffs.length === 0 && rushedPromisePayoffs.length === 0) {
    return '';
  }

  const parts = ['=== PAYOFF QUALITY FEEDBACK ==='];
  parts.push(
    'Previous resolutions were assessed as rushed. Ensure future resolutions develop through action and consequence, not exposition.'
  );

  if (rushedThreadPayoffs.length > 0) {
    parts.push(
      `Rushed thread payoffs: ${rushedThreadPayoffs.map((a) => `[${a.threadId}] ${a.threadText}`).join('; ')}`
    );
  }

  if (rushedPromisePayoffs.length > 0) {
    const formatPayoff = includePromiseIds
      ? (a: PromisePayoffAssessment): string => `[${a.promiseId}] ${a.description}`
      : (a: PromisePayoffAssessment): string => a.description;
    parts.push(`Rushed promise payoffs: ${rushedPromisePayoffs.map(formatPayoff).join('; ')}`);
  }

  return parts.join('\n') + '\n\n';
}
