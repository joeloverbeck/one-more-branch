# Choice Generator Prompt (Production Template)

- Source: `src/llm/prompts/choice-generator-prompt.ts`
- Generation source: `src/llm/choice-generator-generation.ts`
- Types source: `src/llm/choice-generator-types.ts`
- Output schema source: `src/llm/schemas/choice-generator-schema.ts`
- Validation schema source: `src/llm/schemas/choice-generator-validation-schema.ts`
- Response transformer source: `src/llm/schemas/choice-generator-response-transformer.ts`
- Choice guidelines source: `src/llm/prompts/sections/shared/choice-guidelines.ts`

## Pipeline Position

The Choice Generator runs **after** the Writer and Reconciler, **before** the Analyst:

```
Planner → Accountant → Lorekeeper → Writer → Reconciler → **Choice Generator** → Analyst → AgendaResolver
```

- If `isEnding === true` on the planner output, the Choice Generator is **skipped** (endings have no choices).
- The Choice Generator receives the written narrative as input, so choices can reference specific moments from the scene.

## Relationship to Planner

The Planner produces `dramaticQuestion` as the thematic anchor for choices. This is passed to the Choice Generator (not the writer). The Choice Generator uses it as guidance along with the full scene context to autonomously ideate compelling choices.

## Input Context

`ChoiceGeneratorContext` interface:

| Field | Source | Description |
|-------|--------|-------------|
| `narrative` | Writer output | The written scene text |
| `sceneSummary` | Writer output | Scene summary from writer |
| `protagonistAffect` | Writer output | Protagonist emotional state at scene end |
| `dramaticQuestion` | Planner output | The dramatic question choices should answer |
| `spine` | Story data | Story spine for thematic grounding |
| `activeState` | Engine state | Current location, threats, constraints, threads |
| `structure` | Story data | Story structure (acts/beats) |
| `accumulatedStructureState` | Engine state | Current beat/act position |
| `storyBible` | Lorekeeper output | Curated scene context (relevant history) |
| `tone` / `toneFeel` / `toneAvoid` | Story data | Tone directives |
| `genreFrame` | Story data | Genre conventions |
| `decomposedCharacters` | Story data | Character profiles (protagonist traits) |
| `choiceGuidance` | Config | `'basic'` or `'strict'` — controls inclusion of STRICT_CHOICE_GUIDELINES |

## Messages Sent To Model

### 1) System Message

```text
You are a choice architect for interactive fiction. Your sole focus is crafting meaningful, divergent player choices that emerge naturally from the scene just written.

You do NOT write narrative prose. You ONLY generate structured choice objects.

CONTENT GUIDELINES:
RATING: NC-21 (ADULTS ONLY)
{{... full content policy ...}}
```

### 2) User Message

