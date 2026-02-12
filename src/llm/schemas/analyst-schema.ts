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
        narrativePromises: {
          type: 'array',
          description:
            'Implicit foreshadowing or Chekhov\'s guns planted in the narrative prose with notable emphasis. Only flag items introduced with deliberate narrative weight, not incidental details. Max 3 per page.',
          items: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Brief description of the narrative promise or foreshadowed element.',
              },
              promiseType: {
                type: 'string',
                enum: ['CHEKHOV_GUN', 'FORESHADOWING', 'DRAMATIC_IRONY', 'UNRESOLVED_EMOTION'],
                description: 'The type of narrative promise.',
              },
              suggestedUrgency: {
                type: 'string',
                enum: ['LOW', 'MEDIUM', 'HIGH'],
                description: 'How urgently this promise should be addressed in upcoming pages.',
              },
            },
            required: ['description', 'promiseType', 'suggestedUrgency'],
            additionalProperties: false,
          },
        },
        threadPayoffAssessments: {
          type: 'array',
          description:
            'Quality assessment of thread resolutions that occurred in this scene. Only populate when threads were resolved.',
          items: {
            type: 'object',
            properties: {
              threadId: {
                type: 'string',
                description: 'The ID of the resolved thread (e.g., "td-3").',
              },
              threadText: {
                type: 'string',
                description: 'The text of the resolved thread.',
              },
              satisfactionLevel: {
                type: 'string',
                enum: ['RUSHED', 'ADEQUATE', 'WELL_EARNED'],
                description:
                  'How satisfying the thread resolution was. RUSHED = resolved via exposition or off-screen. ADEQUATE = resolved through action but without buildup. WELL_EARNED = resolution developed through action and consequence.',
              },
              reasoning: {
                type: 'string',
                description: 'Brief explanation of the satisfaction assessment.',
              },
            },
            required: ['threadId', 'threadText', 'satisfactionLevel', 'reasoning'],
            additionalProperties: false,
          },
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
        'narrativePromises',
        'threadPayoffAssessments',
      ],
      additionalProperties: false,
    },
  },
};
