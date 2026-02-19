# Lorekeeper Prompt (Production Template)

- Source: `src/llm/prompts/lorekeeper-prompt.ts`
- Shared lorekeeper contract: `src/llm/lorekeeper-contract.ts`
- Output schema source: `src/llm/schemas/lorekeeper-schema.ts`
- Validation schema: `src/llm/schemas/lorekeeper-validation-schema.ts`
- Response transformer: `src/llm/schemas/lorekeeper-response-transformer.ts`

## Purpose

The Lorekeeper is a dedicated LLM call between the planner and writer. It curates a compact, scene-focused "Story Bible" containing only what the writer needs, replacing the raw context dumps that would otherwise bloat the writer prompt with irrelevant information.

**Pipeline position**: Planner -> **Lorekeeper** -> Writer -> Analyst -> Agenda Resolver

The Lorekeeper runs for **both opening and continuation pages**. For opening pages, it receives `startingSituation` instead of `previousNarrative` / `ancestorSummaries` / `grandparentNarrative`, using the starting situation to determine which worldbuilding elements, characters, and canon facts are relevant to the first scene.

## Messages Sent To Model

### 1) System Message

```text
You are the Lorekeeper for an interactive branching story. Your role is to curate a compact, scene-focused "Story Bible" containing ONLY what the writer needs for the upcoming scene.

You receive the full story context and the planner's scene intent. You must filter, synthesize, and return a focused bible that eliminates irrelevant information while preserving everything essential.

CONTENT GUIDELINES:
{{CONTENT_POLICY}}

CURATION PRINCIPLES:
1. SELECTIVE INCLUSION: Only include characters, facts, history, and world details relevant to the planner's scene intent, continuity anchors, and dramatic question. The whole point is curation, not regurgitation.
2. PROXIMITY AWARENESS: Include characters who are physically nearby even if not yet visible — behind doors, approaching, in adjacent rooms, on the other side of a wall, etc. The writer needs to know about nearby characters to handle reveals, entries, sounds, and environmental hints. Exclude only characters who are truly distant or irrelevant to the scene geography.
3. SPEECH PATTERN EXTRACTION: For each relevant character, synthesize HOW they speak. When structured character profiles with speech fingerprints are provided, use those as your primary source for voice data (catchphrases, vocabulary, verbal tics, sentence patterns, dialogue samples). Enrich with character canon facts AND actual dialogue found in recent narrative text. This must be thorough - idiosyncratic speech is critical for voice consistency.
4. NARRATIVE CHRONOLOGY: The relevantHistory field must preserve causality chains and temporal ordering from ancestor summaries. Don't extract disconnected facts - build a narrative thread that shows how events led to the current moment.
5. RELATIONSHIP DYNAMICS: Capture trust levels, power dynamics, emotional tensions, and unresolved interpersonal history between characters and the protagonist.
6. INTER-CHARACTER DYNAMICS: When multiple characters share a scene, describe how they relate to EACH OTHER, not just to the protagonist.
7. CURRENT STATE: Each character's emotional state and situation as they enter the scene, derived from accumulated character state entries and recent narrative.
8. WORLD CONTEXT: When domain-tagged world facts are provided, use them as your primary worldbuilding source - they are pre-decomposed for efficient filtering by domain (geography, magic, society, etc.). Supplement with any runtime canon facts. Include only what is physically, culturally, or socially relevant to THIS scene's location and events.
9. NPC AGENDAS: For each relevant character, incorporate their current agenda (goal, leverage, fear, off-screen behavior) into the character profile. This informs how NPCs will act in the scene.
10. TWO-SOURCE SYNTHESIS: You may receive two sources of truth: (a) structured character/world profiles (initial decomposition from story creation) and (b) runtime canon facts (discovered during gameplay). Prefer structured profiles for speech patterns, traits, relationships, and world rules. Use canon facts for runtime discoveries that supplement the initial decomposition.
11. EPISTEMIC FIDELITY: When world facts are tagged with epistemic status (LAW, BELIEF, RUMOR, MYSTERY, etc.), preserve that status in the Story Bible. Do not present beliefs as settled truth, rumors as confirmed facts, or resolve mysteries. Characters may be wrong about the world - this ambiguity is narratively valuable.
```

### 2) User Message

