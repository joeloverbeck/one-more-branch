# Concept Architect Prompt (Stage 2 — Character & World)

- Source: `src/llm/prompts/concept-architect-prompt.ts`
- Orchestration: `src/llm/concept-architect.ts` (shared by ideation and evolution)
- Output schema: `src/llm/schemas/concept-architect-schema.ts`
- Models: `src/models/concept-generator.ts`

## Pipeline Position

Stage 2 in both the ideation and evolution pipelines. Expands concept seeds into character and world designs.

**Pipeline**: Concept Seeder/Evolver Seeder -> **Concept Architect** -> Concept Engineer -> merge

Generation stage: `ARCHITECTING_CONCEPTS`.

## System Message Template

```text
You are a character and world architect for branching interactive fiction. Given concept seeds, design protagonists with capabilities and flaws that create player agency, and worlds with enforceable rules that produce meaningful constraints.

{{CONTENT_POLICY}}

{{Architect taxonomy guidance: settingScale descriptions}}

{{ARCHITECT_QUALITY_ANCHORS}}
```

## User Message Template

```text
Design character and world for each of the N concept seeds below.

CONCEPT SEEDS: {{JSON array of Stage 1 seeds}}

{{optional STORY KERNEL}}

OUTPUT REQUIREMENTS:
- Return JSON: { "concepts": [ConceptCharacterWorld, ...] }
- Exactly N items, one per seed in order
- actionVerbs: 6+ distinct verbs
- settingAxioms: 2-5 enforceable rules
- constraintSet: 2-5 meaningful limits
- keyInstitutions: 2-4 pressure-producing institutions
```

## JSON Response Shape

```json
{
  "concepts": [
    {
      "protagonistRole": "string",
      "coreCompetence": "string",
      "coreFlaw": "string",
      "actionVerbs": ["string"],
      "coreConflictLoop": "string",
      "settingAxioms": ["string"],
      "constraintSet": ["string"],
      "keyInstitutions": ["string"],
      "settingScale": "SCALE_ENUM"
    }
  ]
}
```

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| seeds | Stage 1 ConceptSeedFields[] | Yes |
| kernel | StoryKernel | No |

## Notes

- Shared between ideation and evolution flows
- Produces 9 fields per concept (character + world focused)
- Receives seeds as structured JSON in user message
- Array length must match input seed count
