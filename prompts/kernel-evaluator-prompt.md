# Kernel Evaluator Prompt (Production Template)

- Source: `src/llm/prompts/kernel-evaluator-prompt.ts`
- Orchestration: `src/llm/kernel-evaluator.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/kernel-evaluator-schema.ts`
- Scoring weights/thresholds + score computation: `src/models/story-kernel.ts`

## Pipeline Position

The kernel evaluator is the second stage in the `/kernels` flow and runs in two passes:

1. Scoring pass: score all ideated kernels with per-dimension evidence.
2. Deep-eval pass: evaluate all scored kernels with strengths/weaknesses/tradeoffs.

**Pipeline position**: Kernel Ideator -> **Kernel Evaluator (Scoring -> Deep Eval)**

Generation stage emitted by `kernelService`: `EVALUATING_KERNELS`.

## Pass 1: Scoring Prompt

### System highlights

- Score every candidate kernel.
- Do not rank, filter, or select kernels.
- Do not compute weighted totals.
- Provide 1-3 evidence bullets per scoring dimension.

### User highlights

- Includes thematic seed context.
- Includes all kernel candidates from ideator output.
- Requires JSON: `{ "scoredKernels": [ ... ] }`.
- Each item must include: `kernel`, `scores`, `scoreEvidence`.

### Rubric specifics (implemented)

- `dramaticClarity`: 0-1 vague truism, 2-3 identifiable but soft thesis, 4-5 crisp falsifiable causal claim.
- `thematicUniversality`: 0-1 niche concern, 2-3 broad but partial resonance, 4-5 fundamental cross-cultural resonance.
- `generativePotential`: 0-1 locked to one story/genre, 2-3 supports a few variations, 4-5 seeds many distinct concepts across genres.
- `conflictTension`: 0-1 weak opposition, 2-3 real but obvious resolution path, 4-5 irreconcilable value pressure with credible claims on both sides.
- `emotionalDepth`: 0-1 abstract/detached, 2-3 emotionally present but surface-level, 4-5 visceral and deeply human.

### Response shape

```json
{
  "scoredKernels": [
    {
      "kernel": { "{{StoryKernel fields}}": "..." },
      "scores": {
        "dramaticClarity": 0,
        "thematicUniversality": 0,
        "generativePotential": 0,
        "conflictTension": 0,
        "emotionalDepth": 0
      },
      "scoreEvidence": {
        "dramaticClarity": ["..."],
        "thematicUniversality": ["..."],
        "generativePotential": ["..."],
        "conflictTension": ["..."],
        "emotionalDepth": ["..."]
      }
    }
  ]
}
```

Runtime behavior:

- Parser recomputes `overallScore` with `computeKernelOverallScore(scores)`.
- Score fields are clamped to `0..5` at parse time; clamping emits a warning log.
- Parser enforces exact kernel coverage (no omissions/duplicates vs ideator set).

## Pass 2: Deep-Eval Prompt

### System highlights

- Evaluate all provided kernels.
- Do not rescore and do not alter kernels.
- Return strengths, weaknesses, and tradeoff summary.

### User highlights

- Includes thematic seed context.
- Includes full scored kernel set with locked `scores` and `overallScore`.
- Requires JSON: `{ "evaluatedKernels": [ ... ] }`.
- Each item must include: `kernel`, `strengths`, `weaknesses`, `tradeoffSummary`.
- `strengths` and `weaknesses` must each contain 2-3 non-empty items.

### Response shape

```json
{
  "evaluatedKernels": [
    {
      "kernel": { "{{StoryKernel fields}}": "..." },
      "strengths": ["..."],
      "weaknesses": ["..."],
      "tradeoffSummary": "..."
    }
  ]
}
```

Runtime behavior:

- Deep-eval parser enforces exact kernel coverage against scored set.
- Final returned kernels are sorted descending by code-computed `overallScore`.
