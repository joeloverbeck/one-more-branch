import {
  CHARACTER_REQUIRED_FIELDS,
  CHARACTER_SCHEMA_FIELDS,
  SPEECH_REQUIRED_FIELDS,
  SPEECH_SCHEMA_FIELDS,
} from '../entity-decomposition-contract.js';
import type { JsonSchema } from '../llm-client-types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaProperty = Record<string, any>;

function buildSchemaProperties(
  fields: Record<string, { type: string; description: string }>
): Record<string, SchemaProperty> {
  const properties: Record<string, SchemaProperty> = {};

  for (const [key, field] of Object.entries(fields)) {
    if (field.type === 'array') {
      properties[key] = {
        type: 'array',
        description: field.description,
        items: { type: 'string' },
      };
      continue;
    }

    if (field.type === 'nullable_object') {
      // Handled separately below — skip here
      continue;
    }

    properties[key] = {
      type: 'string',
      description: field.description,
    };
  }

  return properties;
}

const PROTAGONIST_RELATIONSHIP_SCHEMA: SchemaProperty = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['valence', 'dynamic', 'history', 'currentTension', 'leverage'],
      properties: {
        valence: {
          type: 'number',
          description:
            'Relationship valence from -5 (hostile/antagonistic) to +5 (devoted/unconditional ally). ' +
            '0 = neutral/indifferent.',
        },
        dynamic: {
          type: 'string',
          description:
            'Relationship dynamic label. E.g. "mentor", "rival", "ally", "target", ' +
            '"dependency", "protector", "adversary", "unrequited", "co-conspirator".',
        },
        history: {
          type: 'string',
          description: 'Brief history of the relationship. 1-2 sentences.',
        },
        currentTension: {
          type: 'string',
          description:
            'Active tension or unresolved issue in the relationship right now. 1-2 sentences.',
        },
        leverage: {
          type: 'string',
          description:
            'What this NPC holds over the protagonist or vice versa. 1 sentence.',
        },
      },
    },
    { type: 'null' },
  ],
  description:
    'This NPC\'s relationship with the protagonist. MUST be null for the protagonist\'s own entry. ' +
    'For NPCs, describe the structured relationship with valence, dynamic, history, tension, and leverage.',
};

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
              protagonistRelationship: PROTAGONIST_RELATIONSHIP_SCHEMA,
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
            required: ['domain', 'fact', 'scope', 'factType'],
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
              factType: {
                type: 'string',
                enum: ['LAW', 'NORM', 'BELIEF', 'DISPUTED', 'RUMOR', 'MYSTERY'],
                description:
                  'Epistemic status of this fact. ' +
                  'LAW: fundamental world truth (magic rules, physics, cosmology). ' +
                  'NORM: cultural/regional standard practice. ' +
                  'BELIEF: held as true by specific groups (embed who believes it in the fact text). ' +
                  'DISPUTED: multiple contradictory versions exist. ' +
                  'RUMOR: unverified hearsay. ' +
                  'MYSTERY: intentionally unresolved.',
              },
            },
          },
        },
      },
    },
  },
};
