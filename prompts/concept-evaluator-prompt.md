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

**Pipeline position**: Concept Ideator -> **Concept Evaluator (Scoring -> Deep Eval)** -> Concept Verifier

Generation stage emitted by `conceptService`: `EVALUATING_CONCEPTS`.

## Pass 1: Scoring Prompt

### Messages Sent To Model

#### 1) System Message

```text
You are a strict evaluator for branching interactive narrative concepts. You score and analyze concepts; you do not rewrite or improve them.

CONTENT GUIDELINES:
RATING: NC-21 (ADULTS ONLY)
{{... full content policy ...}}

SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, one-line clarity, whatIfQuestion quality, and playerFantasy appeal.
- conflictEngine: Stakes depth, pressure mechanism quality, recurring dilemma strength, ironicTwist quality, and conflictType-to-conflictAxis coherence (e.g., INDIVIDUAL_VS_SYSTEM axis + PERSON_VS_SOCIETY type = strong pairing; mismatched pairings need strong justification).
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.

- ironicPremise: 0-1 premise is straightforward with no built-in contradiction; 2-3 mild irony or subtext present; 4-5 the premise contains a deep structural irony where the protagonist's strength is also their undoing, or the world's rules create inherently paradoxical choices.
- sceneGenerativePower: 0-1 premise evokes only abstract tensions; 2-3 a few specific scenes come to mind; 4-5 reading the premise immediately triggers 5+ vivid, distinct scenes you can see playing out.
- contentCharge: 0-1 concept has no recognizable content-packet DNA; 2-3 packet elements are present but cosmetically applied; 4-5 the concept's identity, world rules, and conflict engine are inseparable from the content packet's wildness invariant and social engine.

DIMENSION WEIGHTS:
- hookStrength: weight {{CONCEPT_SCORING_WEIGHTS.hookStrength}}
- conflictEngine: weight {{CONCEPT_SCORING_WEIGHTS.conflictEngine}}
- agencyBreadth: weight {{CONCEPT_SCORING_WEIGHTS.agencyBreadth}}
- noveltyLeverage: weight {{CONCEPT_SCORING_WEIGHTS.noveltyLeverage}}

- ironicPremise: weight {{CONCEPT_SCORING_WEIGHTS.ironicPremise}}
- sceneGenerativePower: weight {{CONCEPT_SCORING_WEIGHTS.sceneGenerativePower}}
- contentCharge: weight {{CONCEPT_SCORING_WEIGHTS.contentCharge}}

SCORING RULES:
- Score every candidate concept.
- Do not rank, filter, or select concepts.
- Do not compute weighted totals.

PREFERENCE FIDELITY:
- When user preferences are provided, penalize any concept that fails to centrally embody ALL listed vibes/moods/preferences.
- In scoreEvidence for hookStrength and conflictEngine, explicitly note whether each user preference is centrally present or merely incidental.

EVIDENCE REQUIREMENT:
- For each dimension provide 1-3 concrete bullets tied to specific concept fields.
```

#### 2) User Message

```text
Score these concept candidates against the user intent and rubric.

MANDATORY USER PREFERENCES:
{{#if genreVibes}}
GENRE VIBES:
{{genreVibes}}
{{/if}}

{{#if moodKeywords}}
MOOD KEYWORDS:
{{moodKeywords}}
{{/if}}

{{#if contentPreferences}}
CONTENT PREFERENCES:
{{contentPreferences}}
{{/if}}

CONCEPT CANDIDATES:
{{numbered list of JSON-serialized { conceptId, concept } objects from ideator output}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scoredConcepts": [ ... ] }.
- Include one scoredConcept item for every input concept.
- For each item include: conceptId, scores, scoreEvidence.
- conceptId must match exactly one provided candidate conceptId.
```

### JSON Response Shape

