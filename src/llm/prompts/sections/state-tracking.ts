/**
 * State tracking guidelines for inventory, health, and general state changes.
 * Covers ADD/REMOVE patterns and field separation rules.
 */

export const STATE_MANAGEMENT = `STATE MANAGEMENT (ADD/REMOVE PATTERN):
- stateChangesAdded: NEW conditions, events, or status changes that happened THIS SCENE.
- stateChangesRemoved: Existing states that are now RESOLVED, CONTRADICTED, or NO LONGER RELEVANT.
- Use second person ("You") for player events (e.g., "You were wounded...", "You befriended...").
- Identify NPCs by full name when available (e.g., "Captain Mira was wounded").
- Keep state changes concise but specific.
- State changes are for CONDITIONS and EVENTS only - NOT for items (use inventory fields).`;

export const STATE_REMOVAL_RULES = `STATE REMOVAL RULES:
- When a condition is RESOLVED (healing removes injury), REMOVE the old state and ADD the new state.
- When a condition is CONTRADICTED (allegiance changes), REMOVE the old state and ADD the new state.
- When a condition NO LONGER APPLIES (temporary effects expire), REMOVE the state.
- Use EXACT or very close text matching the existing state entry for removals.
- Example: If CURRENT STATE shows "You are wounded from the battle", and player heals:
  - stateChangesRemoved: ["You are wounded from the battle"]
  - stateChangesAdded: ["You have been healed and feel restored"]`;

export const INVENTORY_MANAGEMENT = `INVENTORY MANAGEMENT:
- Use inventoryAdded for items the protagonist GAINS (be specific: "Rusty iron key", "50 gold coins", not just "key" or "money").
- Use inventoryRemoved for items LOST, USED UP, BROKEN, or DISCARDED (use EXACT text from existing inventory).
- Reference inventory items naturally in the narrative when relevant.
- Items in inventory can enable or unlock certain choices.
- Duplicates are allowed (e.g., multiple "Health Potion" entries).`;

export const HEALTH_MANAGEMENT = `HEALTH MANAGEMENT:
- Use healthAdded for PHYSICAL conditions the protagonist ACQUIRES (wounds, poison, injuries, illness, exhaustion).
- Use healthRemoved for conditions that are HEALED or RESOLVED (use EXACT text from existing health entries).
- Reference health conditions naturally in the narrative when relevant.
- Physical conditions should affect available choices when appropriate (e.g., injured leg limits running).
- Health is for PHYSICAL conditions only (emotions belong in protagonistAffect).
- Examples of health conditions: "Your head throbs painfully", "Poison spreads through your arm", "You feel exhausted", "A deep gash mars your shoulder".`;

export const FIELD_SEPARATION = `FIELD SEPARATION (CRITICAL):
- INVENTORY (inventoryAdded/inventoryRemoved): Physical objects the protagonist possesses, gains, or loses
- HEALTH (healthAdded/healthRemoved): Physical wounds, injuries, poison, illness, exhaustion - NOT emotional states
- STATE CHANGES (stateChangesAdded/stateChangesRemoved): Commitments, knowledge, relationships, events - NOT emotions, items, or health
- PROTAGONIST AFFECT (protagonistAffect): Protagonist's emotional state SNAPSHOT at end of scene - NOT accumulated
- WORLD FACTS (newCanonFacts): Permanent world-building facts - NOT items or character traits
- CHARACTER CANON (newCharacterCanonFacts): PERMANENT character traits, backgrounds, abilities - WHO they are
- CHARACTER STATE (characterStateChangesAdded/characterStateChangesRemoved): SITUATIONAL NPC events - WHAT happened in THIS branch`;
