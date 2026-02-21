# EVOLVE-01: Create Concept Evolver LLM Stage

**Status**: COMPLETED

**Priority**: HIGH (blocks all other tickets)
**Depends on**: None
**Blocks**: EVOLVE-02, EVOLVE-03, EVOLVE-04, EVOLVE-05, EVOLVE-06

## Summary

Create the new concept evolver LLM stage that takes 2-3 parent `EvaluatedConcept` objects + a `StoryKernel` and produces 6 `ConceptSpec` offspring through controlled recombination and mutation.

## Reassessed Assumptions (2026-02-21)

1. Existing LLM stages consistently use `runLlmStage(...)` + `PromptType` + `LlmStage` routing + JSON schema and a parser.
2. Adding a new stage requires updates in more places than originally listed:
   - `src/config/stage-model.ts` (`LlmStage` union)
   - `src/config/schemas.ts` (`llm.models` schema keys)
   - `src/logging/prompt-formatter.ts` (`PromptType` union)
   - test coverage for config + prompt docs alignment maps
3. Prompt docs are contract-tested (`test/unit/llm/prompt-doc-alignment.test.ts`), so adding a prompt source/doc pair requires extending that contract.
4. Existing ideation/evaluation architecture relies on prompt constraints for diversity; parser-level validation currently checks structure/enums/field bounds only.
5. Reusing shared concept taxonomy/quality guidance between ideator and evolver is architecturally preferable to duplicating prompt blocks.

## Scope Correction

This ticket includes all work required for a production-usable evolver stage in current architecture:

- New evolver orchestrator, schema, prompt builder, prompt doc, and types.
- Stage/config/logging union/schema updates needed for compile-time safety and runtime model routing.
- Unit tests for parser and prompt builder.
- Contract-test updates for prompt-doc alignment.
- Config/stage-model test updates for the new stage key.
- Optional hardening: parser-level uniqueness validation for duplicate `genreFrame+conflictAxis` pairs (to move a key diversity invariant from prompt-only to code-enforced).

## Files to Create

1. **`src/llm/concept-evolver.ts`** -- LLM orchestrator
   - `parseConceptEvolutionResponse(parsed: unknown): readonly ConceptSpec[]`
     - Validates response shape: `{ "concepts": ConceptSpec[] }`
     - Enforces exactly 6 concepts (not 6-8 like ideator)
     - Reuses `parseConceptSpec(...)` from `concept-spec-parser.ts` for each concept
     - Rejects duplicate `genreFrame+conflictAxis` combinations across offspring
   - `evolveConceptIdeas(parentConcepts, kernel, apiKey, options?): Promise<ConceptEvolutionResult>`
     - Calls `runLlmStage(...)` with evolver schema/prompt
     - Returns `{ concepts: ConceptSpec[], rawResponse: string }`

2. **`src/llm/prompts/concept-evolver-prompt.ts`** -- Prompt builder
   - `buildConceptEvolverPrompt(context: ConceptEvolverContext): ChatMessage[]`
   - System message includes:
     - Role: concept evolution architect
     - Mutation strategies (recombine, invert, escalate, transplant, hybridize, radicalize)
     - Diversity constraints (exactly 6 + no duplicate genreFrame+conflictAxis + minimum frame/axis spread)
     - Taxonomy guidance (shared with ideator from common helper/constants)
     - Quality anchors (shared with ideator from common helper/constants)
     - Kernel constraints
     - Content policy
   - User message includes:
     - Kernel fields
     - 2-3 parent concepts with scores, strengths, weaknesses, tradeoffSummary
     - Output requirements

3. **`src/llm/schemas/concept-evolver-schema.ts`** -- JSON Schema
   - Same structure as `concept-ideator-schema.ts` but with `minItems: 6, maxItems: 6`
   - Export as `CONCEPT_EVOLUTION_SCHEMA`

4. **`prompts/concept-evolver-prompt.md`** -- Prompt documentation
   - Follow exact same format as `concept-ideator-prompt.md`
   - Document pipeline position, messages, JSON response shape, context

## Files to Modify

- `src/models/concept-generator.ts` -- add `ConceptEvolverContext`, `ConceptEvolutionResult`
- `src/models/index.ts` -- export new evolver types
- `src/config/stage-model.ts` -- add `conceptEvolver` to `LlmStage`
- `src/config/schemas.ts` -- add `llm.models.conceptEvolver`
- `src/logging/prompt-formatter.ts` -- add `conceptEvolver` prompt type
- `test/unit/config/stage-model.test.ts` -- include `conceptEvolver` in stage coverage
- `test/unit/config/schemas.test.ts` -- include `conceptEvolver` in per-stage model schema coverage
- `test/unit/llm/prompt-doc-alignment.test.ts` -- map evolver prompt source to doc
- `src/llm/prompts/concept-ideator-prompt.ts` -- import shared concept prompt constants/helpers (DRY)

## Types to Add

In `src/models/concept-generator.ts` or a new types file:

```typescript
interface ConceptEvolverContext {
  readonly parentConcepts: readonly EvaluatedConcept[];
  readonly kernel: StoryKernel;
}

interface ConceptEvolutionResult {
  readonly concepts: readonly ConceptSpec[];
  readonly rawResponse: string;
}
```

## Stage Model Configuration

In `src/config/stage-model.ts`, add `conceptEvolver` entry with appropriate model (same as `conceptIdeator` or user-configurable).

Also add this key to config schema (`src/config/schemas.ts`) and stage-model tests.

## Acceptance Criteria

- [x] Evolver produces exactly 6 valid `ConceptSpec` objects
- [x] Each concept passes `parseConceptSpec(...)` validation
- [x] Duplicate `genreFrame+conflictAxis` offspring pairs are rejected by parser
- [x] Prompt includes parent evaluation data (scores, strengths, weaknesses)
- [x] Prompt includes kernel fields
- [x] Diversity constraints are both instructed in prompt and partially code-enforced (duplicate pair rejection)
- [x] Prompt documentation matches production template
- [x] Unit tests for `parseConceptEvolutionResponse`
- [x] Unit tests for prompt builder
- [x] Config schema/stage-model/logging unions recognize `conceptEvolver`

## Outcome

- **Completion date**: 2026-02-21
- **What changed**:
  - Added evolver stage implementation (`concept-evolver.ts`) with strict 6-item parsing and duplicate `genreFrame+conflictAxis` rejection.
  - Added evolver prompt builder (`concept-evolver-prompt.ts`), schema (`concept-evolver-schema.ts`), and prompt documentation (`prompts/concept-evolver-prompt.md`).
  - Added shared concept prompt taxonomy/quality module (`concept-prompt-shared.ts`) and refactored ideator prompt to reuse it.
  - Added evolver domain types and integrated stage key into model routing, config schema, default config, and prompt logging unions.
  - Added/updated unit and contract tests for evolver parser/prompt/orchestration and stage/config/prompt-doc registration.
- **Deviations from original plan**:
  - Expanded scope to include required stage registration surfaces (`config` + `logging` + prompt-doc alignment tests) that were missing from the initial ticket.
  - Added parser-level duplicate pair enforcement to harden a diversity invariant that was previously prompt-only.
- **Verification results**:
  - `npm run test:unit -- test/unit/llm/concept-evolver.test.ts test/unit/llm/concept-ideator.test.ts test/unit/config/stage-model.test.ts test/unit/config/schemas.test.ts test/unit/llm/prompt-doc-alignment.test.ts` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
