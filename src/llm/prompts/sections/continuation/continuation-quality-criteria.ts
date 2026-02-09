/**
 * Quality criteria specific to continuation prompts.
 * Includes removal patterns and state modification guidance.
 */

export const CONTINUATION_ACTIVE_STATE_QUALITY = `ACTIVE STATE QUALITY CRITERIA:
Active state entries should track conditions that are TRUE RIGHT NOW and affect current story decisions.
Before adding any entry, ask: "Is this currently happening? Does it affect the protagonist's immediate situation?"

GOOD THREATS (threatsAdded):
- "THREAT_GUARDS: Two guards patrol the corridor ahead"
- "THREAT_FIRE: Flames spreading from the east wing"
- "THREAT_BEAST: Something large is stalking in the darkness"

BAD THREATS (do NOT add):
- Past dangers: "THREAT_AMBUSH: Was attacked earlier" - no longer active
- Vague fears: "THREAT_DANGER: Something feels wrong" - too vague
- Non-threats: "THREAT_DARK: It's dark" - use CONSTRAINT instead

GOOD CONSTRAINTS (constraintsAdded):
- "CONSTRAINT_INJURED_LEG: Leg wound slows movement"
- "CONSTRAINT_NO_LIGHT: Complete darkness limits visibility"
- "CONSTRAINT_TIME_LIMIT: Must escape before dawn"

BAD CONSTRAINTS (do NOT add):
- Emotions: "CONSTRAINT_FEAR: Protagonist is scared" - use protagonistAffect
- Past events: "CONSTRAINT_BETRAYED: Was betrayed by ally" - use threadsAdded for unresolved hooks
- Inventory limits: "CONSTRAINT_NO_WEAPON: Unarmed" - implied by inventory

GOOD THREADS (threadsAdded):
- "THREAD_MYSTERIOUS_LETTER: The letter's contents remain unknown"
- "THREAD_STRANGER_IDENTITY: Who was the hooded figure?"
- "THREAD_MISSING_ARTIFACT: The artifact was not where expected"

BAD THREADS (do NOT add):
- Resolved questions: Threads should be mysteries, not answered facts
- Current events: "THREAD_FIGHTING: Currently in combat" - this is a threat
- Character traits: "THREAD_BRAVE: Protagonist is courageous" - use characterCanon

REMOVAL QUALITY (for continuation scenes):
- Remove threats when the danger no longer exists (guards defeated, fire extinguished)
- Remove constraints when the limitation is overcome (healed, light found)
- Resolve threads when the mystery is answered or hook is addressed
- Always use ONLY the prefix for removals (e.g., "THREAT_FIRE", not the full entry)

When the protagonist picks up a sword, gains gold, loses a key, or breaks an item:
✅ Use inventoryAdded/inventoryRemoved
❌ Do NOT put item gains/losses in active state fields

When the protagonist is wounded, poisoned, exhausted, or healed:
✅ Use healthAdded/healthRemoved
❌ Do NOT put physical conditions in threatsAdded or constraintsAdded`;

export const CONTINUATION_CANON_QUALITY = `CANON QUALITY CRITERIA:
Canon facts should be PERMANENT world-building or character elements likely to matter across MULTIPLE scenes.
Before adding any canon, ask: "Would this fact constrain or inform future scenes in ANY branch?"

GOOD WORLD CANON (newCanonFacts) - add these:
- Locations: "The Drowned Anchor is a tavern in the port district"
- Factions: "The Iron Brotherhood controls the smuggling routes"
- Laws/customs: "Magic use is punishable by death in the capital"
- Geography: "The river divides the noble quarter from the slums"

BAD WORLD CANON (do NOT add these):
- Single-scene details: "The room smelled of stale beer" - not reusable
- Trivial observations: "The guard was wearing blue" - no story impact
- Plot-specific events: "Vane offered a contract" - use threadsAdded for unresolved hooks
- Branch-dependent facts: "The protagonist killed the guard" - use characterStateChangesAdded

GOOD CHARACTER CANON (newCharacterCanonFacts) - add these:
- Inherent traits: "Has a nervous habit of adjusting his ring"
- Abilities: "Can see in complete darkness"
- Background: "Grew up in the mining camps"
- Relationships: "Sister of the Duke"

BAD CHARACTER CANON (do NOT add these):
- Actions taken this scene: "Revealed the target's name" - use characterStateChangesAdded
- Temporary states: "Is waiting at the docks" - use characterStateChangesAdded
- Scene-specific reactions: "Seemed nervous about the question" - leave in narrative

Rule: If it would be true regardless of player choices, it might be CANON. If it only happened because of this specific playthrough, use STATE fields instead.`;
