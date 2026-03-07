import type { JsonSchema } from '../llm-client-types.js';
import {
  WRITER_CHOICE_TYPE_ENUM,
  WRITER_PRIMARY_DELTA_ENUM,
  WRITER_CHOICE_SHAPE_ENUM,
} from '../writer-contract.js';

export const CHOICE_GENERATOR_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'choice_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        choices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description:
                  'The choice text the player sees. Start with a verb. 3-500 characters.',
              },
              choiceType: {
                type: 'string',
                enum: WRITER_CHOICE_TYPE_ENUM,
                description:
                  'What the protagonist is mainly DOING. INVESTIGATE=learning, REVEAL=telling, PERSUADE=changing another\'s decision without force, CONNECT=aligning with/protecting/trusting someone, DECEIVE=misleading, CONTEST=open opposition, COMMIT=binding yourself through cost/promise, INTERVENE=acting on a system/object/environment, NAVIGATE=route/order/target selection, WITHDRAW=reducing contact/exposure, SUBMIT=yielding to external demand.',
              },
              primaryDelta: {
                type: 'string',
                enum: WRITER_PRIMARY_DELTA_ENUM,
                description:
                  'What this choice primarily CHANGES in the world. LOCATION_ACCESS_CHANGE=protagonist moves or gains/loses access, GOAL_PRIORITY_CHANGE=objective changes or reprioritizes, RELATIONSHIP_ALIGNMENT_CHANGE=NPC stance/trust/alliance shifts, TIME_PRESSURE_CHANGE=urgency increases or decreases, RESOURCE_CONTROL_CHANGE=significant resource changes hands, INFORMATION_STATE_CHANGE=new knowledge gained or lost, SECRECY_EXPOSURE_CHANGE=how much attention/suspicion protagonist draws, CONDITION_STATUS_CHANGE=physical condition changes, THREAT_LEVEL_CHANGE=danger introduced/escalated/neutralized, OBLIGATION_RULE_CHANGE=limitation/rule imposed or lifted, POWER_AUTHORITY_CHANGE=hierarchy/authority shifts, IDENTITY_REPUTATION_CHANGE=how protagonist is perceived changes.',
              },
              choiceSubtype: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
                description:
                  'Optional free-text subtype for nuance, e.g. "CONFESSION", "BARGAIN", "DISGUISE". Null if not applicable.',
              },
              choiceShape: {
                anyOf: [
                  { type: 'string', enum: WRITER_CHOICE_SHAPE_ENUM },
                  { type: 'null' },
                ],
                description:
                  'What kind of pressure this choice creates. RELAXED=no urgency, OBVIOUS=clearly correct path, TRADEOFF=gain X lose Y, DILEMMA=two bad options, GAMBLE=unknown outcome, TEMPTATION=easy but costly, SACRIFICE=costly but right, FLAVOR=cosmetic difference. Null if not applicable.',
              },
            },
            required: ['text', 'choiceType', 'primaryDelta', 'choiceSubtype', 'choiceShape'],
            additionalProperties: false,
          },
          description:
            'Array of 2-4 structured choice objects. No two choices may share both the same choiceType AND the same primaryDelta. Typically 3 choices; add a 4th only when truly warranted.',
        },
      },
      required: ['choices'],
      additionalProperties: false,
    },
  },
};
