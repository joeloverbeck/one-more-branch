# EVOLVE-02: Create Evolution Service

**Priority**: HIGH
**Depends on**: EVOLVE-01
**Blocks**: EVOLVE-03

## Summary

Create `evolution-service.ts` that orchestrates the full evolution pipeline: evolver -> evaluator -> verifier. This service reuses the existing evaluator and verifier LLM stages unchanged.

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

2. **EVALUATING_CONCEPTS** -- call existing `evaluateConcepts({ concepts: offspring, userSeeds: {} }, apiKey)`
   - Reuses evaluator from `src/llm/concept-evaluator.ts` unchanged
   - `userSeeds` is empty (or derived from parent metadata if desired)
   - Returns `ScoredConcept[]` + `EvaluatedConcept[]`

3. **VERIFYING_CONCEPTS** -- call existing `verifyConcepts({ evaluatedConcepts }, apiKey)`
   - Reuses verifier from `src/llm/concept-verifier.ts` unchanged
   - Returns `ConceptVerification[]`

Follow the same dependency injection pattern as `concept-service.ts`:
- Accept deps via constructor/factory
- Default deps use real implementations
- Export singleton: `export const evolutionService = createEvolutionService();`

## Error Handling

- If evolver fails, throw immediately (no partial save needed)
- If evaluator fails, consider wrapping in a typed error similar to `ConceptEvaluationStageError`
- If verifier fails, consider returning partial results (evolved + evaluated but unverified)

## Files to Modify

1. **`src/server/services/index.ts`** -- export `evolutionService` and related types

## Acceptance Criteria

- [ ] Service orchestrates evolver -> evaluator -> verifier
- [ ] Reuses existing evaluator and verifier without modification
- [ ] Progress stage callbacks fire for all 3 stages
- [ ] Input validation: requires 2-3 parent concepts, valid API key, kernel
- [ ] Unit tests with mocked LLM dependencies
- [ ] Integration test verifying pipeline flow
