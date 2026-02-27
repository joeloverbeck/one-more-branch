import type { DelayedConsequence } from '../models/state/delayed-consequence.js';

/**
 * Ages pending delayed consequences by one page.
 * Already-triggered consequences keep their current age.
 */
export function incrementDelayedConsequenceAges(
  consequences: readonly DelayedConsequence[]
): readonly DelayedConsequence[] {
  return consequences.map((consequence) => {
    if (consequence.triggered) {
      return consequence;
    }
    return { ...consequence, currentAge: consequence.currentAge + 1 };
  });
}

/**
 * Returns delayed consequences eligible to trigger on this page.
 * Eligibility window is inclusive: minPagesDelay <= currentAge <= maxPagesDelay.
 */
export function getTriggerEligibleDelayedConsequences(
  consequences: readonly DelayedConsequence[]
): readonly DelayedConsequence[] {
  return consequences.filter(
    (consequence) =>
      !consequence.triggered &&
      consequence.currentAge >= consequence.minPagesDelay &&
      consequence.currentAge <= consequence.maxPagesDelay
  );
}

/**
 * Marks delayed consequences as triggered when their IDs are selected by analyst evaluation.
 */
export function applyTriggeredDelayedConsequences(
  consequences: readonly DelayedConsequence[],
  triggeredIds: readonly string[]
): readonly DelayedConsequence[] {
  if (triggeredIds.length === 0) {
    return consequences;
  }

  const triggeredSet = new Set(triggeredIds);
  return consequences.map((consequence) =>
    triggeredSet.has(consequence.id) ? { ...consequence, triggered: true } : consequence
  );
}
