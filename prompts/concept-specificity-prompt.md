# Concept Specificity Prompt (Production Template)

- Source: `src/llm/prompts/concept-specificity-prompt.ts`
- Orchestration: `src/llm/concept-verifier.ts` (via `runTwoPhaseLlmStage`)
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-specificity-schema.ts`
- Types: `src/llm/concept-specificity-types.ts` (`ConceptSpecificityAnalysis`, `ConceptSpecificityResult`)

## Pipeline Position

The concept specificity analyzer is the first of two sequential stages in concept verification. It runs after evaluation and performs analytical/destructive testing on each concept to determine whether it is genuinely specific and load-bearing.

**Pipeline position**: Concept Ideator -> Concept Evaluator -> **Concept Specificity Analyzer** -> Concept Scenario Generator -> (optional) Concept Stress Tester

Generation stage: `ANALYZING_SPECIFICITY` (display name: `ANALYZING`)

## Purpose

The specificity analyzer focuses on analytical and destructive testing — probing, breaking, and exposing weaknesses. It does NOT generate creative scenarios or score concept integrity (that is the Concept Scenario Generator's job).

Specifically, it produces:

1. **Signature Scenario**: The single most iconic interactive decision moment that ONLY exists because of this concept's differentiator.
2. **Logline Compression Test**: Whether the concept compresses into a compelling <=27-word logline.
3. **Premise Promises**: 3-5 specific audience expectations the premise promises to deliver (not structure beats).
4. **Inevitability Statement**: What kind of story MUST happen given the premise's internal logic.
5. **Load-Bearing Check**: A negative test — removing the core differentiator and checking whether the story collapses into generic genre.
6. **Kernel Fidelity Check**: A negative test — removing the story kernel and checking whether the concept's conflict engine still implies the same value-at-stake and opposing force.

## Messages Sent To Model

### 1) System Message

```text
You are a concept specificity analyst for interactive branching fiction. Your job is to prove whether each concept is genuinely specific and load-bearing, or a dressed-up genre template. You perform destructive analytical testing — probing, breaking, and exposing weaknesses.

SPECIFICITY DIRECTIVES:
- Do not praise concepts. Probe their specificity.
- For each concept, produce evidence that the concept is irreducibly unique — or expose that it collapses into genre.
- The signature scenario must describe the single most iconic interactive decision moment — where the player's choice ONLY exists because of this concept's premise (both its conflict engine and its world-specific elements).
- logline compression test: assess whether the full concept compresses into a compelling <=27-word logline. Set loglineCompressible and provide the compressed logline text in logline.
- premise promises are audience expectations: list 3-5 specific scenarios this premise promises the reader will experience. These are not structure beats.
- The inevitability statement captures what kind of story MUST happen given this premise — not what could happen, but what is forced by internal logic.
- The load-bearing check is a negative test: remove the conflict engine (genreSubversion + coreFlaw + coreConflictLoop) and determine whether the story collapses into generic genre.

KERNEL FIDELITY DIRECTIVE:
- For each concept, determine whether the kernel's valueAtStake and opposingForce are STRUCTURALLY embedded in the concept's conflict engine, or merely cosmetically referenced.
- The test: Remove the story kernel entirely. Does the concept's conflict engine (coreConflictLoop, pressureSource, stakesPersonal, stakesSystemic) still clearly imply the same value-at-stake and opposing force? If NOT, the operationalization is genuine. If it COULD serve any kernel equally well, the operationalization is superficial.
- kernelFidelityCheck.passes = true means the concept has genuinely grounded the kernel.
- kernelFidelityCheck.kernelDrift describes what kernel elements are absent, weakly mapped, or superficially parroted.
```

### 2) User Message

```text
Analyze the specificity and load-bearing integrity of each evaluated concept below.

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
    "deadlineMechanism": "...",
    "keyInstitutions": ["..."],
    "escapeValve": "...",
    "incitingDisruption": "...",
    "playerFantasy": "...",
    "strengths": ["..."],
    "weaknesses": ["..."]
  }
]

STORY KERNEL (shared by all concepts):
- dramaticThesis: ...
- valueAtStake: ...
- opposingForce: ...
- directionOfChange: ...
- thematicQuestion: ...

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "specificityAnalyses": ConceptSpecificityAnalysis[] }.
- specificityAnalyses array must have exactly N items, one per input concept.
- Each analysis must include:
  - conceptId: string (must match exactly one provided input conceptId)
  - signatureScenario: string
  - loglineCompressible: boolean
  - logline: string (<=27 words)
  - premisePromises: string[] (exactly 3-5)
  - inevitabilityStatement: string
  - loadBearingCheck: { passes: boolean, reasoning: string, genericCollapse: string }
  - kernelFidelityCheck: { passes: boolean, reasoning: string, kernelDrift: string }
- Every input conceptId must appear exactly once in the output.
- All text fields must be non-empty.
- logline must be <=27 words.
```

## JSON Response Shape

```json
{
  "specificityAnalyses": [
    {
      "conceptId": "concept_1",
      "signatureScenario": "description of the most iconic interactive decision moment",
      "loglineCompressible": true,
      "logline": "a <=27-word compressed concept logline",
      "premisePromises": [
        "audience expectation 1",
        "audience expectation 2",
        "audience expectation 3"
      ],
      "inevitabilityStatement": "given this premise, X kind of story MUST happen",
      "loadBearingCheck": {
        "passes": true,
        "reasoning": "why the concept is load-bearing",
        "genericCollapse": "what it becomes without its differentiator"
      },
      "kernelFidelityCheck": {
        "passes": true,
        "reasoning": "how the kernel is structurally grounded in the concept",
        "kernelDrift": "what kernel elements are absent, weak, or superficially applied"
      }
    }
  ]
}
```

### Validation

- `parseConceptSpecificityResponse(...)` requires exactly N analyses with conceptIds matching the input set.
- `premisePromises` must contain 3-5 non-empty strings (enforced at parse time, not in the JSON Schema — Anthropic rejects `minItems` > 1 and `maxItems`).
- `logline` must contain at most 27 words.
- All text fields must be non-empty after trimming.

## Context Provided

| Context Field | Description |
|---|---|
| `evaluatedConcepts` | Array of evaluated concepts from the evaluator stage |
| `kernel` | StoryKernel with `dramaticThesis`, `valueAtStake`, `opposingForce`, `directionOfChange`, `thematicQuestion` — always required |

## Downstream Integration

The `signatureScenario` from this stage is passed to the Concept Scenario Generator (stage 2) to anchor setpiece generation.

### Spine Generation
When a saved concept has a `verificationResult`, spine generation receives:
- `signatureScenario` — the spine's `centralDramaticQuestion` should make this moment inevitable
- `inevitabilityStatement` — grounds the dramatic question in narrative necessity

## Notes

- This stage was split from the original concept verifier to isolate analytical/destructive testing from creative scenario generation, preventing cognitive mode competition.
- Prompt logging uses `promptType: 'conceptSpecificity'` via `runTwoPhaseLlmStage(...)`.
- Model routing uses stage key `conceptSpecificity` in `getStageModel(...)`.
