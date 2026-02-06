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
            'Array of 2-4 meaningful choices. INVARIANT: 2-4 choices if isEnding=false; exactly 0 if isEnding=true. Typically 3 choices; add a 4th only when truly warranted.',
        },
        stateChangesAdded: {
          type: 'array',
          items: { type: 'string' },
          description:
            'NEW conditions, events, or status changes to ADD to the current state. Use for injuries, relationships, emotional states, abilities gained - NOT for items (use inventoryAdded/inventoryRemoved). Use second person for player ("You were wounded...", "You befriended..."). Identify NPCs by name.',
        },
        stateChangesRemoved: {
          type: 'array',
          items: { type: 'string' },
          description:
            'State entries to REMOVE because they are RESOLVED, CONTRADICTED, or NO LONGER RELEVANT. Use EXACT or very close text of the existing state entry. Example: Remove "You are wounded" when healed, remove "You are exhausted" after resting.',
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
        isEnding: {
          type: 'boolean',
          description: 'True only when the story concludes and choices is empty.',
        },
        storyArc: {
          type: 'string',
          description: 'Main goal/conflict for the story opening page.',
        },
      },
      required: ['narrative', 'choices', 'stateChangesAdded', 'stateChangesRemoved', 'newCanonFacts', 'newCharacterCanonFacts', 'inventoryAdded', 'inventoryRemoved', 'healthAdded', 'healthRemoved', 'isEnding'],
      additionalProperties: false,
    },
  },
};
