# Scene Blueprint Prompt (Production Template)

- Source: `src/llm/prompts/scene-blueprint-prompt.ts`
- Contract source: `src/llm/scene-blueprint-contract.ts`
- Type definitions: `src/llm/scene-blueprint-types.ts`
- Output schema source: `src/llm/schemas/scene-blueprint-schema.ts`
- Response transformer: `src/llm/schemas/scene-blueprint-response-transformer.ts`
- Blueprint section formatter: `src/llm/prompts/sections/shared/blueprint-section.ts`

## Purpose

The Scene Blueprint is a dedicated LLM call between the Lorekeeper and the Writer. It designs the internal paragraph-level structure of a scene BEFORE prose is composed, using Dwight Swain's Scene-Sequel model and Motivation-Reaction Units (MRUs).

**Pipeline position**: Planner -> Accountant -> Lorekeeper -> **Scene Blueprint** -> Writer -> Choice Generator -> Analyst

The blueprint provides the writer with a unit-by-unit structural plan that maps scene mandates to specific narrative positions, specifies emotional register variation, assigns sensory anchors, and controls paragraph weight distribution. When a blueprint is present, the writer follows simplified REQUIREMENTS that defer to the blueprint's structural intent instead of the default SCENE PROGRESSION DISCIPLINE / OPENING SCENE DISCIPLINE blocks.

## Messages Sent To Model

### 1) System Message

```text
You are a Scene Architect for an interactive branching story. Your role is to design the internal paragraph-level structure of a scene BEFORE the writer composes prose.

You work from Dwight Swain's Scene-Sequel model:
- SCENE units follow Goal -> Conflict -> Disaster
- SEQUEL units follow Reaction -> Dilemma -> Decision
- Not every scene uses all six; pick what serves THIS scene

Each unit you produce maps to a Motivation-Reaction Unit (MRU):
- MOTIVATION: An external event/stimulus the protagonist perceives
- REACTION: The protagonist's internal response (feeling -> reflex -> action -> speech)
- MIXED: Rapid exchanges where motivation and reaction interleave (dialogue, combat)

{{#if tone}}
TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}
{{/if}}

CONTENT GUIDELINES:
{{CONTENT_POLICY}}

STRUCTURAL RULES:
- Produce 4-8 units for a normal scene, 2-4 for an ending scene
- Each unit specifies a concrete sensory anchor (dominant sense + specific image)
- Emotional register MUST vary across units -- no monotone scenes
- No more than 2 consecutive units at the same intensity level
- Every sceneMandates entry MUST appear in exactly one unit's mandateMapping
- The emotionalArc should show a clear trajectory, not a flat line
- paragraphWeight across all units should sum to 6-12 for normal scenes, 4-8 for endings
- Do NOT write prose. Output structured planning only
- The blueprint must create internal scene movement -- setup, complication, shift -- not a flat sequence at the same emotional pitch

SCENE ARCHITECTURE RULES:
- At least one unit must produce a material, player-legible change (not atmospheric intensification alone)
- Each escalation unit must be tied to a concrete observable change
- Assign speaking characters to specific units when dialogue is planned
- Honor forbiddenRecaps -- no unit should re-describe forbidden content
```

### 2) User Message

```text
Design the paragraph-level structure for this scene.

{{#if spine}}
STORY SPINE (invariant narrative backbone -- every scene must serve this):
{{spine section from buildSpineSection()}}
{{/if}}

{{#if genreFrame}}
GENRE CONVENTIONS ({{genreFrame}} -- maintain throughout):
{{#each genreConventions}}
- {{this.tag}}: {{this.gloss}}
{{/each}}
{{/if}}

=== PLANNER OUTPUT ===
Scene Intent: {{pagePlan.sceneIntent}}
Dramatic Question: {{pagePlan.dramaticQuestion}}
Is Ending: {{pagePlan.isEnding}}
Scene Mandates (each MUST appear in exactly one unit's mandateMapping):
- {{mandate}}
- ...

{{#if forbiddenRecaps.length > 0}}
Forbidden Recaps (no unit may re-describe these):
- {{recap}}
- ...
{{/if}}

{{#if storyBible}}
=== STORY BIBLE (curated for this scene) ===
Scene World Context: {{storyBible.sceneWorldContext}}
Scene Characters:
- {{character.name}} ({{character.role}}): {{character.relevantProfile}}
{{/if}}

{{#if previousNarrative}}
PREVIOUS SCENE (for emotional register continuity):
{{previousNarrative (last 1500 chars)}}
{{/if}}

{{#if selectedChoice}}
PLAYER'S CHOICE: "{{selectedChoice}}"
{{/if}}

{{#if isOpening && openingImage}}
OPENING IMAGE CONTRACT: {{openingImage}}
{{/if}}

=== MODE-SPECIFIC RULES ===
{{#if isOpening}}
- Units 1-2 must establish orientation (where the protagonist is, what is happening, what immediate pressure is active)
- One unit must introduce the protagonist through action, reaction, or behavior -- not descriptive exposition
- Final unit must create a concrete choiceable situation
- If an opening image contract is provided, assign it to a specific unit's sensory anchor
{{else}}
- Unit 1 must address the player's choice directly and immediately
- Final unit must create a concrete choiceable situation (unless isEnding)
- Inherited mood from previous scene may appear as a brief element in unit 1, not a full unit
{{/if}}

Return JSON only.
```

