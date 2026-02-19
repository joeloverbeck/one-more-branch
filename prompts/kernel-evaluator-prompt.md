# Kernel Evaluator Prompt (Production Template)

- Source: `src/llm/prompts/kernel-evaluator-prompt.ts`
- Orchestration: `src/llm/kernel-evaluator.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/kernel-evaluator-schema.ts`
- Scoring weights + score computation: `src/models/story-kernel.ts`
- Pass thresholds (code-side only): `src/models/story-kernel.ts` (`KERNEL_PASS_THRESHOLDS`, `passesKernelThresholds()`)

## Pipeline Position

The kernel evaluator is the second stage in the `/kernels` flow and runs in two passes:

1. Scoring pass: score all ideated kernels with per-dimension evidence.
2. Deep-eval pass: evaluate all scored kernels with strengths/weaknesses/tradeoffs.

Pass/fail is computed code-side via `passesKernelThresholds(scores)` and stored as a `passes: boolean` field on `ScoredKernel` and `EvaluatedKernel`. Thresholds are NOT exposed to the LLM to avoid anchoring bias.

**Pipeline position**: Kernel Ideator -> **Kernel Evaluator (Scoring -> Deep Eval)**

Generation stage emitted by `kernelService`: `EVALUATING_KERNELS`.

## Pass 1: Scoring Prompt

### 1) System Message

```text
You are a strict evaluator for story kernels. You score and analyze kernels; you do not rewrite, merge, or improve them.

SCORING RUBRIC (0-5):
- dramaticClarity: 0-1 vague truism; 2-3 identifiable but soft thesis; 4-5 crisp and falsifiable causal claim.
- thematicUniversality: 0-1 niche concern; 2-3 broad but partial resonance; 4-5 fundamental cross-cultural human resonance.
- generativePotential: 0-1 locked to one story/genre; 2-3 supports a few variations; 4-5 can seed many distinct concepts across genres.
- conflictTension: 0-1 weak opposition; 2-3 real but obvious resolution path; 4-5 irreconcilable value pressure with credible claims on both sides.
- emotionalDepth: 0-1 abstract and detached; 2-3 emotionally present but surface-level; 4-5 visceral and deeply human.

DIMENSION WEIGHTS:
- dramaticClarity: weight 20
- thematicUniversality: weight 15
- generativePotential: weight 25
- conflictTension: weight 25
- emotionalDepth: weight 15

SCORING RULES:
- Score every candidate kernel.
- Do not rank, filter, or select kernels.
- Do not compute weighted totals.

EVIDENCE REQUIREMENT:
- For each scoring dimension provide 1-3 concrete bullets tied to specific kernel fields.
```

### 2) User Message

```text
Score these story kernel candidates against user intent and rubric.

USER SEEDS:
{{#if thematicInterests}}
THEMATIC INTERESTS:
{{thematicInterests}}
{{/if}}

{{#if emotionalCore}}
EMOTIONAL CORE:
{{emotionalCore}}
{{/if}}

{{#if sparkLine}}
SPARK LINE:
{{sparkLine}}
{{/if}}

{{#if no seeds provided}}
No optional user seeds provided.
{{/if}}

KERNEL CANDIDATES:
{{kernelList — each kernel JSON-serialized with index}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scoredKernels": [ ... ] }.
- Include one scoredKernel item for every input kernel.
- Preserve kernel content exactly.
- For each item include: kernel, scores, scoreEvidence.
```

### JSON Response Shape (Pass 1)

```json
{
  "scoredKernels": [
    {
      "kernel": {
        "dramaticThesis": "{{causal dramatic claim}}",
        "valueAtStake": "{{fundamental human value}}",
        "opposingForce": "{{abstract opposing force}}",
        "directionOfChange": "{{POSITIVE|NEGATIVE|IRONIC|AMBIGUOUS}}",
        "thematicQuestion": "{{question form thesis}}"
      },
      "scores": {
        "dramaticClarity": 0,
        "thematicUniversality": 0,
        "generativePotential": 0,
        "conflictTension": 0,
        "emotionalDepth": 0
      },
      "scoreEvidence": {
        "dramaticClarity": ["{{evidence bullet}}"],
        "thematicUniversality": ["{{evidence bullet}}"],
        "generativePotential": ["{{evidence bullet}}"],
        "conflictTension": ["{{evidence bullet}}"],
        "emotionalDepth": ["{{evidence bullet}}"]
      }
    }
  ]
}
```

