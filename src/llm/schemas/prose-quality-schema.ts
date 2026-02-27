import type { JsonSchema } from '../llm-client-types.js';

export const PROSE_QUALITY_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'prose_quality_evaluation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        toneAdherent: {
          type: 'boolean',
          description:
            'True if the narrative prose matches the target tone in mood, vocabulary, and emotional register. False if it drifts toward a different genre feel.',
        },
        toneDriftDescription: {
          type: 'string',
          description:
            'If toneAdherent is false, briefly describes what feels off and what the tone should be. Empty string when toneAdherent is true.',
        },
        thematicCharge: {
          type: 'string',
          enum: ['THESIS_SUPPORTING', 'ANTITHESIS_SUPPORTING', 'AMBIGUOUS'],
          description:
            'Scene-level thematic valence relative to the thematic question and antithesis. THESIS_SUPPORTING when scene outcomes support the thesis-direction answer, ANTITHESIS_SUPPORTING when outcomes support the antithesis-direction answer, AMBIGUOUS when evidence is mixed or unresolved.',
        },
        thematicChargeDescription: {
          type: 'string',
          description:
            '1-2 sentences explaining the thematicCharge classification with concrete scene evidence.',
        },
        narrativeFocus: {
          type: 'string',
          enum: ['DEEPENING', 'BROADENING', 'BALANCED'],
          description:
            'Scene-level depth-vs-breadth focus. DEEPENING develops existing threads/relationships/conflicts; BROADENING introduces new elements or expands scope; BALANCED does both without strong dominance.',
        },
      },
      required: [
        'toneAdherent',
        'toneDriftDescription',
        'thematicCharge',
        'thematicChargeDescription',
        'narrativeFocus',
      ],
      additionalProperties: false,
    },
  },
};
