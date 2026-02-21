# Concept Verifier Prompt (Production Template)

- Source: `src/llm/prompts/concept-verifier-prompt.ts`
- Orchestration: `src/llm/concept-verifier.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-verifier-schema.ts`
- Types: `src/models/concept-generator.ts` (`ConceptVerification`, `LoadBearingCheck`, `ConceptVerifierContext`, `ConceptVerificationResult`)

## Pipeline Position

The verifier is the 3rd auto-running stage in `generateConcepts()`. It runs after evaluation and verifies ALL concepts in the batch, testing whether each concept is genuinely unique and load-bearing versus a dressed-up genre template.

**Pipeline position**: Concept Ideator -> Concept Evaluator -> **Concept Verifier** -> (optional) Concept Stress Tester

Generation stage emitted by `conceptService`: `VERIFYING_CONCEPTS`.

## Purpose

The evaluator scores concepts on quality dimensions and the stress tester hardens them against drift/player-break, but neither asks "is this concept specific enough to generate unique scenarios?" The verifier fills this gap by:

1. **Signature Scenario**: Identifying the single most iconic interactive decision moment that ONLY exists because of this concept's differentiator.
2. **Escalating Setpieces**: Producing 6 concept-unique situations in rising intensity that serve as downstream beat seeds for structure generation.
3. **Inevitability Statement**: Capturing what kind of story MUST happen (not could happen) given the premise's internal logic.
4. **Load-Bearing Check**: A negative test — removing the core differentiator and checking whether the story collapses into generic genre.
5. **Concept Integrity Score**: 0-100 based on how many setpieces are truly concept-unique.

## Messages Sent To Model

### 1) System Message

```text
You are a concept integrity analyst for interactive branching fiction. Your job is to prove whether each concept is genuinely specific and load-bearing, or a dressed-up genre template.

VERIFICATION DIRECTIVES:
- Do not praise concepts. Probe their specificity.
- For each concept, produce evidence that the concept is irreducibly unique — or expose that it collapses into genre.
- All scenarios and setpieces must be ONLY possible because of this specific concept's differentiator (genreSubversion + coreFlaw + coreConflictLoop). If a scenario could appear in a generic story of the same genre, reject it and write one that couldn't.
- The signature scenario must describe the single most iconic interactive decision moment — where the player's choice ONLY exists because of this concept's differentiator.
- The 6 escalating setpieces must form a rising intensity arc from opening hook to climax. Each must be concept-unique.
- The inevitability statement captures what kind of story MUST happen given this premise — not what could happen, but what is forced by internal logic.
- The load-bearing check is a negative test: remove the core differentiator and determine whether the story collapses into generic genre.
```

### 2) User Message

```text
Verify the specificity and load-bearing integrity of each evaluated concept below.

EVALUATED CONCEPTS INPUT:
[
  {
    "conceptId": "concept_1",
    "oneLineHook": "...",
    "genreFrame": "...",
    "genreSubversion": "...",
    "protagonistRole": "...",
    "coreFlaw": "...",
    "coreConflictLoop": "...",
    "conflictAxis": "...",
    "conflictType": "...",
    "pressureSource": "...",
    "settingAxioms": ["..."],
    "constraintSet": ["..."],
    "playerFantasy": "...",
    "strengths": ["..."],
    "weaknesses": ["..."]
  }
]

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "verifications": ConceptVerification[] }.
- verifications array must have exactly N items, one per input concept, in the same order.
- Each verification must include:
  - signatureScenario: string
  - escalatingSetpieces: string[] (exactly 6)
  - inevitabilityStatement: string
  - loadBearingCheck: { passes: boolean, reasoning: string, genericCollapse: string }
  - conceptIntegrityScore: number 0-100
- All text fields must be non-empty.
- Each escalatingSetpieces array must contain exactly 6 strings.
```

## JSON Response Shape

```json
{
  "verifications": [
    {
      "signatureScenario": "description of the most iconic interactive decision moment",
      "escalatingSetpieces": [
        "setpiece 1 (opening intensity)",
        "setpiece 2",
        "setpiece 3",
        "setpiece 4",
        "setpiece 5",
        "setpiece 6 (climax intensity)"
      ],
      "inevitabilityStatement": "given this premise, X kind of story MUST happen",
      "loadBearingCheck": {
        "passes": true,
        "reasoning": "why the concept is load-bearing",
        "genericCollapse": "what it becomes without its differentiator"
      },
      "conceptIntegrityScore": 85
    }
  ]
}
```

- `parseConceptVerificationResponse(...)` requires exactly N verifications matching the input count.
- `escalatingSetpieces` must have exactly 6 items.
- `conceptIntegrityScore` is clamped to 0-100 and rounded.
- All text fields must be non-empty after trimming.

## Context Provided

| Context Field | Description |
|---|---|
| `evaluatedConcepts` | Array of evaluated concepts from the evaluator stage |

Each concept exposes: `oneLineHook`, `genreFrame`, `genreSubversion`, `protagonistRole`, `coreFlaw`, `coreConflictLoop`, `conflictAxis`, `conflictType`, `pressureSource`, `settingAxioms`, `constraintSet`, `playerFantasy`, `strengths`, `weaknesses`.

## Downstream Integration

### Spine Generation
When a saved concept has a `verificationResult`, spine generation receives:
- `signatureScenario` — the spine's `centralDramaticQuestion` should make this moment inevitable
- `inevitabilityStatement` — grounds the dramatic question in narrative necessity

### Structure Generation
When verification data is available, structure generation receives the **setpiece bank**:
- 6 escalating setpieces as beat seeds
- Constraint: at least 3 `uniqueScenarioHook` fields should trace back to verified setpieces

## Notes

- This stage runs automatically as part of `generateConcepts()`, not on-demand.
- Verification results are persisted on `SavedConcept.verificationResult` and `GeneratedConceptBatch.verifications`.
- Prompt logging uses `promptType: 'conceptVerifier'` via `runLlmStage(...)`.
- Model routing uses stage key `conceptVerifier` in `getStageModel(...)`.