```text
Curate a Story Bible for the upcoming scene based on the planner's guidance and all available context.

=== PLANNER GUIDANCE ===
Scene Intent: {{pagePlan.sceneIntent}}
Dramatic Question: {{pagePlan.dramaticQuestion}}
Continuity Anchors:
{{pagePlan.continuityAnchors as bullet list}}
{{#if pagePlan.choiceIntents.length}}
Choice Intents:
{{pagePlan.choiceIntents as numbered list: "N. [choiceType / primaryDelta] hook"}}
{{/if}}

{{#if mentionedCharacters detected in planner text}}
CHARACTERS REFERENCED IN THIS PLAN (must appear in relevantCharacters):
- {{matched canonical character name}}
- ...
{{/if}}

=== FULL STORY CONTEXT ===

{{#if decomposedWorld.facts.length > 0}}
WORLDBUILDING (structured):
[DOMAIN_NAME]
- [FACT_TYPE] fact text (scope: scope text)
...
{{else}}
WORLDBUILDING:
(none provided)
{{/if}}

TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}

{{#if spine}}
STORY SPINE (invariant narrative backbone — every scene must serve this):
{{spine section from buildSpineSection()}}
Every act must advance or complicate the protagonist's relationship to the central dramatic question.
{{/if}}

{{#if decomposedCharacters.length > 0}}
CHARACTERS (structured profiles with speech fingerprints):
{{decomposedCharacters formatted as structured profiles with SPEECH FINGERPRINT blocks; index 0 marked as PROTAGONIST}}
{{/if}}

{{#if accumulatedNpcAgendas has entries}}
NPC AGENDAS (current goals and off-screen behavior):
[CharacterName]
  Goal: {{agenda.currentGoal}}
  Leverage: {{agenda.leverage}}
  Fear: {{agenda.fear}}
  Off-screen: {{agenda.offScreenBehavior}}
{{/if}}

{{#if accumulatedNpcRelationships has entries}}
NPC-PROTAGONIST RELATIONSHIPS:
[CharacterName]
  Dynamic: {{relationship.dynamic}} | Valence: {{relationship.valence}}
  Tension: {{relationship.currentTension}}
{{/if}}

{{#if structure && accumulatedStructureState}}
=== STORY STRUCTURE ===
{{structureSection (same format as continuation prompt)}}
{{/if}}

{{#if globalCanon.length > 0}}
ESTABLISHED WORLD FACTS:
{{globalCanon rendered via formatCanonForPrompt() — tagged facts show as "• [TYPE] text" (e.g., "• [LAW] The river flows north"), bare strings as "• text"}}
{{/if}}

{{#if globalCharacterCanon has entries}}
CHARACTER CANON (permanent traits):
{{globalCharacterCanon rendered as:
[Character Name]
- fact
- fact}}
{{/if}}

{{#if accumulatedCharacterState has entries}}
NPC ACCUMULATED STATE (branch-specific events):
{{accumulatedCharacterState rendered as:
[Character Name]
- [id] state text}}
{{/if}}

{{#if activeState has any fields}}
ACTIVE STATE:
Current Location: {{activeState.currentLocation}}
Active Threats: {{activeState.activeThreats as comma-separated text list}}
Active Constraints: {{activeState.activeConstraints as comma-separated text list}}
Open Threads: {{activeState.openThreads as "text [threadType/urgency]" comma-separated list}}
{{/if}}

{{#if startingSituation}}
STARTING SITUATION:
This is the opening page. The starting situation below describes what the protagonist is walking into. Use it to determine which worldbuilding elements, characters, and canon facts are relevant to this first scene.

{{startingSituation}}
{{/if}}

{{#if ancestorSummaries.length > 0}}
ANCESTOR PAGE SUMMARIES (oldest first):
{{ancestorSummaries as "- Page N: summary" list}}
{{/if}}

{{#if grandparentNarrative}}
GRANDPARENT NARRATIVE (2 pages ago):
{{grandparentNarrative}}
{{/if}}

{{#if !startingSituation}}
PARENT NARRATIVE (previous page):
{{previousNarrative}}
{{/if}}

TONE REMINDER: All output must fit the tone: {{tone}}.{{#if toneFeel}} Target feel: {{toneFeel joined by ', '}}.{{/if}}{{#if toneAvoid}} Avoid: {{toneAvoid joined by ', '}}.{{/if}}

=== INSTRUCTIONS ===
Return a Story Bible containing ONLY what the writer needs for this specific scene:
1. sceneWorldContext: Filter worldbuilding to what's relevant here
2. relevantCharacters: Characters present, physically nearby (behind doors, approaching, in adjacent spaces), referenced, or whose influence matters - with synthesized speech patterns
3. relevantCanonFacts: Only canon facts needed for consistency in this scene
4. relevantHistory: A synthesized narrative chronology preserving causality chains
```

