# CONPACPIPIMP-001: Add engagement modes, value tensions, and deep patterns to TasteProfile

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None (foundational ticket — all others depend on this or run in parallel)

## Problem

The Taste Distiller captures aesthetic preferences but not *how the user wants to interact* with stories. Choice-poetics research shows engagement modes and value tensions are distinct axes of taste that aesthetic profiling alone cannot capture. Deep patterns capture structural transformations beneath surface plots that `collisionPatterns` (static juxtapositions) miss.

## Assumption Reassessment (2026-03-25)

1. `TasteProfile` in `src/models/content-generation-contracts.ts` currently has 9 fields: `collisionPatterns`, `favoredMechanisms`, `humanAnchors`, `socialEngines`, `toneBlend`, `sceneAppetites`, `antiPatterns`, `surfaceDoNotRepeat`, `riskAppetite` — confirmed.
2. `SavedTasteProfile` in `src/models/saved-content-packet.ts` mirrors `TasteProfile` plus `id`, `name`, `createdAt`, `updatedAt` — confirmed.
3. `isSavedTasteProfile` guard validates all existing fields — confirmed; must be extended.
4. `buildContentTasteDistillerSchema()` in `src/llm/schemas/content-taste-distiller-schema.ts` returns a JSON schema with a `tasteProfile` object containing all 9 fields — confirmed.

## Architecture Check

1. Pure additive change — 3 new readonly string-array fields on existing interfaces. No existing field semantics change.
2. No backward-compatibility shims needed for in-memory types. Saved persistence upcasting for `SavedTasteProfile` is handled here: existing saved profiles missing the new fields get empty arrays via the `parseEntity` hook.

## What to Change

### 1. `TasteProfile` interface

Add 3 fields:
```typescript
readonly engagementModes: readonly string[];
readonly valueTensions: readonly string[];
readonly deepPatterns: readonly string[];
```

### 2. `SavedTasteProfile` interface

Add the same 3 fields. Update `isSavedTasteProfile` guard to check `Array.isArray` for each.

### 3. Persistence upcaster for `SavedTasteProfile`

In the taste profile repository's `parseEntity` hook, default missing fields to empty arrays:
```typescript
if (!Array.isArray(profile.engagementModes)) profile.engagementModes = [];
if (!Array.isArray(profile.valueTensions)) profile.valueTensions = [];
if (!Array.isArray(profile.deepPatterns)) profile.deepPatterns = [];
```

### 4. Taste Distiller JSON schema

Add 3 properties to the `tasteProfile` object schema:
- `engagementModes`: `{ type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 }`
- `valueTensions`: `{ type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 }`
- `deepPatterns`: `{ type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 }`

Add all 3 to the `required` array.

## Files to Touch

- `src/models/content-generation-contracts.ts` (modify)
- `src/models/saved-content-packet.ts` (modify)
- `src/llm/schemas/content-taste-distiller-schema.ts` (modify)
- `test/unit/models/content-generation-contracts.test.ts` (modify)
- `test/unit/models/saved-content-packet.test.ts` (modify)
- `test/unit/llm/content-taste-distiller.test.ts` (modify)

## Out of Scope

- Prompt text changes (CONPACPIPIMP-002)
- Sparkstormer changes (CONPACPIPIMP-004)
- Evaluator changes (CONPACPIPIMP-008)
- Client-side JS rendering of new taste profile fields (CONPACPIPIMP-010)
- `prompts/content-taste-distiller-prompt.md` doc update (CONPACPIPIMP-002)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `TasteProfile` objects with the 3 new fields typecheck and are accepted by any guard/validator
2. Unit test: `SavedTasteProfile` objects with the 3 new fields pass `isSavedTasteProfile`
3. Unit test: `SavedTasteProfile` objects *missing* the 3 new fields are upcasted to have empty arrays by the parseEntity hook
4. Unit test: `buildContentTasteDistillerSchema()` output includes `engagementModes`, `valueTensions`, `deepPatterns` in the tasteProfile required array and properties
5. Existing suite: `npm test` — all existing tests pass with updated mocks

### Invariants

1. All existing `TasteProfile` fields remain unchanged in type and semantics
2. Saved taste profiles from disk that lack the new fields load without errors (upcasted to empty arrays)
3. `strict` TypeScript compilation passes — no `any` types introduced

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-generation-contracts.test.ts` — add cases for TasteProfile with new fields
2. `test/unit/models/saved-content-packet.test.ts` — add cases for SavedTasteProfile guard with/without new fields; upcaster test
3. `test/unit/llm/content-taste-distiller.test.ts` — verify schema output includes new properties

### Commands

1. `npm run test:unit -- --testPathPattern="content-generation-contracts|saved-content-packet|content-taste-distiller"`
2. `npm run typecheck && npm run lint && npm test`

## Outcome

- **Completed**: 2026-03-25
- **Changes**:
  - Added `engagementModes`, `valueTensions`, `deepPatterns` (readonly string[]) to `TasteProfile` and `SavedTasteProfile`
  - Extended `isSavedTasteProfile` guard with `isStringArray` checks for new fields
  - Added `parseTasteProfileEntity` upcaster to `taste-profile-repository.ts` (defaults missing fields to `[]`)
  - Added 3 properties with minItems/maxItems to taste distiller JSON schema (9 → 12 required)
  - Updated `parseTasteDistillerResponse` to validate and return new fields
  - Updated mock fixtures in 8 test files; added upcasting and guard acceptance tests
- **Deviations**: Also updated `src/llm/content-taste-distiller-generation.ts` (unlisted in ticket but required for response parser)
- **Verification**: typecheck clean, lint 0 errors, 321 suites / 3715 tests passed
