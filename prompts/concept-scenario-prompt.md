# Concept Scenario Prompt (Production Template)

- Source: `src/llm/prompts/concept-scenario-prompt.ts`
- Orchestration: `src/llm/concept-verifier.ts` (via `runTwoPhaseLlmStage`)
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-scenario-schema.ts`
- Types: `src/llm/concept-scenario-types.ts` (`ConceptScenarioAnalysis`, `ConceptScenarioResult`)

## Pipeline Position

The concept scenario generator is the second of two sequential stages in concept verification. It runs after the specificity analyzer and generates creative scenarios to prove each concept can sustain a full story.

**Pipeline position**: Concept Ideator -> Concept Evaluator -> Concept Specificity Analyzer -> **Concept Scenario Generator** -> (optional) Concept Stress Tester

Generation stage: `GENERATING_SCENARIOS` (display name: `ENVISIONING`)

## Purpose

The scenario generator focuses on creative/generative work — inventing scenarios and testing causal links. It receives the `signatureScenario` from the specificity analyzer to anchor setpiece generation to the concept's core identity.

Specifically, it produces:

1. **Escalating Setpieces**: 6 concept-unique situations in rising intensity from opening hook to climax.
2. **Setpiece Causal Chain Test**: 5 causal links (1->2 through 5->6) analyzing whether each setpiece outcome CAUSES the next setpiece setup.
3. **Concept Integrity Score**: 0-100 measuring how many of the 6 setpieces are truly concept-unique (100 = all 6 are impossible in any other story).

## Messages Sent To Model

### 1) System Message

```text
You are a creative scenario architect for interactive branching fiction. Your job is to generate escalating setpieces that prove each concept can sustain a full story — or expose that it cannot. You work from specificity analyses already performed on each concept.

SCENARIO DIRECTIVES:
- All scenarios and setpieces must be ONLY possible because of this specific concept's premise — both its conflict engine (genreSubversion, coreFlaw, coreConflictLoop) and its world-specific elements (settingAxioms, constraintSet, keyInstitutions, deadlineMechanism, pressureSource, escapeValve). Each setpiece must exploit at least one world-specific element, not just the conflict engine. If a setpiece could appear in a generic story of the same genre with different world rules, reject it and write one that couldn't.
- The 6 escalating setpieces must form a rising intensity arc from opening hook to climax. Each must be concept-unique.
- setpiece causal chain test: analyze whether each setpiece outcome CAUSES the next setpiece setup. If links are weak or missing, set setpieceCausalChainBroken=true and still provide the strongest possible 5 causal links (between setpieces 1->2 through 5->6).
- The conceptIntegrityScore measures how many of the 6 setpieces are truly concept-unique (100 = all 6 are impossible in any other story).
- Anchor each setpiece to the signature scenario already identified in the specificity analysis. The setpieces should feel like they belong in the same story as that signature moment.
- When content packets are provided: at least 2 of 6 setpieces must directly exploit a content packet's signatureImage or escalationPath. At least 1 setpiece must show a packet's socialEngine in action (institution/market/ritual operating in the scene). Setpieces that merely reference packet cosmetically do not count.
```

### 2) User Message

```text
Generate escalating setpieces and assess causal integrity for each concept below. Each concept includes its signature scenario from the specificity analysis.

CONCEPTS WITH SPECIFICITY CONTEXT:
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
    "deadlineMechanism": "...",
    "keyInstitutions": ["..."],
    "escapeValve": "...",
    "incitingDisruption": "...",
    "playerFantasy": "...",
    "signatureScenario": "from specificity analysis stage 1"
  }
]

STORY KERNEL (shared by all concepts):
- dramaticThesis: ...
- valueAtStake: ...
- opposingForce: ...
- directionOfChange: ...
- thematicQuestion: ...

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scenarioAnalyses": ConceptScenarioAnalysis[] }.
- scenarioAnalyses array must have exactly N items, one per input concept.
- Each analysis must include:
  - conceptId: string (must match exactly one provided input conceptId)
  - escalatingSetpieces: string[] (exactly 6 concept-unique situations in rising intensity)
  - setpieceCausalChainBroken: boolean
  - setpieceCausalLinks: string[] (exactly 5 causal links: 1->2, 2->3, 3->4, 4->5, 5->6)
  - conceptIntegrityScore: number 0-100
- Every input conceptId must appear exactly once in the output.
- All text fields must be non-empty.
- Each escalatingSetpieces array must contain exactly 6 strings.
- Each setpieceCausalLinks array must contain exactly 5 non-empty strings.
```

## JSON Response Shape

```json
{
  "scenarioAnalyses": [
    {
      "conceptId": "concept_1",
      "escalatingSetpieces": [
        "setpiece 1 (opening intensity)",
        "setpiece 2",
        "setpiece 3",
        "setpiece 4",
        "setpiece 5",
        "setpiece 6 (climax intensity)"
      ],
      "setpieceCausalChainBroken": false,
      "setpieceCausalLinks": [
        "setpiece 1 causes setpiece 2",
        "setpiece 2 causes setpiece 3",
        "setpiece 3 causes setpiece 4",
        "setpiece 4 causes setpiece 5",
        "setpiece 5 causes setpiece 6"
      ],
      "conceptIntegrityScore": 85
    }
  ]
}
```

### Validation

- `parseConceptScenarioResponse(...)` requires exactly N analyses with conceptIds matching the input set.
- `escalatingSetpieces` must have exactly 6 items (enforced at parse time, not in the JSON Schema — Anthropic rejects `minItems` > 1 and `maxItems`).
- `setpieceCausalLinks` must have exactly 5 non-empty strings (enforced at parse time, not in the JSON Schema).
- `conceptIntegrityScore` is clamped to 0-100 and rounded.
- All text fields must be non-empty after trimming.

## Context Provided

| Context Field | Description |
|---|---|
| `evaluatedConcepts` | Array of evaluated concepts from the evaluator stage |
| `kernel` | StoryKernel with `dramaticThesis`, `valueAtStake`, `opposingForce`, `directionOfChange`, `thematicQuestion` |
| `specificityAnalyses` | Array of `ConceptSpecificityAnalysis` from stage 1, providing `signatureScenario` for each concept |
| `contentPackets` | ContentPacket[] with `signatureImage`, `escalationPath`, `socialEngine` |

## Downstream Integration

### Structure Generation
When verification data is available, structure generation receives the **setpiece bank**:
- 6 escalating setpieces as beat seeds
- Constraint: at least 3 `uniqueScenarioHook` fields should trace back to verified setpieces

## Content Packet Integration (WILCONPIP)

When `contentPackets` are provided, the prompt injects a `CONTENT PACKETS` block containing `signatureImage`, `escalationPath`, and `socialEngine` for each packet. The scenario generator must:

- Directly exploit packet `signatureImage` or `escalationPath` in at least 2 of 6 setpieces
- Show at least 1 packet's `socialEngine` in action (institution/market/ritual operating in the scene)
- Cosmetic references to packet material do not count toward these requirements

## Notes

- This stage was split from the original concept verifier to isolate creative scenario generation from analytical/destructive testing, eliminating self-evaluation bias (the LLM no longer scores its own generated setpieces in the same call).
- Prompt logging uses `promptType: 'conceptScenario'` via `runTwoPhaseLlmStage(...)`.
- Model routing uses stage key `conceptScenario` in `getStageModel(...)`.
- Verification results are persisted on `SavedConcept.verificationResult` and `GeneratedConceptBatch.verifications`.
- The combined output from both stages is assembled by `combineVerifications()` in `concept-verifier.ts` into the same `ConceptVerification` shape used by downstream consumers.