## JSON Response Shape

```json
{
  "sceneWorldContext": "{{filtered worldbuilding relevant to this scene}}",
  "relevantCharacters": [
    {
      "name": "{{character name}}",
      "role": "{{ally|antagonist|bystander|mentor|love interest|etc.}}",
      "relevantProfile": "{{who they are, what matters for this scene}}",
      "speechPatterns": "{{verbal tics, vocabulary, formality, dialect, phrases, sentence structure}}",
      "protagonistRelationship": "{{trust level, power dynamic, emotional tension, unresolved history}}",
      "interCharacterDynamics": "{{relationships with other characters in scene, or empty string}}",
      "currentState": "{{situation and emotional state entering this scene}}"
    }
  ],
  "relevantCanonFacts": ["{{canon fact relevant to this scene}}"],
  "relevantHistory": "{{synthesized narrative chronology preserving causality chains}}"
}
```

All fields are required. `relevantCharacters` may be an empty array. `interCharacterDynamics` is required in the schema but may be an empty string (the response transformer strips empty values before passing to the writer).

## Validation and Transformation

The response transformer (`lorekeeper-response-transformer.ts`) applies the following post-processing:

1. **Whitespace trimming**: All string fields are trimmed.
2. **Empty canon fact filtering**: Canon facts that are empty or whitespace-only after trimming are removed.
3. **Optional interCharacterDynamics**: If `interCharacterDynamics` is empty or whitespace-only after trimming, the field is omitted from the character entry.
4. **Character validation**: Characters with empty `name` or `role` after trimming cause a validation error.
5. **Default values**: Missing top-level fields default to empty string/array via Zod schema.
6. **JSON string parsing**: If the input is a JSON string, it is parsed before validation.

## Contract Ownership

- Curation-principle text and required output field sets are centralized in `src/llm/lorekeeper-contract.ts`.
- Prompt text, schema required arrays, and response-transformer field handling consume this contract to reduce drift.

## Context Provided

The Lorekeeper receives the **full** story context (same data as the writer would receive without bible):

| Context Field | Description |
|---|---|
| `decomposedCharacters` | Structured character profiles with speech fingerprints (required) |
| `decomposedWorld` | Domain-tagged atomic world facts (required) |
| `tone` | Tone/genre string |
| `toneFeel` | Target feel keywords (optional, from spine) |
| `toneAvoid` | Words/moods to avoid (optional, from spine) |
| `structure` / `accumulatedStructureState` | Current story structure and act/beat position |
| `globalCanon` | All global canon facts as `CanonFact[]` — may be bare strings (legacy) or `{ text, factType }` objects with epistemic tags (LAW, NORM, BELIEF, DISPUTED, RUMOR, MYSTERY). Rendered via `formatCanonForPrompt()` |
| `globalCharacterCanon` | All character canon facts (by character name, runtime discoveries) |
| `accumulatedCharacterState` | All NPC state entries (by character name) |
| `accumulatedNpcAgendas` | Current NPC agendas (by NPC name): goal, leverage, fear, off-screen behavior |
| `accumulatedNpcRelationships` | Current NPC-protagonist relationships (by NPC name): dynamic, valence, tension |
| `activeState` | Current location, threats, constraints, threads |
| `spine` | Story spine context (optional; injected via `buildSpineSection()` between tone block and NPC sections) |
| `startingSituation` | Starting situation text (opening pages only; replaces narrative history fields) |
| `ancestorSummaries` | All ancestor page summaries (continuation only) |
| `grandparentNarrative` | Full text of 2 pages ago (continuation only, if exists) |
| `previousNarrative` | Full text of parent page (continuation only) |

## Engine-Side Character Detection

