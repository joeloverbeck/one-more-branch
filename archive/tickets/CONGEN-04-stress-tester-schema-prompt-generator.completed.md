# CONGEN-04: Concept Stress-Tester (Stage 3) — Schema, Prompt, Generator

**Status**: COMPLETED
**Depends on**: CONGEN-01
**Blocks**: CONGEN-05

## Summary

Implement Stage 3 (optional) of the concept generation pipeline: the Concept Stress-Tester. This adversarially critiques a selected concept and produces a hardened version.

## Files to Create

- `src/llm/schemas/concept-stress-tester-schema.ts`
- `src/llm/prompts/concept-stress-tester-prompt.ts`
- `src/llm/concept-stress-tester.ts`
- `test/unit/llm/concept-stress-tester.test.ts`

## Files to Touch

- `src/config/stage-model.ts` (add `conceptStressTester` stage key)
- `test/unit/config/stage-model.test.ts` (include new stage in stage list assertion)
- `src/logging/prompt-formatter.ts` (add `conceptStressTester` prompt type)

## Out of Scope

- Ideator (CONGEN-02) and evaluator (CONGEN-03)
- Route handlers and service orchestration (CONGEN-05)
- UI changes (CONGEN-06, CONGEN-07)
- Generation progress stage registration in client/server progress UX (CONGEN-08)

## Work Description

### 1. JSON Schema (`concept-stress-tester-schema.ts`)

- Export `CONCEPT_STRESS_TEST_SCHEMA` of type `JsonSchema`
- Top-level requires: `hardenedConcept` (ConceptSpec shape), `driftRisks` (array), `playerBreaks` (array)
- `driftRisks` items: `{ risk: string, mitigation: string, mitigationType: enum }`
- `playerBreaks` items: `{ scenario: string, handling: string, constraintUsed: string }`
- `mitigationType` enum: `["STATE_CONSTRAINT", "WORLD_AXIOM", "SCENE_RULE", "RETRIEVAL_SCOPE"]`
- Reuse `CONCEPT_SPEC_SCHEMA` from `concept-ideator-schema.ts` for `hardenedConcept` to avoid schema drift between stages
- All `additionalProperties: false`, `strict: true`

### 2. Prompt Builder (`concept-stress-tester-prompt.ts`)

- Export `buildConceptStressTesterPrompt(context: ConceptStressTesterContext): ChatMessage[]`
- System prompt role: "adversarial story architect" — job is to BREAK the concept, not praise it
- Drift analysis section: find ways the LLM could lose track of world rules
- Player-break analysis section: model extreme but plausible player behavior
- Strengthening directives: for each risk/break, propose concrete tightening
- Weak dimension focus: specifically improve dimensions that scored below pass thresholds
- User prompt: the selected ConceptSpec + scores + weaknesses from evaluator

### 3. Generator (`concept-stress-tester.ts`)

- Export `stressTestConcept(context: ConceptStressTesterContext, apiKey: string, options?: Partial<GenerationOptions>): Promise<ConceptStressTestResult>`
- Same LLM call pattern
- Use `getStageModel('conceptStressTester')` with fallback
- Parse response via `parseConceptStressTestResponse()`
- Log prompts via `logPrompt(logger, 'conceptStressTester', messages)` following existing concept stage behavior

### 4. Response Parser

Within `concept-stress-tester.ts`:
- Validate `hardenedConcept` has all ConceptSpec fields (reuse enum type guards)
- Validate `driftRisks` is a non-empty array with valid `mitigationType` values
- Validate `playerBreaks` is a non-empty array
- All string fields must be non-empty after trim

## Acceptance Criteria

### Tests That Must Pass

`test/unit/llm/concept-stress-tester.test.ts`:

1. **`parseConceptStressTestResponse` with valid data**: Returns complete ConceptStressTestResult
2. **`parseConceptStressTestResponse` validates hardenedConcept enums**: Rejects invalid enum values
3. **`parseConceptStressTestResponse` validates driftRisk mitigationType**: Rejects invalid mitigation types
4. **`parseConceptStressTestResponse` rejects empty driftRisks**: Throws LLMError
5. **`parseConceptStressTestResponse` rejects empty playerBreaks**: Throws LLMError
6. **`buildConceptStressTesterPrompt` includes weak dimensions**: System prompt references dimensions below pass threshold
7. **`buildConceptStressTesterPrompt` includes adversarial directives**: System prompt contains drift analysis and player-break analysis sections
8. **`stressTestConcept` with mocked fetch**: Returns parsed result
9. **`getStageModel` stage list includes `conceptStressTester`**: Stage-model test covers new stage key

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests break
- Hardened concept maintains the same `ConceptSpec` shape as input (no new fields)
- No duplicated enum/source-of-truth declarations for concept schema fields

## Outcome

- Completion date: 2026-02-18
- Actually changed:
  - Added Stage 3 schema: `src/llm/schemas/concept-stress-tester-schema.ts`
  - Added Stage 3 prompt builder: `src/llm/prompts/concept-stress-tester-prompt.ts`
  - Added Stage 3 generator + parser: `src/llm/concept-stress-tester.ts`
  - Added shared concept-stage execution utility: `src/llm/concept-stage-runner.ts` and refactored concept ideator/evaluator/stress-tester generators to use it
  - Added Stage 3 unit tests: `test/unit/llm/concept-stress-tester.test.ts`
  - Added runner unit tests: `test/unit/llm/concept-stage-runner.test.ts`
  - Registered stage model key: `src/config/stage-model.ts`, `test/unit/config/stage-model.test.ts`
  - Registered prompt logging type: `src/logging/prompt-formatter.ts`, `test/unit/logging/prompt-formatter.test.ts`
- Deviations from original plan:
  - Original ticket claimed no touched files; implementation required touching stage registration and prompt logging type definitions/tests to integrate `getStageModel('conceptStressTester')` and prompt logging cleanly.
- Verification results:
  - `npm run test:unit -- test/unit/llm/concept-stress-tester.test.ts test/unit/config/stage-model.test.ts test/unit/logging/prompt-formatter.test.ts` (passed; command runs all unit suites via script pattern)
  - `npm test` (passed)
  - `npm run typecheck` (passed)
  - `npm run lint` (passed)
