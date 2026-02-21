# Kernel Evolver Prompt (Production Template)

- Source: `src/llm/prompts/kernel-evolver-prompt.ts`
- Orchestration: `src/llm/kernel-evolver.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/kernel-evolver-schema.ts`
- Kernel model + enums: `src/models/story-kernel.ts`

## Pipeline Position

The kernel evolver mutates and recombines 2+ evaluated parent kernels into 6 offspring kernels using named mutation strategies.

**Pipeline position**: Kernel Ideator -> Kernel Evaluator -> **Kernel Evolver**

Generation stage emitted by the kernel evolution flow: `EVOLVING_KERNELS`.

## Messages Sent To Model

### 1) System Message

```text
You are a kernel evolution architect for branching interactive fiction. You recombine proven dramatic propositions, mutate weak points, and generate novel but structurally sound story kernels.

CONTENT GUIDELINES:
{{CONTENT_POLICY}}

MUTATION STRATEGIES:
- thesis-inversion: Flip the dramatic thesis so the original claim becomes its opposite or its dark mirror.
- force-escalation: Preserve the core value-at-stake but amplify the opposing force to a higher order of magnitude.
- value-transplant: Move a working value/force dynamic into an entirely different human conflict domain.
- direction-pivot: Keep thesis and stakes but shift directionOfChange (e.g. POSITIVE parent becomes IRONIC offspring).
- synthesis: Merge the dramatic cores of two parents into a single kernel that honors both tensions.
- radicalize: Push one parent's defining differentiator to its logical extreme.

QUALITY ANCHORS:
- dramaticThesis must be a causal dramatic claim, not a topic label.
- valueAtStake must name a fundamental human value, not a task or objective.
- opposingForce must be an abstract force that can operate across settings.
- thematicQuestion must be a meaningful question that can be answered in multiple ways.
- Keep kernels abstract and transferable across genres.

DIVERSITY CONSTRAINTS:
- Return exactly 6 kernels.
- No two kernels may share the same valueAtStake.
- No two kernels may share the same opposingForce.
- Use at least 3 distinct directionOfChange values.
- Ensure kernels represent materially different human conflict domains.

DIRECTION OF CHANGE TAXONOMY:
- POSITIVE: The value ultimately prevails.
- NEGATIVE: The value is lost, compromised, or corrupted.
- IRONIC: The value is gained at a transformative cost, or victory feels hollow.
- AMBIGUOUS: Multiple dramatic outcomes remain equally valid.

VALID directionOfChange values:
- POSITIVE
- NEGATIVE
- IRONIC
- AMBIGUOUS

PROHIBITIONS:
- Do not include genre framing.
- Do not include setting/world details.
- Do not include named characters or character bios.
- Do not include plot beats or scene sequencing.
- Do not include game mechanics or system design instructions.
```

### 2) User Message

```text
Evolve the provided parent kernels into exactly 6 offspring kernels.

PARENT KERNELS INPUT:
[
  {
    "parentId": "parent_1",
    "overallScore": {{number}},
    "passes": {{boolean}},
    "scores": {{KernelDimensionScores}},
    "strengths": ["{{string}}"],
    "weaknesses": ["{{string}}"],
    "tradeoffSummary": "{{string}}",
    "kernel": {{StoryKernel}}
  }
]

OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "kernels": [StoryKernel, ...] }.
- kernels array must contain exactly 6 items.
- Every kernel must be complete and schema-valid.
- Do not copy any parent unchanged.
- Preserve useful parent strengths while directly addressing parent weaknesses.
- Each offspring should employ a different mutation strategy.
```

## JSON Response Shape

```json
{
  "kernels": [
    {
      "dramaticThesis": "{{causal dramatic claim}}",
      "valueAtStake": "{{fundamental human value}}",
      "opposingForce": "{{abstract opposing force}}",
      "directionOfChange": "{{POSITIVE|NEGATIVE|IRONIC|AMBIGUOUS}}",
      "thematicQuestion": "{{question form thesis}}"
    }
  ]
}
```

Schema constraints in `src/llm/schemas/kernel-evolver-schema.ts`:
- `kernels` array with no fixed length constraint at schema level (runtime-enforced to exactly 6)
- Reuses `KERNEL_SCHEMA` from `src/llm/schemas/kernel-ideator-schema.ts`
- Strict object schemas (`additionalProperties: false`)
- All kernel fields required
- `directionOfChange` enum-constrained

## Runtime Validation

`parseKernelEvolutionResponse(...)` in `src/llm/kernel-evolver.ts` enforces:
- Object payload with `kernels` array
- Exactly 6 kernel count
- Each entry passes `isStoryKernel(...)`
- No two kernels share the same `valueAtStake` (case-insensitive)
- No two kernels share the same `opposingForce` (case-insensitive)
- At least 3 distinct `directionOfChange` values across the set
- Malformed payloads throw retryable `LLMError` with `STRUCTURE_PARSE_ERROR`

## Context Provided

| Context Field | Description |
|---|---|
| `parentKernels` | Required array of `EvaluatedKernel` parents (with scores, strengths, weaknesses, tradeoffSummary) |

## Notes

- The parent payload serializer (`buildParentPayload`) includes `overallScore`, `passes`, `scores`, `strengths`, `weaknesses`, `tradeoffSummary`, and `kernel` for each parent, giving the LLM full evaluation context to address weaknesses.
- Prompt logging uses `promptType: 'kernelEvolver'` via `runLlmStage(...)`.
- Model routing uses stage key `kernelEvolver` in `getStageModel(...)`.
