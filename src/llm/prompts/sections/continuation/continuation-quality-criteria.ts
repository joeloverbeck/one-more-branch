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
- { text: "Open relationship question: Can Mara trust Iven after the checkpoint betrayal?", threadType: "RELATIONSHIP", urgency: "HIGH" }
- { text: "Need to learn: Who ordered the checkpoint betrayal?", threadType: "INFORMATION", urgency: "HIGH" }
- { text: "Goal: secure the relay key; success when the key is recovered from the magistrate vault", threadType: "QUEST", urgency: "HIGH" }

BAD THREADS (do NOT add):
- Resolved questions: Threads should be mysteries, not answered facts
- Current events: "Currently in combat" - this is a threat
- Character traits: "Protagonist is courageous" - use characterCanon
- Duplicate relationship loop rewordings: "Can Mara trust Iven now?" when the same trust loop is already open
- Duplicate explanation loop rewordings: "Who is behind the betrayal?" when the same unknown actor loop is already open
- State-as-thread mistakes: "The gate is locked right now" - this is a constraint, not a thread

HARD THREAD DEDUP/REFINEMENT RULES:
- If an active thread already captures the same unresolved loop, do NOT add a reworded duplicate.
- If you are refining an existing loop to a more specific successor, use replacement semantics only:
  1. Resolve the prior thread by ID in threadsResolved (e.g., "td-3")
  2. Add exactly one refined successor in threadsAdded
- Never keep both the old loop and its refined version unresolved in the same output.

THREAT VS DANGER (classification guardrail):
- Immediate scene hazard ("gunfire in the hallway", "bridge collapsing now") => THREAT/CONSTRAINT, not DANGER thread.
- DANGER thread is only for looming structural risk framed as prevention:
  "Prevent risk: checkpoint alert spreads citywide; avoid by disabling alarm relays before dawn"

REMOVAL QUALITY (for continuation scenes):
- Remove threats when the danger no longer exists (guards defeated, fire extinguished)
- Remove constraints when the limitation is overcome (healed, light found)
- Resolve threads when the loop is answered, achieved/abandoned, decided, or rendered moot by events
- Always use ONLY the server-assigned ID for removals/resolutions (e.g., "th-2", "cn-1", "td-3")

When the protagonist picks up a sword, gains gold, loses a key, or breaks an item:
✅ Use inventoryAdded/inventoryRemoved
❌ Do NOT put item gains/losses in active state fields

When the protagonist is wounded, poisoned, exhausted, or healed:
✅ Use healthAdded/healthRemoved
❌ Do NOT put physical conditions in threatsAdded or constraintsAdded`;
