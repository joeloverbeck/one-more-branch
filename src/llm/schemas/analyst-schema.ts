import type { JsonSchema } from '../types.js';

export const ANALYST_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'analyst_evaluation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        beatConcluded: {
          type: 'boolean',
          description:
            'True if the active beat objective was achieved OR if the narrative has progressed beyond the beat scope into later beat territory. Evaluate cumulative progress, not just this single page.',
        },
        beatResolution: {
          type: 'string',
          description:
            'If beatConcluded is true, briefly describe how the beat was resolved. Required when beatConcluded is true.',
        },
        deviationDetected: {
          type: 'boolean',
          description:
            'True when remaining planned beats are invalidated by the narrative direction.',
        },
        deviationReason: {
          type: 'string',
          description:
            'Concise explanation for detected deviation; empty when no deviation.',
        },
        invalidatedBeatIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Beat IDs invalidated by deviation (format: X.Y); empty when no deviation.',
        },
        narrativeSummary: {
          type: 'string',
          description:
            'Short summary of current narrative state. Always populate — used for planner context compression and rewrite context.',
        },
        pacingIssueDetected: {
          type: 'boolean',
          description:
            'True if the narrative shows pacing problems: a beat stalling beyond expected page count, or the story passing through its midpoint without a meaningful reveal or reversal.',
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
      },
      required: [
        'beatConcluded',
        'beatResolution',
        'deviationDetected',
        'deviationReason',
        'invalidatedBeatIds',
        'narrativeSummary',
        'pacingIssueDetected',
        'pacingIssueReason',
        'recommendedAction',
        'sceneMomentum',
        'objectiveEvidenceStrength',
        'commitmentStrength',
        'structuralPositionSignal',
        'entryConditionReadiness',
        'objectiveAnchors',
        'anchorEvidence',
        'completionGateSatisfied',
        'completionGateFailureReason',
      ],
      additionalProperties: false,
    },
  },
};
