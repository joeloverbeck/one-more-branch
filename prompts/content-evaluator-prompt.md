# Content Evaluator Prompt

- Source: `src/llm/prompts/content-evaluator-prompt.ts`
- Orchestration: `src/llm/content-evaluator-generation.ts`
- Output schema: `src/llm/schemas/content-evaluator-schema.ts`
- Models: `src/models/content-packet.ts`

## Pipeline Position

Stage 4 (final) in the content generation pipeline. Scores each content packet on 10 dimensions, detects substantive overlap across the batch, and assigns a role label for downstream concept seeding.

**Pipeline**: Taste Distiller → Sparkstormer → Content Packeter → **Content Evaluator**

## System Message Template

```text
You are a strict content packet evaluator for interactive fiction. Score each packet on 10 dimensions, detect batch-level overlap, and assign a role label indicating its usefulness as concept-seeding material. You are a quality filter and portfolio curator, not a concept builder.

Do not inflate scores. Most packets should NOT be PRIMARY_SEED.

SCORING RUBRIC (0-5 integers):
- imageCharge: Unforgettable concrete visual (0 = abstract/generic, 5 = searing image)
- humanAche: Live emotional wound/desire inside (0 = no human feeling, 5 = gut-punch)
- socialLoadBearing: Creates institutions, power structures (0 = no social machinery, 5 = load-bearing social engine)
- branchingPressure: Forces meaningful choices (0 = no choice pressure, 5 = unavoidable dilemmas)
- surfaceFreshness: Distinctive surface treatment rather than stock genre coating (0 = generic surface, 5 = instantly distinctive)
- deepOriginality: Fresh underlying narrative pattern rather than a familiar formula (0 = standard structure, 5 = the pattern itself feels invented)
- sceneBurst: Implies multiple vivid scenes (0 = abstract, 5 = 5+ distinct scenes visible)
- structuralIrony: Built-in contradiction (0 = straightforward, 5 = solution IS the problem)
- tasteAlignment: Specific fit for the supplied taste profile's deep patterns, engagement modes, value tensions, collision patterns, and scene appetites (0 = generic fit, 5 = tailor-made)
- causalSpecificity: Mechanisms are specific enough to generate scenes and choices on their own (0 = decorative abstraction, 5 = causally generative)

{{CONTENT_POLICY}}
```

## User Message Template

```text
Evaluate these content packets against the scoring rubric.

CONTENT PACKETS:
{{packets array from packeter}}

TASTE PROFILE:
{{required taste profile for tasteAlignment scoring}}

OUTPUT REQUIREMENTS:
- Return JSON: { "evaluations": ContentEvaluation[] }
- One evaluation per input packet
- All 10 score dimensions required
- strengths: 1-3 brief statements
- weaknesses: 1-3 brief statements
- recommendedRole: PRIMARY_SEED | SECONDARY_MUTAGEN | IMAGE_ONLY | REJECT
- redundancyCluster: stronger overlapping packet's contentId, or null if distinct
```

## JSON Response Shape

```json
{
  "evaluations": [
    {
      "contentId": "pkt-01",
      "scores": {
        "imageCharge": 0,
        "humanAche": 0,
        "socialLoadBearing": 0,
        "branchingPressure": 0,
        "surfaceFreshness": 0,
        "deepOriginality": 0,
        "sceneBurst": 0,
        "structuralIrony": 0,
        "tasteAlignment": 0,
        "causalSpecificity": 0
      },
      "strengths": ["..."],
      "weaknesses": ["..."],
      "recommendedRole": "PRIMARY_SEED | SECONDARY_MUTAGEN | IMAGE_ONLY | REJECT",
      "redundancyCluster": "pkt-02 or null"
    }
  ]
}
```

## Role Labels

| Role | Meaning | Typical Score Profile |
|------|---------|----------------------|
| PRIMARY_SEED | Strong enough to anchor a concept alone | High across most dimensions |
| SECONDARY_MUTAGEN | Interesting but weaker alone; enriches other concepts | Medium scores, strong in 2-3 dimensions |
| IMAGE_ONLY | Striking image/moment but lacks depth; useful as flavour | High imageCharge, low elsewhere |
| REJECT | Too generic, abstract, or decorative | Low scores across dimensions |

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| packets | Lean `ConceptSeedPacket[]` projection from Content Packeter output | Yes |
| tasteProfile | Taste Distiller output | Yes |

## Notes

- Scoring is calibrated: 0 = missing/generic, 3 = average (most packets), 5 = exceptional
- The parser and schema enforce integer scores in the 0-5 range
- Role assignment is explicit — not just rating but labeling intended usage
- `redundancyCluster` is the evaluator's built-in overlap signal; it avoids a separate portfolio-deduplication stage for now
- The evaluator does NOT modify packets — it only scores and labels the lean downstream packet projection
- The evaluator does not consume saved-asset-only context like `premiseSummary`, `situationFrame`, `worldState`, `origin`, or existing saved evaluations
- Service-layer persistence may later attach the resulting `ContentEvaluation` onto the richer saved asset as sibling metadata; that attachment is outside this prompt's contract
- Evaluated packets with role PRIMARY_SEED or SECONDARY_MUTAGEN are passed to concept seeding stages
- Prompt logging uses `promptType: 'contentEvaluator'`