## JSON Response Shape

```json
{
  "units": [
    {
      "action": "{{what happens in this unit}}",
      "emotionalRegister": "{{emotional tone of this unit}}",
      "sceneFunction": "{{GOAL|CONFLICT|DISASTER|REACTION|DILEMMA|DECISION|SETUP|TURN}}",
      "mruType": "{{MOTIVATION|REACTION|MIXED}}",
      "sensoryAnchor": "{{dominant sense + specific image}}",
      "paragraphWeight": 1,
      "speakingCharacters": ["{{character name}}"]
    }
  ],
  "emotionalArc": "{{trajectory description for the whole scene}}",
  "mandateMapping": [
    {
      "mandate": "{{exact mandate text from planner}}",
      "unitIndex": 0
    }
  ]
}
```

All fields on each unit are required. `speakingCharacters` is nullable (may be `null` when no dialogue is planned in that unit). `paragraphWeight` is an integer indicating how many paragraphs the unit should expand to.

## Context Provided

The Scene Blueprint receives a focused subset of story context:

| Context Field | Description |
|---|---|
| `pagePlan` | Full planner output including `sceneIntent`, `dramaticQuestion`, `isEnding`, `sceneMandates`, `forbiddenRecaps` |
| `storyBible` | Lorekeeper-curated story bible (optional; included when available) |
| `tone` | Tone/genre string |
| `toneFeel` | Target feel keywords (optional, from spine) |
| `toneAvoid` | Words/moods to avoid (optional, from spine) |
| `spine` | Story spine context (optional; injected via `buildSpineSection()`) |
| `genreFrame` | Optional genre frame; when present, a GENRE CONVENTIONS block is injected via `buildGenreConventionsSection()` |
| `isEnding` | Whether the planner marked this as an ending page |
| `isOpening` | Whether this is the opening page (controls mode-specific rules) |
| `previousNarrative` | Previous scene text (last 1500 chars; for emotional register continuity) |
| `selectedChoice` | Player's choice text (continuation only) |
| `openingImage` | Opening image contract (opening pages only) |

## Mode-Specific Rules

The blueprint prompt selects between two sets of architecture rules based on `isOpening`:

**Opening mode**: Requires orientation in units 1-2, protagonist introduction through behavior, a choiceable final unit, and opening image placement when provided.

**Continuation mode**: Requires unit 1 to address the player's choice directly, a choiceable final unit (unless ending), and only brief inherited mood in unit 1.

## Writer Integration

When a blueprint is present, the writer prompts (both opening and continuation) switch to a simplified REQUIREMENTS block that instructs the writer to follow the blueprint unit-by-unit. The default SCENE PROGRESSION DISCIPLINE / OPENING SCENE DISCIPLINE blocks are suppressed. The priority hierarchy also changes to include "Follow the blueprint's structural intent and emotional arc" as a high-priority item.

The blueprint is formatted for the writer via `formatBlueprintSection()` in `src/llm/prompts/sections/shared/blueprint-section.ts`, which renders each unit with its function, MRU type, paragraph weight, action, register, sensory anchor, and speaking characters.

## Contract Ownership

- Scene function values, MRU type values, required field lists, and unit/paragraph constraints are centralized in `src/llm/scene-blueprint-contract.ts`.
- Prompt text, schema, and response transformer consume this contract to reduce drift.

## Validation Constraints

From the contract:
- Unit count: 2-8 units (normal max 8, ending max 4)
- Paragraph weight per unit: 1-3
- Total paragraph weight: 6-12 (normal scenes), 4-8 (endings)
- Every `sceneMandates` entry must appear in exactly one `mandateMapping` entry
