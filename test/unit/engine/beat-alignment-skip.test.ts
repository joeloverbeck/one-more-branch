import { resolveBeatAlignmentSkip } from '../../../src/engine/beat-alignment';
import { createMockAnalystResult } from '../../fixtures/llm-results';
import type { AccumulatedStructureState } from '../../../src/models/story-arc';

describe('resolveBeatAlignmentSkip', () => {
  const baseState: AccumulatedStructureState = {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions: [
      { beatId: '1.1', status: 'active' },
      { beatId: '1.2', status: 'pending' },
      { beatId: '1.3', status: 'pending' },
      { beatId: '1.4', status: 'pending' },
    ],
    pagesInCurrentBeat: 3,
    pacingNudge: null,
  };

  it('returns undefined when beatConcluded is false', () => {
    const analyst = createMockAnalystResult({
      alignedBeatId: '1.4',
      beatAlignmentConfidence: 'HIGH',
      beatAlignmentReason: 'Narrative leaped ahead.',
    });

    const result = resolveBeatAlignmentSkip(analyst, false, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when analystResult is null', () => {
    const result = resolveBeatAlignmentSkip(null, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when alignedBeatId is null', () => {
    const analyst = createMockAnalystResult({
      alignedBeatId: null,
      beatAlignmentConfidence: 'HIGH',
      beatAlignmentReason: '',
    });

    const result = resolveBeatAlignmentSkip(analyst, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when confidence is MEDIUM', () => {
    const analyst = createMockAnalystResult({
      alignedBeatId: '1.4',
      beatAlignmentConfidence: 'MEDIUM',
      beatAlignmentReason: 'Somewhat aligned.',
    });

    const result = resolveBeatAlignmentSkip(analyst, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when confidence is LOW', () => {
    const analyst = createMockAnalystResult({
      alignedBeatId: '1.4',
      beatAlignmentConfidence: 'LOW',
      beatAlignmentReason: 'Weak alignment.',
    });

    const result = resolveBeatAlignmentSkip(analyst, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when aligned beat is the next sequential beat (no skip needed)', () => {
    const analyst = createMockAnalystResult({
      alignedBeatId: '1.2',
      beatAlignmentConfidence: 'HIGH',
      beatAlignmentReason: 'Normal progression.',
    });

    const result = resolveBeatAlignmentSkip(analyst, true, baseState);

    expect(result).toBeUndefined();
  });

  it('returns skip info when HIGH confidence and aligned beat is 2+ beats ahead', () => {
    const analyst = createMockAnalystResult({
      alignedBeatId: '1.4',
      beatAlignmentConfidence: 'HIGH',
      beatAlignmentReason: 'Narrative clearly in trial territory.',
    });

    const result = resolveBeatAlignmentSkip(analyst, true, baseState);

    expect(result).toBeDefined();
    expect(result!.targetBeatId).toBe('1.4');
    expect(result!.bridgedResolution).toBe('Implicitly resolved by narrative advancement');
  });

  it('returns skip info for cross-act skip with HIGH confidence', () => {
    const analyst = createMockAnalystResult({
      alignedBeatId: '2.1',
      beatAlignmentConfidence: 'HIGH',
      beatAlignmentReason: 'Narrative jumped to act 2.',
    });

    const result = resolveBeatAlignmentSkip(analyst, true, baseState);

    expect(result).toBeDefined();
    expect(result!.targetBeatId).toBe('2.1');
  });

  it('returns undefined when aligned beat is behind the current position', () => {
    const stateAtBeat3: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 2,
      beatProgressions: [
        { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
        { beatId: '1.2', status: 'concluded', resolution: 'Done.' },
        { beatId: '1.3', status: 'active' },
        { beatId: '1.4', status: 'pending' },
      ],
      pagesInCurrentBeat: 1,
      pacingNudge: null,
    };

    const analyst = createMockAnalystResult({
      alignedBeatId: '1.2',
      beatAlignmentConfidence: 'HIGH',
      beatAlignmentReason: 'Seems like beat 1.2.',
    });

    const result = resolveBeatAlignmentSkip(analyst, true, stateAtBeat3);

    expect(result).toBeUndefined();
  });
});
