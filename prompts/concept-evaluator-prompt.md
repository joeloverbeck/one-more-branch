# Concept Evaluator Prompt (Production Template)

- Source: `src/llm/prompts/concept-evaluator-prompt.ts`
- Orchestration: `src/llm/concept-evaluator.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-evaluator-schema.ts`
- Scoring weights + score computation: `src/models/concept-generator.ts`
- Pass thresholds (code-side only): `src/models/concept-generator.ts` (`CONCEPT_PASS_THRESHOLDS`, `passesConceptThresholds()`)

## Pipeline Position

The concept evaluator is the second stage in the `/concepts` flow and runs in **two passes**:

1. **Scoring pass**: score **all** ideated concepts with per-dimension evidence.
2. **Deep-eval pass**: deep-evaluate **all** scored concepts with strengths/weaknesses/tradeoffs.

Pass/fail is computed code-side via `passesConceptThresholds(scores)` and stored as a `passes: boolean` field on `ScoredConcept` and `EvaluatedConcept`. Thresholds are NOT exposed to the LLM to avoid anchoring bias.

**Pipeline position**: Concept Ideator -> **Concept Evaluator (Scoring -> Deep Eval)** -> (optional per-concept) Concept Stress Tester

Generation stage emitted by `conceptService`: `EVALUATING_CONCEPTS`.

## Pass 1: Scoring Prompt

### Messages Sent To Model

#### 1) System Message

```text
You are a strict evaluator for branching interactive narrative concepts. You score and analyze concepts; you do not rewrite or improve them.

SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, one-line clarity, whatIfQuestion quality, and playerFantasy appeal.
- conflictEngine: Stakes depth, pressure mechanism quality, recurring dilemma strength, ironicTwist quality, and conflictType-to-conflictAxis coherence (e.g., INDIVIDUAL_VS_SYSTEM axis + PERSON_VS_SOCIETY type = strong pairing; mismatched pairings need strong justification).
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.
- branchingFitness: Branch scalability, reconvergence viability, and state manageability.
- llmFeasibility: Rule enforceability, drift resistance, and implementation tractability.

DIMENSION WEIGHTS:
- hookStrength: weight {{CONCEPT_SCORING_WEIGHTS.hookStrength}}
- conflictEngine: weight {{CONCEPT_SCORING_WEIGHTS.conflictEngine}}
- agencyBreadth: weight {{CONCEPT_SCORING_WEIGHTS.agencyBreadth}}
- noveltyLeverage: weight {{CONCEPT_SCORING_WEIGHTS.noveltyLeverage}}
- branchingFitness: weight {{CONCEPT_SCORING_WEIGHTS.branchingFitness}}
- llmFeasibility: weight {{CONCEPT_SCORING_WEIGHTS.llmFeasibility}}

SCORING RULES:
- Score every candidate concept.
- Do not rank, filter, or select concepts.
- Do not compute weighted totals.

EVIDENCE REQUIREMENT:
- For each dimension provide 1-3 concrete bullets tied to specific concept fields.
```

#### 2) User Message

```text
Score these concept candidates against the user intent and rubric.

USER SEEDS:
{{#if genreVibes}}
GENRE VIBES:
{{genreVibes}}
{{/if}}

{{#if moodKeywords}}
MOOD KEYWORDS:
{{moodKeywords}}
{{/if}}

{{#if thematicInterests}}
THEMATIC INTERESTS:
{{thematicInterests}}
{{/if}}

{{#if sparkLine}}
SPARK LINE:
{{sparkLine}}
{{/if}}

{{#if contentPreferences}}
CONTENT PREFERENCES:
{{contentPreferences}}
{{/if}}

CONCEPT CANDIDATES:
{{numbered list of JSON-serialized ConceptSpec objects from ideator output}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scoredConcepts": [ ... ] }.
- Include one scoredConcept item for every input concept.
- Preserve concept content exactly.
- For each item include: concept, scores, scoreEvidence.
```

### JSON Response Shape

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
- Parser computes `passes` with `passesConceptThresholds(scores)`.
- Score fields are clamped to 0..5 at parse time; clamping emits a warning log.
- Parser enforces exact concept coverage (no omissions/duplicates vs ideator set).

