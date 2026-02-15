# Agenda Resolver Prompt (Production Template)

- Source: `src/llm/prompts/agenda-resolver-prompt.ts`
- Generation entry point: `src/llm/agenda-resolver-generation.ts`
- Output schema source: `src/llm/schemas/agenda-resolver-schema.ts`
- Response transformer: `src/llm/schemas/agenda-resolver-response-transformer.ts`

## Purpose

The Agenda Resolver is a dedicated LLM call that runs after the analyst on both opening and continuation pages. It evaluates how scene events affected each NPC's agenda and updates their goals, leverage, fears, and off-screen behavior accordingly. It also evaluates and updates NPC-protagonist relationships based on scene events and analyst-detected relationship shifts. This transforms NPCs from reactive stage furniture into autonomous story drivers with their own evolving arcs and tracked relationship dynamics.

**Pipeline position**: Planner -> Lorekeeper -> Writer -> Analyst -> **Agenda Resolver**

The Agenda Resolver is skipped when:
- The story has no NPCs defined

For opening pages, the resolver receives `initialNpcAgendas` (from the structure generator) as the parent agendas to evolve from.

Failure is **non-fatal**: if the resolver fails, parent agendas and relationships carry forward unchanged and page generation continues.

## Messages Sent To Model

### 1) System Message

```text
You are the NPC Agenda Resolver for an interactive branching story. After each scene, you evaluate how events affect each NPC's agenda and update their goals, leverage, fears, and off-screen behavior accordingly.

RULES:
1. Only update agendas whose situation materially changed due to the scene's events. If nothing relevant happened to an NPC, do NOT include them in updatedAgendas.
2. Off-screen NPCs still evolve: their goals progress, leverage shifts, and off-screen behavior reflects time passing and their own pursuits.
3. Keep each field to 1-2 sentences maximum.
4. Respect story structure pacing: do NOT let NPCs resolve Act 3 conflicts during Act 1. NPCs should be setting up, maneuvering, and positioning - not achieving endgame goals prematurely.
5. Off-screen behavior must be plausible given the NPC's leverage and fear. An NPC who fears exposure won't be acting boldly in public.
6. When structured character profiles are provided, treat them as the primary source for motivations, relationships, and voice-influenced behavior.
7. NPC names in your output MUST exactly match the names in the character definitions section.
8. Return an empty updatedAgendas array if no NPC's situation changed materially.

RELATIONSHIP UPDATES:
9. When NPC-protagonist relationships are provided, evaluate whether the scene caused meaningful relationship changes.
10. Use analyst relationship shift signals as guidance, but make your own judgment on final values.
11. Only include an NPC in updatedRelationships when their relationship with the protagonist materially changed.
12. Valence must stay within -5 to +5 (negative = hostile/cold, positive = warm/allied).
13. Return an empty updatedRelationships array if no relationships changed.

{{#if tone}}
TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}
{{/if}}
```

### 2) User Message

```text
Evaluate NPC agenda and relationship changes after the following scene.

{{#if decomposedCharacters && decomposedCharacters.length > 0}}
CHARACTERS (structured profiles with speech fingerprints):
{{decomposedCharacters formatted with formatDecomposedCharacterForPrompt()}}
{{else}}
NPC DEFINITIONS:
{{formattedNpcs}}
{{/if}}

CURRENT NPC AGENDAS:
{{currentAgendas rendered as:
[CharacterName]
  Goal: {{agenda.currentGoal}}
  Leverage: {{agenda.leverage}}
  Fear: {{agenda.fear}}
  Off-screen: {{agenda.offScreenBehavior}}
or '(no existing agendas)'}}

{{#if currentRelationships has entries}}
CURRENT NPC-PROTAGONIST RELATIONSHIPS:
{{currentRelationships rendered as:
[CharacterName]
  Dynamic: {{relationship.dynamic}} | Valence: {{relationship.valence}}
  History: {{relationship.history}}
  Current Tension: {{relationship.currentTension}}
  Leverage: {{relationship.leverage}}
or '(no existing relationships)'}}
{{/if}}

{{#if structure}}
STORY STRUCTURE CONTEXT:
Overall Theme: {{structure.overallTheme}}
{{/if}}

{{#if deviationContext}}
STRUCTURAL DEVIATION ALERT:
The story has just deviated from its planned structure. NPC agendas aligned with now-invalidated beats must be proactively realigned.
Deviation reason: {{deviationContext.reason}}
New story beats going forward:
{{#each deviationContext.newBeats}}- {{name}} ({{role}}): {{objective}}
{{/each}}
Realign NPC goals and off-screen behavior to reflect this structural shift.
{{/if}}

ACTIVE STATE:
{{#if activeState.currentLocation}}Current Location: {{activeState.currentLocation}}{{/if}}
{{#if activeState.activeThreats.length > 0}}Active Threats: {{activeState.activeThreats as comma-separated text}}{{/if}}

SCENE SUMMARY:
{{sceneSummary}}

NARRATIVE:
{{narrative}}

{{#if analystRelationshipShifts.length > 0}}
ANALYST RELATIONSHIP SHIFT SIGNALS:
{{#each analystRelationshipShifts}}- {{npcName}}: {{shiftDescription}} (suggested valence change: {{suggestedValenceChange}}{{#if suggestedNewDynamic}}, suggested new dynamic: {{suggestedNewDynamic}}{{/if}})
{{/each}}
Use these as guidance but make your own judgment on final relationship values.
{{/if}}

{{#if analystNpcCoherenceIssues}}
ANALYST COHERENCE NOTE:
The scene analyst flagged the following NPC behavior inconsistency: {{analystNpcCoherenceIssues}}
Consider whether this represents intentional NPC evolution (update the agenda accordingly) or a writer error (maintain the original agenda direction).
{{/if}}

{{#if tone}}TONE REMINDER: All output must fit the tone: {{tone}}.{{#if toneFeel}} Target feel: {{toneFeel joined by ', '}}.{{/if}}{{#if toneAvoid}} Avoid: {{toneAvoid joined by ', '}}.{{/if}}

{{/if}}Return only agendas and relationships that changed. If nothing material changed, return empty arrays for both updatedAgendas and updatedRelationships.
```

