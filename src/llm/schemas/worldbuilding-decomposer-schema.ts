import type { JsonSchema } from '../llm-client-types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaProperty = Record<string, any>;

const WORLD_FACT_SCHEMA: SchemaProperty = {
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
      enum: ['LAW', 'NORM', 'BELIEF', 'DISPUTED', 'RUMOR', 'MYSTERY', 'PRACTICE', 'TABOO'],
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
};

export const WORLD_FACTS_ARRAY_SCHEMA: SchemaProperty = {
  type: 'array',
  description:
    'Atomic worldbuilding facts decomposed from the raw worldbuilding text. ' +
    'Each fact should be a single proposition. Empty array if no worldbuilding provided.',
  items: WORLD_FACT_SCHEMA,
};

export const WORLDBUILDING_DECOMPOSITION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'worldbuilding_decomposition',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['worldFacts'],
      properties: {
        worldFacts: WORLD_FACTS_ARRAY_SCHEMA,
      },
    },
  },
};
