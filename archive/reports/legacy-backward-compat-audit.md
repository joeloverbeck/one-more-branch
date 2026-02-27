**Status**: COMPLETED

# Legacy & Backward-Compatibility Audit Report

**Date:** 2026-02-27
**Purpose:** Catalog all backward-compatibility shims, legacy migration code, and deprecated aliases in the codebase to prepare for a clean break (wiping old stories/concepts/kernels).

---

## Summary Table

| # | Pattern | Source Files | Test Files | Removal Impact | Dead Code? |
|---|---------|-------------|------------|----------------|------------|
| 1 | Tone field renaming (`toneKeywords` -> `toneFeel`) | 2 | 1 | Old stories lose tone data | No |
| 2 | Concept payload migration (missing `incitingDisruption`/`escapeValve`) | 2 | 2 | Old concepts fail validation | No |
| 3 | Concept score migration (removing `branchingFitness`) | 1 | 1 | Old concepts fail validation | No |
| 4 | Page builder re-exports | 1 | 0 source, some tests | Zero source impact | Yes (source) |
| 5 | Deprecated tone prompt functions | 2 | 0 | Zero | Yes |
| 6 | NPC relationship derivation fallback | 1 | 1 | Old stories lose NPC relationships | No |
| 7 | `storyArc` field on `ContinuationContext` | 1 | 0 | Zero | Yes |

**Total:** 7 patterns across 5 source files and ~12 test files.

---

## Detailed Findings

### 1. Tone Field Renaming (`toneKeywords` -> `toneFeel`, `toneAntiKeywords` -> `toneAvoid`)

**What it does:** Old stories stored tone keywords under `toneKeywords`/`toneAntiKeywords`. The deserializer falls back to these if the current `toneFeel`/`toneAvoid` fields are absent.

**Source locations:**
- `src/persistence/story-serializer-types.ts:71-74` - `@deprecated` fields `toneKeywords` and `toneAntiKeywords` on `SpineFileData`
- `src/persistence/story-serializer-types.ts:119-122` - Same deprecated fields on `StoryFileData`
- `src/persistence/story-serializer.ts:302-306` - Deserialization fallback: `data.toneFeel ?? data.toneKeywords`
- `src/persistence/story-serializer.ts:335-336` - Spine deserialization fallback: `data.spine.toneFeel ?? data.spine.toneKeywords`

**Test locations:**
- `test/unit/persistence/story-serializer.test.ts:300-328` - Tests for legacy field fallbacks

**Removal instructions:**
1. Delete the `toneKeywords` and `toneAntiKeywords` fields from `SpineFileData` and `StoryFileData` in `story-serializer-types.ts`
2. Replace `data.toneFeel ?? data.toneKeywords` with `data.toneFeel ?? []` (or just `data.toneFeel`) in `story-serializer.ts`
3. Do the same for `toneAvoid`/`toneAntiKeywords`
4. Delete the legacy fallback tests in `story-serializer.test.ts`

**Removal impact:** Old stories with only `toneKeywords`/`toneAntiKeywords` fields will silently get empty tone arrays.

---

### 2. Concept Payload Migration (missing `incitingDisruption` and `escapeValve`)

**What it does:** Old saved concepts lacked `incitingDisruption` and `escapeValve` fields. The parser derives them from `coreConflictLoop` and `whatIfQuestion` respectively.

**Source locations:**
- `src/persistence/concept-payload-parser.ts:14-36` - `withLegacyConceptDefaults()`: fills `incitingDisruption` from `coreConflictLoop` and `escapeValve` from `whatIfQuestion`
- `src/persistence/concept-payload-parser.ts:101-117` - `withSavedConceptLegacyDefaults()`: applies the above to both `evaluatedConcept` and `preHardenedConcept`
- `src/persistence/concept-payload-parser.ts:119-130` - `parseSavedConcept()`: runs migration before validation
- `src/persistence/concept-repository.ts:27` - Wired as `parseEntity` hook in repository creation

**Test locations:**
- `test/unit/persistence/concept-payload-parser.test.ts:38-127` - Tests for all legacy concept migration paths
- `test/unit/persistence/concept-repository.test.ts:134-170` - Integration test for loading legacy saved concepts

**Removal instructions:**
1. Delete `withLegacyConceptDefaults()` and `withSavedConceptLegacyDefaults()` from `concept-payload-parser.ts`
2. Simplify `parseSavedConcept()` to just validate without migration
3. Remove the `parseEntity` hook from `concept-repository.ts` (or simplify it to just validate)
4. Delete legacy migration tests from both test files

**Removal impact:** Old saved concepts without `incitingDisruption`/`escapeValve` will fail `isSavedConcept()` validation and throw.

---

### 3. Concept Score Migration (removing `branchingFitness`)

**What it does:** Old evaluated concepts had a `branchingFitness` score dimension that was removed. The parser strips it and recalculates aggregate scores.

