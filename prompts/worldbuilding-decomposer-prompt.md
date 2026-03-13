# Worldbuilding Decomposer Prompt (Production Template)

- Source: `src/llm/prompts/worldbuilding-decomposer-prompt.ts`
- Generation file: `src/llm/worldbuilding-decomposer.ts`
- Schema file: `src/llm/schemas/worldbuilding-decomposer-schema.ts`
- Shared world facts schema: `src/llm/schemas/entity-decomposer-schema.ts` (`WORLD_FACTS_ARRAY_SCHEMA`)
- Shared tone builder: `src/llm/prompts/sections/shared/tone-block.ts`
- Model types: `src/models/decomposed-world.ts` (`DecomposedWorld`, `WorldFact`, `WorldFactDomain`, `WorldFactType`)

## Purpose

World-only decomposition — converts raw worldbuilding prose into structured, atomic facts with domain tags, scope annotations, and epistemic status. This is the worldbuilding-specific counterpart to the full entity decomposer, used when characters are already supplied by another pipeline (e.g., the character decomposer + contextualizer pipeline).

**Pipeline position**: Spine Selection -> **Worldbuilding Decomposer** (parallel with Character Decomposer) -> Character Contextualizer -> Structure Generator

**Why it exists**: Separating worldbuilding decomposition from character decomposition enables parallel execution. When characters are built through the character dev pipeline (stages 1-5), only the world facts need LLM decomposition — character profiles are already structured.

## Context Provided

| Context Field | Type | Description |
|---|---|---|
| `worldbuilding` | `string` | Raw worldbuilding prose to decompose |
| `tone` | `string` | Tone/genre string |
| `toneFeel` | `string[]?` | Target feel keywords (optional, from spine) |
| `toneAvoid` | `string[]?` | Words/moods to avoid (optional, from spine) |
| `spine` | `StorySpine?` | Story spine (optional) — narrative backbone with dramatic question, antagonistic force |

## Messages Sent To Model

### 1) System Message

```text
You are a Worldbuilding Decomposer for an interactive branching story engine. Your job is to convert raw worldbuilding prose into structured, atomic facts with domain tags, scope annotations, and epistemic status.

{{CONTENT_POLICY}}

WORLDBUILDING ATOMIZATION PRINCIPLES:

1. Break worldbuilding prose into atomic facts. Each fact should be a single, self-contained proposition.

2. Available domains: geography, ecology, history, society, culture, religion, governance, economy, faction, technology, magic, language.

3. Epistemic status (factType) for each fact:
   - LAW: Fundamental world truths that simply ARE.
   - NORM: Cultural or regional standard practices.
   - BELIEF: Held as true by specific groups but may or may not be objectively true.
   - DISPUTED: Multiple contradictory versions exist.
   - RUMOR: Unverified hearsay circulating in the world.
   - MYSTERY: Intentionally unresolved unknowns.

4. PRESERVE NUANCE: Do not discard implied or subtle worldbuilding. Capture indirect suggestions as BELIEF or RUMOR.

5. SCOPE PRECISION: Assign scopes that reflect where and when each fact applies.
```

### 2) User Message

```text
Decompose the following worldbuilding prose into atomic, structured facts.

WORLDBUILDING:
{{worldbuilding}}

{{#if tone}}
TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}
{{/if}}

{{#if spine}}
STORY SPINE (decompose worldbuilding in light of this):
Central dramatic question: {{spine.centralDramaticQuestion}}
Antagonistic force: {{spine.primaryAntagonisticForce.description}}
{{/if}}

INSTRUCTIONS:
1. Decompose into atomic propositions — each fact should be a single, self-contained statement
2. Assign appropriate domain tags from the available domain list
3. Assign scope annotations reflecting where/when each fact applies
4. Assign epistemic status (factType) reflecting certainty level
5. If no worldbuilding is provided or the text is empty, return an empty worldFacts array
```

## JSON Response Shape

```json
{
  "worldFacts": [
    {
      "domain": "{{geography|ecology|history|society|culture|religion|governance|economy|faction|technology|magic|language}}",
      "fact": "{{single atomic worldbuilding proposition}}",
      "scope": "{{where/when this fact applies}}",
      "factType": "{{LAW|NORM|BELIEF|DISPUTED|RUMOR|MYSTERY}}"
    }
  ]
}
```

- Reuses `WORLD_FACTS_ARRAY_SCHEMA` from the entity-decomposer schema.
- Same domain validation, fact type validation, and empty fact filtering as the full entity decomposer.
- Invalid domains default to `'culture'`. Invalid/missing `factType` values are omitted.
- World facts with empty or whitespace-only `fact` text are filtered out.

## Generation Stage

The Worldbuilding Decomposer runs as part of the `DECOMPOSING_ENTITIES` generation stage (when used in the split decomposition pipeline).

## LLM Stage Configuration

- Stage model key: `worldbuildingDecomposer`
- Uses `withRetry()` + `withModelFallback()` directly (not `runLlmStage()`)

## Contract Notes

- The worldbuilding decomposer shares the same world-fact parsing semantics as the full entity decomposer.
- Output is `WorldbuildingDecompositionResult` containing `decomposedWorld: DecomposedWorld` (with `facts` array and `rawWorldbuilding` string).
- When no worldbuilding is provided, returns an empty `facts` array.