Runtime behavior:

- Parser recomputes `overallScore` with `computeKernelOverallScore(scores)`.
- Parser computes `passes` with `passesKernelThresholds(scores)`.
- Score fields are clamped to `0..5` at parse time; clamping emits a warning log.
- Parser enforces exact kernel coverage (no omissions/duplicates vs ideator set).

## Pass 2: Deep-Eval Prompt

### 1) System Message

```text
You are a strict evaluator for story kernels. You score and analyze kernels; you do not rewrite, merge, or improve them.

SCORING RUBRIC (0-5):
- dramaticClarity: 0-1 vague truism; 2-3 identifiable but soft thesis; 4-5 crisp and falsifiable causal claim.
- thematicUniversality: 0-1 niche concern; 2-3 broad but partial resonance; 4-5 fundamental cross-cultural human resonance.
- generativePotential: 0-1 locked to one story/genre; 2-3 supports a few variations; 4-5 can seed many distinct concepts across genres.
- conflictTension: 0-1 weak opposition; 2-3 real but obvious resolution path; 4-5 irreconcilable value pressure with credible claims on both sides.
- emotionalDepth: 0-1 abstract and detached; 2-3 emotionally present but surface-level; 4-5 visceral and deeply human.

DIMENSION WEIGHTS:
- dramaticClarity: weight 20
- thematicUniversality: weight 15
- generativePotential: weight 25
- conflictTension: weight 25
- emotionalDepth: weight 15

DEEP EVALUATION RULES:
- Evaluate all provided kernels.
- Do not rescore and do not alter kernels.
- For each kernel, explain strengths, weaknesses, and tradeoffs.
```

### 2) User Message

```text
Deep-evaluate this full kernel set selected in code.

USER SEEDS:
{{#if thematicInterests}}
THEMATIC INTERESTS:
{{thematicInterests}}
{{/if}}

{{#if emotionalCore}}
EMOTIONAL CORE:
{{emotionalCore}}
{{/if}}

{{#if sparkLine}}
SPARK LINE:
{{sparkLine}}
{{/if}}

{{#if no seeds provided}}
No optional user seeds provided.
{{/if}}

KERNELS WITH LOCKED SCORES:
{{scoredKernelList — each scored kernel JSON-serialized with index, including kernel, scores, and overallScore}}

OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedKernels": [ ... ] }.
- Include one evaluatedKernel item for every scored kernel.
- Preserve kernel content exactly.
- For each item include: kernel, strengths, weaknesses, tradeoffSummary.
- strengths and weaknesses must each contain 2-3 non-empty items.
```

### JSON Response Shape (Pass 2)

```json
{
  "evaluatedKernels": [
    {
      "kernel": {
        "dramaticThesis": "{{causal dramatic claim}}",
        "valueAtStake": "{{fundamental human value}}",
        "opposingForce": "{{abstract opposing force}}",
        "directionOfChange": "{{POSITIVE|NEGATIVE|IRONIC|AMBIGUOUS}}",
        "thematicQuestion": "{{question form thesis}}"
      },
      "strengths": ["{{strength}}"],
      "weaknesses": ["{{weakness}}"],
      "tradeoffSummary": "{{tradeoff summary}}"
    }
  ]
}
```

Runtime behavior:

- Deep-eval parser enforces exact kernel coverage against scored set.
- `passes` field is propagated from scored data during merge.
- Final returned kernels are sorted descending by code-computed `overallScore`.

## Context Provided

| Context Field | Description |
|---|---|
| `userSeeds.thematicInterests` | Optional theme interests |
| `userSeeds.emotionalCore` | Optional emotional core text |
| `userSeeds.sparkLine` | Optional seed hook sentence |
| `kernels` (Pass 1) | Array of `StoryKernel` from ideator output |
| `scoredKernels` (Pass 2) | Array of `ScoredKernel` with locked scores and `overallScore` |

## Notes

- Both passes share the same `ROLE_INTRO` and `RUBRIC` constants.
- Dimension weights are injected from `KERNEL_SCORING_WEIGHTS` in `src/models/story-kernel.ts`. Pass thresholds are NOT sent to the LLM; they are applied code-side only.
- Prompt logging uses `promptType: 'kernelEvaluator'` via `runLlmStage(...)`.
- Model routing uses stage key `kernelEvaluator` in `getStageModel(...)`.