**Source locations:**
- `src/persistence/concept-payload-parser.ts:38-87` - `stripBranchingFitness()` and `withLegacyScoreDefaults()`: removes `branchingFitness` from scores and recomputes `overallScore`/`passes`

**Test locations:**
- `test/unit/persistence/concept-payload-parser.test.ts:153-203` - Tests for `branchingFitness` migration

**Removal instructions:**
1. Delete `stripBranchingFitness()` and `withLegacyScoreDefaults()` from `concept-payload-parser.ts`
2. Remove any calls to these functions in `parseSavedConcept()` or `withSavedConceptLegacyDefaults()`
3. Delete the corresponding tests

**Removal impact:** Old concepts with `branchingFitness` in their score objects will fail validation.

---

### 4. Page Builder Re-exports for Backward Compatibility

**What it does:** Functions that were moved from `page-builder.ts` to dedicated modules (`thread-lifecycle`, `promise-lifecycle`) are re-exported from `page-builder.ts` so old import paths still work.

**Source locations:**
- `src/engine/page-builder.ts:39-41` - Re-exports `computeContinuationThreadAges`, `augmentThreadsResolvedFromAnalyst`, `computeAccumulatedPromises`, `getMaxPromiseIdNumber`

**Current consumers:** No source file imports these from `page-builder` - only from the canonical modules. Only test files may import from `page-builder`.

**Removal instructions:**
1. Delete the re-export lines from `page-builder.ts`
2. Search test files for imports from `page-builder` that reference these functions and update to canonical module paths
3. Run tests to verify

**Removal impact:** Zero impact on source code. Some test imports may need updating.

---

### 5. Deprecated Tone Prompt Functions (`buildToneBlock`, `buildToneReminder`)

**What it does:** `buildToneBlock` is an alias for `buildToneDirective` and `buildToneReminder` is a stub. Both are `@deprecated` and re-exported from the shared index.

**Source locations:**
- `src/llm/prompts/sections/shared/tone-block.ts:28-42` - `buildToneBlock` (alias) and `buildToneReminder` (stub), both `@deprecated`
- `src/llm/prompts/sections/shared/index.ts:17` - Re-exports both deprecated functions

**Current consumers:** Zero source imports of `buildToneBlock` or `buildToneReminder` anywhere in `src/`.

**Removal instructions:**
1. Delete `buildToneBlock` and `buildToneReminder` from `tone-block.ts`
2. Remove their re-exports from `shared/index.ts`
3. Search tests for any references (likely none)

**Removal impact:** Zero. Pure dead code.

---

### 6. NPC Relationship Derivation from Decomposed Characters

**What it does:** Stories created before `initialNpcRelationships` was stored explicitly get relationships derived from `decomposedCharacters[].protagonistRelationship`.

**Source locations:**
- `src/persistence/story-serializer.ts:136-153` - `deriveInitialNpcRelationshipsFromDecomposed()`: when `initialNpcRelationships` is absent, derives them from `decomposedCharacters`
- `src/persistence/story-serializer.ts:400-402` - Called in deserialization fallback

**Test locations:**
- `test/unit/persistence/story-serializer.test.ts:395-430` - Tests for derivation

**Removal instructions:**
1. Delete `deriveInitialNpcRelationshipsFromDecomposed()` from `story-serializer.ts`
2. Replace the fallback call with `data.initialNpcRelationships ?? []`
3. Delete the derivation tests

**Removal impact:** Old stories without `initialNpcRelationships` will load with an empty relationship array.

---

### 7. `storyArc` Field on `ContinuationContext`

**What it does:** A `storyArc?: string | null` field exists on `ContinuationContext` but is never populated by any code.

**Source locations:**
- `src/llm/context-types.ts:50` - `storyArc?: string | null` on `ContinuationContext`

**Current consumers:** Not populated or read by any code in `src/`.

**Removal instructions:**
1. Delete the `storyArc` field from `ContinuationContext`
2. Search for any test references and remove

**Removal impact:** Zero. Dead field.

---

## Not Legacy (Retained)

### Character State Name Alias

- `src/engine/character-state-manager.ts:11-13` - `normalizeCharacterNameForState` is an alias for `normalizeCharacterName`
- **Classification:** This is a semantic alias providing domain clarity, not backward-compatibility code. Retain or remove per preference.

---

## Recommended Removal Order

1. **Dead code first (zero risk):** Items 4, 5, 7
2. **Migration code (requires old data wipe):** Items 1, 2, 3, 6

After wiping old stories/concepts, all 7 items can be removed safely.

---

## Outcome

**Completion date:** 2026-02-27
**What was changed:**
- All 7 legacy backward-compatibility patterns were removed
- Dead code: page-builder re-exports, deprecated tone functions, storyArc field
- Migration code: tone field fallbacks, NPC relationship derivation, concept payload migration (incitingDisruption/escapeValve defaults and branchingFitness stripping)
- Associated test cases for legacy behavior were removed
- Test imports updated to canonical module paths

**Verification:** All typecheck, lint, and test suites pass after removal.
