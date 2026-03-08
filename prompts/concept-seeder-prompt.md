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

{{DIVERSITY_CONSTRAINTS: 6-8 seeds, unique genre+axis pairs, min 3 genres, min 3 axes, diversity = genres/textures NOT distributing vibes}}
```

## User Message Template

```text
Generate 6-8 concept seeds that satisfy the taxonomy and diversity constraints.

{{optional USER CREATIVE MANDATE block with Genre Vibes, Mood Keywords, Content Preferences as non-negotiable constraints}}
{{optional SELECTED STORY KERNEL including moralArgument, valueSpectrum (positive/contrary/contradictory/negationOfNegation)}}

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
| contentPackets | ContentPacket[] | No |

## Content Packet Integration (WILCONPIP)

When `contentPackets` are provided, the prompt injects a `CONTENT PACKETS` block. The seeder must:

- Assign each concept seed exactly 1 `primaryContentId` from available packets
- May optionally fuse 1 `secondaryContentId` from a different packet
- CRITICAL: Preserve each packet's `wildnessInvariant` — do not normalize into generic genre language
- Carry forward `signatureImageHook` derived from the packet's `signatureImage`
- Diversity means different genres and play textures, NOT distributing user vibes across concepts — every concept must centrally embody ALL user-specified vibes

## Notes

- Produces 7 fields per concept (identity-focused)
- Diversity constraints enforced: unique genre+axis pairs, min 3 distinct genres, min 3 distinct axes
- Downstream stages (Architect, Engineer) expand these seeds into full ConceptSpec objects
- When kernel is present, includes moralArgument and valueSpectrum (4 levels) in SELECTED STORY KERNEL block
