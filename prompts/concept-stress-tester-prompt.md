# Concept Stress Tester Prompt (Production Template)

- Source: `src/llm/prompts/concept-stress-tester-prompt.ts`
- Orchestration: `src/llm/concept-stress-tester.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-stress-tester-schema.ts`
- Mitigation enums + concept model: `src/models/concept-generator.ts`

## Pipeline Position

The stress tester is an on-demand LLM call (triggered by `/concepts/api/:conceptId/harden`) that pressure-tests one evaluated concept and returns a hardened replacement plus concrete risk handling.

**Pipeline position**: Concept Ideator -> Concept Evaluator -> **Concept Stress Tester** (optional per concept)

Generation stage emitted by `conceptService`: `STRESS_TESTING_CONCEPT`.

## Messages Sent To Model

### 1) System Message

```text
You are an adversarial story architect. Your job is to break this concept under realistic play pressure and harden it for robust branching execution.

ADVERSARIAL DIRECTIVES:
- Do not praise the concept. Prioritize failure modes.
- Drift analysis: identify where world rules, constraints, or consequences are likely to erode across turns.
- Player-break analysis: test extreme but plausible player behavior (refusal, exploit loops, antagonist alignment, sidequest fixation).
- conflictType durability: does the conflictType create enough structural opposition to sustain branching? Can the antagonistic source (person/society/nature/etc.) generate sufficient variety of encounters?
- For every identified weakness, tighten existing concept fields with concrete and enforceable changes.
- Keep hardenedConcept in the exact ConceptSpec shape.

WEAK DIMENSION FOCUS:
- Prioritize reinforcement for: {{dimensions below pass thresholds, comma-separated, or "none below threshold"}}
- If no dimensions are below threshold, still harden against drift and hostile player strategies.
```

### 2) User Message

```text
Stress-test this evaluated concept and return a hardened version plus concrete risk handling.

EVALUATED CONCEPT INPUT:
{
  "concept": {{ConceptSpec}},
  "scores": {{ConceptDimensionScores}},
  "weaknesses": ["{{weakness}}"]
}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "hardenedConcept": ConceptSpec, "driftRisks": DriftRisk[], "playerBreaks": PlayerBreak[] }.
- driftRisks and playerBreaks must both be non-empty arrays.
- mitigationType must be one of: STATE_CONSTRAINT, WORLD_AXIOM, SCENE_RULE, RETRIEVAL_SCOPE.
- All text fields must be concrete and non-empty.
```

## JSON Response Shape

```json
{
  "hardenedConcept": {
    "{{ConceptSpec fields}}": "same shape as concept ideator output"
  },
  "driftRisks": [
    {
      "risk": "{{how concept can drift over turns}}",
      "mitigation": "{{enforceable hardening step}}",
      "mitigationType": "{{STATE_CONSTRAINT|WORLD_AXIOM|SCENE_RULE|RETRIEVAL_SCOPE}}"
    }
  ],
  "playerBreaks": [
    {
      "scenario": "{{extreme but plausible player strategy}}",
      "handling": "{{how engine/story should absorb it}}",
      "constraintUsed": "{{which concept constraint/axiom is used}}"
    }
  ]
}
```

- `parseConceptStressTestResponse(...)` requires non-empty `driftRisks` and `playerBreaks`.
- `hardenedConcept` is parsed with `parseConceptSpec(...)`, so all ConceptSpec enum and array bounds remain enforced.
- `mitigationType` must satisfy `isDriftRiskMitigationType(...)` or parsing fails.
- Each text field in drift/player entries must be non-empty after trimming.

## Context Provided

| Context Field | Description |
|---|---|
| `concept` | Evaluated concept to harden |
| `scores` | Dimension scores for that concept |
| `weaknesses` | Evaluator-provided weak points/tradeoffs |

## Notes

- This stage mutates only concept durability artifacts; it does not rescore the concept.
- In `conceptRoutes`, successful hardening snapshots the current `evaluatedConcept` into `preHardenedConcept` before overwriting `evaluatedConcept.concept` with the hardened version. Repeated hardening overwrites `preHardenedConcept` each time (always reflects the state immediately before the most recent hardening).
- `stressTestResult` (`driftRisks`, `playerBreaks`) is stored on the saved concept record and overwritten on each hardening pass.
- Prompt logging uses `promptType: 'conceptStressTester'` via `runLlmStage(...)`.
- Model routing uses stage key `conceptStressTester` in `getStageModel(...)`.
