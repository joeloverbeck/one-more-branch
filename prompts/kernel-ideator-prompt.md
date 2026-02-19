# Kernel Ideator Prompt (Production Template)

- Source: `src/llm/prompts/kernel-ideator-prompt.ts`
- Orchestration: `src/llm/kernel-ideator.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/kernel-ideator-schema.ts`
- Kernel model + enums: `src/models/story-kernel.ts`

## Pipeline Position

The kernel ideator generates 6-8 abstract dramatic kernels from thematic seeds.

**Pipeline position**: **Kernel Ideator** -> Kernel Evaluator (implemented in STOKERSTAANDCONENR-04)

## Message Intent

### System Message

The system prompt defines:
- Role: dramatic theorist focused on irreducible dramatic propositions.
- Quality anchors for `dramaticThesis`, `valueAtStake`, `opposingForce`, and `thematicQuestion`.
- Diversity constraints across kernel set (`valueAtStake`, `opposingForce`, `directionOfChange`).
- `directionOfChange` taxonomy (`POSITIVE`, `NEGATIVE`, `IRONIC`, `AMBIGUOUS`).
- Strict prohibitions against genre, setting, characters, plot beats, and game mechanics.
- `CONTENT_POLICY` injection from `src/llm/content-policy.ts`.

### User Message

The user prompt:
- Requests 6-8 kernels.
- Includes optional seed blocks when present:
  - `THEMATIC INTERESTS`
  - `EMOTIONAL CORE`
  - `SPARK LINE`
- Falls back to universal human themes when no seeds are provided.
- Enforces JSON output shape: `{ "kernels": [StoryKernel, ...] }`.

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

Schema constraints in `src/llm/schemas/kernel-ideator-schema.ts`:
- `kernels` length: 6-8
- Strict object schemas (`additionalProperties: false`)
- All kernel fields required
- `directionOfChange` enum-constrained

## Runtime Validation

`parseKernelIdeationResponse(...)` in `src/llm/kernel-ideator.ts` enforces:
- object payload with `kernels` array
- 6-8 kernel count
- each entry passes `isStoryKernel(...)`
- malformed payloads throw retryable `LLMError` with `STRUCTURE_PARSE_ERROR`

## Integration Points

- Stage model routing key: `kernelIdeator` in `src/config/stage-model.ts`
- Optional model override key: `llm.models.kernelIdeator` in `src/config/schemas.ts`
- Prompt logging type: `kernelIdeator` in `src/logging/prompt-formatter.ts`
- Default configured model: `configs/default.json`
