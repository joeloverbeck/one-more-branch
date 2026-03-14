import type { JsonSchema } from '../llm-client-types.js';

export const STRUCTURE_EVALUATOR_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'structure_evaluation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        milestoneConcluded: {
          type: 'boolean',
          description:
            'True if the active milestone objective was achieved OR if the narrative has progressed beyond the milestone scope into later milestone territory. Evaluate cumulative progress, not just this single page.',
        },
        milestoneResolution: {
          type: 'string',
          description:
            'If milestoneConcluded is true, briefly describe how the milestone was resolved. Required when milestoneConcluded is true.',
        },
        sceneMomentum: {
          type: 'string',
          enum: [
            'STASIS',
            'INCREMENTAL_PROGRESS',
            'MAJOR_PROGRESS',
            'REVERSAL_OR_SETBACK',
            'SCOPE_SHIFT',
          ],
        },
        objectiveEvidenceStrength: {
          type: 'string',
          enum: ['NONE', 'WEAK_IMPLICIT', 'CLEAR_EXPLICIT'],
        },
        commitmentStrength: {
          type: 'string',
          enum: ['NONE', 'TENTATIVE', 'EXPLICIT_REVERSIBLE', 'EXPLICIT_IRREVERSIBLE'],
        },
        structuralPositionSignal: {
          type: 'string',
          enum: ['WITHIN_ACTIVE_BEAT', 'BRIDGING_TO_NEXT_BEAT', 'CLEARLY_IN_NEXT_BEAT'],
        },
        entryConditionReadiness: {
          type: 'string',
          enum: ['NOT_READY', 'PARTIAL', 'READY'],
        },
        objectiveAnchors: {
          type: 'array',
          items: { type: 'string' },
        },
        anchorEvidence: {
          type: 'array',
          items: { type: 'string' },
        },
        completionGateSatisfied: {
          type: 'boolean',
        },
        completionGateFailureReason: {
          type: 'string',
        },
        deviationDetected: {
          type: 'boolean',
          description:
            'True when remaining planned milestones are invalidated by the narrative direction.',
        },
        deviationReason: {
          type: 'string',
          description: 'Concise explanation for detected deviation; empty when no deviation.',
        },
        invalidatedMilestoneIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Milestone IDs invalidated by deviation (format: X.Y); empty when no deviation.',
        },
        spineDeviationDetected: {
          type: 'boolean',
          description:
            'True ONLY when a spine element has been IRREVERSIBLY invalidated by the narrative. This should be extremely rare — most narrative changes are milestone-level deviations, not spine-level. Only set true when the central dramatic question has been definitively answered, the antagonistic force has been permanently eliminated, or the protagonist need-want arc has been fully resolved prematurely.',
        },
        spineDeviationReason: {
          type: 'string',
          description:
            'If spineDeviationDetected is true, explains which spine element was irreversibly invalidated and why. Empty string when no spine deviation.',
        },
        spineInvalidatedElement: {
          anyOf: [
            {
              type: 'string',
              enum: ['dramatic_question', 'antagonistic_force', 'need_want'],
            },
            { type: 'null' },
          ],
          description:
            'Which spine element was invalidated: "dramatic_question" if the CDQ was definitively answered, "antagonistic_force" if the primary opposition was permanently eliminated, "need_want" if the protagonist arc was fully resolved prematurely. null when no spine deviation.',
        },
        alignedMilestoneId: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
          description:
            'When structuralPositionSignal is not WITHIN_ACTIVE_BEAT, identify which pending milestone (by ID, e.g. "1.4" or "2.1") the narrative most closely aligns with. null when WITHIN_ACTIVE_BEAT or when no clear alignment exists.',
        },
        milestoneAlignmentConfidence: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH'],
          description:
            'Confidence in the alignedMilestoneId judgment. HIGH = narrative clearly satisfies most conditions of the target milestone objective. MEDIUM = narrative has elements of the target milestone but is ambiguous. LOW = structural position is uncertain.',
        },
        milestoneAlignmentReason: {
          type: 'string',
          description:
            'One sentence explaining why the narrative aligns with the identified milestone. Empty string when alignedMilestoneId is null.',
        },
        pacingIssueDetected: {
          type: 'boolean',
          description:
            'True if the narrative shows pacing problems: a milestone stalling beyond expected page count, or the story passing through its midpoint without a meaningful reveal or reversal.',
        },
        pacingIssueReason: {
          type: 'string',
          description:
            'If pacingIssueDetected is true, explains the pacing problem. Empty when no issue.',
        },
        recommendedAction: {
          type: 'string',
          enum: ['none', 'nudge', 'rewrite'],
          description:
            'Recommended response to pacing issue. "none" if no issue. "nudge" to inject a directive into the next continuation prompt. "rewrite" to trigger a structure rewrite pulling turning points closer.',
        },
        pacingDirective: {
          type: 'string',
          description:
            'A holistic 1-3 sentence natural-language pacing directive for the page planner. Synthesize sceneMomentum, objectiveEvidenceStrength, commitmentStrength, structuralPositionSignal, entryConditionReadiness, and the pacing budget context into a single actionable instruction. Address rhythm (breathe or accelerate?), structural position (how close is milestone conclusion?), and what narrative movement the next page should deliver. Write as if briefing a writer, not classifying signals.',
        },
      },
      required: [
        'milestoneConcluded',
        'milestoneResolution',
        'sceneMomentum',
        'objectiveEvidenceStrength',
        'commitmentStrength',
        'structuralPositionSignal',
        'entryConditionReadiness',
        'objectiveAnchors',
        'anchorEvidence',
        'completionGateSatisfied',
        'completionGateFailureReason',
        'deviationDetected',
        'deviationReason',
        'invalidatedMilestoneIds',
        'spineDeviationDetected',
        'spineDeviationReason',
        'spineInvalidatedElement',
        'alignedMilestoneId',
        'milestoneAlignmentConfidence',
        'milestoneAlignmentReason',
        'pacingIssueDetected',
        'pacingIssueReason',
        'recommendedAction',
        'pacingDirective',
      ],
      additionalProperties: false,
    },
  },
};
