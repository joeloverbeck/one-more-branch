# CONGEN-01: Types, Enums, and Type Guards

**Status**: PENDING
**Depends on**: None
**Blocks**: CONGEN-02, CONGEN-03, CONGEN-04, CONGEN-05

## Summary

Create the shared type definitions file `src/llm/concept-generator-types.ts` containing all enums, interfaces, type guards, and scoring constants used across the concept generation pipeline.

## Files to Create

- `src/llm/concept-generator-types.ts`

## Files to Touch

- None (this is purely additive)

## Out of Scope

- Prompt builders, schemas, LLM call logic
- UI changes
- Route handlers
- Story model changes
- Any modifications to existing files

## Work Description

### 1. Taxonomy Enums (as const arrays + type aliases)

Following the project pattern (see `src/models/story-spine.ts` for reference), define:

- `GENRE_FRAMES` array and `GenreFrame` type (16 values: HORROR, THRILLER, MYSTERY, FANTASY, SCI_FI, LITERARY, ROMANCE, DRAMA, WESTERN, NOIR, SATIRE, FABLE, GOTHIC, SURREAL, DYSTOPIAN, MYTHIC)
- `CONFLICT_AXES` array and `ConflictAxis` type (8 values)
- `BRANCHING_POSTURES` array and `BranchingPosture` type (4 values: TREE, RECONVERGE, STORYLETS, HUB_AND_SPOKE)
- `SETTING_SCALES` array and `SettingScale` type (4 values: INTIMATE, LOCAL, REGIONAL, GLOBAL)
- `STATE_COMPLEXITIES` array and `StateComplexity` type (3 values: LOW, MEDIUM, HIGH)
- `DRIFT_RISK_MITIGATION_TYPES` array and `DriftRiskMitigationType` type (4 values)

### 2. Type Guard Functions

For each enum: `isGenreFrame()`, `isConflictAxis()`, `isBranchingPosture()`, `isSettingScale()`, `isStateComplexity()`, `isDriftRiskMitigationType()`

### 3. Core Interfaces (all readonly)

- `ConceptSeedInput` (spec section 2)
- `ConceptSpec` (spec section 3.2)
- `ConceptDimensionScores` (spec section 3.3)
- `EvaluatedConcept` (spec section 3.3)
- `ConceptContext` (spec section 8.2)
- `DriftRisk` (spec section 6.2)
- `PlayerBreak` (spec section 6.2)

### 4. Stage-Specific Context and Result Interfaces

- `ConceptIdeatorContext` (spec section 4.1)
- `ConceptIdeationResult` (spec section 4.2)
- `ConceptEvaluatorContext` (spec section 5.1)
- `ConceptEvaluationResult` (spec section 5.2)
- `ConceptStressTesterContext` (spec section 6.1)
- `ConceptStressTestResult` (spec section 6.2)

### 5. Scoring Constants

- `CONCEPT_SCORING_WEIGHTS` object with the 6 dimension weights from spec section 3.4
- `CONCEPT_PASS_THRESHOLDS` object with the 6 dimension pass thresholds from spec section 3.4
- `computeOverallScore(scores: ConceptDimensionScores): number` utility function

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/concept-generator-types.test.ts`:

1. **Type guard tests**: Each type guard returns `true` for all valid enum values and `false` for invalid strings, `null`, `undefined`, numbers
2. **Enum completeness**: Each enum array has the correct number of elements matching the spec
3. **`computeOverallScore` tests**:
   - All 5s → returns 100
   - All 0s → returns 0
   - Known specific values → returns expected weighted sum
   - Verify weights sum to 100

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests break (this ticket only adds new files)
- All interfaces use `readonly` fields per project coding style
- Enum arrays use `as const` pattern consistent with `src/engine/types.ts` and `src/models/story-spine.ts`
