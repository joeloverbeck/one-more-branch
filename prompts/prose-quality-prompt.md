# Prose Quality Prompt (Production Template)

- Source: `src/llm/prompts/prose-quality-prompt.ts`
- Output schema source: `src/llm/schemas/prose-quality-schema.ts`
- Types: `src/llm/prose-quality-types.ts` (`ProseQualityResult`, `ProseQualityContext`, `ThematicCharge`, `NarrativeFocus`)

## Pipeline Position

The prose quality evaluator runs in parallel with the structure evaluator, promise tracker, and NPC intelligence evaluator as part of the 4-way split analyst system:

**Pipeline position**: Planner -> Lorekeeper -> Writer -> **[Structure Evaluator | Promise Tracker | Prose Quality | NPC Intelligence]** (parallel) -> Agenda Resolver

Progress stage: `ASSESSING_PROSE` (display name: `APPRAISING`)

The prose quality evaluator runs for **both opening and continuation pages**. It focuses solely on tone adherence, thematic charge, and narrative focus classification. It does NOT evaluate NPC behavior, relationship shifts, knowledge asymmetry, story structure, beat completion, deviation, pacing, or narrative promises — those are handled by other evaluators.

## Messages Sent To Model

### 1) System Message

```text
You are a prose quality evaluator for interactive fiction. Your SINGLE responsibility is to evaluate narrative quality, tone adherence, and thematic coherence.

You do NOT evaluate NPC behavior, relationship shifts, knowledge asymmetry, or dramatic irony. Those are handled by another evaluator.
You do NOT evaluate story structure, beat completion, deviation, pacing, or narrative promises. Those are handled by other evaluators.

CONTENT GUIDELINES:
RATING: NC-21 (ADULTS ONLY)
{{... full content policy ...}}

TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}

TONE EVALUATION:
- Set toneAdherent to true if the narrative's mood, vocabulary, and emotional register match the target tone.
- Set toneAdherent to false if the narrative drifts toward a different genre feel (e.g., grimdark when tone should be comedic).
- When toneAdherent is false, write a brief toneDriftDescription explaining what feels off and what the tone should be instead.
- When toneAdherent is true, set toneDriftDescription to an empty string.

THEMATIC CHARGE CLASSIFICATION:
- If THEMATIC KERNEL context is present, classify scene-level thematic valence:
  - THESIS_SUPPORTING: scene consequences/actions support the thesis-direction answer to the thematic question.
  - ANTITHESIS_SUPPORTING: scene consequences/actions support the antithesis-direction answer.
  - AMBIGUOUS: evidence is mixed, unresolved, or equally supports both sides.
- Set thematicCharge to exactly one enum value.
- Set thematicChargeDescription to 1-2 sentences citing concrete scene evidence.
- If THEMATIC KERNEL context is absent, default to thematicCharge = AMBIGUOUS with a concise neutral description.

NARRATIVE FOCUS CLASSIFICATION:
- Classify scene focus as exactly one:
  - DEEPENING: primarily develops existing conflicts, promises, relationships, or known constraints.
  - BROADENING: primarily introduces new factions, mysteries, goals, locations, or major scope expansions.
  - BALANCED: meaningfully deepens existing threads while adding limited new elements.
- Prefer DEEPENING when uncertain between DEEPENING and BALANCED.
- Prefer BALANCED when uncertain between BALANCED and BROADENING.
```

The tone block is injected between the role intro and the evaluation rules.

### 2) User Message

```text
{{spineSection}}{{genreConventionsSection}}{{thematicKernelSection}}
NARRATIVE TO EVALUATE:
{{narrative}}
```

Optional sections are conditionally included:

- **Spine Section**: Full story spine context (when spine is available)
- **Genre Conventions Section**: Genre-level atmospheric constraints (when genreFrame is present)
- **Thematic Kernel Section**: Thematic question and antithesis (when either is present)

## JSON Response Shape

```json
{
  "toneAdherent": true,
  "toneDriftDescription": "",
  "thematicCharge": "THESIS_SUPPORTING",
  "thematicChargeDescription": "1-2 sentences with scene evidence",
  "narrativeFocus": "DEEPENING"
}
```

### Field Descriptions

- `toneAdherent`: Whether the narrative prose matches the target tone in mood, vocabulary, and emotional register. Defaults to `true`.
- `toneDriftDescription`: When `toneAdherent` is `false`, briefly describes what feels off and what the tone should be instead. Empty string when adherent.
- `thematicCharge`: Scene-level thematic valence relative to the thematic kernel. One of: THESIS_SUPPORTING (scene outcomes support the thesis direction), ANTITHESIS_SUPPORTING (scene outcomes support the antithesis direction), or AMBIGUOUS (evidence is mixed or unresolved). Defaults to AMBIGUOUS.
- `thematicChargeDescription`: 1-2 sentences explaining the thematicCharge classification with concrete scene evidence.
- `narrativeFocus`: Scene-level depth-vs-breadth focus. DEEPENING develops existing threads/relationships/conflicts; BROADENING introduces new elements or expands scope; BALANCED does both meaningfully without strong dominance. Defaults to BALANCED.

## Context Provided

| Context Field | Description |
|---|---|
| `narrative` | The narrative text to evaluate |
| `tone` | Target tone string |
| `toneFeel` | Optional array of target feel keywords |
| `toneAvoid` | Optional array of tones to avoid |
| `thematicQuestion` | Thematic question from the story kernel |
| `antithesis` | Antithesis from the story kernel |
| `spine` | Optional StorySpine for spine section |
| `genreFrame` | Optional GenreFrame for genre conventions section |

## Notes

- This stage was split from the original scene quality evaluator to isolate prose judgment (literary evaluation) from NPC intelligence (theory-of-mind reasoning).
- Prompt logging uses `promptType: 'proseQuality'` via `runLlmStage(...)`.
- Model routing uses stage key `proseQuality` in `getStageModel(...)`.