## JSON Response Shape

```json
{
  "updatedAgendas": [
    {
      "npcName": "{{exact NPC name from definitions}}",
      "currentGoal": "{{updated goal, 1-2 sentences}}",
      "leverage": "{{updated advantage or resource, 1-2 sentences}}",
      "fear": "{{updated fear or avoidance, 1-2 sentences}}",
      "offScreenBehavior": "{{what this NPC is doing off-screen after this scene, 1-2 sentences}}"
    }
  ],
  "updatedRelationships": [
    {
      "npcName": "{{exact NPC name from definitions}}",
      "valence": "{{updated valence, -5 to +5}}",
      "dynamic": "{{updated dynamic label (mentor, rival, ally, target, dependency, protector, etc.)}}",
      "history": "{{updated relationship history, 1-2 sentences}}",
      "currentTension": "{{updated current tension, 1-2 sentences}}",
      "leverage": "{{updated leverage one party holds over the other, 1 sentence}}"
    }
  ]
}
```

- Both `updatedAgendas` and `updatedRelationships` are required top-level fields.
- Both may be empty arrays when nothing changed materially.
- All five agenda fields (`npcName`, `currentGoal`, `leverage`, `fear`, `offScreenBehavior`) are required for each agenda entry.
- All six relationship fields (`npcName`, `valence`, `dynamic`, `history`, `currentTension`, `leverage`) are required for each relationship entry.

## Validation and Transformation

The response transformer (`agenda-resolver-response-transformer.ts`) applies the following post-processing:

1. **JSON string parsing**: If the input is a JSON string, it is parsed before validation.
2. **Type validation**: Response must be an object with an `updatedAgendas` array (required) and `updatedRelationships` array (optional, defaults to empty).
3. **Agenda field validation**: Each agenda entry must have all five required string fields. Entries with missing or non-string fields are silently skipped.
4. **Relationship field validation**: Each relationship entry must have `npcName` (string), `valence` (number), `dynamic` (string), `history` (string), `currentTension` (string), and `leverage` (string). Entries with missing or wrong-type fields are silently skipped.
5. **Valence clamping**: Relationship `valence` values are clamped to the range -5 to +5 via `Math.max(-5, Math.min(5, value))`.
6. **NPC name validation**: Both agenda and relationship entries for NPCs not in the story's NPC list are filtered out. Name matching uses `normalizeForComparison()` from `src/models/normalize.ts` (case-insensitive, whitespace-normalized).
7. **Whitespace trimming**: All string fields are trimmed.
8. **Error handling**: Invalid top-level structure throws `LLMError` with code `AGENDA_RESOLVER_PARSE_ERROR` (retryable).

## Context Provided

