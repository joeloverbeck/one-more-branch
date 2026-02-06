# STOENG-001: Engine Types and Error Classes

## Status

Completed (2026-02-06)

## Summary

Define the type system for the Story Engine module, including result types for operations, session management types, and a custom error class with typed error codes.

## Reassessed Assumptions (2026-02-06)

- `src/engine/types.ts` does not exist yet and must be created in this ticket.
- `test/unit/engine/` does not exist yet; this ticket must create `test/unit/engine/types.test.ts`.
- The codebase currently uses extensionless TypeScript imports in source and tests; this ticket should follow that pattern.
- `specs/05-story-engine.md` defines the same engine types and error codes expected by this ticket; there is no additional runtime behavior required here.

## Updated Scope

- Create `src/engine/types.ts` with engine result/session/options types and `EngineError`.
- Create `test/unit/engine/types.test.ts` covering runtime behavior of `EngineError` and compile-time compatibility for exported types.
- Keep changes isolated to these files plus this ticket document.

## Files to Create/Modify

### Create
- `src/engine/types.ts`
- `test/unit/engine/types.test.ts`

### Modify
- `archive/tickets/STOENG-001-types.completed.md` (assumptions/scope/status/outcome updates)

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** create `src/engine/index.ts` (separate ticket)
- **DO NOT** implement any business logic - types only

## Implementation Details

Create `src/engine/types.ts` with the following exports:

### Result Types

```typescript
export interface StartStoryResult {
  readonly story: Story;
  readonly page: Page;
}

export interface MakeChoiceResult {
  readonly page: Page;
  readonly wasGenerated: boolean;
}
```

### Session Types

```typescript
export interface PlaySession {
  readonly storyId: StoryId;
  readonly currentPageId: PageId;
  readonly apiKey: string;
}
```

### Options Types

```typescript
export interface StartStoryOptions {
  readonly characterConcept: string;
  readonly worldbuilding?: string;
  readonly tone?: string;
  readonly apiKey: string;
}

export interface MakeChoiceOptions {
  readonly storyId: StoryId;
  readonly pageId: PageId;
  readonly choiceIndex: number;
  readonly apiKey: string;
}
```

### Error Types

```typescript
export type EngineErrorCode =
  | 'STORY_NOT_FOUND'
  | 'PAGE_NOT_FOUND'
  | 'INVALID_CHOICE'
  | 'GENERATION_FAILED'
  | 'VALIDATION_FAILED'
  | 'CONCURRENT_GENERATION';

export class EngineError extends Error {
  constructor(
    message: string,
    public readonly code: EngineErrorCode
  ) {
    super(message);
    this.name = 'EngineError';
  }
}
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/types.test.ts`:

1. **EngineError instantiation**
   - `new EngineError('msg', 'STORY_NOT_FOUND')` creates error with correct name
   - Error message is accessible via `.message`
   - Error code is accessible via `.code`
   - Error is instanceof Error

2. **Type exports are valid**
   - All types can be imported
   - Types compose correctly (e.g., MakeChoiceOptions uses StoryId, PageId)
   - Immutable field intent is represented via `readonly` properties on interfaces

### Invariants That Must Remain True

1. **No runtime dependencies**: types.ts must not import from persistence or llm modules (models only)
2. **Immutability**: All interface fields should represent immutable data
3. **Type safety**: All imports from models must use proper branded types (StoryId, PageId)

## Estimated Size

~120 lines of code + ~80 lines of tests

## Dependencies

- Spec 02: Data Models (`src/models/` - Story, Page, PageId, StoryId types)

## Outcome

Originally planned:
- Create `src/engine/types.ts` with engine type exports and `EngineError`.
- Create `test/unit/engine/types.test.ts` to verify error runtime behavior and type import compatibility.

Actually changed:
- Added `src/engine/types.ts` with `StartStoryResult`, `MakeChoiceResult`, `PlaySession`, `StartStoryOptions`, `MakeChoiceOptions`, `EngineErrorCode`, and `EngineError`.
- Added `readonly` properties to all interface fields to align with the immutability invariant in this ticket.
- Added `test/unit/engine/types.test.ts` covering:
  - `EngineError` name/message/code/`instanceof Error` behavior.
  - Type compatibility of all exported interfaces with branded `StoryId`/`PageId`.
  - Extra edge coverage for `EngineError` stack/prototype behavior.
- Verified with `npm run test:unit -- --testPathPattern=test/unit/engine/types.test.ts` and `npm run typecheck`.
