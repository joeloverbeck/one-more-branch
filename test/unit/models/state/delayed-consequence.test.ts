import { parsePageId } from '../../../../src/models/id.js';
import { isDelayedConsequence } from '../../../../src/models/state/delayed-consequence.js';

describe('isDelayedConsequence', () => {
  it('returns true for a valid delayed consequence', () => {
    expect(
      isDelayedConsequence({
        id: 'dc-1',
        description: 'The cracked seal begins to glow.',
        triggerCondition: 'When the protagonist reaches the sanctuary.',
        minPagesDelay: 2,
        maxPagesDelay: 5,
        currentAge: 3,
        triggered: false,
        sourcePageId: parsePageId(1),
      })
    ).toBe(true);
  });

  it('returns false when min/max delay bounds are invalid', () => {
    expect(
      isDelayedConsequence({
        id: 'dc-1',
        description: 'Invalid window',
        triggerCondition: 'Never valid',
        minPagesDelay: 4,
        maxPagesDelay: 2,
        currentAge: 1,
        triggered: false,
        sourcePageId: parsePageId(1),
      })
    ).toBe(false);
  });

  it('returns false when sourcePageId is not a valid PageId', () => {
    expect(
      isDelayedConsequence({
        id: 'dc-1',
        description: 'Bad source page',
        triggerCondition: 'Bad source page',
        minPagesDelay: 0,
        maxPagesDelay: 2,
        currentAge: 0,
        triggered: false,
        sourcePageId: 0,
      })
    ).toBe(false);
  });

  it('returns false for negative currentAge', () => {
    expect(
      isDelayedConsequence({
        id: 'dc-1',
        description: 'Negative age',
        triggerCondition: 'Never',
        minPagesDelay: 0,
        maxPagesDelay: 2,
        currentAge: -1,
        triggered: false,
        sourcePageId: parsePageId(1),
      })
    ).toBe(false);
  });
});