```text
Generate structured choices for the following scene.

=== WRITTEN SCENE ===
{{narrative}}

=== SCENE SUMMARY ===
{{sceneSummary}}

{{#if spine}}
STORY SPINE (invariant narrative backbone):
{{spine section}}
{{/if}}

{{#if structure && accumulatedStructureState}}
CURRENT BEAT: "{{beat.name}}" ({{beat.role}})
Beat Objective: {{beat.objective}}
Act Objective: {{act.objective}}
{{/if}}

DRAMATIC QUESTION: {{dramaticQuestion}}

NEED VS WANT RULE: At least one choice should force the protagonist to choose between pursuing their Want and addressing their true Need from the spine.

PROTAGONIST: {{protagonist.name}}
Core Traits: {{protagonist.coreTraits}}

PROTAGONIST EMOTIONAL STATE (end of scene):
Primary: {{emotion}} ({{intensity}}) - {{cause}}
Motivation: {{dominantMotivation}}

{{#if storyBible.relevantHistory}}
RELEVANT HISTORY:
{{storyBible.relevantHistory}}
{{/if}}

{{active state sections: location, threats, constraints, threads}}

{{#if choiceGuidance === 'strict'}}
{{STRICT_CHOICE_GUIDELINES}}
{{/if}}

REQUIREMENTS:
1. Generate 2-4 structured choice objects (typically 3; add a 4th only when the situation truly warrants another distinct path)
2. No two choices may share both the same choiceType AND the same primaryDelta. For 3-choice sets: at least 2 unique action families and 3 unique primary deltas. For 4-choice sets: at least 3 unique action families and 3 unique primary deltas
3. Choices must flow from the scene's final dramatic beat - reference specific moments from the narrative
4. Start each choice text with a clear action verb (e.g., "Demand", "Flee", "Accept")
5. Do NOT offer a choice that repeats what already happened in the scene
6. Do NOT offer choices that prematurely close off open narrative threads unless dramatically appropriate
7. Each choice should present a meaningfully different path that changes the story's direction
8. Choices must be in-character for the protagonist given their personality and emotional state
9. Optionally provide choiceSubtype (free-text like "CONFESSION", "BARGAIN") for nuance
10. Optionally provide choiceShape (RELAXED|OBVIOUS|TRADEOFF|DILEMMA|GAMBLE|TEMPTATION|SACRIFICE|FLAVOR) for pressure type

WHEN IN CONFLICT, PRIORITIZE:
1. Choices answer the dramatic question with divergent tags
2. Choices are natural responses to the scene's final moment
3. Each choice changes a different dimension of the story
```

## JSON Response Shape

```json
{
  "choices": [
    {
      "text": "{{verb-first player choice text, 3-500 chars}}",
      "choiceType": "{{INVESTIGATE|REVEAL|PERSUADE|CONNECT|DECEIVE|CONTEST|COMMIT|INTERVENE|NAVIGATE|WITHDRAW|SUBMIT}}",
      "primaryDelta": "{{LOCATION_ACCESS_CHANGE|GOAL_PRIORITY_CHANGE|RELATIONSHIP_ALIGNMENT_CHANGE|TIME_PRESSURE_CHANGE|RESOURCE_CONTROL_CHANGE|INFORMATION_STATE_CHANGE|SECRECY_EXPOSURE_CHANGE|CONDITION_STATUS_CHANGE|THREAT_LEVEL_CHANGE|OBLIGATION_RULE_CHANGE|POWER_AUTHORITY_CHANGE|IDENTITY_REPUTATION_CHANGE}}",
      "choiceSubtype": "{{optional free-text subtype or null}}",
      "choiceShape": "{{RELAXED|OBVIOUS|TRADEOFF|DILEMMA|GAMBLE|TEMPTATION|SACRIFICE|FLAVOR or null}}"
    }
  ]
}
```

- `choices` array: 2-4 items, validated by Zod schema
- Each choice text: 3-500 characters, trimmed, must be unique (case-insensitive)
- Each choice must have a valid `choiceType` and `primaryDelta` enum value
- `choiceSubtype` is optional (free-text string or null)
- `choiceShape` is optional (one of 8 `ChoiceShape` enum values or null)

## Validation

The Zod validation schema enforces:
- 2-5 choices in the array
- Text length 3-500 characters per choice
- Valid `ChoiceType` (11 values) and `PrimaryDelta` (12 values) enum values
- Optional `choiceSubtype` (string, nullable)
- Optional `choiceShape` (ChoiceShape enum, nullable)
- Unique choice text (case-insensitive deduplication)

## Repair Pipelines

On failure, the choice generator uses the same repair pipelines previously used by the writer:
- **Choice repair** (`writer-choice-repair.ts`): Repairs corrupted JSON in choice responses
- **Choice insufficiency repair** (`writer-choice-insufficiency-repair.ts`): Generates additional choices when fewer than 2 are produced

## Advantages Over Writer-Embedded Choices

- **Scene awareness**: Full written narrative available, so choices reference specific moments
- **Focused attention**: LLM's entire token budget dedicated to choice quality
- **Anti-pattern detection**: Instructions to avoid choices that repeat scene events
- **Thread awareness**: Active state (threats, constraints, threads) provided for situational grounding
- **Dramatic arc awareness**: Beat objective and structure position inform choice design
