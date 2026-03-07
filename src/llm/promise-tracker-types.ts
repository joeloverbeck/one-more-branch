import type {
  PromisePayoffAssessment,
  PromiseScope,
  PromiseType,
  ThreadPayoffAssessment,
  AgedTrackedPromise,
  Urgency,
} from '../models/state/index.js';
import type { DelayedConsequence } from '../models/state/delayed-consequence.js';
import type { DelayedConsequenceDraft } from './writer-types.js';

export interface DetectedPromise {
  readonly description: string;
  readonly promiseType: PromiseType;
  readonly scope: PromiseScope;
  readonly resolutionHint: string;
  readonly suggestedUrgency: Urgency;
}

export interface PromiseTrackerResult {
  promisesDetected: DetectedPromise[];
  promisesResolved: string[];
  promisePayoffAssessments: PromisePayoffAssessment[];
  threadPayoffAssessments: ThreadPayoffAssessment[];
  premisePromiseFulfilled: string | null;
  obligatorySceneFulfilled: string | null;
  delayedConsequencesTriggered: string[];
  delayedConsequencesCreated: DelayedConsequenceDraft[];
}

export interface PromiseTrackerContext {
  readonly narrative: string;
  readonly sceneSummary: string;
  readonly activeTrackedPromises: readonly AgedTrackedPromise[];
  readonly threadsResolved: readonly string[];
  readonly threadAges: Readonly<Record<string, number>>;
  readonly openThreads: readonly { readonly id: string; readonly text: string }[];
  readonly premisePromises: readonly string[];
  readonly fulfilledPremisePromises: readonly string[];
  readonly delayedConsequencesEligible: readonly DelayedConsequence[];
  readonly activeBeatObligationTag?: string;
}
