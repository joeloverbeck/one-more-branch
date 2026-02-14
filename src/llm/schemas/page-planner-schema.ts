import type { JsonSchema } from '../llm-client-types.js';
import {
  PAGE_PLANNER_CHOICE_INTENT_REQUIRED_FIELDS,
  PAGE_PLANNER_CHOICE_TYPE_ENUM,
  PAGE_PLANNER_PRIMARY_DELTA_ENUM,
  PAGE_PLANNER_REQUIRED_FIELDS,
  PAGE_PLANNER_WRITER_BRIEF_REQUIRED_FIELDS,
} from '../page-planner-contract.js';

export const PAGE_PLANNER_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'page_planner_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        sceneIntent: { type: 'string' },
        continuityAnchors: {
          type: 'array',
          items: { type: 'string' },
        },
        writerBrief: {
          type: 'object',
          properties: {
            openingLineDirective: { type: 'string' },
            mustIncludeBeats: { type: 'array', items: { type: 'string' } },
            forbiddenRecaps: { type: 'array', items: { type: 'string' } },
          },
          required: [...PAGE_PLANNER_WRITER_BRIEF_REQUIRED_FIELDS],
          additionalProperties: false,
        },
        dramaticQuestion: {
          type: 'string',
          description:
            'The single dramatic question this scene must raise and leave the choices to answer. Example: "Will you risk exposure to save the contact, or protect your cover?"',
        },
        choiceIntents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hook: {
                type: 'string',
                description: 'A 1-sentence description of what this choice offers the protagonist.',
              },
              choiceType: {
                type: 'string',
                enum: PAGE_PLANNER_CHOICE_TYPE_ENUM,
                description: 'The intended ChoiceType for this choice.',
              },
              primaryDelta: {
                type: 'string',
                enum: PAGE_PLANNER_PRIMARY_DELTA_ENUM,
                description: 'The intended PrimaryDelta for this choice.',
              },
            },
            required: [...PAGE_PLANNER_CHOICE_INTENT_REQUIRED_FIELDS],
            additionalProperties: false,
          },
          description:
            'Array of 2-4 proposed choice intents for the writer. Each intent suggests a hook, choiceType, and primaryDelta. The writer may adjust these if the narrative takes an unexpected turn.',
        },
      },
      required: [...PAGE_PLANNER_REQUIRED_FIELDS],
      additionalProperties: false,
    },
  },
};