| Context Field | Description |
|---|---|
| `narrative` | Full narrative text of the just-written page |
| `sceneSummary` | Scene summary from the writer |
| `npcs` | All NPC definitions (name + description), used as fallback when decomposition is unavailable |
| `decomposedCharacters` | Structured character profiles with speech fingerprints (optional, preferred when present) |
| `currentAgendas` | Accumulated NPC agendas from the parent page |
| `currentRelationships` | Accumulated NPC-protagonist relationships from the parent page (optional) |
| `analystRelationshipShifts` | Relationship shifts detected by the analyst (optional, present when analyst flagged meaningful NPC-protagonist relationship changes) |
| `structure` | Current story structure (optional) |
| `activeState` | Current location and active threats |
| `analystNpcCoherenceIssues` | NPC behavior inconsistency flagged by the analyst (optional, non-empty when analyst detected incoherent NPC behavior) |
| `deviationContext` | Structural deviation context (optional, present only when a story structure rewrite just occurred). Contains the deviation reason and the new beats from the rewritten structure |
| `tone` | Tone/genre string (optional) |
| `toneFeel` | Target feel keywords (optional, from spine) |
| `toneAvoid` | Words/moods to avoid (optional, from spine) |

## Agenda and Relationship Accumulation

Agendas and relationships are stored per-page and inherit from the parent page, similar to other accumulated state:

- **First page**: Receives `initialNpcAgendas` (from the structure generator) and `initialNpcRelationships` (from the entity decomposer's `protagonistRelationship` fields) as parent state. The resolver runs and may update them based on opening scene events.
- **Continuation pages**: Parent state + resolver updates = new accumulated state for both agendas and relationships.
- **Branch isolation**: Different branches evolve agendas and relationships independently.
- **Update semantics**: Updates are full replacements keyed by NPC name (case-insensitive matching). NPCs not included in `updatedAgendas`/`updatedRelationships` retain their existing state unchanged.

## Upstream Inputs

The Agenda Resolver receives feedback from the analyst:

- **Analyst NPC coherence assessment**: When the analyst flags NPC behavior inconsistency (`npcCoherenceIssues`), this is forwarded as `analystNpcCoherenceIssues`. The resolver uses this to decide whether the inconsistency represents intentional NPC evolution (update agenda accordingly) or a writer error (maintain original agenda direction).
- **Analyst relationship shift signals**: When the analyst flags NPC-protagonist relationship changes (`relationshipShiftsDetected`), these are forwarded as `analystRelationshipShifts`. Each shift includes the NPC name, shift description, suggested valence change (-3 to +3), and optional new dynamic label. The resolver uses these as guidance but makes independent judgment on final relationship values. Zero token cost when no shifts detected.
- **Structural deviation context**: When the analyst detects a story deviation and a structure rewrite occurs, the resolver receives `deviationContext` containing the deviation reason and the new beats from the rewritten structure. This allows NPCs to proactively realign their agendas with the new story direction. Zero token cost when no deviation occurs.

## Downstream Consumers

Updated agendas and relationships flow into the next page's context:

- **Page Planner** (continuation): Receives agendas in the `NPC AGENDAS` section and relationships in the `NPC-PROTAGONIST RELATIONSHIPS` section to inform scene planning.
- **Page Planner** (opening): Receives `initialNpcAgendas` in the `NPC INITIAL AGENDAS` section.
- **Lorekeeper**: Receives agendas (curation principle 8) and relationships in the `NPC-PROTAGONIST RELATIONSHIPS` section to curate into the Story Bible's character profiles.
- **Writer**: Receives agendas and relationship context indirectly through the Story Bible's character entries.
- **Analyst**: Receives accumulated relationships as context for evaluating relationship shifts in subsequent scenes.

## Generation Stage

The Agenda Resolver runs as the `RESOLVING_AGENDAS` generation stage, after `ANALYZING_SCENE` (and after the conditional `RESTRUCTURING_STORY` stage when a deviation is detected). The stage event ordering is the same for both opening and continuation pages (with the WRITING stage name varying):

```
PLANNING_PAGE started
PLANNING_PAGE completed
WRITING_OPENING_PAGE / WRITING_CONTINUING_PAGE started
  CURATING_CONTEXT started
  CURATING_CONTEXT completed
WRITING_OPENING_PAGE / WRITING_CONTINUING_PAGE completed
ANALYZING_SCENE started
ANALYZING_SCENE completed
RESTRUCTURING_STORY started       (conditional: only when deviation detected)
RESTRUCTURING_STORY completed
RESOLVING_AGENDAS started
RESOLVING_AGENDAS completed
```

When `RESTRUCTURING_STORY` runs, the agenda resolver receives a `deviationContext` containing the deviation reason and the new beats from the rewritten structure. When no deviation occurs, `RESTRUCTURING_STORY` is skipped and `deviationContext` is absent.

The frontend displays this stage as "SCHEMING" in the spinner UI with dedicated Sims-style humor phrases themed around NPC plotting and off-screen machinations.

## LLM Configuration

| Setting | Value |
|---|---|
| Temperature | 0.4 |
| Max tokens | 1024 |
| Schema enforcement | `strict: true` via OpenRouter `response_format` |