```json
{
  "scoredConcepts": [
    {
      "conceptId": "concept_1",
      "scores": {
        "hookStrength": 0,
        "conflictEngine": 0,
        "agencyBreadth": 0,
        "noveltyLeverage": 0,

        "ironicPremise": 0,
        "sceneGenerativePower": 0,
        "contentCharge": 0
      },
      "scoreEvidence": {
        "hookStrength": ["..."],
        "conflictEngine": ["..."],
        "agencyBreadth": ["..."],
        "noveltyLeverage": ["..."],

        "ironicPremise": ["..."],
        "sceneGenerativePower": ["..."],
        "contentCharge": ["..."]
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

CONTENT GUIDELINES:
RATING: NC-21 (ADULTS ONLY)
{{... full content policy ...}}

SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, one-line clarity, whatIfQuestion quality, and playerFantasy appeal.
- conflictEngine: Stakes depth, pressure mechanism quality, recurring dilemma strength, ironicTwist quality, and conflictType-to-conflictAxis coherence (e.g., INDIVIDUAL_VS_SYSTEM axis + PERSON_VS_SOCIETY type = strong pairing; mismatched pairings need strong justification).
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.

- ironicPremise: 0-1 premise is straightforward with no built-in contradiction; 2-3 mild irony or subtext present; 4-5 the premise contains a deep structural irony where the protagonist's strength is also their undoing, or the world's rules create inherently paradoxical choices.
- sceneGenerativePower: 0-1 premise evokes only abstract tensions; 2-3 a few specific scenes come to mind; 4-5 reading the premise immediately triggers 5+ vivid, distinct scenes you can see playing out.
- contentCharge: 0-1 concept has no recognizable content-packet DNA; 2-3 packet elements are present but cosmetically applied; 4-5 the concept's identity, world rules, and conflict engine are inseparable from the content packet's wildness invariant and social engine.

DIMENSION WEIGHTS:
- hookStrength: weight {{CONCEPT_SCORING_WEIGHTS.hookStrength}}
- conflictEngine: weight {{CONCEPT_SCORING_WEIGHTS.conflictEngine}}
- agencyBreadth: weight {{CONCEPT_SCORING_WEIGHTS.agencyBreadth}}
- noveltyLeverage: weight {{CONCEPT_SCORING_WEIGHTS.noveltyLeverage}}

- ironicPremise: weight {{CONCEPT_SCORING_WEIGHTS.ironicPremise}}
- sceneGenerativePower: weight {{CONCEPT_SCORING_WEIGHTS.sceneGenerativePower}}
- contentCharge: weight {{CONCEPT_SCORING_WEIGHTS.contentCharge}}

DEEP EVALUATION RULES:
- Evaluate all provided scored concepts.
- Do not rescore and do not alter concepts.
- For each concept, explain user-facing strengths, weaknesses, and tradeoffs.

PREFERENCE ADHERENCE:
- When evaluating strengths/weaknesses, explicitly assess whether the concept centrally embodies ALL listed user preferences.
- Flag missing or merely incidental preferences as weaknesses.
```

#### 2) User Message

```text
Deep-evaluate all scored concepts.

MANDATORY USER PREFERENCES:
{{#if genreVibes}}
GENRE VIBES:
{{genreVibes}}
{{/if}}

{{#if moodKeywords}}
MOOD KEYWORDS:
{{moodKeywords}}
{{/if}}

{{#if contentPreferences}}
CONTENT PREFERENCES:
{{contentPreferences}}
{{/if}}

SCORED CONCEPTS WITH LOCKED SCORES:
{{numbered list of JSON-serialized { conceptId, concept, scores, overallScore } objects}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedConcepts": [ ... ] }.
- Include one evaluatedConcept item for every scored concept.
- For each item include: conceptId, strengths, weaknesses, tradeoffSummary.
- conceptId must match exactly one provided scored conceptId.
- strengths and weaknesses must be non-empty string arrays.
```

### JSON Response Shape

```json
{
  "evaluatedConcepts": [
    {
      "conceptId": "concept_1",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "tradeoffSummary": "..."
    }
  ]
}
```

Runtime behavior:

- Deep-eval parser enforces exact conceptId coverage against all scored concepts.
- `passes` field is propagated from scored data during merge.
- Final returned concepts are sorted descending by code-computed `overallScore`.

## Context Provided

| Context Field | Description |
|---|---|
| `genreVibes` | Optional genre guidance text |
| `moodKeywords` | Optional tone keyword list/text |
| `contentPreferences` | Optional content boundaries/preferences |
| `concepts` | ConceptSpec array from ideator output (scoring pass) |
| `scoredConcepts` | All ScoredConcept objects from scoring pass (deep-eval pass) |
| `contentPackets` | Optional ContentPacket[] used by upstream stages (evaluator scores their integration) |

## Content Packet Integration (WILCONPIP)

The `contentCharge` scoring dimension was added in WILCONPIP-12 to evaluate how deeply content packet DNA is embedded in each concept. The evaluator does not receive raw content packets — it evaluates concepts that were already packet-grounded by earlier stages (seeder, architect, engineer). The `contentCharge` dimension measures whether that grounding survived the pipeline or was diluted into generic genre.

## Notes

- Both passes share the same `ROLE_INTRO` and `RUBRIC` constants; pass 1 appends scoring rules while pass 2 appends deep evaluation rules.
- Dimension weights are injected from `CONCEPT_SCORING_WEIGHTS` in `src/models/concept-generator.ts`. Pass thresholds are NOT sent to the LLM; they are applied code-side only.
- User preference section is built identically for both passes via `buildSeedSection(context)`: each optional field is included only when non-empty after trimming, otherwise omitted entirely. If no preferences exist, "No user preferences specified." is emitted. Label is "MANDATORY USER PREFERENCES" to signal constraint status to the LLM.
- Scoring pass includes PREFERENCE FIDELITY section; deep-eval pass includes PREFERENCE ADHERENCE section.
- Prompt logging uses `promptType: 'conceptEvaluator'` for both passes via `runLlmStage(...)`.
- Model routing uses stage key `conceptEvaluator` in `getStageModel(...)`.
