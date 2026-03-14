import { resolveMilestoneAlignmentSkip } from '../../../src/engine/milestone-alignment';
import { createMockAnalystResult } from '../../fixtures/llm-results';
import type { AccumulatedStructureState } from '../../../src/models/story-arc';

describe('resolveMilestoneAlignmentSkip', () => {
  const baseState: AccumulatedStructureState = {
    currentActIndex: 0,
    currentMilestoneIndex: 0,
    milestoneProgressions: [
      { milestoneId: '1.1', status: 'active' },
      { milestoneId: '1.2', status: 'pending' },
      { milestoneId: '1.3', status: 'pending' },
      { milestoneId: '1.4', status: 'pending' },
    ],
    pagesInCurrentMilestone: 3,
    pacingNudge: null,
  };

  it('returns undefined when milestoneConcluded is false', () => {
    const analyst = createMockAnalystResult({
      alignedMilestoneId: '1.4',
      milestoneAlignmentConfidence: 'HIGH',
      milestoneAlignmentReason: 'Narrative leaped ahead.',
    });

    const result = resolveMilestoneAlignmentSkip(analyst, false, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when analystResult is null', () => {
    const result = resolveMilestoneAlignmentSkip(null, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when alignedMilestoneId is null', () => {
    const analyst = createMockAnalystResult({
      alignedMilestoneId: null,
      milestoneAlignmentConfidence: 'HIGH',
      milestoneAlignmentReason: '',
    });

    const result = resolveMilestoneAlignmentSkip(analyst, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when confidence is MEDIUM', () => {
    const analyst = createMockAnalystResult({
      alignedMilestoneId: '1.4',
      milestoneAlignmentConfidence: 'MEDIUM',
      milestoneAlignmentReason: 'Somewhat aligned.',
    });

    const result = resolveMilestoneAlignmentSkip(analyst, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when confidence is LOW', () => {
    const analyst = createMockAnalystResult({
      alignedMilestoneId: '1.4',
      milestoneAlignmentConfidence: 'LOW',
      milestoneAlignmentReason: 'Weak alignment.',
    });

    const result = resolveMilestoneAlignmentSkip(analyst, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when aligned milestone is the next sequential milestone (no skip needed)', () => {
    const analyst = createMockAnalystResult({
      alignedMilestoneId: '1.2',
      milestoneAlignmentConfidence: 'HIGH',
      milestoneAlignmentReason: 'Normal progression.',
    });

    const result = resolveMilestoneAlignmentSkip(analyst, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns skip info when HIGH confidence and aligned milestone is 2+ milestones ahead', () => {
    const analyst = createMockAnalystResult({
      alignedMilestoneId: '1.4',
      milestoneAlignmentConfidence: 'HIGH',
      milestoneAlignmentReason: 'Narrative clearly in trial territory.',
    });

    const result = resolveMilestoneAlignmentSkip(analyst, true, baseState);

    expect(result).toBeDefined();
    expect(result!.targetMilestoneId).toBe('1.4');
    expect(result!.bridgedResolution).toBe('Implicitly resolved by narrative advancement');
  });

  it('returns skip info for cross-act skip with HIGH confidence', () => {
    const analyst = createMockAnalystResult({
      alignedMilestoneId: '2.1',
      milestoneAlignmentConfidence: 'HIGH',
      milestoneAlignmentReason: 'Narrative jumped to act 2.',
    });

    const result = resolveMilestoneAlignmentSkip(analyst, true, baseState);

    expect(result).toBeDefined();
    expect(result!.targetMilestoneId).toBe('2.1');
  });

  it('returns undefined when aligned milestone is behind the current position', () => {
    const stateAtBeat3: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 2,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
        { milestoneId: '1.2', status: 'concluded', resolution: 'Done.' },
        { milestoneId: '1.3', status: 'active' },
        { milestoneId: '1.4', status: 'pending' },
      ],
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
    };

    const analyst = createMockAnalystResult({
      alignedMilestoneId: '1.2',
      milestoneAlignmentConfidence: 'HIGH',
      milestoneAlignmentReason: 'Seems like milestone 1.2.',
    });

    const result = resolveMilestoneAlignmentSkip(analyst, true, stateAtBeat3);

    expect(result).toBeUndefined();
  });
});
