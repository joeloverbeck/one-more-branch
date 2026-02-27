import { z } from 'zod';

const PromiseTypeSchema = z
  .enum([
    'CHEKHOV_GUN',
    'FORESHADOWING',
    'UNRESOLVED_TENSION',
    'DRAMATIC_QUESTION',
    'MYSTERY_HOOK',
    'TICKING_CLOCK',
  ])
  .catch('FORESHADOWING');

const PromiseScopeSchema = z
  .enum(['SCENE', 'BEAT', 'ACT', 'STORY'])
  .catch('BEAT');

const UrgencySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']).catch('MEDIUM');

const SatisfactionLevelSchema = z.enum(['RUSHED', 'ADEQUATE', 'WELL_EARNED']).catch('ADEQUATE');

const DetectedPromiseSchema = z.object({
  description: z.string().default(''),
  promiseType: PromiseTypeSchema,
  scope: PromiseScopeSchema,
  resolutionHint: z.string().default(''),
  suggestedUrgency: UrgencySchema,
});

const PromisePayoffAssessmentSchema = z.object({
  promiseId: z.string().default(''),
  description: z.string().default(''),
  satisfactionLevel: SatisfactionLevelSchema,
  reasoning: z.string().default(''),
});

const ThreadPayoffAssessmentSchema = z.object({
  threadId: z.string().default(''),
  threadText: z.string().default(''),
  satisfactionLevel: SatisfactionLevelSchema,
  reasoning: z.string().default(''),
});

const DelayedConsequenceDraftSchema = z.object({
  description: z.string().default(''),
  triggerCondition: z.string().default(''),
  minPagesDelay: z.number().int().min(1).catch(2).default(2),
  maxPagesDelay: z.number().int().min(2).catch(5).default(5),
});

export const PromiseTrackerResultSchema = z.object({
  promisesDetected: z.array(DetectedPromiseSchema).catch([]).default([]),
  promisesResolved: z.array(z.string()).catch([]).default([]),
  promisePayoffAssessments: z.array(PromisePayoffAssessmentSchema).catch([]).default([]),
  threadPayoffAssessments: z.array(ThreadPayoffAssessmentSchema).catch([]).default([]),
  premisePromiseFulfilled: z.string().nullable().catch(null).default(null),
  obligatorySceneFulfilled: z.string().nullable().catch(null).default(null),
  delayedConsequencesTriggered: z.array(z.string()).catch([]).default([]),
  delayedConsequencesCreated: z.array(DelayedConsequenceDraftSchema).catch([]).default([]),
});
