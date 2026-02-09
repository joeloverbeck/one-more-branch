import type { JsonSchema } from '../types.js';

export const STORY_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'story_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        narrative: {
          type: 'string',
          description:
            'Vivid prose describing scene, action, dialogue, and outcomes. Minimum 100 words. Write in second person.',
        },
        choices: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of 2-4 meaningful choices as SEPARATE string elements. CRITICAL FORMAT: Return as ["Choice 1", "Choice 2", "Choice 3"] where each choice is its own array element. Do NOT return a single stringified element. INVARIANT: 2-4 choices if isEnding=false; exactly 0 if isEnding=true. Typically 3 choices; add a 4th only when truly warranted.',
        },
        currentLocation: {
          type: 'string',
          description:
            'Where the protagonist is at the END of this scene. Use a concise place name (e.g., "Blacksmith forge", "City gate", "Dense forest clearing"). Empty string if location is unchanged.',
        },
        threatsAdded: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Active threats introduced in this scene. Format: "THREAT_ID: Description" (e.g., "THREAT_FIRE: The building is ablaze and collapsing", "THREAT_GUARDS: City guards are searching for you"). Empty array if none.',
        },
        threatsRemoved: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Threats resolved in this scene. Use the prefix only (e.g., "THREAT_FIRE", "THREAT_GUARDS"). Empty array if none.',
        },
        constraintsAdded: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Constraints imposed on the protagonist in this scene. Format: "CONSTRAINT_ID: Description" (e.g., "CONSTRAINT_BOUND: Your hands are tied behind your back", "CONSTRAINT_OATH: You swore not to harm the villagers"). Empty array if none.',
        },
        constraintsRemoved: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Constraints lifted in this scene. Use the prefix only (e.g., "CONSTRAINT_BOUND", "CONSTRAINT_OATH"). Empty array if none.',
        },
        threadsAdded: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Open narrative threads introduced in this scene. Format: "THREAD_ID: Description" (e.g., "THREAD_MISSING_CHILD: A villager mentioned their child has been missing for three days"). Empty array if none.',
        },
        threadsResolved: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Narrative threads resolved in this scene. Use the prefix only (e.g., "THREAD_MISSING_CHILD"). Empty array if none.',
        },
        newCanonFacts: {
          type: 'array',
          items: { type: 'string' },
          description:
            'NEW permanent WORLD facts introduced IN THIS SCENE ONLY. For world-building facts like place names, historical events, institutional rules. Do NOT include: character-specific facts (use newCharacterCanonFacts), or items the protagonist possesses (use inventoryAdded/inventoryRemoved).',
        },
        newCharacterCanonFacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              characterName: { type: 'string' },
              facts: { type: 'array', items: { type: 'string' } },
            },
            required: ['characterName', 'facts'],
            additionalProperties: false,
          },
          description:
            'NEW character-specific facts introduced IN THIS SCENE ONLY. For persistent character traits, relationships, backgrounds. Do NOT include: items the protagonist possesses (use inventoryAdded/inventoryRemoved) or general world facts (use newCanonFacts).',
        },
        inventoryAdded: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Items the protagonist GAINED in this scene. Be specific (e.g., "Rusty iron key", "50 gold coins", "Leather satchel"). Empty array if nothing gained.',
        },
        inventoryRemoved: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Items the protagonist LOST, USED UP, or DISCARDED in this scene. Use the EXACT text of the existing inventory item. Empty array if nothing lost.',
        },
        healthAdded: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Physical conditions, wounds, or ailments the protagonist GAINED in this scene. E.g., "Your head throbs painfully", "Poison spreads through your right leg", "You feel exhausted". NOT emotional states (use stateChanges for those). Empty array if no new conditions.',
        },
        healthRemoved: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Health conditions that are RESOLVED or HEALED in this scene. Use the EXACT text from existing health entries. Empty array if nothing healed.',
        },
        characterStateChangesAdded: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              characterName: { type: 'string' },
              states: { type: 'array', items: { type: 'string' } },
            },
            required: ['characterName', 'states'],
            additionalProperties: false,
          },
          description:
            'NEW situational states for NPCs introduced IN THIS SCENE. Use for actions taken, agreements made, knowledge gained - things that happened, not permanent traits. Example: [{characterName: "Greaves", states: ["Gave protagonist a sketched map", "Proposed a 70-30 split"]}]. Empty array if no NPC state changes.',
        },
        characterStateChangesRemoved: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              characterName: { type: 'string' },
              states: { type: 'array', items: { type: 'string' } },
            },
            required: ['characterName', 'states'],
            additionalProperties: false,
          },
          description:
            'NPC states to REMOVE because they are RESOLVED or NO LONGER RELEVANT. Use EXACT text from existing NPC state entries. Empty array if nothing to remove.',
        },
        protagonistAffect: {
          type: 'object',
          properties: {
            primaryEmotion: {
              type: 'string',
              description: 'The dominant feeling driving the protagonist at the END of this scene (e.g., "fear", "attraction", "guilt", "determination").',
            },
            primaryIntensity: {
              type: 'string',
              enum: ['mild', 'moderate', 'strong', 'overwhelming'],
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
                required: ['emotion', 'cause'],
                additionalProperties: false,
              },
              description: 'Optional background feelings with their causes.',
            },
            dominantMotivation: {
              type: 'string',
              description: 'What the protagonist most wants right now.',
            },
          },
          required: ['primaryEmotion', 'primaryIntensity', 'primaryCause', 'secondaryEmotions', 'dominantMotivation'],
          additionalProperties: false,
          description: 'Snapshot of protagonist emotional state at END of this scene. NOT accumulated - fresh snapshot each page.',
        },
        isEnding: {
          type: 'boolean',
          description: 'True only when the story concludes and choices is empty.',
        },
        beatConcluded: {
          type: 'boolean',
          description: 'True if the active beat objective was achieved OR if the narrative has progressed beyond the beat scope into later beat territory. Evaluate cumulative progress, not just this single page.',
        },
        beatResolution: {
          type: 'string',
          description: 'If beatConcluded is true, briefly describe how the beat was resolved. Required when beatConcluded is true.',
        },
        deviationDetected: {
          type: 'boolean',
          description: 'True when remaining planned beats are invalidated by the narrative direction.',
        },
        deviationReason: {
          type: 'string',
          description: 'Concise explanation for detected deviation; empty when no deviation.',
        },
        invalidatedBeatIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Beat IDs invalidated by deviation (format: X.Y); empty when no deviation.',
        },
        narrativeSummary: {
          type: 'string',
          description: 'Short summary of current narrative state for rewrite context; empty when no deviation.',
        },
      },
      required: ['narrative', 'choices', 'currentLocation', 'threatsAdded', 'threatsRemoved', 'constraintsAdded', 'constraintsRemoved', 'threadsAdded', 'threadsResolved', 'newCanonFacts', 'newCharacterCanonFacts', 'inventoryAdded', 'inventoryRemoved', 'healthAdded', 'healthRemoved', 'characterStateChangesAdded', 'characterStateChangesRemoved', 'protagonistAffect', 'isEnding', 'beatConcluded', 'beatResolution', 'deviationDetected', 'deviationReason', 'invalidatedBeatIds', 'narrativeSummary'],
      additionalProperties: false,
    },
  },
};
