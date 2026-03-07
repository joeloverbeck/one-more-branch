import type { JsonSchema } from '../llm-client-types.js';
import {
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
        isEnding: {
          type: 'boolean',
          description:
            'True only when this scene is the story\'s final conclusion. Default to false.',
        },
      },
      required: [...PAGE_PLANNER_REQUIRED_FIELDS],
      additionalProperties: false,
    },
  },
};
