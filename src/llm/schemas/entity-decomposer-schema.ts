import {
  CHARACTER_REQUIRED_FIELDS,
  CHARACTER_SCHEMA_FIELDS,
  SPEECH_REQUIRED_FIELDS,
  SPEECH_SCHEMA_FIELDS,
} from '../entity-decomposition-contract.js';
import type { JsonSchema } from '../llm-client-types.js';

function buildSchemaProperties(
  fields: Record<string, { type: 'string' | 'array'; description: string }>
): Record<string, { type: string; description: string; items?: { type: 'string' } }> {
  const properties: Record<string, { type: string; description: string; items?: { type: 'string' } }> = {};

  for (const [key, field] of Object.entries(fields)) {
    if (field.type === 'array') {
      properties[key] = {
        type: 'array',
        description: field.description,
        items: { type: 'string' },
      };
      continue;
    }

    properties[key] = {
      type: 'string',
      description: field.description,
    };
  }

  return properties;
}

const SPEECH_PROPERTIES = buildSchemaProperties(SPEECH_SCHEMA_FIELDS);
const CHARACTER_PROPERTIES = buildSchemaProperties(CHARACTER_SCHEMA_FIELDS);

export const ENTITY_DECOMPOSITION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'entity_decomposition',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['characters', 'worldFacts'],
      properties: {
        characters: {
          type: 'array',
          description:
            'Decomposed character profiles for the protagonist and each NPC. ' +
            'The first entry MUST be the protagonist.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              ...CHARACTER_PROPERTIES,
              speechFingerprint: {
                type: 'object',
                additionalProperties: false,
                required: [...SPEECH_REQUIRED_FIELDS],
                properties: SPEECH_PROPERTIES,
              },
            },
            required: [...CHARACTER_REQUIRED_FIELDS, 'speechFingerprint'],
          },
        },
        worldFacts: {
          type: 'array',
          description:
            'Atomic worldbuilding facts decomposed from the raw worldbuilding text. ' +
            'Each fact should be a single proposition. Empty array if no worldbuilding provided.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['domain', 'fact', 'scope'],
            properties: {
              domain: {
                type: 'string',
                enum: [
                  'geography',
                  'ecology',
                  'history',
                  'society',
                  'culture',
                  'religion',
                  'governance',
                  'economy',
                  'faction',
                  'technology',
                  'magic',
                  'language',
                ],
                description:
                  'Category of this worldbuilding fact. ' +
                  'geography: physical terrain, locations, climate, weather, natural resources. ' +
                  'ecology: flora, fauna, ecosystems, wildlife, agriculture. ' +
                  'history: past events, chronology, origins, wars, eras. ' +
                  'society: social structure, class, family, kinship, demographics, norms. ' +
                  'culture: customs, traditions, arts, entertainment, food, clothing, daily life, education. ' +
                  'religion: faiths, deities, spirituality, mythology, cosmology, afterlife. ' +
                  'governance: government, law, politics, justice, military, power structures. ' +
                  'economy: commerce, trade, currency, professions, labor, wealth. ' +
                  'faction: organizations, guilds, secret societies, alliances. ' +
                  'technology: inventions, engineering, infrastructure, transportation, medicine. ' +
                  'magic: supernatural systems, spells, enchantments, magical creatures. ' +
                  'language: languages, dialects, scripts, communication, naming conventions.',
              },
              fact: {
                type: 'string',
                description: 'A single atomic worldbuilding proposition.',
              },
              scope: {
                type: 'string',
                description:
                  'Where/when this fact applies. ' +
                  'E.g. "Entire realm", "Northern provinces only", "During the Blood Moon".',
              },
            },
          },
        },
      },
    },
  },
};