Before building the prompt, `detectMentionedCharacters(context)` scans all planner guidance fields (`sceneIntent`, `dramaticQuestion`, `continuityAnchors`, `choiceIntents[].hook`, `writerBrief.openingLineDirective`, `writerBrief.mustIncludeBeats`, `writerBrief.forbiddenRecaps`) for canonical character name tokens from `decomposedCharacters`. Parenthetical suffixes are stripped (e.g., `"Bobby Western (1972)"` -> `"Bobby Western"`), tokens shorter than 3 characters are filtered, and matching is case-insensitive via `String.includes()`. Matched character names are injected as a `CHARACTERS REFERENCED IN THIS PLAN` directive between the planner guidance and full story context sections. This ensures the Lorekeeper cannot omit characters that the planner explicitly referenced.

## Two-Source Synthesis

When decomposed character/world data is available, the Lorekeeper receives two complementary sources of truth:

1. **Decomposed structure** (from entity decomposer at story creation): Structured character profiles with speech fingerprints, domain-tagged world facts. This is the initial scaffold.
2. **Runtime canon facts** (`globalCanon`, `globalCharacterCanon`): Permanent facts discovered during gameplay. These accumulate across pages.

The Lorekeeper is instructed (principle #9) to prefer decomposed structure for speech patterns, traits, relationships, and world rules, while using canon facts for runtime discoveries that supplement the initial decomposition. Both sources feed into the Story Bible output.

When decomposed world facts include epistemic status tags (LAW, BELIEF, RUMOR, MYSTERY, etc.), the Lorekeeper preserves that status in the Story Bible (principle #10). This prevents beliefs from being flattened into settled truths and keeps intentional ambiguity intact for the writer.

## Writer Integration

The Story Bible produced by the Lorekeeper is stored on the writer context's `storyBible` field (both `OpeningContext.storyBible` and `ContinuationContext.storyBible`) and persisted on the `Page` object as `storyBible: StoryBible | null`. When either writer prompt detects a non-null `storyBible`, it:

1. Inserts a `=== STORY BIBLE (curated for this scene) ===` section (with `Speech:` line removed — NPC speech data is now injected separately)
2. Suppresses: worldbuilding, NPCs, global canon, character canon, character state, ancestor summaries
3. Keeps: active state, inventory, health, protagonist affect, structure, planner guidance, grandparent/parent narrative (continuation), starting situation (opening)
4. Injects an `NPC VOICE FINGERPRINTS` section: for each NPC the lorekeeper selected as scene-relevant, the engine looks up the full `SpeechFingerprint` from `decomposedCharacters` (case-insensitive name match) and injects it directly into the writer prompt. NPCs not found in `decomposedCharacters` fall back to the lorekeeper's `speechPatterns` string.

The `speechPatterns` field in the lorekeeper schema/types is **retained** as a fallback for NPCs that don't have decomposed character data (e.g., NPCs introduced mid-story without entity decomposition). However, for NPCs with decomposed profiles, the writer now receives the full 9-field fingerprint (vocabulary, catchphrases, dialogue samples, anti-examples, discourse markers, register shifts, etc.) instead of a compressed single string.

See `prompts/opening-prompt.md` and `prompts/continuation-prompt.md` for details on the conditional behavior in each mode.

## Generation Stage

The Lorekeeper runs as the `CURATING_CONTEXT` generation stage, emitted inside the WRITING stage (because it runs within the writer's retry pipeline callback). The stage event ordering is the same for both opening and continuation:

**Opening pipeline:**
```
PLANNING_PAGE started
PLANNING_PAGE completed
WRITING_OPENING_PAGE started
  CURATING_CONTEXT started
  CURATING_CONTEXT completed
  WRITING_OPENING_PAGE started (inner, attempt: 1)
WRITING_OPENING_PAGE completed
ANALYZING_SCENE started
ANALYZING_SCENE completed
RESOLVING_AGENDAS started
RESOLVING_AGENDAS completed
```

**Continuation pipeline:**
```
PLANNING_PAGE started
PLANNING_PAGE completed
WRITING_CONTINUING_PAGE started
  CURATING_CONTEXT started
  CURATING_CONTEXT completed
  WRITING_CONTINUING_PAGE started (inner, attempt: 1)
WRITING_CONTINUING_PAGE completed
ANALYZING_SCENE started
ANALYZING_SCENE completed
RESOLVING_AGENDAS started
RESOLVING_AGENDAS completed
```

The frontend displays this stage as "LOREKEEPING" in the spinner UI with dedicated Sims-style humor phrases.
