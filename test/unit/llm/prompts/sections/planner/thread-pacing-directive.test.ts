import {
  buildThreadAgingSection,
  buildNarrativePromisesSection,
  buildPayoffFeedbackSection,
} from '../../../../../../src/llm/prompts/sections/planner/thread-pacing-directive';
import { PromiseType, ThreadType, Urgency } from '../../../../../../src/models/state/keyed-entry';
import type {
  ThreadEntry,
  TrackedPromise,
  ThreadPayoffAssessment,
} from '../../../../../../src/models/state/keyed-entry';
import type { DetectedPromise } from '../../../../../../src/llm/analyst-types';

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

describe('buildNarrativePromisesSection', () => {
  const makeTrackedPromise = (
    desc: string,
    type: TrackedPromise['promiseType'] = PromiseType.FORESHADOWING
  ): TrackedPromise => ({
    id: 'pr-1',
    age: 2,
    description: desc,
    promiseType: type,
    suggestedUrgency: Urgency.MEDIUM,
  });

  const makeDetectedPromise = (
    desc: string,
    type: DetectedPromise['promiseType'] = PromiseType.FORESHADOWING
  ): DetectedPromise => ({
    description: desc,
    promiseType: type,
    suggestedUrgency: Urgency.MEDIUM,
  });

  it('returns empty string when no promises', () => {
    expect(buildNarrativePromisesSection([], [])).toBe('');
  });

  it('includes inherited and analyst-detected promises', () => {
    const inherited = [makeTrackedPromise('Old foreshadowing')];
    const detected = [makeDetectedPromise('New chekhov gun', PromiseType.CHEKHOV_GUN)];
    const result = buildNarrativePromisesSection(inherited, detected);
    expect(result).toContain('NARRATIVE PROMISES');
    expect(result).toContain('Old foreshadowing');
    expect(result).toContain('New chekhov gun');
    expect(result).toContain('CHEKHOV_GUN');
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
