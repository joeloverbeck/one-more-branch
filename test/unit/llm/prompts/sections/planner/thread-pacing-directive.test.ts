import {
  buildThreadAgingSection,
  buildTrackedPromisesSection,
  buildPayoffFeedbackSection,
} from '../../../../../../src/llm/prompts/sections/planner/thread-pacing-directive';
import { THREAD_PACING } from '../../../../../../src/config/thread-pacing-config';
import { PromiseType, ThreadType, Urgency } from '../../../../../../src/models/state/keyed-entry';
import type {
  ThreadEntry,
  TrackedPromise,
  ThreadPayoffAssessment,
} from '../../../../../../src/models/state/keyed-entry';

function makeThread(id: string, type: ThreadType, urgency: Urgency, text: string): ThreadEntry {
  return { id, text, threadType: type, urgency };
}

describe('buildThreadAgingSection', () => {
  it('returns empty string when no threads exist', () => {
    expect(buildThreadAgingSection([], {})).toBe('');
  });

  it('returns empty string when no threads are overdue', () => {
    const threads = [makeThread('td-1', ThreadType.QUEST, Urgency.HIGH, 'Find the key')];
    const ages = { 'td-1': 2 }; // HIGH threshold is 4
    expect(buildThreadAgingSection(threads, ages)).toBe('');
  });

  it('includes overdue HIGH urgency thread at threshold', () => {
    const threads = [makeThread('td-1', ThreadType.QUEST, Urgency.HIGH, 'Find the key')];
    const ages = { 'td-1': 4 }; // exactly at HIGH threshold
    const result = buildThreadAgingSection(threads, ages);
    expect(result).toContain('THREAD PACING PRESSURE');
    expect(result).toContain('[td-1]');
    expect(result).toContain('4 pages old');
    expect(result).toContain('Prioritize paying off');
  });

  it('includes overdue MEDIUM urgency thread', () => {
    const threads = [makeThread('td-2', ThreadType.MYSTERY, Urgency.MEDIUM, 'The missing letter')];
    const ages = { 'td-2': 7 }; // MEDIUM threshold is 7
    const result = buildThreadAgingSection(threads, ages);
    expect(result).toContain('[td-2]');
  });

  it('includes overdue LOW urgency thread', () => {
    const threads = [
      makeThread('td-3', ThreadType.INFORMATION, Urgency.LOW, 'Rumors of a distant war'),
    ];
    const ages = { 'td-3': 10 }; // LOW threshold is 10
    const result = buildThreadAgingSection(threads, ages);
    expect(result).toContain('[td-3]');
  });

  it('excludes non-overdue threads from the section', () => {
    const threads = [
      makeThread('td-1', ThreadType.QUEST, Urgency.HIGH, 'Overdue quest'),
      makeThread('td-2', ThreadType.INFORMATION, Urgency.LOW, 'Young thread'),
    ];
    const ages = { 'td-1': 5, 'td-2': 2 };
    const result = buildThreadAgingSection(threads, ages);
    expect(result).toContain('[td-1]');
    expect(result).not.toContain('[td-2]');
  });
});

describe('buildTrackedPromisesSection', () => {
  const makeTrackedPromise = (
    id: string,
    age: number,
    desc: string,
    type: TrackedPromise['promiseType'] = PromiseType.FORESHADOWING
  ): TrackedPromise => ({
    id,
    age,
    description: desc,
    promiseType: type,
    suggestedUrgency: Urgency.MEDIUM,
  });

  it('returns empty string when no promises', () => {
    expect(buildTrackedPromisesSection([])).toBe('');
  });

  it('includes tracked promises with age and IDs sorted oldest-first', () => {
    const promises = [
      makeTrackedPromise('pr-2', 1, 'New chekhov gun', PromiseType.CHEKHOV_GUN),
      makeTrackedPromise('pr-1', 6, 'Old foreshadowing'),
    ];
    const result = buildTrackedPromisesSection(promises);
    expect(result).toContain('TRACKED PROMISES');
    expect(result).toContain('[pr-1]');
    expect(result).toContain('(FORESHADOWING/MEDIUM, 6 pages)');
    expect(result).toContain('Old foreshadowing');
    expect(result).toContain('New chekhov gun');
    expect(result).toContain('CHEKHOV_GUN');

    expect(result.indexOf('[pr-1]')).toBeLessThan(result.indexOf('[pr-2]'));
  });

  it('separates aging and recent promises at configured threshold', () => {
    const threshold = THREAD_PACING.PROMISE_AGING_NOTICE_PAGES;
    const promises = [
      makeTrackedPromise('pr-1', threshold + 1, 'Aging promise'),
      makeTrackedPromise('pr-2', threshold - 1, 'Recent promise'),
    ];

    const result = buildTrackedPromisesSection(promises);
    expect(result).toContain('Aging promises:');
    expect(result).toContain('Recent promises:');
    expect(result).toContain('[pr-1]');
    expect(result).toContain('[pr-2]');

    const agingHeaderIndex = result.indexOf('Aging promises:');
    const recentHeaderIndex = result.indexOf('Recent promises:');
    const agingPromiseIndex = result.indexOf('[pr-1]');
    const recentPromiseIndex = result.indexOf('[pr-2]');
    expect(agingHeaderIndex).toBeLessThan(recentHeaderIndex);
    expect(agingPromiseIndex).toBeLessThan(recentPromiseIndex);
  });

  it('classifies age exactly at threshold as aging', () => {
    const threshold = THREAD_PACING.PROMISE_AGING_NOTICE_PAGES;
    const promises = [
      makeTrackedPromise('pr-1', threshold, 'Threshold promise'),
      makeTrackedPromise('pr-2', threshold - 1, 'Recent promise'),
    ];

    const result = buildTrackedPromisesSection(promises);
    const agingSection = result.split('Recent promises:')[0] ?? '';
    expect(agingSection).toContain('[pr-1]');
    expect(agingSection).not.toContain('[pr-2]');
  });

  it('uses soft encouragement language, not mandate wording', () => {
    const promises = [makeTrackedPromise('pr-1', THREAD_PACING.PROMISE_AGING_NOTICE_PAGES, 'Old hint')];
    const result = buildTrackedPromisesSection(promises);
    expect(result).toContain(
      'These represent opportunities for reincorporation. Consider whether any fit naturally into the upcoming scene.'
    );
    expect(result).toContain('not mandatory beats');
  });
});

describe('buildPayoffFeedbackSection', () => {
  it('returns empty string when no rushed payoffs', () => {
    const assessments: ThreadPayoffAssessment[] = [
      {
        threadId: 'td-1',
        threadText: 'Some thread',
        satisfactionLevel: 'WELL_EARNED',
        reasoning: 'Great resolution',
      },
    ];
    expect(buildPayoffFeedbackSection(assessments)).toBe('');
  });

  it('returns empty string when no assessments', () => {
    expect(buildPayoffFeedbackSection([])).toBe('');
  });

  it('includes feedback when rushed payoffs exist', () => {
    const assessments: ThreadPayoffAssessment[] = [
      {
        threadId: 'td-2',
        threadText: 'Find the artifact',
        satisfactionLevel: 'RUSHED',
        reasoning: 'Resolved in a single line',
      },
    ];
    const result = buildPayoffFeedbackSection(assessments);
    expect(result).toContain('PAYOFF QUALITY FEEDBACK');
    expect(result).toContain('rushed');
    expect(result).toContain('[td-2]');
    expect(result).toContain('Find the artifact');
  });
});
