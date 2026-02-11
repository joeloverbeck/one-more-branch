/**
 * State tracking guidelines shared by both opening and continuation prompts.
 * Covers inventory, health, active state, and field separation.
 */

export const ACTIVE_STATE_TRACKING = `=== ACTIVE STATE TRACKING ===

Use the state sections in the prompt as authoritative continuity context. These represent what is TRUE RIGHT NOW.

READ-ONLY CONTINUITY INPUT:
- CURRENT LOCATION: where the protagonist is right now.
- ACTIVE THREATS: immediate dangers currently present.
- ACTIVE CONSTRAINTS: limitations currently affecting the protagonist.
- OPEN NARRATIVE THREADS: unresolved hooks and mysteries.

How to use this context:
1. Continue from the exact situation shown by these sections.
2. Do not contradict listed facts unless the scene clearly resolves or changes them in narrative events.
3. Show consequences in prose and choices, not in state/canon mutation fields.

DO NOT OUTPUT STATE/CANON MUTATION FIELDS:
- currentLocation
- threatsAdded / threatsRemoved
- constraintsAdded / constraintsRemoved
- threadsAdded / threadsResolved`;

export const INVENTORY_MANAGEMENT = `INVENTORY MANAGEMENT:
- Treat YOUR INVENTORY as read-only context for what the protagonist currently carries.
- Use inventory details naturally in narrative and choice design.
- Do NOT output inventoryAdded or inventoryRemoved.`;

export const HEALTH_MANAGEMENT = `HEALTH MANAGEMENT:
- Treat YOUR HEALTH as read-only context for current physical condition.
- Reflect physical limitations in narrative and choices when relevant.
- Do NOT output healthAdded or healthRemoved.`;

export const FIELD_SEPARATION = `FIELD SEPARATION:
- CREATIVE OUTPUT FIELDS:
  - narrative
  - choices
  - sceneSummary
  - protagonistAffect
  - isEnding
- READ-ONLY CONTEXT:
  - inventory, health, location, threats, constraints, threads, canon, and NPC state sections in the prompt.
- FORBIDDEN OUTPUT FIELDS:
  - currentLocation
  - threatsAdded / threatsRemoved
  - constraintsAdded / constraintsRemoved
  - threadsAdded / threadsResolved
  - inventoryAdded / inventoryRemoved
  - healthAdded / healthRemoved
  - newCanonFacts / newCharacterCanonFacts
  - characterStateChangesAdded / characterStateChangesRemoved`;
