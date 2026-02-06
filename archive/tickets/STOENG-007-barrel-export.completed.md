# STOENG-007: Barrel Export and Module Integration

## Status

Completed (2026-02-06)

## Summary

Create the barrel export file (`src/engine/index.ts`) that re-exports all public API from the engine module. This makes the module consumable by the UI layer (Spec 06).

## Reassessed Assumptions (2026-02-06)

- `src/engine/index.ts` was missing and needed to be created in this ticket.
- Engine modules to re-export already existed and were unit tested:
  - `src/engine/story-engine.ts`
  - `src/engine/story-service.ts`
  - `src/engine/page-service.ts`
  - `src/engine/state-manager.ts`
  - `src/engine/canon-manager.ts`
  - `src/engine/types.ts`
- Existing project style uses extensionless TypeScript imports (for example `./story-engine`), not `.js` suffixes in source files.
- There was no dedicated unit test file for engine barrel exports.

## Updated Scope

- Create `src/engine/index.ts` as a pure re-export barrel that matches current engine public API.
- Add `test/unit/engine/index.test.ts` to verify runtime exports and compile-time type exports.
- Keep changes minimal and confined to barrel export, tests, and this ticket document.

## Files Created/Modified

### Created

- `src/engine/index.ts`
- `test/unit/engine/index.test.ts`

### Modified

- `tickets/STOENG-007-barrel-export.md`

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any existing engine files
- **DO NOT** add new functionality - exports only

## Implementation Details

Created `src/engine/index.ts` with extensionless TypeScript re-exports for:

- Main engine facade and singleton (`StoryEngine`, `storyEngine`)
- Story service API
- Page service API
- State manager API
- Canon manager API
- Runtime error export (`EngineError`) and type exports (`StartStoryResult`, `MakeChoiceResult`, `PlaySession`, `StartStoryOptions`, `MakeChoiceOptions`, `EngineErrorCode`)

## Acceptance Criteria

### Tests Implemented

Created `test/unit/engine/index.test.ts` covering:

1. **All exports are accessible**
   - StoryEngine class import
   - storyEngine singleton import
   - Story/page/state/canon service function imports
   - EngineError runtime import
2. **Export completeness and API boundary**
   - Asserts barrel exposes expected runtime symbols
   - Asserts internal canon helper utilities are not exported
3. **Type exports work**
   - Uses exported engine types in typed variables
   - Uses exported `EngineErrorCode` union type

### Verification Run

- `npm run test:unit -- --coverage=false --testPathPattern=test/unit/engine/index.test.ts`
- `npm run test:unit -- --coverage=false --runInBand --testPathPattern=test/unit/engine`
- `npm run typecheck`

## Invariants Preserved

1. **Complete re-exports**: All intended engine public API exposed through `index.ts`
2. **No new code**: Barrel is import/export only
3. **Project import style**: Extensionless TypeScript imports, consistent with existing engine files
4. **Clean public API**: Internal helper utilities remain unexported

## Outcome

Originally planned:
- Add an engine barrel export and a small export-verification test.

Actually changed:
- Added `src/engine/index.ts` with pure re-exports aligned to existing engine public API.
- Added `test/unit/engine/index.test.ts` with runtime export checks, type-usage checks, and a guard that internal canon helper utilities are not leaked.
- Updated this ticket’s assumptions/scope to reflect actual repository conventions (extensionless TypeScript imports rather than `.js` suffixes in source).
