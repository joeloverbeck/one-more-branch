# CONGEN-03: Concept Evaluator (Stage 2) — Schema, Prompt, Generator

**Status**: COMPLETED
**Depends on**: CONGEN-01
**Blocks**: CONGEN-05

## Summary

Implement Stage 2 of the concept generation pipeline: the Concept Evaluator. This scores, ranks, and selects the top 3 concept candidates from the ideator's output.

## Reassessed Assumptions (2026-02-18)

- `ConceptSpec`, evaluator context/result types, enum guards, score weights, and `computeOverallScore()` already exist in `src/models/concept-generator.ts` (re-exported via `src/models/index.ts`). This ticket must reuse them instead of creating parallel concept type definitions.
- Existing Stage 1 tests live under `test/unit/llm/` (`test/unit/llm/concept-ideator.test.ts`), so Stage 2 tests should follow the same location/pattern.
- The current `LlmStage` union in `src/config/stage-model.ts` does not yet include `'conceptEvaluator'`. Without adding it, `getStageModel('conceptEvaluator')` cannot type-check.
- Prompt logging type `PromptType` in `src/logging/prompt-formatter.ts` currently only includes `'conceptIdeator'` for concept stages. Logging evaluator prompts with canonical stage names requires adding `'conceptEvaluator'`.
- Clean architecture constraint for this ticket: no aliases, no fallback stage-name reuse (for example, no logging/model lookup via `'conceptIdeator'` from evaluator code).

## Files to Create

- `src/llm/schemas/concept-evaluator-schema.ts`
- `src/llm/prompts/concept-evaluator-prompt.ts`
- `src/llm/concept-evaluator.ts`
- `test/unit/llm/concept-evaluator.test.ts`

## Files to Touch

- `src/config/stage-model.ts` — add `'conceptEvaluator'` to `LlmStage`
- `test/unit/config/stage-model.test.ts` — include `'conceptEvaluator'` in stage coverage assertions
- `src/logging/prompt-formatter.ts` — add `'conceptEvaluator'` to `PromptType`
- `test/unit/logging/prompt-formatter.test.ts` — include `'conceptEvaluator'` in prompt-type coverage

## Out of Scope

- Ideator (CONGEN-02) and stress-tester (CONGEN-04)
- Route handlers and service orchestration (CONGEN-05)
- UI changes (CONGEN-06, CONGEN-07)
- Additional concept-stage registrations not required by evaluator implementation (for example `'conceptStressTester'`) remain in CONGEN-08
- Modification of the concept candidates — the evaluator ONLY scores and selects, never modifies

## Work Description

### 1. JSON Schema (`concept-evaluator-schema.ts`)

Follow `spine-schema.ts` pattern:
- Export `CONCEPT_EVALUATION_SCHEMA` of type `JsonSchema`
- Top-level requires `evaluatedConcepts` array
- Each item has: full `concept` (ConceptSpec shape), `scores` (6 numeric dimensions), `overallScore` (number), `strengths` (string array), `weaknesses` (string array), `tradeoffSummary` (string)
- Score fields: `{ "type": "number" }` (0-5 range enforced in parsing, not schema)
- All objects: `additionalProperties: false`, `strict: true`

### 2. Prompt Builder (`concept-evaluator-prompt.ts`)

- Export `buildConceptEvaluatorPrompt(context: ConceptEvaluatorContext): ChatMessage[]`
- System prompt role: "strict evaluator for branching interactive narrative concepts"
- Include explicit scoring rubric for each of the 6 dimensions with 0-5 scale descriptions
- Include weights and pass thresholds from spec section 3.4
- Evidence requirement: each score backed by 1-3 bullet points
- Selection criteria: top 3 by weighted score; if <3 pass thresholds, return what passes with warnings
- Tradeoff framing directive
- User prompt: numbered JSON objects of all concept candidates + original user seeds

### 3. Generator (`concept-evaluator.ts`)

