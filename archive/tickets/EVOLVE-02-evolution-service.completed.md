# EVOLVE-02: Create Evolution Service

**Status**: COMPLETED
**Priority**: HIGH
**Depends on**: EVOLVE-01
**Blocks**: EVOLVE-03

## Summary

Create `evolution-service.ts` that orchestrates the full evolution pipeline: evolver -> evaluator -> verifier. This service must reuse existing evaluator and verifier LLM stages unchanged.

## Reassessed Assumptions (2026-02-21)

1. `EVOLVING_CONCEPTS` is not currently part of `GenerationStage` in `src/engine/types.ts`. If the service emits that stage (required), this ticket must add it to the canonical stage list now. Deferring to EVOLVE-05 would force unsafe type workarounds.
2. `evaluateConcepts()` requires `userSeeds.apiKey` (`ConceptEvaluatorContext.userSeeds: ConceptSeedInput`). Passing `{}` is invalid; evolution evaluation must pass at least `{ apiKey }`.
3. Existing service architecture uses factory+dependency injection (`createConceptService(deps)`), not class constructors. Evolution service should follow that same pattern.
4. A verifier partial-success return path weakens contract clarity. For robust architecture, this service should be atomic: either full evolve/evaluate/verify success or fail with an error.
5. Service-level pipeline verification belongs in unit tests in this ticket; broader integration tests are tracked in EVOLVE-07.

## Files to Create

1. **`src/server/services/evolution-service.ts`**

## Interface Design

```typescript
interface EvolveConceptsInput {
  readonly parentConcepts: readonly EvaluatedConcept[];  // 2-3 parents
  readonly kernel: StoryKernel;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

interface EvolveConceptsResult {
  readonly evolvedConcepts: readonly ConceptSpec[];
  readonly scoredConcepts: readonly ScoredConcept[];
  readonly evaluatedConcepts: readonly EvaluatedConcept[];
  readonly verifications: readonly ConceptVerification[];
}

interface EvolutionService {
  evolveConcepts(input: EvolveConceptsInput): Promise<EvolveConceptsResult>;
}
```

## Implementation

`evolveConcepts()` executes three stages sequentially:

1. **EVOLVING_CONCEPTS** -- call `evolveConceptIdeas(parentConcepts, kernel, apiKey)`
   - Emits stage started/completed via `onGenerationStage`
   - Returns 6 `ConceptSpec` offspring

2. **EVALUATING_CONCEPTS** -- call existing `evaluateConcepts({ concepts: offspring, userSeeds: { apiKey } }, apiKey)`
   - Reuses evaluator from `src/llm/concept-evaluator.ts` unchanged
   - Returns `ScoredConcept[]` + `EvaluatedConcept[]`

3. **VERIFYING_CONCEPTS** -- call existing `verifyConcepts({ evaluatedConcepts }, apiKey)`
   - Reuses verifier from `src/llm/concept-verifier.ts` unchanged
   - Returns `ConceptVerification[]`

Follow the same dependency injection pattern as `concept-service.ts`:
- Accept deps via `createEvolutionService(deps)` factory argument
- Default deps use real implementations
- Export singleton: `export const evolutionService = createEvolutionService();`

## Error Handling

- If evolver fails, throw immediately
- If evaluator fails, throw immediately
- If verifier fails, throw immediately
- Do not return partial pipeline results from this service

## Files to Modify

1. **`src/server/services/index.ts`** -- export `evolutionService` and related types
2. **`src/engine/types.ts`** -- add `EVOLVING_CONCEPTS` to `GENERATION_STAGES`

## Acceptance Criteria

- [x] Service orchestrates evolver -> evaluator -> verifier
- [x] Reuses existing evaluator and verifier without modification
- [x] Progress stage callbacks fire for all 3 stages
- [x] Input validation: requires 2-3 parent concepts, valid API key, kernel
- [x] Unit tests with mocked LLM dependencies
- [x] Unit tests verify fail-fast behavior (no partial success contract)

## Outcome

**Completed**: 2026-02-21

- Added `src/server/services/evolution-service.ts` with DI factory pattern and singleton export.
- Added typed stage support for evolution by introducing `EVOLVING_CONCEPTS` in `src/engine/types.ts`.
- Updated `src/server/services/index.ts` to export evolution service/types.
- Added `test/unit/server/services/evolution-service.test.ts` for orchestration, validation, callback ordering, and fail-fast invariants.
- Updated `test/unit/engine/types.test.ts` for the new generation stage.

### Deviations From Original Ticket Draft

- Updated evaluator invocation to pass `userSeeds: { apiKey }` (required by `ConceptEvaluatorContext`) instead of `{}`.
- Kept service contract atomic and fail-fast; no partial-success return path from verifier failures.
- Added stage-union update in this ticket (instead of deferring) to avoid unsafe string-stage workarounds.
