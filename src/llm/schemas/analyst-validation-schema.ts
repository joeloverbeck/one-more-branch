import { z } from 'zod';

const SceneMomentumSchema = z
  .enum(['STASIS', 'INCREMENTAL_PROGRESS', 'MAJOR_PROGRESS', 'REVERSAL_OR_SETBACK', 'SCOPE_SHIFT'])
  .catch('STASIS')
  .default('STASIS');

const ObjectiveEvidenceStrengthSchema = z
  .enum(['NONE', 'WEAK_IMPLICIT', 'CLEAR_EXPLICIT'])
  .catch('NONE')
  .default('NONE');

const CommitmentStrengthSchema = z
  .enum(['NONE', 'TENTATIVE', 'EXPLICIT_REVERSIBLE', 'EXPLICIT_IRREVERSIBLE'])
  .catch('NONE')
  .default('NONE');

const StructuralPositionSignalSchema = z
  .enum(['WITHIN_ACTIVE_BEAT', 'BRIDGING_TO_NEXT_BEAT', 'CLEARLY_IN_NEXT_BEAT'])
  .catch('WITHIN_ACTIVE_BEAT')
  .default('WITHIN_ACTIVE_BEAT');

const EntryConditionReadinessSchema = z
  .enum(['NOT_READY', 'PARTIAL', 'READY'])
  .catch('NOT_READY')
  .default('NOT_READY');

const SafeStringArraySchema = z.array(z.string()).catch([]).default([]);

const PromiseTypeSchema = z
  .enum([
    'CHEKHOV_GUN',
    'FORESHADOWING',
    'DRAMATIC_IRONY',
    'UNRESOLVED_EMOTION',
    'SETUP_PAYOFF',
  ])
  .catch('FORESHADOWING');

const UrgencySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']).catch('MEDIUM');

const SatisfactionLevelSchema = z.enum(['RUSHED', 'ADEQUATE', 'WELL_EARNED']).catch('ADEQUATE');

const NarrativePromiseSchema = z.object({
  description: z.string().default(''),
  promiseType: PromiseTypeSchema,
  suggestedUrgency: UrgencySchema,
});

const ThreadPayoffAssessmentSchema = z.object({
  threadId: z.string().default(''),
  threadText: z.string().default(''),
  satisfactionLevel: SatisfactionLevelSchema,
  reasoning: z.string().default(''),
});

export const AnalystResultSchema = z.object({
  beatConcluded: z.boolean().default(false),
  beatResolution: z.string().default(''),
  deviationDetected: z.boolean().default(false),
  deviationReason: z.string().default(''),
  invalidatedBeatIds: z.array(z.string()).optional().default([]),
  narrativeSummary: z.string().default(''),
  pacingIssueDetected: z.boolean().default(false),
  pacingIssueReason: z.string().default(''),
  recommendedAction: z.enum(['none', 'nudge', 'rewrite']).catch('none').default('none'),
  sceneMomentum: SceneMomentumSchema,
  objectiveEvidenceStrength: ObjectiveEvidenceStrengthSchema,
  commitmentStrength: CommitmentStrengthSchema,
  structuralPositionSignal: StructuralPositionSignalSchema,
  entryConditionReadiness: EntryConditionReadinessSchema,
  objectiveAnchors: SafeStringArraySchema,
  anchorEvidence: SafeStringArraySchema,
  completionGateSatisfied: z.boolean().catch(false).default(false),
  completionGateFailureReason: z.string().catch('').default(''),
  toneAdherent: z.boolean().catch(true).default(true),
  toneDriftDescription: z.string().catch('').default(''),
  narrativePromises: z.array(NarrativePromiseSchema).catch([]).default([]),
  threadPayoffAssessments: z.array(ThreadPayoffAssessmentSchema).catch([]).default([]),
});
