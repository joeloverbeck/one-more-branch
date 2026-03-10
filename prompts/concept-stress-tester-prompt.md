# Concept Stress Tester Prompt (Production Template)

- Source: `src/llm/prompts/concept-stress-tester-prompt.ts`
- Orchestration: `src/llm/concept-stress-tester.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-stress-tester-schema.ts`
- Mitigation enums + concept model: `src/models/concept-generator.ts`

## Pipeline Position

The stress tester is an on-demand LLM call (triggered by `/concepts/api/:conceptId/harden`) that pressure-tests one evaluated concept and returns a hardened replacement plus concrete risk handling.

**Pipeline position**: Concept Ideator -> Concept Evaluator -> Concept Verifier -> **Concept Stress Tester** (optional, on-demand `/concepts/api/:conceptId/harden`)

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
- Irony Test: does the concept contain genuine structural irony, or is the "ironic twist" merely a plot surprise? Structural irony means the protagonist's strength IS the source of their potential undoing. If the ironicTwist is just a surprise reveal, tighten it.
- Dinner Table Test: could you explain this concept at a dinner table and have someone lean forward? If the concept sounds like a genre template ("a detective solves mysteries"), the hook needs sharpening. The concept must evoke a specific, vivid situation.
- Scene Flash Test: reading the concept, can you immediately see 5+ distinct, vivid scenes? If not, the concept is too abstract. Tighten settingAxioms, constraintSet, and pressureSource to be more concrete and scene-evoking.
- For every identified weakness, tighten existing concept fields with concrete and enforceable changes.
- Keep hardenedConcept in the exact ConceptSpec shape.

WILDNESS INVARIANT EROSION CHECK:
- Compare pre-hardened vs. hardened concept's relationship to each wildnessInvariant.
- Flag if hardened concept has normalized, genericized, or removed invariant's concrete specificity.
- If erosion detected, emit drift risk with mitigationType WILDNESS_INVARIANT describing what was diluted and how to restore.
- Compare each packet's dullCollapse against verification's genericCollapse — if they describe substantially the same generic story, flag as CRITICAL drift risk with mitigationType WILDNESS_INVARIANT.
- Wildness invariant erosion is MORE serious than other drift risks. A concept that passes all other checks but loses its wildness invariant has failed.

WEAK DIMENSION FOCUS:
- Prioritize reinforcement for: {{dimensions below pass thresholds (hookStrength, conflictEngine, agencyBreadth, noveltyLeverage, ironicPremise, sceneGenerativePower, contentCharge), comma-separated, or "none below threshold"}}
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

{{if verification is available}}

## VERIFICATION INTELLIGENCE

### Signature Scenario (PROTECT THIS)
{{verification.signatureScenario}}

### Setpiece Bank (PRESERVE UNIQUENESS)
1. {{setpiece}}
2. {{setpiece}}
...

### Load-Bearing Check
- Passes: {{verification.loadBearingCheck.passes}}
- Generic collapse risk: "{{verification.loadBearingCheck.genericCollapse}}"
- Integrity score: {{verification.conceptIntegrityScore}}/100

DIRECTIVES:
- Your hardened concept MUST NOT invalidate the signature scenario.
- Your drift risk mitigations MUST NOT erode any setpiece's world-specific elements.
- If load-bearing check identified generic collapse into "{{genericCollapse}}", your hardening must WIDEN the distance from that generic form, not narrow it.

{{end if}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "hardenedConcept": ConceptSpec, "driftRisks": DriftRisk[], "playerBreaks": PlayerBreak[] }.
- driftRisks and playerBreaks must both be non-empty arrays.
- mitigationType must be one of: STATE_CONSTRAINT, WORLD_AXIOM, SCENE_RULE, RETRIEVAL_SCOPE, WILDNESS_INVARIANT.
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
      "mitigationType": "{{STATE_CONSTRAINT|WORLD_AXIOM|SCENE_RULE|RETRIEVAL_SCOPE|WILDNESS_INVARIANT}}"
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
| `verification` | (Optional) Verifier output: signature scenario, setpiece bank, load-bearing check. When present, injects a VERIFICATION INTELLIGENCE section into the user prompt to make hardening premise-protective. |
| `contentPackets` | ContentPacket[] with `contentId`, `wildnessInvariant`, `dullCollapse` |

## Content Packet Integration (WILCONPIP)

WILCONPIP-15 added a wildness invariant erosion check. When `contentPackets` are provided:

- The prompt injects content packet context with `contentId`, `wildnessInvariant`, and `dullCollapse`
- A new `WILDNESS INVARIANT EROSION CHECK` section in the system message directs the stress tester to:
  - Compare pre-hardened vs. hardened concept's relationship to each `wildnessInvariant`
  - Flag if hardening normalized, genericized, or removed the invariant's specificity
  - Emit drift risks with `mitigationType: WILDNESS_INVARIANT` when erosion is detected
  - Cross-reference `dullCollapse` against verification's `genericCollapse` for critical drift
- `WILDNESS_INVARIANT` was added as a new `mitigationType` enum value
- Wildness invariant erosion is treated as MORE serious than other drift risks — a concept passing all other checks but losing its wildness invariant is considered failed

## Notes

- This stage mutates only concept durability artifacts; it does not rescore the concept.
- In `conceptRoutes`, successful hardening snapshots the current `evaluatedConcept` into `preHardenedConcept` before overwriting `evaluatedConcept.concept` with the hardened version. Repeated hardening overwrites `preHardenedConcept` each time (always reflects the state immediately before the most recent hardening).
- `stressTestResult` (`driftRisks`, `playerBreaks`) is stored on the saved concept record and overwritten on each hardening pass.
- Prompt logging uses `promptType: 'conceptStressTester'` via `runLlmStage(...)`.
- Model routing uses stage key `conceptStressTester` in `getStageModel(...)`.
