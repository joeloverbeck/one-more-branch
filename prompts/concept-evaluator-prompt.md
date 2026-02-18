# Concept Evaluator Prompt (Production Template)

- Source: `src/llm/prompts/concept-evaluator-prompt.ts`
- Orchestration: `src/llm/concept-evaluator.ts`
- Shared concept runner: `src/llm/concept-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-evaluator-schema.ts`
- Scoring weights/thresholds + score computation: `src/models/concept-generator.ts`

## Pipeline Position

The concept evaluator is the second LLM call in the `/concepts` flow. It scores ideated concepts, selects the strongest options, and returns tradeoff framing without rewriting concept content.

**Pipeline position**: Concept Ideator -> **Concept Evaluator** -> (optional per-concept) Concept Stress Tester

Generation stage emitted by `conceptService`: `EVALUATING_CONCEPTS`.

## Messages Sent To Model

### 1) System Message

```text
You are a strict evaluator for branching interactive narrative concepts. You score and select concepts; you do not rewrite or improve them.

SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, and one-line clarity.
- conflictEngine: Stakes depth, pressure mechanism quality, recurring dilemma strength, and conflictType-to-conflictAxis coherence (e.g., INDIVIDUAL_VS_SYSTEM axis + PERSON_VS_SOCIETY type = strong pairing; mismatched pairings need strong justification).
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.
- branchingFitness: Branch scalability, reconvergence viability, and state manageability.
- llmFeasibility: Rule enforceability, drift resistance, and implementation tractability.

WEIGHTS AND PASS THRESHOLDS:
- hookStrength: weight 12, pass >= 3
- conflictEngine: weight 20, pass >= 3
- agencyBreadth: weight 15, pass >= 3
- noveltyLeverage: weight 10, pass >= 2
- branchingFitness: weight 20, pass >= 3
- llmFeasibility: weight 23, pass >= 3

EVIDENCE REQUIREMENT:
- For every score dimension, ground judgment in 1-3 concrete bullet points that reference actual concept fields.

SELECTION RULES:
- Compute weighted scores using the provided weights.
- Return only the top 3 concepts by weighted score.
- If fewer than 3 concepts pass thresholds, return only passing concepts and call out threshold failures in weaknesses/tradeoffSummary.

TRADEOFF FRAMING:
- For each selected concept, state what the user gains and what they give up.
- Do not modify concept content.
```

### 2) User Message

```text
Evaluate these concept candidates against the user intent and rubric.

USER SEEDS:
{{normalized seed block from buildSeedSection(context)}}

CONCEPT CANDIDATES:
1. {{JSON.stringify(concept1, null, 2)}}
2. {{JSON.stringify(concept2, null, 2)}}
...

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedConcepts": [ ... ] }.
- For each item include: concept, scores, overallScore, strengths, weaknesses, tradeoffSummary.
- strengths and weaknesses must be non-empty string arrays.
```

If all optional seed fields are empty, the seed block is exactly:

```text
No optional user seeds provided.
```

## JSON Response Shape

```json
{
  "evaluatedConcepts": [
    {
      "concept": {
        "{{ConceptSpec fields}}": "same shape as concept ideator output"
      },
      "scores": {
        "hookStrength": 0,
        "conflictEngine": 0,
        "agencyBreadth": 0,
        "noveltyLeverage": 0,
        "branchingFitness": 0,
        "llmFeasibility": 0
      },
      "overallScore": 0,
      "strengths": ["{{concrete strength}}"],
      "weaknesses": ["{{concrete weakness}}"],
      "tradeoffSummary": "{{what user gains vs gives up}}"
    }
  ]
}
```

- Schema allows 1..N items, but `parseConceptEvaluationResponse(...)` enforces **1-3** evaluated concepts.
- Runtime parser recomputes `overallScore` with `computeOverallScore(scores)` and sorts descending by that value.
- Score fields are clamped to 0..5 at parse time; clamping emits a warning log.
- `strengths`, `weaknesses`, and `tradeoffSummary` must be non-empty after trimming or parsing fails.

## Context Provided

| Context Field | Description |
|---|---|
| `concepts` | Candidate concepts from ideation stage |
| `userSeeds.genreVibes` | Optional genre guidance |
| `userSeeds.moodKeywords` | Optional mood/tone guidance |
| `userSeeds.contentPreferences` | Optional content preferences |
| `userSeeds.thematicInterests` | Optional thematic interests |
| `userSeeds.sparkLine` | Optional spark-line seed |

## Notes

- This stage evaluates and selects only; it does not harden concepts.
- Prompt logging uses `promptType: 'conceptEvaluator'` via `runConceptStage(...)`.
- Model routing uses stage key `conceptEvaluator` in `getStageModel(...)`.
