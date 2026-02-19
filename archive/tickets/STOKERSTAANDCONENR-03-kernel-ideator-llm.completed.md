# STOKERSTAANDCONENR-03: Kernel Ideator LLM Pipeline

**Status**: COMPLETED
**Priority**: HIGH
**Depends On**: STOKERSTAANDCONENR-01
**Spec Phase**: 3a

## Summary

Implement the kernel ideator LLM stage: prompt builder, JSON schema, parser/generation function, and required plumbing so the stage is selectable/configurable and testable in the existing LLM architecture.

## Reassessed Assumptions (Code Reality)

- `src/models/story-kernel.ts` already exists with `StoryKernel`, `KernelSeedInput`, `isStoryKernel`, scoring constants, and helpers.
- `src/models/saved-kernel.ts` and `src/persistence/kernel-repository.ts` already exist and are covered by unit tests.
- There is no kernel ideator implementation yet (`src/llm/kernel-ideator.ts`, prompt, schema, tests are missing).
- The current LLM stack requires stage + prompt integration points for each new stage:
  - `src/config/stage-model.ts` (`LlmStage` union)
  - `src/config/schemas.ts` (`llm.models` optional keys)
  - `src/logging/prompt-formatter.ts` (`PromptType` union)
- Existing `runConceptStage` is already a shared structured-output runner despite the name; this ticket should reuse it (no duplicate kernel-specific runner).

## Scope

### New Files
- `src/llm/prompts/kernel-ideator-prompt.ts` -- Prompt builder function
- `src/llm/schemas/kernel-ideator-schema.ts` -- JSON Schema for structured output
- `src/llm/kernel-ideator.ts` -- Kernel ideation generation + parsing
- `test/unit/llm/kernel-ideator.test.ts` -- Prompt, parser, and generation contract tests

### Modified Files
- `src/config/stage-model.ts` -- Add `kernelIdeator` to `LlmStage`
- `src/config/schemas.ts` -- Add optional `llm.models.kernelIdeator`
- `src/logging/prompt-formatter.ts` -- Add `kernelIdeator` prompt type
- `src/models/story-kernel.ts` -- Add ideation context/result contracts if needed (`KernelIdeatorContext`, `KernelIdeationResult`)
- `src/models/index.ts` -- Re-export new kernel ideation model types
- `test/unit/config/stage-model.test.ts` -- Include `kernelIdeator` in stage coverage assertions
- `test/unit/config/schemas.test.ts` -- Validate `kernelIdeator` config parsing
- `test/unit/logging/prompt-formatter.test.ts` -- Include `kernelIdeator` prompt type support

## Detailed Requirements

### `src/llm/schemas/kernel-ideator-schema.ts`

Define strict JSON schema for:
- Top-level `{ kernels: StoryKernel[] }`
- `kernels` minItems `6`, maxItems `8`
- Required fields on each kernel:
  - `dramaticThesis`
  - `valueAtStake`
  - `opposingForce`
  - `directionOfChange` enum: `POSITIVE | NEGATIVE | IRONIC | AMBIGUOUS`
  - `thematicQuestion`
- `additionalProperties: false` at object levels

Export `KERNEL_IDEATION_SCHEMA` as `JsonSchema` (same style as concept ideator schema).

### `src/llm/prompts/kernel-ideator-prompt.ts`

Implement `buildKernelIdeatorPrompt(context: KernelIdeatorContext): ChatMessage[]`.

Requirements:
- System message includes:
  - Dramatic theorist role
  - Quality anchors for each kernel field
  - Diversity constraints (distinct `valueAtStake`, `opposingForce`, and 3+ `directionOfChange` values)
  - Direction taxonomy guidance
  - Explicit prohibition of genre, setting, characters, plot, and game mechanics
  - Existing `CONTENT_POLICY`
- User message:
  - Includes provided seed fields (`thematicInterests`, `emotionalCore`, `sparkLine`) when non-empty
  - If all seeds are empty/missing, explicitly instruct generation from universal human themes
  - Includes output shape reminder (`{ "kernels": [...] }`)

### `src/llm/kernel-ideator.ts`

Implement:
- `parseKernelIdeationResponse(parsed: unknown): readonly StoryKernel[]`
- `generateKernels(context: KernelIdeatorContext, apiKey: string, options?: Partial<GenerationOptions>): Promise<KernelIdeationResult>`

Behavior:
1. Build prompt via `buildKernelIdeatorPrompt`
2. Call `runConceptStage` with:
  - `stageModel: 'kernelIdeator'`
  - `promptType: 'kernelIdeator'`
  - `schema: KERNEL_IDEATION_SCHEMA`
3. Validate payload shape and kernel count (6-8)
4. Validate each kernel via `isStoryKernel`
5. Return `{ kernels, rawResponse }`
6. Throw `LLMError` with `STRUCTURE_PARSE_ERROR` for malformed payloads (matching existing patterns)

## Out of Scope

- Kernel evaluator/stage runner (STOKERSTAANDCONENR-04)
- Kernel service/routes/UI/client integration (STOKERSTAANDCONENR-05 through -08)
- Concept enrichment and kernel-to-concept integration (STOKERSTAANDCONENR-09 through -11)
- Persistence changes (already implemented)

## Acceptance Criteria

### Tests That Must Pass
- `buildKernelIdeatorPrompt` includes provided seed fields
- `buildKernelIdeatorPrompt` omits empty seed labels
- No-seed prompt includes universal-human-themes fallback instruction
- System message includes dramatic theorist role, diversity constraints, taxonomy guidance, and prohibitions
- System message includes `CONTENT_POLICY`
- `parseKernelIdeationResponse` accepts valid 6-8 kernel payload
- `parseKernelIdeationResponse` rejects missing `kernels`, non-array payloads, invalid kernel shape, and counts outside 6-8
- `generateKernels` sends `KERNEL_IDEATION_SCHEMA` as `response_format`
- `generateKernels` uses prompt logging type `kernelIdeator`
- Config and stage plumbing recognize `kernelIdeator` stage/model key

### Invariants
- Prompt must not ask for genre/setting/character/plot/game-mechanics content
- Kernel count enforced at parser layer: min 6, max 8
- `directionOfChange` constrained by schema + runtime guard
- Existing concept ideator/evaluator behavior remains unchanged

## Outcome

- **Completion date**: February 19, 2026
- **What changed**:
  - Implemented kernel ideator prompt, schema, parser, and generation function.
  - Added model contracts for kernel ideator context/result and barrel re-exports.
  - Added required LLM plumbing (`kernelIdeator` in stage model/config schema/prompt logging type).
  - Added `kernelIdeator` default model routing in `configs/default.json`.
  - Added new unit test suite for kernel ideator and extended config/logging stage coverage tests.
  - Added prompt documentation at `prompts/kernel-ideator-prompt.md` to keep prompt pipeline docs aligned.
- **Deviations from original plan**:
  - Original ticket did not include config/logging/stage plumbing and docs updates; these were required by the current architecture and repository prompt-pipeline documentation rules.
- **Verification results**:
  - `npm run test:unit -- test/unit/llm/kernel-ideator.test.ts test/unit/config/stage-model.test.ts test/unit/config/schemas.test.ts test/unit/logging/prompt-formatter.test.ts` (passed; executed full unit suite via testPathPattern)
  - `npm run lint` (passed)
  - `npm run typecheck` (passed)
