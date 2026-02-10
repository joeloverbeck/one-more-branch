/**
 * Quality criteria specific to continuation prompts.
 * Includes removal patterns and state modification guidance.
 */

export const CONTINUATION_ACTIVE_STATE_QUALITY = `ACTIVE STATE QUALITY CRITERIA:
Active state entries should track conditions that are TRUE RIGHT NOW and affect current story decisions.
Before adding any entry, ask: "Is this currently happening? Does it affect the protagonist's immediate situation?"

GOOD THREATS (threatsAdded):
- "Two guards patrol the corridor ahead"
- "Flames spread from the east wing"
- "Something large stalks in the darkness"

BAD THREATS (do NOT add):
- Past dangers: "Was attacked earlier" - no longer active
- Vague fears: "Something feels wrong" - too vague
- Non-threats: "It's dark" - use CONSTRAINT instead

GOOD CONSTRAINTS (constraintsAdded):
- "Leg wound slows movement"
- "Complete darkness limits visibility"
- "Must escape before dawn"

BAD CONSTRAINTS (do NOT add):
- Emotions: "Protagonist is scared" - use protagonistAffect
- Past events: "Was betrayed by ally" - use threadsAdded for unresolved hooks
- Inventory limits: "Unarmed" - implied by inventory

GOOD THREADS (threadsAdded):
- { text: "The letter's contents remain unknown", threadType: "MYSTERY", urgency: "MEDIUM" }
- { text: "Who was the hooded figure?", threadType: "MYSTERY", urgency: "HIGH" }
- { text: "The artifact was not where expected", threadType: "QUEST", urgency: "HIGH" }

BAD THREADS (do NOT add):
- Resolved questions: Threads should be mysteries, not answered facts
- Current events: "Currently in combat" - this is a threat
- Character traits: "Protagonist is courageous" - use characterCanon

REMOVAL QUALITY (for continuation scenes):
- Remove threats when the danger no longer exists (guards defeated, fire extinguished)
- Remove constraints when the limitation is overcome (healed, light found)
- Resolve threads when the mystery is answered or hook is addressed
- Always use ONLY the server-assigned ID for removals/resolutions (e.g., "th-2", "cn-1", "td-3")

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