## Pass 2: Deep-Eval Prompt

### Messages Sent To Model

#### 1) System Message

```text
You are a strict evaluator for branching interactive narrative concepts. You score and analyze concepts; you do not rewrite or improve them.

SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, one-line clarity, whatIfQuestion quality, and playerFantasy appeal.
- conflictEngine: Stakes depth, pressure mechanism quality, recurring dilemma strength, ironicTwist quality, and conflictType-to-conflictAxis coherence (e.g., INDIVIDUAL_VS_SYSTEM axis + PERSON_VS_SOCIETY type = strong pairing; mismatched pairings need strong justification).
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.
- branchingFitness: Branch scalability, reconvergence viability, and state manageability.
- llmFeasibility: Rule enforceability, drift resistance, and implementation tractability.

DIMENSION WEIGHTS:
- hookStrength: weight {{CONCEPT_SCORING_WEIGHTS.hookStrength}}
- conflictEngine: weight {{CONCEPT_SCORING_WEIGHTS.conflictEngine}}
- agencyBreadth: weight {{CONCEPT_SCORING_WEIGHTS.agencyBreadth}}
- noveltyLeverage: weight {{CONCEPT_SCORING_WEIGHTS.noveltyLeverage}}
- branchingFitness: weight {{CONCEPT_SCORING_WEIGHTS.branchingFitness}}
- llmFeasibility: weight {{CONCEPT_SCORING_WEIGHTS.llmFeasibility}}

DEEP EVALUATION RULES:
- Evaluate all provided scored concepts.
- Do not rescore and do not alter concepts.
- For each concept, explain user-facing strengths, weaknesses, and tradeoffs.
```

#### 2) User Message

```text
Deep-evaluate all scored concepts.

USER SEEDS:
{{#if genreVibes}}
GENRE VIBES:
{{genreVibes}}
{{/if}}

{{#if moodKeywords}}
MOOD KEYWORDS:
{{moodKeywords}}
{{/if}}

{{#if thematicInterests}}
THEMATIC INTERESTS:
{{thematicInterests}}
{{/if}}

{{#if sparkLine}}
SPARK LINE:
{{sparkLine}}
{{/if}}

{{#if contentPreferences}}
CONTENT PREFERENCES:
{{contentPreferences}}
{{/if}}

SCORED CONCEPTS WITH LOCKED SCORES:
{{numbered list of JSON-serialized { concept, scores, overallScore } objects}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedConcepts": [ ... ] }.
- Include one evaluatedConcept item for every scored concept.
- Preserve concept content exactly.
- For each item include: concept, strengths, weaknesses, tradeoffSummary.
- strengths and weaknesses must be non-empty string arrays.
```

### JSON Response Shape

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

- Deep-eval parser enforces exact concept coverage against all scored concepts.
- `passes` field is propagated from scored data during merge.
- Final returned concepts are sorted descending by code-computed `overallScore`.

## Context Provided

| Context Field | Description |
|---|---|
| `genreVibes` | Optional genre guidance text |
| `moodKeywords` | Optional tone keyword list/text |
| `contentPreferences` | Optional content boundaries/preferences |
| `thematicInterests` | Optional theme interests |
| `sparkLine` | Optional seed hook sentence |
| `concepts` | ConceptSpec array from ideator output (scoring pass) |
| `scoredConcepts` | All ScoredConcept objects from scoring pass (deep-eval pass) |

## Notes

- Both passes share the same `ROLE_INTRO` and `RUBRIC` constants; pass 1 appends scoring rules while pass 2 appends deep evaluation rules.
- Dimension weights are injected from `CONCEPT_SCORING_WEIGHTS` in `src/models/concept-generator.ts`. Pass thresholds are NOT sent to the LLM; they are applied code-side only.
- User seed section is built identically for both passes via `buildSeedSection(context)`: each optional field is included only when non-empty after trimming, otherwise omitted entirely. If no seeds exist, "No optional user seeds provided." is emitted.
- Prompt logging uses `promptType: 'conceptEvaluatorScoring'` / `'conceptEvaluatorDeepEval'` via `runLlmStage(...)`.
- Model routing uses stage key `conceptEvaluator` in `getStageModel(...)`.
