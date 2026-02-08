/**
 * Quality criteria for state changes and canon facts.
 * Defines good/bad patterns and anti-patterns.
 */

export const STATE_CHANGE_QUALITY = `STATE CHANGE QUALITY CRITERIA (CRITICAL):
State changes should track CONSEQUENTIAL events that would affect future story decisions.
Before adding any state change, ask: "Would this character NEED to remember this? Would it change their future behavior?"

GOOD STATE CHANGES (track these):
- Commitments: "Agreed to meet at the warehouse at midnight"
- Knowledge: "Knows the vault combination"
- Resources exchanged: "Gave protagonist a detailed map"
- Relationship shifts: "Now trusts the protagonist"
- Pending arrangements: "Waiting at the docks"
- Significant actions: "Betrayed the guild"

BAD STATE CHANGES (do NOT track these):
- Observations: "Noticed protagonist's weapon" - trivial observation, no impact
- Social niceties: "Shook hands" - no story consequence
- Introductions: "Introduced herself" - already in narrative
- Physical descriptions: "Looked tired" - use canon for permanent traits
- Fleeting emotions: "Seemed nervous" - momentary, not consequential
- Micro-actions: "Nodded" - too granular
- Protagonist feelings: "You feel attracted to her" - use protagonistAffect instead
- Emotional states: "Growing frustration", "Feeling hopeful" - use protagonistAffect instead

ANTI-PATTERNS (NEVER do these):
- Starting with "Noticed", "Saw", "Observed" - these are observations, not state
- Recording things already described in the narrative - redundant
- Recording actions with no future consequence - clutter

Apply the same criteria to protagonist stateChangesAdded:
- GOOD: "Promised to return by midnight" (affects future choices)
- GOOD: "Learned the Duke's secret weakness" (actionable knowledge)
- BAD: "Noticed his expensive clothes" (trivial observation)
- BAD: "Felt a chill" (momentary sensation)
- BAD: "You feel attracted to Marla" (use protagonistAffect for emotions)
- BAD: "Growing sense of dread" (use protagonistAffect for emotions)

When the protagonist picks up a sword, gains gold, loses a key, or breaks an item:
✅ Use inventoryAdded/inventoryRemoved
❌ Do NOT put item gains/losses in stateChanges, newCanonFacts, or newCharacterCanonFacts

When the protagonist is wounded, poisoned, exhausted, or healed:
✅ Use healthAdded/healthRemoved
❌ Do NOT put physical conditions in stateChanges (reserve those for relationships and events)`;

export const CANON_QUALITY = `CANON QUALITY CRITERIA (CRITICAL):
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
- Plot-specific events: "Vane offered a contract" - use stateChanges instead
- Branch-dependent facts: "The protagonist killed the guard" - use stateChanges instead

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
