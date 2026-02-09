# STOARCIMP-01: Add BeatRole, premise, and pacingBudget to data models

**Status**: ✅ COMPLETED

**Phase**: 1 (Data Model Enrichment)
**Spec sections**: 1.1, 1.2, 1.3
**Depends on**: Nothing
**Blocks**: STOARCIMP-02, STOARCIMP-03, STOARCIMP-04, STOARCIMP-05, STOARCIMP-06, STOARCIMP-07, STOARCIMP-08

## Description

Add three new concepts to the story-arc data model:

1. **`BeatRole` type and `StoryBeat.role` field** (`'setup' | 'escalation' | 'turning_point' | 'resolution'`).
2. **`StoryStructure.premise`** field (string) -- a 1-2 sentence hook capturing the core dramatic question.
3. **`PacingBudget` interface and `StoryStructure.pacingBudget`** field with `targetPagesMin` (>=10) and `targetPagesMax` (<=80, >= targetPagesMin).

These are purely type/interface changes plus the `createEmptyAccumulatedStructureState` initializer. No prompt, schema, parser, or runtime logic changes.

## Files to touch

| File | Change |
|------|--------|
| `src/models/story-arc.ts` | Add `BeatRole` type, `PacingBudget` interface. Add `role` to `StoryBeat`, `premise` and `pacingBudget` to `StoryStructure`. |
| `test/unit/models/story-arc.test.ts` | Add tests for new types, validate BeatRole values, PacingBudget constraints. |

## Out of scope

- `AccumulatedStructureState` changes (`pagesInCurrentBeat`, `pacingNudge`) -- those are STOARCIMP-02.
- JSON schema changes (`structure-schema.ts`) -- that is STOARCIMP-03.
- Parser changes (`structure-generator.ts`) -- that is STOARCIMP-03.
- Any prompt changes -- those are STOARCIMP-07 and STOARCIMP-08.
- `CompletedBeat` type changes in `types.ts` -- that is STOARCIMP-04.
- Analyst types, schemas, or runtime logic -- STOARCIMP-05 and STOARCIMP-06.

## Acceptance criteria

### Tests that must pass

1. **`StoryBeat` with `role` field**: Constructing a `StoryBeat` literal with each valid role (`'setup'`, `'escalation'`, `'turning_point'`, `'resolution'`) compiles and the value round-trips.
2. **`StoryStructure` with `premise`**: A structure literal including `premise: 'some hook'` compiles and the value is accessible.
3. **`StoryStructure` with `pacingBudget`**: A structure literal including `pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 }` compiles and values are accessible.
4. **Existing `createEmptyAccumulatedStructureState` tests still pass** (this ticket does not modify that function).
5. **Existing `getCurrentAct`, `getCurrentBeat`, `getBeatProgression`, `isLastBeatOfAct`, `isLastAct` tests still pass** -- these functions don't touch the new fields.
6. **TypeScript build (`npm run typecheck`) passes**.

### Invariants that must remain true

- **Page immutability**: No page model changes.
- **Branch isolation**: No state tracking changes.
- **Ending consistency**: `isEnding === true` iff `choices.length === 0` -- untouched.
- **All existing tests pass**: `npm test` green.
- **Backward-incompatible by design**: No migration code. Existing story data will break -- this is expected per spec.

## Outcome

**Completed**: 2026-02-09

**What was changed**:
- `src/models/story-arc.ts`: Added `BeatRole` type, `PacingBudget` interface, `role` on `StoryBeat`, `premise` and `pacingBudget` on `StoryStructure`
- `src/models/index.ts`: Exported `BeatRole` and `PacingBudget`
- `src/engine/structure-types.ts`: Updated `StructureGenerationResult` with `premise`, `pacingBudget`, beat `role`
- `src/engine/structure-factory.ts`: Passes new fields through with `parseBeatRole()` fallback
- `src/llm/structure-generator.ts`: Updated interface and parser with fallbacks
- `src/engine/structure-rewriter.ts`: Passes new fields through merge logic with fallbacks
- `src/persistence/story-repository.ts`: Serializes/deserializes new fields
- `test/unit/models/story-arc.test.ts`: 7 new tests for BeatRole, premise, PacingBudget
- `test/unit/llm/structure-generator.test.ts`: Updated fixtures
- `test/unit/engine/structure-rewriter.test.ts`: Updated fixtures and assertions

**Deviations from plan**:
- Ticket scoped changes to only `story-arc.ts` and its test, but the new required fields on `StoryBeat` and `StoryStructure` caused compilation errors in `structure-factory.ts`, `structure-rewriter.ts`, `structure-generator.ts`, `structure-types.ts`, and `story-repository.ts`. These were fixed with fallback defaults to maintain backward compatibility in parsing.

**Verification**:
- `npm run typecheck`: 0 errors
- `npm test`: 108 suites, 1502 passed, 0 failures
