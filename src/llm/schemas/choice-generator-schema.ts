import type { JsonSchema } from '../llm-client-types.js';
import {
  WRITER_CHOICE_REQUIRED_FIELDS,
  WRITER_CHOICE_TYPE_ENUM,
  WRITER_PRIMARY_DELTA_ENUM,
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
                  'What this choice is ABOUT. TACTICAL_APPROACH=method/tactic, MORAL_DILEMMA=value conflict, IDENTITY_EXPRESSION=self-definition, RELATIONSHIP_SHIFT=changing a relationship, RESOURCE_COMMITMENT=spending/risking something scarce, INVESTIGATION=examining/learning/revealing, PATH_DIVERGENCE=fundamentally different direction, CONFRONTATION=engaging/fighting, AVOIDANCE_RETREAT=fleeing/hiding/de-escalating.',
              },
              primaryDelta: {
                type: 'string',
                enum: WRITER_PRIMARY_DELTA_ENUM,
                description:
                  'What this choice primarily CHANGES in the world. LOCATION_CHANGE=protagonist moves, GOAL_SHIFT=objective changes, RELATIONSHIP_CHANGE=NPC stance shifts, URGENCY_CHANGE=time pressure shifts, ITEM_CONTROL=significant object changes hands, EXPOSURE_CHANGE=attention/suspicion changes, CONDITION_CHANGE=physical condition changes, INFORMATION_REVEALED=new knowledge gained, THREAT_SHIFT=danger introduced/neutralized, CONSTRAINT_CHANGE=limitation imposed/lifted.',
              },
            },
            required: [...WRITER_CHOICE_REQUIRED_FIELDS],
            additionalProperties: false,
          },
          description:
            'Array of 2-4 structured choice objects. Each choice MUST have a different choiceType OR primaryDelta from all other choices. Typically 3 choices; add a 4th only when truly warranted.',
        },
      },
      required: ['choices'],
      additionalProperties: false,
    },
  },
};
