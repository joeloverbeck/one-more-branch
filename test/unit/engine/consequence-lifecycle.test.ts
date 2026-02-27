import { parsePageId } from '../../../src/models/id.js';
import {
  getTriggerEligibleDelayedConsequences,
  incrementDelayedConsequenceAges,
} from '../../../src/engine/consequence-lifecycle.js';
import type { DelayedConsequence } from '../../../src/models/state/delayed-consequence.js';

function makeConsequence(
  overrides: Partial<DelayedConsequence> = {}
): DelayedConsequence {
  return {
    id: 'dc-1',
    description: 'A delayed narrative reversal.',
    triggerCondition: 'The player opens the wrong vault.',
    minPagesDelay: 2,
    maxPagesDelay: 4,
    currentAge: 0,
    triggered: false,
    sourcePageId: parsePageId(1),
    ...overrides,
  };
}

describe('incrementDelayedConsequenceAges', () => {
  it('increments age for untriggered delayed consequences', () => {
    const consequences = [makeConsequence({ currentAge: 2 })];

    const result = incrementDelayedConsequenceAges(consequences);

    expect(result).toEqual([makeConsequence({ currentAge: 3 })]);
  });

  it('does not increment age for triggered delayed consequences', () => {
    const consequences = [makeConsequence({ currentAge: 3, triggered: true })];

    const result = incrementDelayedConsequenceAges(consequences);

    expect(result).toEqual([makeConsequence({ currentAge: 3, triggered: true })]);
  });

  it('is immutable', () => {
    const original = makeConsequence({ currentAge: 1 });
    const consequences = [original];

    const result = incrementDelayedConsequenceAges(consequences);

    expect(result).not.toBe(consequences);
    expect(consequences).toEqual([makeConsequence({ currentAge: 1 })]);
    expect(result).toEqual([makeConsequence({ currentAge: 2 })]);
  });
});

describe('getTriggerEligibleDelayedConsequences', () => {
  it('returns untriggered consequences within the inclusive min/max delay window', () => {
    const consequences = [
      makeConsequence({ id: 'dc-1', currentAge: 2 }),
      makeConsequence({ id: 'dc-2', currentAge: 3 }),
      makeConsequence({ id: 'dc-3', currentAge: 4 }),
    ];

    const result = getTriggerEligibleDelayedConsequences(consequences);

    expect(result.map((item) => item.id)).toEqual(['dc-1', 'dc-2', 'dc-3']);
  });

  it('excludes consequences outside the window or already triggered', () => {
    const consequences = [
      makeConsequence({ id: 'dc-1', currentAge: 1 }), // before min
      makeConsequence({ id: 'dc-2', currentAge: 5 }), // after max
      makeConsequence({ id: 'dc-3', currentAge: 3, triggered: true }), // already triggered
      makeConsequence({ id: 'dc-4', currentAge: 3 }), // eligible
    ];

    const result = getTriggerEligibleDelayedConsequences(consequences);

    expect(result.map((item) => item.id)).toEqual(['dc-4']);
  });
});
