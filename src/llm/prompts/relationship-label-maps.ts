const VALENCE_LABELS = [
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
] as const;

const TENSION_LABELS = [
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
] as const;

const VALENCE_DELTA_LABELS = [
  'large cooling',
  'slight cooling',
  'stable',
  'slight warming',
  'large warming',
] as const;

const TENSION_DELTA_LABELS = [
  'major de-escalation',
  'slight de-escalation',
  'stable',
  'slight escalation',
  'major escalation',
] as const;

function roundAndClamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function valenceLabel(value: number): string {
  return VALENCE_LABELS[roundAndClamp(value, -5, 5) + 5]!;
}

export function tensionLabel(value: number): string {
  return TENSION_LABELS[roundAndClamp(value, 0, 10)]!;
}

export function valenceDeltaLabel(value: number): string {
  return VALENCE_DELTA_LABELS[roundAndClamp(value, -2, 2) + 2]!;
}

export function tensionDeltaLabel(value: number): string {
  return TENSION_DELTA_LABELS[roundAndClamp(value, -2, 2) + 2]!;
}