- Export `evaluateConcepts(context: ConceptEvaluatorContext, apiKey: string, options?: Partial<GenerationOptions>): Promise<ConceptEvaluationResult>`
- Same LLM call pattern as spine-generator.ts
- Use `getStageModel('conceptEvaluator')` with default model fallback
- Parse response via `parseConceptEvaluationResponse()`
- Log prompts via `logPrompt(logger, 'conceptEvaluator', messages)`

### 4. Response Parser

Within `concept-evaluator.ts`, implement `parseConceptEvaluationResponse(parsed: unknown): readonly EvaluatedConcept[]`:
- Validate `evaluatedConcepts` array (1-3 items)
- Validate each concept's ConceptSpec fields (reuse enum type guards)
- Validate each score is a number 0-5 (clamp if out of range, log warning)
- Validate `overallScore` is a number 0-100
- Recompute `overallScore` from individual scores using `computeOverallScore()` from CONGEN-01 — use the recomputed value (don't trust LLM arithmetic)
- Sort by `overallScore` descending
- Validate `strengths` and `weaknesses` are non-empty string arrays

## Acceptance Criteria

### Tests That Must Pass

`test/unit/llm/concept-evaluator.test.ts`:

1. **`parseConceptEvaluationResponse` with valid data**: Returns sorted EvaluatedConcept array
2. **`parseConceptEvaluationResponse` recomputes overallScore**: Ignores LLM-provided overallScore and recalculates from weights
3. **`parseConceptEvaluationResponse` sorts by score descending**: Highest-scored concept is first
4. **`parseConceptEvaluationResponse` clamps out-of-range scores**: Score of 7 → 5, score of -1 → 0
5. **`parseConceptEvaluationResponse` rejects missing evaluatedConcepts**: Throws LLMError
6. **`parseConceptEvaluationResponse` rejects empty strengths/weaknesses**: Throws LLMError
7. **`buildConceptEvaluatorPrompt` includes scoring rubric**: System prompt contains all 6 dimension names and weight values
8. **`buildConceptEvaluatorPrompt` includes user seeds**: User prompt contains the original seed input for relevance assessment
9. **`evaluateConcepts` with mocked fetch**: Returns parsed ConceptEvaluationResult

`test/unit/config/stage-model.test.ts`:

10. **LlmStage coverage includes evaluator stage**: stage list includes `'conceptEvaluator'`

`test/unit/logging/prompt-formatter.test.ts`:

11. **PromptType coverage includes evaluator prompt type**: prompt type list includes `'conceptEvaluator'`

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests break
- Evaluator NEVER modifies concept content — only scores and selects
- `overallScore` is always engine-computed, not LLM-provided

## Outcome

- **Completion date**: 2026-02-18
- **What changed**:
  - Implemented Stage 2 evaluator schema, prompt builder, generator, and parser:
    - `src/llm/schemas/concept-evaluator-schema.ts`
    - `src/llm/prompts/concept-evaluator-prompt.ts`
    - `src/llm/concept-evaluator.ts`
  - Added Stage 2 unit coverage:
    - `test/unit/llm/concept-evaluator.test.ts`
  - Added required canonical stage/prompt typing to support evaluator wiring:
    - `src/config/stage-model.ts`
    - `src/logging/prompt-formatter.ts`
    - `test/unit/config/stage-model.test.ts`
    - `test/unit/logging/prompt-formatter.test.ts`
  - Refactored for DRY parsing reuse:
    - Added shared `ConceptSpec` parser: `src/llm/concept-spec-parser.ts`
    - Updated ideator to reuse shared parser: `src/llm/concept-ideator.ts`
    - Exported reusable concept schema object: `src/llm/schemas/concept-ideator-schema.ts`
- **Deviations from original plan**:
  - Original ticket stated no touched files outside new evaluator files; adjusted to include minimal required stage/prompt type integration and shared parser extraction for cleaner long-term architecture.
- **Verification results**:
  - `npm run test:unit` passed (all unit suites)
  - `npm run typecheck` passed
  - `npm run lint` passed
