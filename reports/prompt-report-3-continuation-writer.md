# Prompt Report 3: Continuation Writer

## Purpose
Generate subsequent story pages from selected player choice, while maintaining continuity and state.

## Source of Truth
- `src/llm/prompts/continuation-prompt.ts`
- `src/llm/prompts/continuation/*`
- `src/llm/prompts/system-prompt-builder.ts`
- `src/llm/prompts/sections/shared/*`
- `src/llm/prompts/sections/continuation/*`
- `src/llm/schemas/writer-schema.ts`
- `src/llm/writer-generation.ts`

## Production Notes
- `response_format` uses `WRITER_GENERATION_SCHEMA` (strict JSON schema).
- Current default config: `fewShotMode: "none"`, `choiceGuidance: "strict"`.
- Same writer JSON output shape as opening writer.

## Messages Sent To LLM (Production Template)

### Message 1 (`system`)
Same `system` prompt as opening writer (creative persona + NC-21 policy + storytelling guidelines + ending guidelines).

### Message 2 (`user`)
```text
Continue the interactive story based on the player's choice.

=== DATA & STATE RULES ===
{{CONTINUATION_DATA_RULES_STRICT}}

CHARACTER CONCEPT:
{{characterConcept}}

{{#if worldbuilding}}
WORLDBUILDING:
{{worldbuilding}}

{{/if}}
{{#if npcs.length > 0}}
NPCS (Available Characters):
NPC: {{npc1.name}}
{{npc1.description}}

NPC: {{npc2.name}}
{{npc2.description}}
{{...}}

These characters are available for use in the story. Introduce or involve them when narratively appropriate.

{{/if}}
TONE/GENRE: {{tone}}

{{#if structure + accumulatedStructureState}}
=== STORY STRUCTURE ===
Overall Theme: {{structure.overallTheme}}
Premise: {{structure.premise}}

CURRENT ACT: {{currentAct.name}} (Act {{currentActIndex+1}} of 3)
Objective: {{currentAct.objective}}
Stakes: {{currentAct.stakes}}

BEATS IN THIS ACT:
{{for each beat in currentAct.beats}}
{{if concluded}}  [x] CONCLUDED ({{beat.role}}): {{beat.description}}
    Resolution: {{resolutionOrDefault}}
{{if active}}  [>] ACTIVE ({{beat.role}}): {{beat.description}}
    Objective: {{beat.objective}}
{{if pending}}  [ ] PENDING ({{beat.role}}): {{beat.description}}
{{/for}}

REMAINING ACTS:
{{if any}}  - Act {{n}}: {{act.name}} - {{act.objective}}{{/if}}
{{if none}}  - None{{/if}}

{{/if}}
{{#if pacingNudge}}
=== PACING DIRECTIVE ===
The story analyst detected a pacing issue: {{pacingNudge}}
This page should advance the narrative toward resolving the current beat or deliver a meaningful story event.
Do not repeat setup or exposition -- push the story forward with action, revelation, or irreversible change.

{{/if}}
{{#if globalCanon.length > 0}}
ESTABLISHED WORLD FACTS:
- {{canonFact1}}
- {{canonFact2}}
{{...}}

{{/if}}
{{#if globalCharacterCanon has entries}}
CHARACTER INFORMATION (permanent traits):
[{{characterNameA}}]
- {{fact1}}
- {{fact2}}

[{{characterNameB}}]
- {{fact1}}
{{...}}

{{/if}}
{{#if accumulatedCharacterState has entries}}
NPC CURRENT STATE (branch-specific events):
[{{characterNameA}}]
- [{{csId1}}] {{state1}}
- [{{csId2}}] {{state2}}

[{{characterNameB}}]
- [{{csId3}}] {{state3}}
{{...}}

{{/if}}
{{#if currentLocation}}
CURRENT LOCATION:
{{currentLocation}}

{{/if}}
{{#if activeThreats.length > 0}}
ACTIVE THREATS (dangers that exist NOW):
- [{{thId1}}] {{threat1}}
- [{{thId2}}] {{threat2}}
{{...}}

{{/if}}
{{#if activeConstraints.length > 0}}
ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):
- [{{cnId1}}] {{constraint1}}
- [{{cnId2}}] {{constraint2}}
{{...}}

{{/if}}
{{#if openThreads.length > 0}}
OPEN NARRATIVE THREADS (unresolved hooks):
- [{{tdId1}}] {{thread1}}
- [{{tdId2}}] {{thread2}}
{{...}}

{{/if}}
{{#if accumulatedInventory.length > 0}}
YOUR INVENTORY:
- [{{invId1}}] {{item1}}
- [{{invId2}}] {{item2}}
{{...}}

{{/if}}
{{#if accumulatedHealth.length > 0}}
YOUR HEALTH:
- [{{hpId1}}] {{condition1}}
- [{{hpId2}}] {{condition2}}
{{...}}

{{else}}
YOUR HEALTH:
- You feel fine.

{{/if}}
{{#if parentProtagonistAffect}}
PROTAGONIST'S CURRENT EMOTIONAL STATE:
Primary: {{primaryEmotionUpper}} ({{primaryIntensity}}) - {{primaryCause}}
{{#if secondaryEmotions}}Secondary: {{SECONDARY_1_UPPER}} - {{cause1}}; {{SECONDARY_2_UPPER}} - {{cause2}}{{/if}}
Motivation: {{dominantMotivation}}

{{/if}}
{{#if ancestorSummaries.length > 0}}
EARLIER SCENE SUMMARIES (for factual/thematic continuity):
[Scene 1] {{ancestorSummary1}}
[Scene 2] {{ancestorSummary2}}
{{...}}

{{/if}}
{{#if grandparentNarrative}}
SCENE BEFORE LAST (full text for style continuity):
{{grandparentNarrative}}

{{/if}}
PREVIOUS SCENE (full text for style continuity):
{{previousNarrative}}

PLAYER'S CHOICE: "{{selectedChoice}}"

REQUIREMENTS (follow all):
1. Start exactly where the previous scene ended—do NOT recap or summarize what happened
   - Do NOT repeat or rephrase the last sentence of the previous scene
   - Begin with an action, dialogue, or reaction within the next 1-2 beats
2. Show the direct, immediate consequences of the player's choice - the story must react
3. Advance the narrative naturally - time passes, situations evolve, new elements emerge
4. Maintain consistency with all established facts and the current state
5. Present 3 new meaningful structured choice objects with text, choiceType, and primaryDelta - each choice MUST have a different choiceType OR primaryDelta (add a 4th only when the situation truly warrants another distinct path)
6. Ensure choices are divergent via their enum tags - each must change a different dimension of the story
7. Update protagonistAffect to reflect how the protagonist feels at the END of this scene (this is a fresh snapshot, not inherited from previous scenes)
8. Write a sceneSummary: 2-3 sentences summarizing the key events and consequences of this scene (for future context)

REMINDER: If the player's choice naturally leads to a story conclusion, make it an ending (empty choices array, isEnding: true). protagonistAffect should capture the protagonist's emotional state at the end of this scene - consider how the events of this scene have affected them.
```

