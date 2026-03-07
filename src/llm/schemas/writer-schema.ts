import type { JsonSchema } from '../llm-client-types.js';
import {
  WRITER_EMOTION_INTENSITY_ENUM,
  WRITER_PROTAGONIST_AFFECT_REQUIRED_FIELDS,
  WRITER_REQUIRED_FIELDS,
  WRITER_SECONDARY_EMOTION_REQUIRED_FIELDS,
} from '../writer-contract.js';

export const WRITER_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'writer_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        narrative: {
          type: 'string',
          description:
            'Vivid prose describing scene, action, dialogue, and outcomes. Minimum 100 words. Write in second person.',
        },
        protagonistAffect: {
          type: 'object',
          properties: {
            primaryEmotion: {
              type: 'string',
              description:
                'The dominant feeling driving the protagonist at the END of this scene (e.g., "fear", "attraction", "guilt", "determination").',
            },
            primaryIntensity: {
              type: 'string',
              enum: WRITER_EMOTION_INTENSITY_ENUM,
              description: 'How intensely the protagonist feels the primary emotion.',
            },
            primaryCause: {
              type: 'string',
              description: 'What is causing this emotion (brief, specific to this scene).',
            },
            secondaryEmotions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  emotion: { type: 'string' },
                  cause: { type: 'string' },
                },
                required: [...WRITER_SECONDARY_EMOTION_REQUIRED_FIELDS],
                additionalProperties: false,
              },
              description: 'Optional background feelings with their causes.',
            },
            dominantMotivation: {
              type: 'string',
              description: 'What the protagonist most wants right now.',
            },
          },
          required: [...WRITER_PROTAGONIST_AFFECT_REQUIRED_FIELDS],
          additionalProperties: false,
          description:
            'Snapshot of protagonist emotional state at END of this scene. NOT accumulated - fresh snapshot each page.',
        },
        sceneSummary: {
          type: 'string',
          description:
            'A 2-3 sentence factual summary of what happened in this scene. Focus on key events, decisions made, and consequences. This will be used as context for future scenes, so emphasize plot-relevant facts over atmospheric details.',
        },
        isEnding: {
          type: 'boolean',
          description: 'True only when the story concludes and choices is empty.',
        },
      },
      required: [...WRITER_REQUIRED_FIELDS],
      additionalProperties: false,
    },
  },
};
