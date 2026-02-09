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
            'Short summary of current narrative state for rewrite context; empty when no deviation.',
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
      ],
      additionalProperties: false,
    },
  },
};
