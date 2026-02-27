import type {
  PromisePayoffAssessment,
  ThreadPayoffAssessment,
} from '../../models/state/index.js';
import type { DetectedPromise, PromiseTrackerResult } from '../promise-tracker-types.js';
import type { DelayedConsequenceDraft } from '../writer-types.js';
import { isCanonicalIdForPrefix, STATE_ID_PREFIXES } from '../validation/state-id-prefixes.js';
import { PromiseTrackerResultSchema } from './promise-tracker-validation-schema.js';

const MAX_PROMISES_DETECTED = 2;
const MAX_DELAYED_CONSEQUENCES = 2;

function isCanonicalPromiseId(value: string): boolean {
  return isCanonicalIdForPrefix(value, STATE_ID_PREFIXES.promises);
}

function normalizeDetectedPromises(
  value: readonly {
    description: string;
    promiseType: string;
    scope: string;
    resolutionHint: string;
    suggestedUrgency: string;
  }[]
): DetectedPromise[] {
  return value
    .filter((p) => p.description.trim().length > 0 && p.resolutionHint.trim().length > 0)
    .slice(0, MAX_PROMISES_DETECTED)
    .map((p) => ({
      description: p.description.trim(),
      promiseType: p.promiseType as DetectedPromise['promiseType'],
      scope: p.scope as DetectedPromise['scope'],
      resolutionHint: p.resolutionHint.trim(),
      suggestedUrgency: p.suggestedUrgency as DetectedPromise['suggestedUrgency'],
    }));
}

function normalizePromisesResolved(value: readonly string[]): string[] {
  return value.map((id) => id.trim()).filter((id) => isCanonicalPromiseId(id));
}

function normalizePromisePayoffAssessments(
  value: readonly {
    promiseId: string;
    description: string;
    satisfactionLevel: string;
    reasoning: string;
  }[]
): PromisePayoffAssessment[] {
  return value
    .filter((a) => isCanonicalPromiseId(a.promiseId))
    .map((a) => ({
      promiseId: a.promiseId.trim(),
      description: a.description.trim(),
      satisfactionLevel: a.satisfactionLevel as PromisePayoffAssessment['satisfactionLevel'],
      reasoning: a.reasoning.trim(),
    }));
}

function normalizeThreadPayoffAssessments(
  value: readonly {
    threadId: string;
    threadText: string;
    satisfactionLevel: string;
    reasoning: string;
  }[]
): ThreadPayoffAssessment[] {
  return value
    .filter((a) => a.threadId.trim().length > 0)
    .map((a) => ({
      threadId: a.threadId.trim(),
      threadText: a.threadText.trim(),
      satisfactionLevel: a.satisfactionLevel as ThreadPayoffAssessment['satisfactionLevel'],
      reasoning: a.reasoning.trim(),
    }));
}

function normalizeDelayedConsequencesTriggered(value: readonly string[]): string[] {
  return value.map((id) => id.trim()).filter((id) => /^dc-\d+$/.test(id));
}

function normalizeDelayedConsequencesCreated(
  value: readonly {
    description: string;
    triggerCondition: string;
    minPagesDelay: number;
    maxPagesDelay: number;
  }[]
): DelayedConsequenceDraft[] {
  return value
    .filter((dc) => dc.description.trim().length > 0 && dc.triggerCondition.trim().length > 0)
    .slice(0, MAX_DELAYED_CONSEQUENCES)
    .map((dc) => ({
      description: dc.description.trim(),
      triggerCondition: dc.triggerCondition.trim(),
      minPagesDelay: Math.max(1, dc.minPagesDelay),
      maxPagesDelay: Math.max(dc.minPagesDelay + 1, dc.maxPagesDelay),
    }));
}

export function validatePromiseTrackerResponse(
  rawJson: unknown,
  rawResponse: string
): PromiseTrackerResult & { rawResponse: string } {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const validated = PromiseTrackerResultSchema.parse(parsed);
  const premisePromiseFulfilled = validated.premisePromiseFulfilled?.trim();
  const obligatorySceneFulfilled = validated.obligatorySceneFulfilled?.trim();

  return {
    promisesDetected: normalizeDetectedPromises(validated.promisesDetected),
    promisesResolved: normalizePromisesResolved(validated.promisesResolved),
    promisePayoffAssessments: normalizePromisePayoffAssessments(
      validated.promisePayoffAssessments
    ),
    threadPayoffAssessments: normalizeThreadPayoffAssessments(validated.threadPayoffAssessments),
    premisePromiseFulfilled:
      premisePromiseFulfilled && premisePromiseFulfilled.length > 0
        ? premisePromiseFulfilled
        : null,
    obligatorySceneFulfilled:
      obligatorySceneFulfilled && obligatorySceneFulfilled.length > 0
        ? obligatorySceneFulfilled
        : null,
    delayedConsequencesTriggered: normalizeDelayedConsequencesTriggered(
      validated.delayedConsequencesTriggered
    ),
    delayedConsequencesCreated: normalizeDelayedConsequencesCreated(
      validated.delayedConsequencesCreated
    ),
    rawResponse,
  };
}
