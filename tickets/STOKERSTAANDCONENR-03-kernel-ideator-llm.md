# STOKERSTAANDCONENR-03: Kernel Ideator LLM Pipeline

**Status**: PENDING
**Priority**: HIGH
**Depends On**: STOKERSTAANDCONENR-01
**Spec Phase**: 3a

## Summary

Create the kernel ideator: prompt builder, JSON schema, and generation function. This LLM stage generates 6-8 story kernels from thematic seed inputs.

## File List

### New Files
- `src/llm/prompts/kernel-ideator-prompt.ts` -- Prompt builder function
- `src/llm/schemas/kernel-ideator-schema.ts` -- JSON Schema for structured output
- `src/llm/kernel-ideator.ts` -- Generation function (calls LLM client)

### Test Files
- `test/unit/llm/kernel-ideator.test.ts` -- Prompt construction, response parsing, schema validation

## Detailed Requirements

### `src/llm/schemas/kernel-ideator-schema.ts`

JSON Schema defining the expected LLM response structure:

```
{
  type: 'object',
  properties: {
    kernels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dramaticThesis: { type: 'string' },
          valueAtStake: { type: 'string' },
          opposingForce: { type: 'string' },
          directionOfChange: { type: 'string', enum: ['POSITIVE', 'NEGATIVE', 'IRONIC', 'AMBIGUOUS'] },
          thematicQuestion: { type: 'string' }
        },
        required: ['dramaticThesis', 'valueAtStake', 'opposingForce', 'directionOfChange', 'thematicQuestion']
      },
      minItems: 6,
      maxItems: 8
    }
  },
  required: ['kernels']
}
```

Export as `kernelIdeatorSchema` and a response type `KernelIdeatorResponse`.

### `src/llm/prompts/kernel-ideator-prompt.ts`

`buildKernelIdeatorPrompt(context: KernelIdeatorContext): { system: string; user: string }`

Where `KernelIdeatorContext` has optional fields: `thematicInterests`, `emotionalCore`, `sparkLine`.

**System message** must include:
- Role: dramatic theorist distilling irreducible dramatic propositions
- Quality anchors for each field (spec section 3a)
- Diversity constraints (no shared valueAtStake, opposingForce; 3+ distinct directionOfChange values)
- Taxonomy guidance for directionOfChange values
- Explicit prohibition of genre, setting, characters, plot, game mechanics

**User message**: Assembled from provided seed fields. If no seeds provided, instruct to generate from universal human themes.

### `src/llm/kernel-ideator.ts`

`generateKernels(input: KernelSeedInput): Promise<KernelIdeationResult>`

Where `KernelIdeationResult = { kernels: readonly StoryKernel[]; rawResponse: string }`

Mirror `src/llm/concept-ideator.ts` pattern:
1. Build prompt via `buildKernelIdeatorPrompt`
2. Call LLM client with structured output (JSON schema)
3. Parse response, validate each kernel with `isStoryKernel`
4. Return validated kernels + raw response

## Out of Scope

- Kernel evaluator (STOKERSTAANDCONENR-04)
- Kernel stage runner (STOKERSTAANDCONENR-04)
- Routes, services, UI (STOKERSTAANDCONENR-05 through -08)
- Concept changes (STOKERSTAANDCONENR-09, -10)
- Content policy injection (reuse existing `content-policy.ts` as-is)

## Acceptance Criteria

### Tests That Must Pass
- `buildKernelIdeatorPrompt` with all seeds produces system+user messages containing seed content
- `buildKernelIdeatorPrompt` with no seeds produces valid system+user messages
- System message contains "dramatic theorist" role description
- System message prohibits genre/setting/characters/plot
- System message includes diversity constraints
- System message includes directionOfChange taxonomy
- Schema defines array of 6-8 kernel objects with all required fields
- `generateKernels` calls LLM client with correct model, schema, and messages
- `generateKernels` validates each returned kernel via `isStoryKernel`
- `generateKernels` rejects responses with fewer than 6 kernels

### Invariants
- Prompt NEVER mentions genre, setting, characters, or plot
- Schema enforces minItems: 6, maxItems: 8
- All 5 StoryKernel fields are required in schema
- `directionOfChange` is constrained to enum in schema
- Function signature matches concept-ideator pattern
- Uses existing LLM client (`src/llm/client.ts`) without modification
