# Agenda Resolver Prompt (Production Template)

- Source: `src/llm/prompts/agenda-resolver-prompt.ts`
- Generation entry point: `src/llm/agenda-resolver-generation.ts`
- Output schema source: `src/llm/schemas/agenda-resolver-schema.ts`
- Response transformer: `src/llm/schemas/agenda-resolver-response-transformer.ts`

## Purpose

The Agenda Resolver is a dedicated LLM call that runs after the analyst on continuation pages. It evaluates how scene events affected each NPC's agenda and updates their goals, leverage, fears, and off-screen behavior accordingly. This transforms NPCs from reactive stage furniture into autonomous story drivers with their own evolving arcs.

**Pipeline position**: Planner -> Lorekeeper -> Writer -> Analyst -> **Agenda Resolver**

The Agenda Resolver is skipped when:
- The story has no NPCs defined
- It's the opening page (initial agendas come from the structure generator instead)

Failure is **non-fatal**: if the resolver fails, parent agendas carry forward unchanged and page generation continues.

## Messages Sent To Model

### 1) System Message

```text
You are the NPC Agenda Resolver for an interactive branching story. After each scene, you evaluate how events affect each NPC's agenda and update their goals, leverage, fears, and off-screen behavior accordingly.

RULES:
1. Only update agendas whose situation materially changed due to the scene's events. If nothing relevant happened to an NPC, do NOT include them in updatedAgendas.
2. Off-screen NPCs still evolve: their goals progress, leverage shifts, and off-screen behavior reflects time passing and their own pursuits.
3. Keep each field to 1-2 sentences maximum.
4. Respect story structure pacing: do NOT let NPCs resolve Act 3 conflicts during Act 1. NPCs should be setting up, maneuvering, and positioning — not achieving endgame goals prematurely.
5. Off-screen behavior must be plausible given the NPC's leverage and fear. An NPC who fears exposure won't be acting boldly in public.
6. NPC names in your output MUST exactly match the names in the NPC definitions.
7. Return an empty updatedAgendas array if no NPC's situation changed materially.
```

### 2) User Message

```text
Evaluate NPC agenda changes after the following scene.

NPC DEFINITIONS:
{{formattedNpcs}}

CURRENT NPC AGENDAS:
{{currentAgendas rendered as:
[CharacterName]
  Goal: {{agenda.currentGoal}}
  Leverage: {{agenda.leverage}}
  Fear: {{agenda.fear}}
  Off-screen: {{agenda.offScreenBehavior}}
or '(no existing agendas)'}}

{{#if structure && accumulatedStructureState}}
STORY STRUCTURE CONTEXT:
Current Act Index: {{accumulatedStructureState.currentActIndex}}
Current Beat Index: {{accumulatedStructureState.currentBeatIndex}}
Overall Theme: {{structure.overallTheme}}
{{/if}}

ACTIVE STATE:
{{#if activeState.currentLocation}}Current Location: {{activeState.currentLocation}}{{/if}}
{{#if activeState.activeThreats.length > 0}}Active Threats: {{activeState.activeThreats as comma-separated text}}{{/if}}

SCENE SUMMARY:
{{sceneSummary}}

NARRATIVE:
{{narrative}}

Return only agendas that changed. If nothing material changed for any NPC, return an empty updatedAgendas array.
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
  ]
}
```

- `updatedAgendas` may be an empty array when no NPC's situation changed materially.
- All five fields (`npcName`, `currentGoal`, `leverage`, `fear`, `offScreenBehavior`) are required for each entry.

## Validation and Transformation

The response transformer (`agenda-resolver-response-transformer.ts`) applies the following post-processing:

1. **JSON string parsing**: If the input is a JSON string, it is parsed before validation.
2. **Type validation**: Response must be an object with an `updatedAgendas` array.
3. **Field validation**: Each agenda entry must have all five required string fields. Entries with missing or non-string fields are silently skipped.
4. **NPC name validation**: Agenda entries for NPCs not in the story's NPC list are filtered out. Name matching uses `normalizeForComparison()` from `src/models/normalize.ts` (case-insensitive, whitespace-normalized).
5. **Whitespace trimming**: All string fields are trimmed.
6. **Error handling**: Invalid top-level structure throws `LLMError` with code `AGENDA_RESOLVER_PARSE_ERROR` (retryable).

## Context Provided

| Context Field | Description |
|---|---|
| `narrative` | Full narrative text of the just-written page |
| `sceneSummary` | Scene summary from the writer |
| `npcs` | All NPC definitions (name + description) |
| `currentAgendas` | Accumulated NPC agendas from the parent page |
| `structure` | Current story structure (optional) |
| `accumulatedStructureState` | Current act/beat position (optional) |
| `activeState` | Current location and active threats |

## Agenda Accumulation

Agendas are stored per-page and inherit from the parent page, similar to other accumulated state:

- **First page**: Receives `initialNpcAgendas` from the structure generator. No resolver runs.
- **Continuation pages**: Parent agendas + resolver updates = new accumulated agendas.
- **Branch isolation**: Different branches evolve agendas independently.
- **Update semantics**: Updates are full replacements keyed by NPC name (case-insensitive matching). NPCs not included in `updatedAgendas` retain their existing agenda unchanged.

## Downstream Consumers

Updated agendas flow into the next page's planning context:

- **Page Planner** (continuation): Receives agendas in the `NPC AGENDAS` section to inform scene planning.
- **Page Planner** (opening): Receives `initialNpcAgendas` in the `NPC INITIAL AGENDAS` section.
- **Lorekeeper**: Receives agendas to curate into the Story Bible's character profiles (curation principle 8).
- **Writer**: Receives agendas indirectly through the Story Bible's character entries.

## Generation Stage

The Agenda Resolver runs as the `RESOLVING_AGENDAS` generation stage, after `ANALYZING_SCENE`. The stage event ordering is:

```
PLANNING_PAGE started
PLANNING_PAGE completed
WRITING_CONTINUING_PAGE started
  CURATING_CONTEXT started
  CURATING_CONTEXT completed
WRITING_CONTINUING_PAGE completed
ANALYZING_SCENE started
ANALYZING_SCENE completed
RESOLVING_AGENDAS started
RESOLVING_AGENDAS completed
```

The frontend displays this stage as "SCHEMING" in the spinner UI with dedicated Sims-style humor phrases themed around NPC plotting and off-screen machinations.

## LLM Configuration

| Setting | Value |
|---|---|
| Temperature | 0.4 |
| Max tokens | 1024 |
| Schema enforcement | `strict: true` via OpenRouter `response_format` |
