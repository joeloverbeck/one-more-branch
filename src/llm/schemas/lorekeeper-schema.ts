import type { JsonSchema } from '../llm-client-types.js';
import {
  LOREKEEPER_CHARACTER_REQUIRED_FIELDS,
  LOREKEEPER_REQUIRED_FIELDS,
} from '../lorekeeper-contract.js';

export const LOREKEEPER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'story_bible',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        sceneWorldContext: {
          type: 'string',
          description:
            'Filtered worldbuilding relevant to this specific scene. Include only setting details, cultural norms, physical environment, or world rules that the writer needs for this scene. Omit everything else.',
        },
        relevantCharacters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Character name as established in the story.',
              },
              role: {
                type: 'string',
                description:
                  'Role in this scene (e.g., "ally", "antagonist", "bystander", "mentor", "love interest").',
              },
              relevantProfile: {
                type: 'string',
                description:
                  'Who they are and what matters for this scene. Synthesize from NPC definitions and character canon facts.',
              },
              speechPatterns: {
                type: 'string',
                description:
                  'HOW this character speaks - verbal tics, vocabulary level, formality, dialect, characteristic phrases, sentence structure. Synthesize from NPC definitions, character canon, and actual dialogue in recent narrative.',
              },
              protagonistRelationship: {
                type: 'string',
                description:
                  'Trust level, power dynamic, emotional tension, and unresolved history between this character and the protagonist.',
              },
              interCharacterDynamics: {
                type: 'string',
                description:
                  'Relationships with OTHER characters present in this scene. Only populate when multiple characters share the scene. Empty string if not applicable.',
              },
              currentState: {
                type: 'string',
                description:
                  "This character's situation and emotional state entering this scene, based on accumulated character state and recent narrative.",
              },
            },
            required: [...LOREKEEPER_CHARACTER_REQUIRED_FIELDS],
            additionalProperties: false,
          },
          description:
            'Characters relevant to this scene. Include characters who are present, physically nearby (behind doors, approaching, in adjacent spaces), referenced, or whose influence matters.',
        },
        relevantCanonFacts: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Subset of global and character canon facts relevant to this scene. Include only facts the writer needs to maintain consistency.',
        },
        relevantHistory: {
          type: 'string',
          description:
            'Synthesized narrative chronology from ancestor summaries. Preserve causality chains and temporal ordering. Focus on events that set up or influence this scene.',
        },
      },
      required: [...LOREKEEPER_REQUIRED_FIELDS],
      additionalProperties: false,
    },
  },
};
