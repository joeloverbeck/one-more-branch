/**
 * Continuity rules specific to continuation prompts.
 * References exact headers used in the continuation prompt context.
 */

export const CONTINUATION_CONTINUITY_RULES = `CONTINUITY RULES (CONTINUATION):
You are continuing an EXISTING story. Consistency with established facts is CRITICAL.

DO NOT CONTRADICT:
- ESTABLISHED WORLD FACTS - permanent world-building truths listed in that section
- CHARACTER INFORMATION - permanent character traits listed in that section
- NPC CURRENT STATE - branch-specific events that have already occurred
- YOUR INVENTORY - items the protagonist currently possesses
- YOUR HEALTH - current physical conditions
- CURRENT LOCATION, ACTIVE THREATS, ACTIVE CONSTRAINTS, OPEN THREADS - the current situation

WHEN ADDING NEW FACTS:
- New permanent world facts → newCanonFacts
- New permanent character traits → newCharacterCanonFacts
- Branch-specific NPC events → characterStateChangesAdded
- Narrative details that won't affect future scenes → leave in narrative only

RETCONS ARE FORBIDDEN:
- Do NOT change names, roles, species, or relationships already established
- Do NOT contradict previously established abilities or limitations
- Do NOT "forget" inventory items, health conditions, or active state
- Work WITH established facts, not around them

CONSISTENCY VERIFICATION:
Before generating your response, mentally verify:
1. Does my narrative contradict any ESTABLISHED WORLD FACTS?
2. Does my narrative contradict any CHARACTER INFORMATION?
3. Am I using inventory items the protagonist actually has?
4. Am I respecting the protagonist's current health conditions?
5. Am I acknowledging active threats and constraints?`;

export const CHARACTER_CANON_VS_STATE = `CHARACTER CANON vs CHARACTER STATE (CRITICAL DISTINCTION):
Use CHARACTER CANON (newCharacterCanonFacts) for PERMANENT traits that define WHO they are:
- Inherent abilities: "Transforms between midnight and dawn"
- Physical traits: "Eyes turn black during transformation"
- Background: "Runs a timber warehouse business"
- Relationships to the world: "Sister of the Duke"

Use CHARACTER STATE (characterStateChangesAdded) for SITUATIONAL events that happened in THIS playthrough:
- Actions taken: "Gave protagonist a sketched map"
- Agreements made: "Proposed a 70-30 split"
- Knowledge gained: "Knows about the three murders"
- Branch-specific status: "Currently waiting at the docks"

Rule: If it would be true in ANY playthrough, it's CANON. If it only happened because of choices made, it's STATE.`;
