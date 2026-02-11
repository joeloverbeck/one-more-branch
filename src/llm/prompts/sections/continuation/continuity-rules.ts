/**
 * Continuity rules specific to continuation prompts.
 * References exact headers used in the continuation prompt context.
 */

export const CONTINUATION_CONTINUITY_RULES = `CONTINUITY RULES (CONTINUATION):
You are continuing an EXISTING story. Consistency with established facts is essential.

DO NOT CONTRADICT:
- ESTABLISHED WORLD FACTS - permanent world-building truths listed in that section
- CHARACTER INFORMATION - permanent character traits listed in that section
- NPC CURRENT STATE - branch-specific events that have already occurred
- YOUR INVENTORY - items the protagonist currently possesses
- YOUR HEALTH - current physical conditions
- CURRENT LOCATION, ACTIVE THREATS, ACTIVE CONSTRAINTS, OPEN THREADS - the current situation

WHEN NEW FACTS EMERGE:
- Weave them into narrative and sceneSummary naturally.
- Do NOT output canon/state mutation fields.

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
5. Am I acknowledging active threats and constraints?

DO NOT OUTPUT:
- newCanonFacts / newCharacterCanonFacts
- characterStateChangesAdded / characterStateChangesRemoved
- any state mutation arrays or IDs`;

export const CHARACTER_CANON_VS_STATE = `CHARACTER CANON vs CHARACTER STATE:
Use these categories as interpretation aids for continuity, not as output fields.

CHARACTER CANON (permanent, cross-branch):
- Inherent abilities
- Physical traits
- Background
- Persistent world relationships

CHARACTER STATE (situational, branch-specific):
- Actions taken in this branch
- Agreements made in this branch
- Knowledge gained from branch events
- Temporary status from recent scenes

Rule: If it would be true in ANY playthrough, treat it as canon context. If it depends on choices in THIS run, treat it as branch-state context.
Both are read-only prompt context for the writer.`;
