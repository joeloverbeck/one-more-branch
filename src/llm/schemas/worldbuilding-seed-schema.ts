import type { JsonSchema } from '../llm-client-types.js';

export const WORLDBUILDING_SEED_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'worldbuilding_seed',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'signatureElements',
        'invariants',
        'powerStructures',
        'culturalFaultLines',
        'pressures',
        'anchorLocations',
        'everydayPractices',
        'publicMysteries',
        'namingLexicon',
        'storyVectors',
        'sensoryPalette',
      ],
      properties: {
        signatureElements: {
          type: 'array',
          description: '3-5 signature elements that define this world.',
          items: { type: 'string' },
        },
        invariants: {
          type: 'array',
          description: '3-6 invariants: what is always true, what it enables/constrains, what it costs people.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['invariant', 'consequence', 'humanCost'],
            properties: {
              invariant: { type: 'string', description: 'What is always true in this world.' },
              consequence: { type: 'string', description: 'What this enables or constrains.' },
              humanCost: { type: 'string', description: 'What this does to actual people.' },
            },
          },
        },
        powerStructures: {
          type: 'array',
          description: '1-4 power structures: who holds power, how, and where they are vulnerable.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['holder', 'mechanism', 'vulnerability'],
            properties: {
              holder: { type: 'string' },
              mechanism: { type: 'string' },
              vulnerability: { type: 'string' },
            },
          },
        },
        culturalFaultLines: {
          type: 'array',
          description: '1-4 cultural fault lines: tensions between groups with narrative potential.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['tension', 'groups', 'narrativePotential'],
            properties: {
              tension: { type: 'string' },
              groups: { type: 'array', items: { type: 'string' } },
              narrativePotential: { type: 'string' },
            },
          },
        },
        pressures: {
          type: 'array',
          description: '2-5 world pressures that demand stories.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['pressure', 'affectedGroups', 'escalationPath', 'storyFunction'],
            properties: {
              pressure: { type: 'string' },
              affectedGroups: { type: 'array', items: { type: 'string' } },
              escalationPath: { type: 'string' },
              storyFunction: { type: 'string', enum: ['EPIC', 'EPISTEMIC', 'DRAMATIC'] },
            },
          },
        },
        anchorLocations: {
          type: 'array',
          description: '2-5 anchor locations where scenes can happen.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'publicFace', 'hiddenPressure', 'sensorySignature', 'likelySceneUse'],
            properties: {
              name: { type: 'string' },
              publicFace: { type: 'string' },
              hiddenPressure: { type: 'string' },
              sensorySignature: { type: 'string' },
              likelySceneUse: { type: 'string' },
            },
          },
        },
        everydayPractices: {
          type: 'array',
          description: '3-6 everyday practices that reveal social structure.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['practice', 'whoPerformsIt', 'socialMeaning', 'costOfRefusal', 'sensoryCue'],
            properties: {
              practice: { type: 'string' },
              whoPerformsIt: { type: 'string' },
              socialMeaning: { type: 'string' },
              costOfRefusal: { type: 'string' },
              sensoryCue: { type: 'string' },
            },
          },
        },
        publicMysteries: {
          type: 'array',
          description: '1-3 public mysteries everyone knows but nobody understands.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['mystery', 'commonExplanation', 'hiddenTruthHint'],
            properties: {
              mystery: { type: 'string' },
              commonExplanation: { type: 'string' },
              hiddenTruthHint: { type: 'string' },
            },
          },
        },
        namingLexicon: {
          type: 'object',
          additionalProperties: false,
          required: ['personNameStyle', 'placeNameStyle', 'titles', 'idioms', 'tabooTerms'],
          properties: {
            personNameStyle: { type: 'string' },
            placeNameStyle: { type: 'string' },
            titles: { type: 'array', items: { type: 'string' } },
            idioms: { type: 'array', items: { type: 'string' } },
            tabooTerms: { type: 'array', items: { type: 'string' } },
          },
        },
        storyVectors: {
          type: 'array',
          description: '2-5 story vectors: branchable narrative pressures.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['vector', 'type', 'centralQuestion', 'stakes', 'likelyOpposition'],
            properties: {
              vector: { type: 'string' },
              type: { type: 'string', enum: ['EPIC', 'EPISTEMIC', 'DRAMATIC'] },
              centralQuestion: { type: 'string' },
              stakes: { type: 'string' },
              likelyOpposition: { type: 'string' },
            },
          },
        },
        sensoryPalette: {
          type: 'object',
          additionalProperties: false,
          required: ['textures', 'sounds', 'smells', 'colors'],
          properties: {
            textures: { type: 'array', items: { type: 'string' } },
            sounds: { type: 'array', items: { type: 'string' } },
            smells: { type: 'array', items: { type: 'string' } },
            colors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
};
