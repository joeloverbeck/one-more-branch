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

{{optional STORY KERNEL block:
- dramaticThesis, antithesis, valueAtStake, opposingForce
- directionOfChange, conflictAxis, dramaticStance, thematicQuestion
- moralArgument
- valueSpectrum.positive, valueSpectrum.contrary, valueSpectrum.contradictory, valueSpectrum.negationOfNegation}}

WEILAND ARC ENGINEERING:
- protagonistGhost should be the backstory wound that makes the pressureSource personally devastating.
- protagonistLie should be the false belief that the deadlineMechanism exploits.
- protagonistTruth should be the realization that, if embraced, would dissolve the Lie and resolve the moral argument.
- wantNeedCollisionSketch should describe the moment where the protagonist's conscious goal (want) directly prevents their inner transformation (need).

OUTPUT REQUIREMENTS:
- Return JSON: { "concepts": [ConceptEngine, ...] }
- Exactly N items, one per concept in order
- elevatorParagraph must synthesize the full concept
- All fields must be non-empty and concept-specific
- protagonistLie, protagonistTruth, protagonistGhost, wantNeedCollisionSketch must all be non-empty strings
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
      "elevatorParagraph": "string",
      "protagonistLie": "string",
      "protagonistTruth": "string",
      "protagonistGhost": "string",
      "wantNeedCollisionSketch": "string"
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
- Produces 12 fields per concept (conflict engine + pitch + Weiland arc focused)
- Receives full seed + character/world context as merged JSON
- elevatorParagraph benefits from having complete concept context
- No taxonomy enums to choose (no enum guidance needed)
- When kernel is present, includes moralArgument and valueSpectrum (4 levels) in STORY KERNEL block
- WEILAND ARC ENGINEERING guidance connects Ghost→pressureSource, Lie→deadlineMechanism, Truth→moralArgument resolution
