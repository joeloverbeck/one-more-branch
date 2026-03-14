import type { JsonSchema } from '../llm-client-types.js';

export const PROMISE_TRACKER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'promise_tracking',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        promisesDetected: {
          type: 'array',
          description:
            'Narrative promises: forward-looking obligations the reader expects answered. Litmus test: Can you phrase it as a specific question a reader expects answered? Would a reader feel disappointed if never addressed? If BOTH not clearly yes, do NOT detect it. Max 2 per page.',
          items: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Brief description of the narrative promise.',
              },
              promiseType: {
                type: 'string',
                enum: [
                  'CHEKHOV_GUN',
                  'FORESHADOWING',
                  'UNRESOLVED_TENSION',
                  'DRAMATIC_QUESTION',
                  'MYSTERY_HOOK',
                  'TICKING_CLOCK',
                ],
                description: 'The type of narrative promise.',
              },
              scope: {
                type: 'string',
                enum: ['SCENE', 'BEAT', 'ACT', 'STORY'],
                description:
                  'Structural scope matching the weight of the setup. SCENE = resolve within 1-3 pages, BEAT = resolve within current milestone, ACT = resolve within current act, STORY = resolve at climax/ending.',
              },
              resolutionHint: {
                type: 'string',
                description:
                  'A specific question this promise asks that the reader expects answered (e.g., "Will the attacker return?"). If you cannot write a clear question, it is NOT a promise.',
              },
              suggestedUrgency: {
                type: 'string',
                enum: ['LOW', 'MEDIUM', 'HIGH'],
                description:
                  'How urgently this promise should be addressed in upcoming pages.',
              },
            },
            required: ['description', 'promiseType', 'scope', 'resolutionHint', 'suggestedUrgency'],
            additionalProperties: false,
          },
        },
        promisesResolved: {
          type: 'array',
          description:
            'IDs of active tracked promises resolved in this scene (e.g., "pr-3"). Empty when no promises are paid off.',
          items: { type: 'string' },
        },
        promisePayoffAssessments: {
          type: 'array',
          description:
            'Quality assessment of promise resolutions that occurred in this scene. Only include entries for resolved promises.',
          items: {
            type: 'object',
            properties: {
              promiseId: {
                type: 'string',
                description: 'The ID of the resolved promise (e.g., "pr-3").',
              },
              description: {
                type: 'string',
                description: 'The description of the resolved promise.',
              },
              satisfactionLevel: {
                type: 'string',
                enum: ['RUSHED', 'ADEQUATE', 'WELL_EARNED'],
                description:
                  'How satisfying the promise resolution was. RUSHED = resolved via exposition or off-screen. ADEQUATE = resolved through action but without buildup. WELL_EARNED = resolution developed through action and consequence.',
              },
              reasoning: {
                type: 'string',
                description: 'Brief explanation of the satisfaction assessment.',
              },
            },
            required: ['promiseId', 'description', 'satisfactionLevel', 'reasoning'],
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
        premisePromiseFulfilled: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
          description:
            'Exact premise promise text fulfilled by this scene, or null when no premise promise was fulfilled.',
        },
        obligatorySceneFulfilled: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
          description:
            'Exact obligatorySceneTag fulfilled by this scene for the active milestone, or null when no obligatory scene obligation was fulfilled.',
        },
        delayedConsequencesTriggered: {
          type: 'array',
          items: { type: 'string' },
          description:
            'IDs of trigger-eligible delayed consequences that this scene clearly triggers (e.g., "dc-2"). Empty array when none are triggered.',
        },
        delayedConsequencesCreated: {
          type: 'array',
          description:
            'Delayed consequences planted by the writer in this scene. Identify setups that should pay off later — causal chains, ticking clocks, or seeds the narrative planted that will bloom in future scenes. Max 2 per page.',
          items: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description:
                  'What will happen when this consequence triggers (e.g., "The guard discovers the stolen key is missing").',
              },
              triggerCondition: {
                type: 'string',
                description:
                  'What narrative condition causes this to fire (e.g., "Protagonist returns to the guard post").',
              },
              minPagesDelay: {
                type: 'number',
                description: 'Minimum pages before this can trigger (typically 2-3).',
              },
              maxPagesDelay: {
                type: 'number',
                description: 'Maximum pages before this must trigger (typically 5-8).',
              },
            },
            required: ['description', 'triggerCondition', 'minPagesDelay', 'maxPagesDelay'],
            additionalProperties: false,
          },
        },
      },
      required: [
        'promisesDetected',
        'promisesResolved',
        'promisePayoffAssessments',
        'threadPayoffAssessments',
        'premisePromiseFulfilled',
        'obligatorySceneFulfilled',
        'delayedConsequencesTriggered',
        'delayedConsequencesCreated',
      ],
      additionalProperties: false,
    },
  },
};
