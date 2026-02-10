/**
 * State tracking guidelines shared by both opening and continuation prompts.
 * Covers inventory, health, active state, and field separation.
 */

export const ACTIVE_STATE_TRACKING = `=== ACTIVE STATE TRACKING ===

Track the story's current state using structured fields. These represent what is TRUE RIGHT NOW, not a history of what happened.

LOCATION:
- Set "currentLocation" to where the protagonist is at the END of this scene
- If location doesn't change, set to the same value as before
- Be specific: "cramped maintenance tunnel" not just "tunnel"

THREATS (dangers that exist NOW):
- To ADD a threat, provide a plain text description (the server assigns an ID automatically)
- To REMOVE a resolved threat, use its ID exactly as shown in ACTIVE THREATS (e.g., "th-1")
- Only include threats that are CURRENTLY present, not past dangers

CONSTRAINTS (limitations affecting protagonist NOW):
- To ADD a constraint, provide a plain text description (the server assigns an ID automatically)
- To REMOVE a constraint, use its ID exactly as shown in ACTIVE CONSTRAINTS (e.g., "cn-1")
- Only include constraints that are CURRENTLY active

THREADS (unresolved narrative hooks):
- To ADD a thread, provide an object with text, threadType, and urgency (the server assigns an ID automatically)
- To RESOLVE a thread, use its ID exactly as shown in OPEN NARRATIVE THREADS (e.g., "td-1")
- These are mysteries, unanswered questions, or plot hooks

Rules:
1. For removals/resolutions, use ONLY IDs (e.g., "th-1", "cn-2", "td-3")
2. threatsAdded/constraintsAdded are plain text only; threadsAdded uses typed objects (do not include your own IDs or prefixes)
3. Don't duplicate entries - update by removing old and adding new
4. Empty arrays mean "no changes" for that category

Example output for active state:

{
  "currentLocation": "abandoned subway platform",
  "threatsAdded": [
    "Large rats moving in the shadows",
    "Floor tiles are cracking"
  ],
  "threatsRemoved": ["th-1"],
  "constraintsAdded": [
    "Flashlight battery is failing"
  ],
  "constraintsRemoved": ["cn-1"],
  "threadsAdded": [
    {
      "text": "Strange symbols on the wall",
      "threadType": "MYSTERY",
      "urgency": "HIGH"
    }
  ],
  "threadsResolved": ["td-1"]
}`;

export const INVENTORY_MANAGEMENT = `INVENTORY MANAGEMENT:
- Use inventoryAdded for items the protagonist GAINS (be specific: "Rusty iron key", "50 gold coins", not just "key" or "money").
- Use inventoryRemoved for items LOST, USED UP, BROKEN, or DISCARDED (use the item's ID exactly as shown in YOUR INVENTORY, e.g., "inv-1").
- Reference inventory items naturally in the narrative when relevant.
- Items in inventory can enable or unlock certain choices.
- Duplicates are allowed (e.g., multiple "Health Potion" entries).`;

export const HEALTH_MANAGEMENT = `HEALTH MANAGEMENT:
- Use healthAdded for PHYSICAL conditions the protagonist ACQUIRES (wounds, poison, injuries, illness, exhaustion).
- Use healthRemoved for conditions that are HEALED or RESOLVED (use the condition ID exactly as shown in YOUR HEALTH, e.g., "hp-2").
- Do NOT add a condition that already exists. If a condition worsens, remove the old entry and add the updated one.
- Reference health conditions naturally in the narrative when relevant.
- Physical conditions should affect available choices when appropriate (e.g., injured leg limits running).
- Health is for PHYSICAL conditions only (emotions belong in protagonistAffect).
- Examples of health conditions: "Your head throbs painfully", "Poison spreads through your arm", "You feel exhausted", "A deep gash mars your shoulder".`;

export const FIELD_SEPARATION = `FIELD SEPARATION:
- INVENTORY (inventoryAdded/inventoryRemoved): Physical objects the protagonist possesses, gains, or loses
- HEALTH (healthAdded/healthRemoved): Physical wounds, injuries, poison, illness, exhaustion - NOT emotional states
- ACTIVE STATE (threatsAdded/threatsRemoved, constraintsAdded/constraintsRemoved, threadsAdded/threadsResolved): Current dangers, limitations, and narrative hooks. Threat/constraint additions are plain text, thread additions are typed objects, and removals/resolutions use IDs shown in prompt state sections.
- PROTAGONIST AFFECT (protagonistAffect): Protagonist's emotional state SNAPSHOT at end of scene - NOT accumulated
- WORLD FACTS (newCanonFacts): Permanent world-building facts - NOT items or character traits
- CHARACTER CANON (newCharacterCanonFacts): PERMANENT character traits, backgrounds, abilities - WHO they are
- CHARACTER STATE (characterStateChangesAdded/characterStateChangesRemoved): SITUATIONAL NPC events - WHAT happened in THIS branch`;
