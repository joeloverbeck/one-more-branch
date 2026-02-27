# Concept Engineer Prompt (Stage 3 — Conflict Engine & Pitch)

- Source: `src/llm/prompts/concept-engineer-prompt.ts`
- Orchestration: `src/llm/concept-engineer.ts` (shared by ideation and evolution)
- Output schema: `src/llm/schemas/concept-engineer-schema.ts`
- Models: `src/models/concept-generator.ts`

## Pipeline Position

Stage 3 in both the ideation and evolution pipelines. Engineers conflict forces and writes the elevator paragraph.

**Pipeline**: Concept Seeder/Evolver Seeder -> Concept Architect -> **Concept Engineer** -> merge

Generation stage: `ENGINEERING_CONCEPTS`.

## System Message Template

```text
You are a story conflict engineer for branching interactive fiction. Given concept identity, character, and world, design the mechanical forces that drive the story — pressure, stakes, deadlines, irony, disruption, escape mechanisms — and write a compelling elevator paragraph that synthesizes the full concept.

{{CONTENT_POLICY}}

{{ENGINEER_QUALITY_ANCHORS}}
```

## User Message Template

```text
Engineer conflict forces and write elevator paragraphs for each of the N concepts below.

CONCEPT IDENTITY + CHARACTER + WORLD: {{JSON array of merged Stage 1 + Stage 2 fields}}

{{optional STORY KERNEL}}

OUTPUT REQUIREMENTS:
- Return JSON: { "concepts": [ConceptEngine, ...] }
- Exactly N items, one per concept in order
- elevatorParagraph must synthesize the full concept
- All fields must be non-empty and concept-specific
```

## JSON Response Shape

```json
{
  "concepts": [
    {
      "pressureSource": "string",
      "stakesPersonal": "string",
      "stakesSystemic": "string",
      "deadlineMechanism": "string",
      "ironicTwist": "string",
      "incitingDisruption": "string",
      "escapeValve": "string",
      "elevatorParagraph": "string"
    }
  ]
}
```

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| seeds | Stage 1 ConceptSeedFields[] | Yes |
| characterWorlds | Stage 2 ConceptCharacterWorldFields[] | Yes |
| kernel | StoryKernel | No |

## Notes

- Shared between ideation and evolution flows
- Produces 8 fields per concept (conflict engine + pitch focused)
- Receives full seed + character/world context as merged JSON
- elevatorParagraph benefits from having complete concept context
- No taxonomy enums to choose (no enum guidance needed)
