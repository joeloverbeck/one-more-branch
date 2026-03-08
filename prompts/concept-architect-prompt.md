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

{{optional TONE DIRECTIVE from genre vibes + mood keywords}}

{{CONTENT_POLICY}}

{{Architect taxonomy guidance: settingScale descriptions}}

{{ARCHITECT_QUALITY_ANCHORS}}
```

## User Message Template

```text
Design character and world for each of the N concept seeds below.

CONCEPT SEEDS: {{JSON array of Stage 1 seeds}}

{{optional STORY KERNEL block:
- dramaticThesis, antithesis, valueAtStake, opposingForce
- directionOfChange, conflictAxis, dramaticStance, thematicQuestion
- moralArgument
- valueSpectrum.positive, valueSpectrum.contrary, valueSpectrum.contradictory, valueSpectrum.negationOfNegation}}

CHARACTER GROUNDING (Weiland):
- The protagonist's coreFlaw should connect to a Lie they believe.
- The protagonist's motivations should be driven by the Ghost (backstory wound).
- The Lie/Truth/Ghost fields will be generated in the engineer stage; architect should design the character so these fields emerge naturally.

{{optional USER CREATIVE MANDATE block with Genre Vibes, Mood Keywords, Content Preferences}}

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
| genreVibes | User input | No |
| moodKeywords | User input | No |
| contentPreferences | User input | No |
| contentPackets | ContentPacket[] | No |

## Content Packet Integration (WILCONPIP)

When `contentPackets` are provided, the prompt injects a `CONTENT PACKETS` block containing each packet's `coreAnomaly`, `wildnessInvariant`, `socialEngine`, and `signatureImage`. The architect must:

- Operationalize each packet's `coreAnomaly` as an impossible rule in `settingAxioms`
- Derive at least one `keyInstitution` from the packet's `socialEngine`
- Preserve the `wildnessInvariant` — do not normalize it into generic genre language
- Ensure `coreConflictLoop` puts pressure on the packet's implied `choicePressure`

## Notes

- Shared between ideation and evolution flows
- Produces 9 fields per concept (character + world focused)
- Receives seeds as structured JSON in user message
- Array length must match input seed count
- When kernel is present, includes valueSpectrum (4 levels) and moralArgument in STORY KERNEL block
- CHARACTER GROUNDING (Weiland) guidance prepares character design for downstream Lie/Truth/Ghost generation in engineer stage
