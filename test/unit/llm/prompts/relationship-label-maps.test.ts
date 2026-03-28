import {
  tensionDeltaLabel,
  tensionLabel,
  valenceDeltaLabel,
  valenceLabel,
} from '../../../../src/llm/prompts/relationship-label-maps';

describe('relationship-label-maps', () => {
  it('maps every valence score from -5 to +5', () => {
    expect(
      [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((value) => valenceLabel(value))
    ).toEqual([
      'deeply hostile',
      'hostile',
      'cold and antagonistic',
      'wary and distrustful',
      'cool and guarded',
      'neutral',
      'cautiously warm',
      'warm and friendly',
      'trusting and close',
      'devoted',
      'unconditionally loyal',
    ]);
  });

  it('maps every tension score from 0 to 10', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => tensionLabel(value))).toEqual([
      'no tension',
      'faint unease',
      'mild undercurrent',
      'noticeable friction',
      'growing strain',
      'significant pressure',
      'palpable stress',
      'high tension',
      'near breaking point',
      'critical volatility',
      'unbearable pressure',
    ]);
  });

  it('maps every valence delta from -2 to +2', () => {
    expect([-2, -1, 0, 1, 2].map((value) => valenceDeltaLabel(value))).toEqual([
      'large cooling',
      'slight cooling',
      'stable',
      'slight warming',
      'large warming',
    ]);
  });

  it('maps every tension delta from -2 to +2', () => {
    expect([-2, -1, 0, 1, 2].map((value) => tensionDeltaLabel(value))).toEqual([
      'major de-escalation',
      'slight de-escalation',
      'stable',
      'slight escalation',
      'major escalation',
    ]);
  });

  it('clamps out-of-range values before lookup', () => {
    expect(valenceLabel(7)).toBe('unconditionally loyal');
    expect(valenceLabel(-8)).toBe('deeply hostile');
    expect(tensionLabel(12)).toBe('unbearable pressure');
    expect(tensionDeltaLabel(-10)).toBe('major de-escalation');
  });

  it('rounds non-integer values to the nearest integer before lookup', () => {
    expect(valenceLabel(2.7)).toBe('trusting and close');
    expect(valenceDeltaLabel(-0.6)).toBe('slight cooling');
    expect(tensionLabel(6.6)).toBe('high tension');
    expect(tensionDeltaLabel(1.2)).toBe('slight escalation');
  });
});
