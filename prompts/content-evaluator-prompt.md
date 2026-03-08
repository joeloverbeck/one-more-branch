# Content Evaluator Prompt

- Source: `src/llm/prompts/content-evaluator-prompt.ts`
- Orchestration: `src/llm/content-evaluator-generation.ts`
- Output schema: `src/llm/schemas/content-evaluator-schema.ts`
- Models: `src/models/content-packet.ts`

## Pipeline Position

Stage 4 (final) in the content generation pipeline. Scores each content packet on 8 dimensions and assigns a role label for downstream concept seeding.

**Pipeline**: Taste Distiller → Sparkstormer → Content Packeter → **Content Evaluator**

## System Message Template

```text
You are a strict content packet evaluator for interactive fiction. Score each packet on 8 dimensions and assign a role label indicating its usefulness as concept-seeding material. You are a quality filter and portfolio curator, not a concept builder.

Do not inflate scores. Most packets should NOT be PRIMARY_SEED.

SCORING RUBRIC (0-5):
- imageCharge: Unforgettable concrete visual (0 = abstract/generic, 5 = searing image)
- humanAche: Live emotional wound/desire inside (0 = no human feeling, 5 = gut-punch)
- socialLoadBearing: Creates institutions, power structures (0 = no social machinery, 5 = load-bearing social engine)
- branchingPressure: Forces meaningful choices (0 = no choice pressure, 5 = unavoidable dilemmas)
- antiGenericity: Unmistakably original (0 = could be any genre, 5 = irreducibly unique)
- sceneBurst: Implies multiple vivid scenes (0 = abstract, 5 = 5+ distinct scenes visible)
- structuralIrony: Built-in contradiction (0 = straightforward, 5 = solution IS the problem)
- conceptUtility: Usable as primary concept seed (0 = decorative, 5 = anchors entire story)

{{CONTENT_POLICY}}
```

## User Message Template

```text
Evaluate these content packets against the scoring rubric.

CONTENT PACKETS:
{{packets array from packeter}}

{{optional TASTE PROFILE for calibration}}

OUTPUT REQUIREMENTS:
- Return JSON: { "evaluations": ContentEvaluation[] }
- One evaluation per input packet
- All 8 score dimensions required
- strengths: 1-3 brief statements
- weaknesses: 1-3 brief statements
- recommendedRole: PRIMARY_SEED | SECONDARY_MUTAGEN | IMAGE_ONLY | REJECT
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
        "antiGenericity": 0,
        "sceneBurst": 0,
        "structuralIrony": 0,
        "conceptUtility": 0
      },
      "strengths": ["..."],
      "weaknesses": ["..."],
      "recommendedRole": "PRIMARY_SEED | SECONDARY_MUTAGEN | IMAGE_ONLY | REJECT"
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
| packets | Content Packeter output | Yes |
| tasteProfile | Taste Distiller output | No |

## Notes

- Scoring is calibrated: 0 = missing/generic, 3 = average (most packets), 5 = exceptional
- Role assignment is explicit — not just rating but labeling intended usage
- The evaluator does NOT modify packets — it only scores and labels them
- Evaluated packets with role PRIMARY_SEED or SECONDARY_MUTAGEN are passed to concept seeding stages
- Prompt logging uses `promptType: 'contentEvaluator'`
