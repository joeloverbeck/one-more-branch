# Concept Seeder Prompt (Stage 1a — Ideation)

- Source: `src/llm/prompts/concept-seeder-prompt.ts`
- Orchestration: `src/llm/concept-seeder.ts` (called by `src/llm/concept-ideator.ts`)
- Output schema: `src/llm/schemas/concept-seeder-schema.ts`
- Models: `src/models/concept-generator.ts`

## Pipeline Position

Stage 1a in the 3-stage concept ideation pipeline. Generates diverse concept seeds from user inputs.

**Pipeline**: **Concept Seeder** -> Concept Architect -> Concept Engineer -> merge -> Evaluator -> Verifier

Generation stage: `SEEDING_CONCEPTS`.

## System Message Template

```text
You are a concept ideation specialist for branching interactive fiction. Generate diverse, high-concept seeds that define identity, genre, conflict axis, and player fantasy — not full world or character designs.

{{optional tone block}}

{{CONTENT_POLICY}}

{{Seeder taxonomy guidance: genreFrame, conflictAxis, conflictType descriptions}}

{{optional KERNEL CONSTRAINTS}}

{{SEEDER_QUALITY_ANCHORS}}

{{DIVERSITY_CONSTRAINTS: 6-8 seeds, unique genre+axis pairs, min 3 genres, min 3 axes}}
```

## User Message Template

```text
Generate 6-8 concept seeds that satisfy the taxonomy and diversity constraints.

{{optional GENRE VIBES}}
{{optional MOOD KEYWORDS}}
{{optional CONTENT PREFERENCES}}
{{optional SELECTED STORY KERNEL}}

OUTPUT REQUIREMENTS:
- Return JSON: { "concepts": [ConceptSeed, ...] }
- conflictType must be coherent with conflictAxis
```

## JSON Response Shape

```json
{
  "concepts": [
    {
      "oneLineHook": "string",
      "genreFrame": "GENRE_ENUM",
      "genreSubversion": "string",
      "conflictAxis": "AXIS_ENUM",
      "conflictType": "TYPE_ENUM",
      "whatIfQuestion": "string",
      "playerFantasy": "string"
    }
  ]
}
```

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| genreVibes | User input | No |
| moodKeywords | User input | No |
| contentPreferences | User input | No |
| kernel | Selected StoryKernel | No |

## Notes

- Produces 7 fields per concept (identity-focused)
- Diversity constraints enforced: unique genre+axis pairs, min 3 distinct genres, min 3 distinct axes
- Downstream stages (Architect, Engineer) expand these seeds into full ConceptSpec objects
