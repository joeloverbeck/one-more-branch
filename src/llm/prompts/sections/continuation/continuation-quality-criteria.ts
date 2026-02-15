/**
 * Quality criteria specific to continuation prompts.
 * Includes removal patterns and state modification guidance.
 */

export const CONTINUATION_ACTIVE_STATE_QUALITY = `ACTIVE STATE QUALITY CRITERIA:
Active state entries should track conditions that are TRUE RIGHT NOW and affect current story decisions.
Before adding any entry, ask: "Is this currently happening? Does it affect the protagonist's immediate situation?"

GOOD THREATS (threatsAdded):
- { text: "Two guards patrol the corridor ahead", threatType: "HOSTILE_AGENT" }
- { text: "Flames spread from the east wing", threatType: "ENVIRONMENTAL" }
- { text: "Something large stalks in the darkness", threatType: "CREATURE" }

BAD THREATS (do NOT add):
- Past dangers: "Was attacked earlier" - no longer active
- Vague fears: "Something feels wrong" - too vague
- Non-threats: "It's dark" - use CONSTRAINT instead

GOOD CONSTRAINTS (constraintsAdded):
- { text: "Leg wound slows movement", constraintType: "PHYSICAL" }
- { text: "Complete darkness limits visibility", constraintType: "ENVIRONMENTAL" }
- { text: "Must escape before dawn", constraintType: "TEMPORAL" }

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
❌ Do NOT put physical conditions in threatsAdded or constraintsAdded

HARD THREAT/CONSTRAINT DEDUP RULES:
- Before adding a threat or constraint, scan ALL existing entries in the provided state.
- If an existing entry already covers this concept — even in different words — do NOT add.
- If a BROADER entry already exists, do NOT add a narrower sub-aspect of the same thing.
- One entry per distinct concept. Rephrasings, elaborations, and sub-aspects are duplicates.

BAD DUPLICATES (do NOT add when the existing entry already covers it):
- Existing: "Crew being questioned separately, limiting coordination"
  BAD add: "Individual interrogations prevent crew coordination" (same concept)
  BAD add: "Captain cannot coordinate with crew during interrogation" (same concept)
  BAD add: "Any contradiction between separated testimonies will be weaponized" (consequence of same concept)
- Existing: "Any visible emotional reaction will be documented as evidence"
  BAD add: "Any accusation will be documented as hostile behavior" (same pattern)
  BAD add: "Any emotional reaction during testimony will undermine strategy" (same constraint)

THREAT CLASSIFICATION (stricter):
- A threat is a danger that can PHYSICALLY ESCALATE or DIRECTLY HARM in THIS scene.
- If the danger is someone's STRATEGY, INSTITUTIONAL PROCESS, or FUTURE PLAN, it is a DANGER thread, NOT a threat.
- If the danger is about how someone will INTERPRET behavior, it is NOT a threat.

BAD THREATS (reclassify or reject):
- "Investigator building case that crew staged evidence" -> This is a DANGER thread (institutional process)
- "Palace creating psychological profile framing responses as guilt" -> This is a DANGER thread (strategy)
- "Investigator's response will determine narrative direction" -> This is a dramatic question, not a threat
- "Korrim may report conversation attempts" -> This is a possibility/concern, not an active threat

CONSTRAINT CLASSIFICATION (stricter):
- A constraint is a limitation that RESTRICTS what the protagonist can PHYSICALLY DO right now.
- If the constraint describes how others will INTERPRET or DOCUMENT behavior, it is context, not a constraint.
- If the constraint describes a CONSEQUENCE of a past action, it belongs in characterState, not constraints.

BAD CONSTRAINTS (reject):
- "Captain's acknowledgment undermines authority" -> consequence of past action, not active limitation
- "Interrogation questions are designed with assumed answers" -> meta-commentary about style, not a constraint
- "Captain's admission can be used as conspiracy theory" -> consequence, not limitation

THREAT/CONSTRAINT QUANTITY DISCIPLINE:
- Aim for 3-8 threats and 3-8 constraints. These are ACTIVE SCENE CONDITIONS, not a comprehensive risk register.
- If the current count exceeds 8 in either category, prioritize REMOVAL and CONSOLIDATION before adding new entries.
- One well-phrased entry is better than three overlapping ones.

SCENE-LIFECYCLE REMOVAL TRIGGERS:
- When a character who was the SOURCE of a threat LEAVES the scene, remove threats tied to that character's immediate presence.
- When a confrontation DE-ESCALATES or ENDS, remove threats specific to that confrontation's peak moment.
- When a specific CONVERSATIONAL MOMENT passes (e.g., "threatening charges if questioning continues"), remove the entry if questioning did not continue.
- Scene-specific entries should not outlive their scene context.

THREAT/CONSTRAINT SELF-CHECK (before you finalize JSON):
- For each new threat: Is this an IMMEDIATE physical danger in the planned scene, or a strategic concern? If strategic -> DANGER thread or nothing.
- For each new threat: Is threatType correct? HOSTILE_AGENT for people, ENVIRONMENTAL for hazards, CREATURE for non-human entities.
- For each new constraint: Does this RESTRICT the protagonist's physical actions, or describe how others interpret behavior? If interpretation -> nothing.
- For each new constraint: Is constraintType correct? PHYSICAL for body limits, ENVIRONMENTAL for world limits, TEMPORAL for deadlines/time pressure.
- For each new add: Does ANY existing entry already cover this concept? If yes -> do not add.
- Count check: Will the total threats exceed 8? Will total constraints exceed 8? If yes, identify entries to remove first.`;

export const CONTINUATION_CANON_QUALITY = `CANON EPISTEMIC CLASSIFICATION (continuation pages):
Each canon.worldAdd entry MUST include a factType that reflects how the protagonist LEARNED this fact:

FACT TYPE RUBRIC:
- LAW: Protagonist directly witnessed or physically verified this truth (e.g., saw the sun rise in the west, tested a lock mechanism).
- NORM: Protagonist observed a repeated social pattern or custom (e.g., noticed all merchants bow before speaking).
- BELIEF: Protagonist was told this by a trusted authority but has not personally verified it (e.g., a mentor explained the world's creation myth).
- DISPUTED: Protagonist has encountered conflicting accounts from different sources (e.g., one NPC says the king is just, another says he is a tyrant).
- RUMOR: Protagonist heard this secondhand, from gossip, overheard conversation, or unreliable source (e.g., a tavern patron mentioned a hidden treasure).
- MYSTERY: Protagonist has evidence something exists or is true but cannot explain it yet (e.g., the locked door opens every midnight, but no one knows why).

EPISTEMIC ACCESS RULES:
- Match the protagonist's ACTUAL epistemic access, not the narrator's omniscient knowledge.
- If the protagonist only HEARD about something -> RUMOR or BELIEF, never LAW.
- If the protagonist SAW it happen -> LAW.
- If sources conflict -> DISPUTED.
- Epistemic status CAN evolve across pages: a RUMOR may become LAW when the protagonist witnesses it directly.

CONTINUATION-SPECIFIC REMINDERS:
- Do NOT re-add facts that were already established by the entity decomposer at story creation (check ESTABLISHED WORLD FACTS).
- Do NOT duplicate decomposed world facts with slightly different wording.
- Most continuation pages should add ZERO canon entries. Only add when genuinely new permanent information is established.`;
