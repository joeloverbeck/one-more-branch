# Kernel Ideator Prompt (Production Template)

- Source: `src/llm/prompts/kernel-ideator-prompt.ts`
- Orchestration: `src/llm/kernel-ideator.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/kernel-ideator-schema.ts`
- Kernel model + enums: `src/models/story-kernel.ts`

## Pipeline Position

The kernel ideator generates 6-8 abstract dramatic kernels from thematic seeds.

**Pipeline position**: **Kernel Ideator** -> Kernel Evaluator (implemented in STOKERSTAANDCONENR-04)

## Messages Sent To Model

### 1) System Message

```text
You are a dramatic theorist who distills stories to their irreducible dramatic proposition. You generate story kernels, not concepts or plot outlines.

CONTENT GUIDELINES:
{{CONTENT_POLICY}}

QUALITY ANCHORS:
- dramaticThesis must be a causal dramatic claim, not a topic label.
- valueAtStake must name a fundamental human value, not a task or objective.
- opposingForce must be an abstract force that can operate across settings.
- thematicQuestion must be a meaningful question that can be answered in multiple ways.
- Keep kernels abstract and transferable across genres.

DIVERSITY CONSTRAINTS:
- Return 6-8 kernels.
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
Generate 6-8 story kernels as abstract dramatic propositions.

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
No seeds were provided. Derive kernels from universal human themes and conflicts.
{{/if}}

OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "kernels": [StoryKernel, ...] }.
- Each kernel must contain dramaticThesis, valueAtStake, opposingForce, directionOfChange, thematicQuestion.
- Keep every field concise and semantically distinct across the set.
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

## Context Provided

| Context Field | Description |
|---|---|
| `thematicInterests` | Optional theme interests |
| `emotionalCore` | Optional emotional core text |
| `sparkLine` | Optional seed hook sentence |

## Integration Points

- Stage model routing key: `kernelIdeator` in `src/config/stage-model.ts`
- Optional model override key: `llm.models.kernelIdeator` in `src/config/schemas.ts`
- Prompt logging type: `kernelIdeator` in `src/logging/prompt-formatter.ts`
- Default configured model: `configs/default.json`
