# Concept Evaluator Prompt (Production Template)

- Source: `src/llm/prompts/concept-evaluator-prompt.ts`
- Orchestration: `src/llm/concept-evaluator.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-evaluator-schema.ts`
- Scoring weights/thresholds + score computation: `src/models/concept-generator.ts`

## Pipeline Position

The concept evaluator is the second stage in the `/concepts` flow and now runs in **two passes**:

1. **Scoring pass**: score **all** ideated concepts with per-dimension evidence.
2. **Deep-eval pass**: code selects shortlist by thresholds/ranking, then model returns strengths/weaknesses/tradeoffs for shortlist only.

**Pipeline position**: Concept Ideator -> **Concept Evaluator (Scoring -> Deep Eval)** -> (optional per-concept) Concept Stress Tester

Generation stage emitted by `conceptService`: `EVALUATING_CONCEPTS`.

## Pass 1: Scoring Prompt

### System highlights

- Score every candidate concept.
- Do not rank, filter, or select concepts.
- Do not compute weighted totals.
- Provide 1-3 evidence bullets for each score dimension.

### User highlights

- Includes all user seed context.
- Includes all concept candidates from ideator output.
- Requires JSON: `{ "scoredConcepts": [ ... ] }`.
- Each item must include: `concept`, `scores`, `scoreEvidence`.

### Response shape

```json
{
  "scoredConcepts": [
    {
      "concept": { "{{ConceptSpec fields}}": "..." },
      "scores": {
        "hookStrength": 0,
        "conflictEngine": 0,
        "agencyBreadth": 0,
        "noveltyLeverage": 0,
        "branchingFitness": 0,
        "llmFeasibility": 0
      },
      "scoreEvidence": {
        "hookStrength": ["..."],
        "conflictEngine": ["..."],
        "agencyBreadth": ["..."],
        "noveltyLeverage": ["..."],
        "branchingFitness": ["..."],
        "llmFeasibility": ["..."]
      }
    }
  ]
}
```

Runtime behavior:

- Parser recomputes `overallScore` with `computeOverallScore(scores)`.
- Score fields are clamped to 0..5 at parse time; clamping emits a warning log.
- Parser enforces exact concept coverage (no omissions/duplicates vs ideator set).

## Pass 2: Deep-Eval Prompt

### System highlights

- Evaluate only the code-selected shortlist.
- Do not rescore and do not alter concepts.
- Return strengths, weaknesses, and tradeoff summary.

### User highlights

- Includes user seed context.
- Includes shortlist concepts with locked scores and overallScore from code.
- Requires JSON: `{ "evaluatedConcepts": [ ... ] }`.
- Each item must include: `concept`, `strengths`, `weaknesses`, `tradeoffSummary`.

### Response shape

```json
{
  "evaluatedConcepts": [
    {
      "concept": { "{{ConceptSpec fields}}": "..." },
      "strengths": ["..."],
      "weaknesses": ["..."],
      "tradeoffSummary": "..."
    }
  ]
}
```

Runtime behavior:

- Code applies thresholding with `passesConceptThresholds(scores)` and ranks by recomputed `overallScore`.
- If no concepts pass thresholds, code falls back to top scored concepts.
- Deep-eval parser enforces exact concept coverage against shortlist.
- Final returned concepts are sorted descending by code-computed `overallScore`.