## Expansion: `CONTINUATION_DATA_RULES_STRICT`
The continuation data rules are:
- All shared data rules used in opening (`ACTIVE_STATE_TRACKING`, `INVENTORY_MANAGEMENT`, `HEALTH_MANAGEMENT`, `FIELD_SEPARATION`, `PROTAGONIST_AFFECT`).
- Continuation-specific rules below.
- Strict choice guidelines (same block as opening strict mode).

```text
CONTINUITY RULES (CONTINUATION):
You are continuing an EXISTING story. Consistency with established facts is essential.

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
5. Am I acknowledging active threats and constraints?

CHARACTER CANON vs CHARACTER STATE:
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

Rule: If it would be true in ANY playthrough, it's CANON. If it only happened because of choices made, it's STATE.

ACTIVE STATE QUALITY CRITERIA:
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
- "The letter's contents remain unknown"
- "Who was the hooded figure?"
- "The artifact was not where expected"

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
❌ Do NOT put physical conditions in threatsAdded or constraintsAdded

CANON QUALITY CRITERIA:
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

Rule: If it would be true regardless of player choices, it might be CANON. If it only happened because of this specific playthrough, use STATE fields instead.
```

## Expected Structured Output (`response_format`)
Same JSON schema as opening writer (`WRITER_GENERATION_SCHEMA`):
- Required keys: `narrative`, `choices`, `currentLocation`, all state delta arrays, canon arrays, inventory/health arrays, character-state arrays, `protagonistAffect`, `sceneSummary`, `isEnding`.
- `choices`: 2-4 when `isEnding=false`; `[]` when `isEnding=true`.
- Enums enforced for `choiceType`, `primaryDelta`, and `protagonistAffect.primaryIntensity`.
