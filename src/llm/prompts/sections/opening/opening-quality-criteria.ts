/**
 * Quality criteria specific to opening prompts.
 * Focuses on establishment patterns without removal language.
 */

export const OPENING_ACTIVE_STATE_QUALITY = `OPENING ACTIVE STATE QUALITY:
Focus on ESTABLISHMENT, not removal. For the opening page:

GOOD INITIAL THREATS (threatsAdded):
- Dangers present at story start that create immediate tension
- "Two guards watch the town gate"
- "A violent storm is approaching"

GOOD INITIAL CONSTRAINTS (constraintsAdded):
- Limitations the protagonist faces from the start
- "Must reach the city before nightfall"
- "Identity must remain hidden"

GOOD INITIAL THREADS (threadsAdded):
- Mysteries or hooks that create intrigue
- { text: "Open relationship question: Is Captain Voss protecting the protagonist or setting a trap?", threadType: "RELATIONSHIP", urgency: "HIGH" }
- { text: "Need to learn: Why did the archive courier vanish before delivery?", threadType: "INFORMATION", urgency: "MEDIUM" }

BAD INITIAL ENTRIES (do NOT add):
- Entries that imply past events ("Enemies seek revenge for past wrongs") - if relevant, establish it in the narrative
- Overly vague entries ("Something feels wrong") - be specific
- Constraints that are just inventory facts ("No weapon") - implied by inventory
- Duplicate loop variants in the same payload ("Can Voss be trusted?" and "Is Voss lying?") - keep one canonical loop
- State-as-thread mistakes ("The guards are chasing us right now") - this is a threat, not a thread

THREAD DEDUP/REFINEMENT RULES (opening payload):
- Do not add two threads that represent the same unresolved loop with different wording.
- If a loop can be stated more specifically, keep the most specific single version and drop weaker variants.

THREAT VS DANGER (classification guardrail):
- Immediate hazard at story start ("armed patrol entering the room now") => THREAT/CONSTRAINT.
- DANGER thread only for prevention-oriented, longer-horizon risk:
  "Prevent risk: city lockdown reveals the safehouse network; avoid by rotating codes before curfew."

OPENING-SPECIFIC REMINDERS:
- threatsRemoved, constraintsRemoved, threadsResolved should be empty arrays
- inventoryRemoved and healthRemoved should be empty arrays
- characterStateChangesRemoved should be empty arrays
- You are creating initial state, not modifying existing state`;

export const OPENING_CANON_QUALITY = `OPENING CANON QUALITY:
Canon facts should be PERMANENT world-building or character elements that will constrain future scenes.

GOOD WORLD CANON (newCanonFacts) - facts to establish:
- Locations that will matter: "The Drowned Anchor is a tavern in the port district"
- Power structures: "The Iron Brotherhood controls the smuggling routes"
- Laws or customs: "Magic use is punishable by death in the capital"
- Geography: "The river divides the noble quarter from the slums"

BAD WORLD CANON (do NOT add):
- Single-scene details: "The room smelled of stale beer" - leave in narrative
- Trivial observations: "The guard was wearing blue" - no story impact
- Speculative additions not supported by worldbuilding provided

GOOD CHARACTER CANON (newCharacterCanonFacts) - traits from concept:
- Inherent traits: "Has a nervous habit of adjusting his ring"
- Abilities: "Can see in complete darkness"
- Background: "Grew up in the mining camps"
- Relationships: "Sister of the Duke"

BAD CHARACTER CANON (do NOT add):
- Traits invented beyond the character concept
- Things that happened in this scene (use characterStateChangesAdded)
- Temporary states or locations (use active state fields)

Rule: Only establish canon that is directly supported by the character concept and worldbuilding provided.`;
