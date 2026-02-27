import type { PageId } from '../id.js';
import { isPageId } from '../id.js';

export interface DelayedConsequence {
  readonly id: string;
  readonly description: string;
  readonly triggerCondition: string;
  readonly minPagesDelay: number;
  readonly maxPagesDelay: number;
  readonly currentAge: number;
  readonly triggered: boolean;
  readonly sourcePageId: PageId;
}

export function isDelayedConsequence(value: unknown): value is DelayedConsequence {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const minPagesDelay = obj['minPagesDelay'];
  const maxPagesDelay = obj['maxPagesDelay'];
  const currentAge = obj['currentAge'];

  return (
    typeof obj['id'] === 'string' &&
    obj['id'].trim().length > 0 &&
    typeof obj['description'] === 'string' &&
    obj['description'].trim().length > 0 &&
    typeof obj['triggerCondition'] === 'string' &&
    obj['triggerCondition'].trim().length > 0 &&
    typeof minPagesDelay === 'number' &&
    Number.isInteger(minPagesDelay) &&
    minPagesDelay >= 0 &&
    typeof maxPagesDelay === 'number' &&
    Number.isInteger(maxPagesDelay) &&
    maxPagesDelay >= minPagesDelay &&
    typeof currentAge === 'number' &&
    Number.isInteger(currentAge) &&
    currentAge >= 0 &&
    typeof obj['triggered'] === 'boolean' &&
    isPageId(obj['sourcePageId'])
  );
}
