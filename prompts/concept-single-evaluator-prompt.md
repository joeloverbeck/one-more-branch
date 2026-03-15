# Concept Single Evaluator Prompt (Production Template)

- Source: `src/llm/prompts/concept-single-evaluator-prompt.ts`
- Generation file: `src/llm/concept-single-evaluator.ts`
- Schema file: `src/llm/schemas/concept-single-evaluator-schema.ts`
- Model types: `src/models/concept-generator.ts` (`ConceptSpec`, `ScoredConcept`, `EvaluatedConcept`, `ConceptDimensionScores`, `ConceptScoreEvidence`, `CONCEPT_SCORING_WEIGHTS`)

## Purpose

Single-concept scoring and deep evaluation variant. Unlike the batch concept evaluator (which scores/evaluates multiple concepts in one call), this prompt handles one concept at a time via a two-phase LLM pipeline: (1) scoring phase scores the concept across 7 dimensions, (2) deep-eval phase produces strengths, weaknesses, and tradeoff analysis.

**Pipeline position**: Concept Generation -> **Concept Single Evaluator** (scoring -> deep-eval) -> Concept Selection

**Why it exists**: Some flows (e.g., concept evolution, single-concept re-evaluation) need to score/evaluate one concept without the overhead of batch processing. The two-phase design ensures scoring is locked before evaluation begins, preventing the evaluator from retroactively adjusting scores.

## Context Provided

### Scoring Phase

| Context Field | Type | Description |
|---|---|---|
| `concept` | `ConceptSpec` | The concept to score (~25 fields) |
| `userSeeds` | `ConceptSeedInput` | User preferences: genreVibes, moodKeywords, contentPreferences |

### Deep-Eval Phase

| Context Field | Type | Description |
|---|---|---|
| `concept` | `ConceptSpec` | The concept being evaluated |
| `scored` | `ScoredConcept` | Locked scores from the scoring phase |
| `userSeeds` | `ConceptSeedInput` | User preferences (same as scoring phase) |

## Messages Sent To Model

### Scoring Phase

#### 1) System Message

```text
You are a strict evaluator for branching interactive narrative concepts. You score and analyze concepts; you do not rewrite or improve them.

{{CONTENT_POLICY}}

SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, one-line clarity, whatIfQuestion quality, and playerFantasy appeal.
- conflictEngine: Stakes depth, pressure mechanism quality, recurring dilemma strength, ironicTwist quality, and conflictType-to-conflictAxis coherence.
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.
- ironicPremise: 0-1 straightforward; 2-3 mild irony; 4-5 deep structural irony.
- sceneGenerativePower: 0-1 abstract tensions; 2-3 a few scenes; 4-5 triggers 5+ vivid scenes.
- contentCharge: 0-1 cosmetic weirdness; 2-3 one decent differentiator; 4-5 unforgettable concrete impossibilities.

DIMENSION WEIGHTS:
{{formatted weights from CONCEPT_SCORING_WEIGHTS}}

SCORING RULES:
- Score this concept across all 7 dimensions.
- Do not compute weighted totals.

PREFERENCE FIDELITY:
- Penalize if the concept fails to centrally embody ALL listed vibes/moods/preferences.

EVIDENCE REQUIREMENT:
- For each dimension provide 1-3 concrete bullets tied to specific concept fields.
```

#### 2) User Message

```text
Score this concept against the user intent and rubric.

MANDATORY USER PREFERENCES:
{{genreVibes, moodKeywords, contentPreferences — or "No user preferences specified."}}

CONCEPT:
{{JSON.stringify(concept)}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scoredConcept": { scores, scoreEvidence } }.
- scores must contain all 7 dimension scores (0-5).
- scoreEvidence must contain 1-3 string items per dimension.
```

### Deep-Eval Phase

#### 1) System Message

```text
You are a strict evaluator for branching interactive narrative concepts.

{{CONTENT_POLICY}}

DEEP EVALUATION RULES:
- Evaluate this scored concept.
- Do not rescore and do not alter the concept.
- Explain user-facing strengths, weaknesses, and tradeoffs.

PREFERENCE ADHERENCE:
- Explicitly assess whether the concept centrally embodies ALL listed user preferences.
```

#### 2) User Message

```text
Deep-evaluate this scored concept.

MANDATORY USER PREFERENCES:
{{genreVibes, moodKeywords, contentPreferences}}

SCORED CONCEPT WITH LOCKED SCORES:
{{JSON.stringify({ concept, scores, overallScore })}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedConcept": { strengths, weaknesses, tradeoffSummary } }.
- strengths and weaknesses must be non-empty string arrays.
- tradeoffSummary must be a non-empty string.
```

## JSON Response Shape

### Scoring Phase

```json
{
  "scoredConcept": {
    "scores": {
      "hookStrength": 4,
      "conflictEngine": 3,
      "agencyBreadth": 4,
      "noveltyLeverage": 3,
      "ironicPremise": 2,
      "sceneGenerativePower": 4,
      "contentCharge": 3
    },
    "scoreEvidence": {
      "hookStrength": ["{{evidence bullet 1}}", "{{evidence bullet 2}}"],
      "conflictEngine": ["{{evidence bullet}}"],
      "agencyBreadth": ["{{evidence bullet}}"],
      "noveltyLeverage": ["{{evidence bullet}}"],
      "ironicPremise": ["{{evidence bullet}}"],
      "sceneGenerativePower": ["{{evidence bullet}}"],
      "contentCharge": ["{{evidence bullet}}"]
    }
  }
}
```

### Deep-Eval Phase

```json
{
  "evaluatedConcept": {
    "strengths": ["{{strength 1}}", "{{strength 2}}"],
    "weaknesses": ["{{weakness 1}}", "{{weakness 2}}"],
    "tradeoffSummary": "{{non-empty tradeoff analysis}}"
  }
}
```

- Scores are clamped to 0-5 by the parser. Out-of-range values are logged and clamped.
- `scoreEvidence` must have at least 1 item per dimension (`minItems: 1` in schema).
- `overallScore` is computed client-side via `computeOverallScore()` using `CONCEPT_SCORING_WEIGHTS`.
- `passes` is computed client-side via `passesConceptThresholds()`.

## LLM Stage Configuration

- Stage model key: `conceptEvaluator` (both phases)
- Prompt type: `conceptEvaluator` (both phases)
- Uses `runTwoPhaseLlmStage()` from `llm-stage-runner.ts`

## Contract Notes

- The two-phase design uses `runTwoPhaseLlmStage()` which runs the scoring phase, then passes its parsed result to the deep-eval phase builder.
- `parseSingleScoringResponse()` and `parseSingleDeepEvalResponse()` are exported for direct testing.
- The `ScoredConcept` type includes the original `concept`, computed `overallScore`, and `passes` boolean.
- The `EvaluatedConcept` type extends `ScoredConcept` with `strengths`, `weaknesses`, and `tradeoffSummary`.
