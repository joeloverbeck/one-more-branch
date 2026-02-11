# Feature: Split Writing Prompts

We have prompts to write the opening and continuation pages in src/llm/prompts/* . The docs are in reports/* . While they work generally well, we have some issues:

1) I suspect the quality of the narrative/prose isn't as good as it could be, particularly around retreading some discussions that the writer prompt had been provided in the "previous scenes" section.
2) We have issues with consistency when it comes to adding threads/threats/constraints/character states. Sometimes some entries get added that are barely rewordings of previous ones. Often it fails to remove entries that are now stale or even contradictory.

Researching this through ChatGPT, it has confirmed that the research suggests that we should split the acts of writing the scenes into 1) page planner 2) page writer (opening/continuation) 3) consistency step

What ChatGPT said on this subject:

"Yes — research strongly supports splitting “write the scene” from “maintain/update structured world state,” and it’s very likely to improve both (a) narrative quality and (b) correctness of adds/removes/dedup… if you do it as a deliberate multi-step pipeline.

Why splitting helps (what the research says, applied to your case)

1) Hierarchical generation improves story coherence
Story-generation work explicitly shows that doing planning first and surface writing second yields stories that are more coherent/on-topic than “just write.” That’s exactly the separation you want: decide what threads/threats/constraints move, then write the page.

2) Task decomposition improves LLM performance on complex objectives
Your current writer prompt asks for high-quality fiction and careful bookkeeping (dedupe, reconcile contradictions, resolve IDs). Decomposition methods (solve simpler subproblems sequentially) reliably improve performance vs one big prompt.

3) “Draft → verify/correct” reduces errors
State updates are a verification-style task: compare “previous state + new scene” and correct inconsistencies. Work like Chain-of-Verification shows models do better when they draft first, then run an explicit verification/correction step.
Self-Refine shows iterative critique/refinement improves outputs without extra training.

4) Agent architectures separate memory/state from generation
Generative Agents is basically your problem in another skin: believable behavior required separating memory (record), reflection (compress), planning (decide), and action (generate); ablations show those components matter.

5) Repetition is a known failure mode, and a dedicated “state manager” is a practical mitigation
Repetition / looping is a well-studied degeneration issue in generation; splitting lets you attack it where it belongs (planner/state/verifier), instead of hoping the storyteller also does clerical hygiene perfectly.

Why it’s especially relevant to your prompts

Your continuation writer currently carries the full burden of continuity + state tracking (“Generate subsequent story pages… while maintaining continuity and state” + active state tracking rules + thread examples). 

That’s a lot of competing objectives inside one generation."

## What I’d implement (research-aligned pipelines)

1) **Planner / State Intent

Input: Canon (global and character), current state (threads/threats/constraints/NPC state), selected choice, previous scenes (3-10 summaries and 2 full scenes). Obviously we'd have to account that the opening page will need to be planned too, and we'd have no previous choice, scene text, etc.

Output: which threads to advance/resolve, whether to time-cut, what new hook (if any) to seed. This will be fed to the Scene Writer; whether it would be better to do it in a single "plan" output string in the LLM schema, or in different properties (threads to advance/resolve, whether to time-cut, what new hook (if any) to seed), I don't know.

(This is your “plan-and-write” step.)

2) Scene Writer (creative-only)

Inputs: plan + canon (global and character) + last scene(s). Likely the current state (threads/threats/constraints/NPC state) shouldn't be fed, as that's more for planning, while canon is for consistency.

Output: narrative + choices + sceneSummary + protagonistAffect.

No state adds/removes here.

3) State Manager / Extractor + Verifier (deterministic - likely lower temperature as for the analyst prompt (src/llm/prompts/* ))

Inputs: previous structured state + the newly generated narrative.

Output: deltas (threadsAdded/Resolved, threatsAdded/Removed, constraintsAdded/Removed, etc.), with strict dedupe and contradiction elimination.

Do it as draft → verify → final inside this call (CoVe/Self-Refine pattern).

This is the sweet spot: the writer focuses on fiction; the state manager focuses on consistency.

## Trade-offs (so you don’t get surprised)

Cost/latency increases (extra call or two).

You must ensure the state manager sees the exact final narrative it’s updating from (no “nearly same” version).

You’ll want the state manager run at low temperature (because it’s extraction/logic, not creativity).

Net: in systems like yours, the quality gains usually dominate the costs.

## Narrative Threads instructions

There are issues with the instructions we have currently for the narrative threads. ChatGPT said:

"What’s off is the definition + phrasing contract for what an open thread is.

What I meant by “threads must be questions (not ongoing events)” wasn’t “only MYSTERY exists.” It was: an openThread entry should represent an open loop (unresolved), not a current fact (state). If you let “current facts” live in openThreads, you’ll get exactly what you’re seeing: duplicates, circular talk, and stale entries that never “close.”

The clean mental model

NPC state / constraints / threats = “What is true right now (or immediately ongoing)”

openThreads = “What is unresolved / what the story can push forward”

So your taxonomy can stay. You just need a tighter text form per type."

### Where your current examples go wrong

You already have duplicates that show the failure mode:

(refer to stories/e84ab696-4cee-4454-9bf1-9e67c3280060/page_36.json)

td-14 vs td-15 are basically the same relationship question.

td-13 vs td-16 are the same “how will she explain X to Bobby” thread, just with slightly different payload.

And a few are not really “threads” at all — they’re states:

“Alicia is experiencing her first genuine agency in months…” (that’s a current inner-state fact, not an unresolved loop)

“Alicia now has a pristine 1710 Stradivarius…” (inventory/state; the thread is whether she’ll play, what it means, what changes)

### Keep the taxonomy, tighten the contract

Here’s a practical rule that fixes your problem without changing ThreadType:

Rule: Every openThread must be written as one of:

1. a question that can be answered (MYSTERY / INFORMATION / MORAL / RELATIONSHIP), or

2. a goal with a success condition (QUEST / RESOURCE), or

3. a longer-horizon hazard framed as prevention/avoidance (DANGER).

If it’s merely “something currently true,” it belongs elsewhere.

### Canonical phrasing templates by ThreadType

Use templates like these (and enforce them in the prompt):

MYSTERY: What is/are ___? / Why did ___? / Are the "visitors" hallucinations or something else?

QUEST: Goal: ___ (by when / how will progress be measured?)

RELATIONSHIP: Will ___ choose/accept/repair/leave ___ given ___?

DANGER: Can ___ prevent/avoid ___ before ___ happens? (If it’s immediate, it’s a THREAT, not a THREAD.)

INFORMATION: What does ___ mean / what is the truth about ___?

RESOURCE: Need: ___ to accomplish ___ (what’s blocking it?)

MORAL: Should ___ do ___ even if ___? (a choice, not a recap)

### The key separation that prevents duplication with threats

Your DANGER thread type is valid, but define it like this:

ACTIVE THREATS = danger that can bite this scene / next scene

DANGER THREADS = danger that is looming or structural (weeks/months), framed as “prevent/mitigate”

That prevents “the woods are on fire” from becoming both a threat and a thread.

### Replace your THREADS definition with an “open loop” contract

Replace the THREADS section inside ACTIVE_STATE_TRACKING (both opening + continuation share it) with this:

"THREADS (unresolved narrative hooks / open loops):
Threads are NOT "things that are true right now."
Threads are ONLY unresolved loops that can be advanced, complicated, or resolved in future scenes.

A valid thread must be ONE of:
A) A QUESTION (mystery / missing info): ends with "?" and names the unknown.
B) A GOAL with a success condition (quest/resource): uses "Goal:" and states what "done" looks like.
C) A DILEMMA (moral/relationship): frames a choice with a real tradeoff (two viable costs).

THREADS MUST NOT BE:
- Current events ("The woods are on fire…") → THREAT/CONSTRAINT
- Agreements, promises, deadlines ("Agreed to wait four months…") → CONSTRAINT or CHARACTER STATE
- Emotional snapshots ("She feels agency…") → leave in narrative
- Inventory facts ("Has a Stradivarius…") → INVENTORY; if it matters as a hook, write the LOOP ("Will she play again…?")
- Completed/answered topics → do not add; resolve instead

Form requirements:
- One sentence only.
- One core unknown/goal/dilemma (do NOT bundle multiple issues).
- Must name at least one concrete entity (person/place/thing) and the unresolved element."

### Upgrade “don’t duplicate” into an explicit replacement algorithm

Your current “Don’t duplicate entries - update by removing old and adding new” is too weak. Add this immediately after that “Rules:” list (or replace rule #3 with it):

"THREAD DEDUP / REFINEMENT RULE (HARD):
Before adding any new thread, compare it to the OPEN NARRATIVE THREADS list.

- If the new idea is the SAME LOOP with different wording → DO NOT add.
- If the new idea is a MORE SPECIFIC version of an existing loop → resolve the old td-ID and add ONE replacement thread.
- You may only keep two threads that mention the same entities if their unresolved loop is clearly different.

If you add a near-duplicate without resolving/replacing the old one, the output is invalid."

This directly prevents what you showed: two “how will she explain X to Bobby” threads and two “what relationship does she want with Bobby” threads.

### Change your GOOD/BAD THREAD examples so they match your actual failure modes

Right now, your “GOOD THREADS” examples are fine but don’t warn against the specific kinds of junk you’re getting. Replace the GOOD/BAD blocks in both opening and continuation with these:

"GOOD THREADS (threadsAdded):
- "What are the 'visitors'—hallucinations, memory artifacts, or something else?"
- "Goal: Build a life that can stand without Bobby before he wakes (new routine, purpose, connection)."
- "Should Alicia tell Bobby the full truth about the mansion and time travel, knowing what it could cost?"
- "Will Alicia and Bobby try to return to the old shape of their relationship, or choose something new?"

BAD THREADS (do NOT add):
- Facts that are already true: "Alicia has a Stradivarius"
- Emotional states: "Alicia is experiencing agency"
- Agreements/deadlines: "Alicia agreed to wait four months" (use CONSTRAINT)
- Ongoing events: "Currently in combat" (use THREAT)
- Two threads that are the same loop reworded"

Notice what this does: it trains the model away from “thread = fact.”

### Add a “thread resolution trigger” rule (so loops actually close)

You already say “resolve when the mystery is answered”, but it needs teeth. Add:

"THREAD RESOLUTION TRIGGERS:
Resolve (threadsResolved) immediately when:
- The question is answered on-page (even partially, if the loop is no longer open)
- The goal is achieved or abandoned
- The dilemma is decided in a binding way (choice made, no longer in question)
- The story makes the thread irrelevant (new information renders it moot)

Do not keep a thread around “just because it’s interesting” if it no longer functions as an open loop."

This reduces thread “bloat” that causes later repetition.

## Consistency step instructions

Add a mandatory “reconciliation contract”. Add this block near the top of your CONTINUATION_DATA_RULES_STRICT:

"=== MANDATORY STATE RECONCILIATION (NO CONTRADICTIONS) ===
Before producing JSON, reconcile ALL state lists against what is true at the END of this scene.

For each entry in:
- NPC CURRENT STATE
- ACTIVE THREATS
- ACTIVE CONSTRAINTS
- OPEN NARRATIVE THREADS

You must do ONE of:
A) KEEP it (no change, do not mention it in removed/resolved arrays)
B) UPDATE it (remove the old ID, add a replacement with the new truth)
C) REMOVE/RESOLVE it (add its ID to the correct removed/resolved array)

Hard rule: The final state must NOT contain contradictions.
Example: if "Mary is tied to a post" is no longer true, you MUST remove that cs-ID when you add "Mary has been freed".
If you forget to remove contradictory entries, the output is invalid."

This turns “please remove stale things” into a hard constraint.

### Issue of Duplicate / near-duplicate threats & threads

Your rules say "Don’t duplicate entries", but models often treat “more specific” as “add another line,” not “replace the older one.”

Add this block:

"=== DEDUPLICATION & REFINEMENT RULE ===
Before adding any threat/constraint/thread/NPC state, check the corresponding ACTIVE list.

If the new entry is the same situation with different wording OR is just a more specific version:
- Do NOT add a second entry.
- Instead: remove the old ID and add ONE replacement entry (keep the most specific, decision-relevant phrasing).

Example (threat):
Existing: The woods are on fire and spreading.
New idea: The fire is spreading toward the village.
Correct: threatsRemoved: ["th-#"] + threatsAdded: ["The woods are on fire and the flames are advancing toward the village."]
Incorrect: Keep both lines."

Also: separate threats vs threads by form, otherwise you’ll keep duplicating “event as thread” and “event as threat.”

Add:

"THREAD FORM RULE:
Threads must be framed as unresolved questions/mysteries, not ongoing events.
Ongoing events belong in THREATS or CONSTRAINTS."

That prevents “The woods are on fire…” from appearing as both a threat and a thread.

## Narrative continuation (in the new Page Planner prompt)

The instructions for writing a scene indicate that it needs to continue immediately after the end of the previous one. The decision on whether to continue it or time-cut will go into the planner now, with specific instructions:

Replace your continuation requirement to start at the next consequential moment after the previous scene.

"Default: continue immediately within the next few beats.

If nothing meaningful happens for a while (travel, waiting, resting, routine), SKIP time and open at the next scene where the choice's consequences matter.

Signal the skip with a brief time cue ("Minutes later…", "That night…", "Two days later…") and then jump straight into action/dialogue.

Do NOT recap and do NOT rephrase the last sentence of the previous scene."

That gives the model permission to do the normal “scene cut” grammar of fiction while keeping your “no recap” rule intact.

If you want to make it even more deterministic, you can add:  
“Each page is a *scene*. If the player’s choice implies travel/prep/offscreen time, use a time cut.”

## Circular dialogue / re-asking resolved questions

We've had issue with circular dialogue in the generated scenes.

### Why it happens
Long-form generation is prone to “degeneration” (repetition / looping). Classic work on repetition in generation discusses this failure mode broadly (even when the model *has* the text). In your setup, you *also* feed the model full recent scenes, which can paradoxically increase “echoing” unless you explicitly demand novelty.

### Fix A (prompt): “no wheel-spin” + “novelty quota”
Add to continuation requirements of the Page Writer (continuation, given that it's not relevant for the opening):

"=== NO WHEEL-SPIN (ANTI-REPETITION) ===
- Do not re-ask a question that was asked and answered in the previous 1–2 scenes.
- Do not re-litigate the same emotional reassurance beat unless NEW information changes the answer or raises the stakes.
- If a topic must return, it must advance: new fact, new consequence, new decision, or a sharper conflict—otherwise omit it.

Each scene must include at least ONE of:
(1) a new concrete action with consequences,
(2) a meaningful revelation,
(3) an irreversible change in the situation,
(4) a new complication that forces a different choice."

