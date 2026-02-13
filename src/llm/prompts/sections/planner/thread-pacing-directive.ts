import type {
  ThreadEntry,
  NarrativePromise,
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

export function buildNarrativePromisesSection(
  inheritedPromises: readonly NarrativePromise[],
  parentAnalystPromises: readonly NarrativePromise[]
): string {
  const allPromises = [...inheritedPromises, ...parentAnalystPromises];
  if (allPromises.length === 0) {
    return '';
  }

  const lines = ['=== NARRATIVE PROMISES (implicit foreshadowing not yet captured as threads) ==='];

  for (const promise of allPromises) {
    lines.push(`- [${promise.promiseType}/${promise.suggestedUrgency}] ${promise.description}`);
  }

  lines.push('');
  lines.push(
    'Consider converting important promises to formal threads via stateIntents, ' +
      'or address them directly in sceneIntent.'
  );
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
