# Concept Evolver Seeder Prompt (Stage 1b — Evolution)

- Source: `src/llm/prompts/concept-evolver-seeder-prompt.ts`
- Orchestration: `src/llm/concept-evolver-seeder.ts` (called by `src/llm/concept-evolver.ts`)
- Output schema: `src/llm/schemas/concept-seeder-schema.ts` (shared with Stage 1a)
- Models: `src/models/concept-generator.ts`

## Pipeline Position

Stage 1b in the 3-stage concept evolution pipeline. Mutates parent concepts into evolved seeds.

**Pipeline**: **Concept Evolver Seeder** -> Concept Architect -> Concept Engineer -> merge -> Evaluator -> Verifier

Generation stage: `SEEDING_EVOLVED_CONCEPTS`.

## System Message Template

```text
You are a concept evolution architect for branching interactive fiction. Recombine proven strengths, mutate weak points, and generate novel seed identities that improve on their parents.

{{optional TONE DIRECTIVE from genre vibes + mood keywords}}

{{CONTENT_POLICY}}

MUTATION STRATEGIES:
- recombine, invert, escalate, transplant, hybridize, radicalize, ghost-deepening, lie-escalation, irony-sharpening

{{Seeder taxonomy guidance: genreFrame, conflictAxis, conflictType descriptions}}

{{SEEDER_QUALITY_ANCHORS}}

{{DIVERSITY_CONSTRAINTS: exactly 6 seeds, unique genre+axis pairs}}

{{KERNEL_CONSTRAINTS}}
```

## User Message Template

```text
Evolve the provided parents into exactly 6 offspring concept seeds.

STORY KERNEL: {{kernel fields including moralArgument, valueSpectrum (positive/contrary/contradictory/negationOfNegation)}}

PARENT CONCEPTS INPUT: {{JSON array of parent concepts with scores/strengths/weaknesses}}

{{optional USER CREATIVE MANDATE block with Genre Vibes, Mood Keywords, Content Preferences — mutation changes form, not tonal identity}}

OUTPUT REQUIREMENTS:
- Return JSON: { "concepts": [ConceptSeed, ...] }
- Exactly 6 items, no parent copied unchanged
```

## JSON Response Shape

Same as concept-seeder-prompt (7-field seed shape).

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| parentConcepts | EvaluatedConcept[] with scores | Yes |
| kernel | Selected StoryKernel | Yes |
| genreVibes | User input | No |
| moodKeywords | User input | No |
| contentPreferences | User input | No |
| contentPackets | ContentPacket[] | No |
| excludedGenres | string[] | No |

## Content Packet Integration (WILCONPIP)

When `contentPackets` are provided, the prompt injects a `CONTENT PACKETS` block and a separate `WILDNESS INVARIANTS` block. The evolver must:

- Ensure each evolved seed engages with at least one packet's `wildnessInvariant`
- Seeds may fuse packet material with parent strengths
- CRITICAL: Do not normalize the packet's weirdness into generic genre language
- The `WILDNESS INVARIANTS` block emphasizes that invariants must be preserved or intensified, never diluted

## Notes

- Shares the same JSON schema as Stage 1a (concept-seeder-schema.ts)
- Produces exactly 6 seeds (vs 6-8 for ideation)
- Enforces diversity: no duplicate genreFrame+conflictAxis pairs
- 9 mutation strategies (6 original + ghost-deepening, lie-escalation, irony-sharpening)
- Mutation strategies guide the LLM to improve on parent weaknesses
- Kernel block includes moralArgument and valueSpectrum (4 levels)
