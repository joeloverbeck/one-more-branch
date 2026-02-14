# STANARPROPLA-01: Define TrackedPromise types and PromiseType enum

**Status**: PENDING
**Depends on**: None
**Blocks**: STANARPROPLA-03, STANARPROPLA-04, STANARPROPLA-05, STANARPROPLA-06, STANARPROPLA-07, STANARPROPLA-08

## Summary

Replace the transitory `PromiseType` string union and `NarrativePromise` interface with a proper `PromiseType` enum, `TrackedPromise` interface (with id, age), and `PromisePayoffAssessment` interface. Add `'pr'` to `StateIdPrefix`.

## File list

- **Modify**: `src/models/state/keyed-entry.ts`
  - Replace lines 120-128: `PromiseType` string union -> `PromiseType` enum (add `SETUP_PAYOFF`)
  - Replace `NarrativePromise` interface -> `TrackedPromise` interface (add `id: string`, `age: number`)
  - Add `PromisePayoffAssessment` interface
  - Add `PROMISE_TYPE_VALUES` constant and `isPromiseType()` guard
  - Add `'pr'` to `StateIdPrefix` type (line 71)
- **Modify**: `src/models/state/index.ts`
  - Replace narrative promise export block (lines 56-62) to export new types: `PromiseType` (value), `PROMISE_TYPE_VALUES`, `isPromiseType`, `TrackedPromise` (type), `PromisePayoffAssessment` (type)

## Out of scope

- Do NOT modify any test files (downstream test updates are in STANARPROPLA-12)
- Do NOT modify `page.ts`, `page-builder.ts`, `page-serializer.ts`, or any other consumer of these types
- Do NOT modify analyst types, schemas, or prompts
- Do NOT remove `NarrativePromise` export yet (consumers still reference it; removal happens in STANARPROPLA-12)

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` may show errors in downstream files that still import `NarrativePromise` - this is expected. The types file itself must compile cleanly.
- No existing tests should break from this change alone (old `NarrativePromise` still exported).

### Invariants that must remain true

- `PromiseType` is an enum (not a string union), with values: `CHEKHOV_GUN`, `FORESHADOWING`, `DRAMATIC_IRONY`, `UNRESOLVED_EMOTION`, `SETUP_PAYOFF`
- `TrackedPromise` has exactly: `id: string`, `description: string`, `promiseType: PromiseType`, `suggestedUrgency: Urgency`, `age: number` - all `readonly`
- `PromisePayoffAssessment` has exactly: `promiseId: string`, `description: string`, `satisfactionLevel: SatisfactionLevel`, `reasoning: string` - all `readonly`
- `StateIdPrefix` includes `'pr'` alongside existing prefixes
- Existing types (`KeyedEntry`, `ThreadEntry`, `Urgency`, `SatisfactionLevel`, `ThreadPayoffAssessment`, etc.) are unchanged
- `NarrativePromise` and old `PromiseType` still exist temporarily for backward compat until STANARPROPLA-12
