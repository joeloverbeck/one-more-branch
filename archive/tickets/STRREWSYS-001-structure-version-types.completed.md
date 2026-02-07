# STRREWSYS-001: Create Structure Version Types

## Summary
Create the foundational type definitions for versioned story structures that enable structure rewriting while maintaining immutability.

## Reassessed Assumptions (2026-02-07)
- `src/models/structure-version.ts` does not exist yet, so this ticket remains unimplemented.
- The original scope said tests are handled only in STRREWSYS-002. For this execution, foundational tests are included here to verify behavior and avoid leaving unvalidated model primitives.
- Existing model patterns in this repository rely on `readonly` typing and non-mutating constructors rather than deep runtime freezing/cloning. This ticket should follow that pattern.
- The original acceptance criteria referenced `test/unit/models/structure-version.test.ts` as pre-created, but it does not exist in the current branch.

## Files to Touch

### New Files
- `src/models/structure-version.ts`
- `test/unit/models/structure-version.test.ts`

### Modified Files
- `src/models/index.ts` (add exports)

## Out of Scope
- Do NOT modify `src/models/story.ts` (handled in STRREWSYS-003)
- Do NOT modify `src/models/page.ts` (handled in STRREWSYS-004)
- Do NOT implement migration logic (handled in STRREWSYS-010)
- Do NOT add integration/e2e/performance coverage here (handled by later tickets)

## Implementation Details

### `src/models/structure-version.ts`

Create the following types and functions:

```typescript
import { StoryStructure } from './story-arc';
import { PageId } from './id';

/**
 * Unique identifier for a structure version.
 * Format: "sv-{timestamp}-{random}" (e.g., "sv-1707321600000-a1b2")
 */
export type StructureVersionId = string & { readonly __brand: 'StructureVersionId' };

/**
 * A versioned story structure that tracks its lineage.
 * Structures are immutable once created.
 */
export interface VersionedStoryStructure {
  readonly id: StructureVersionId;
  readonly structure: StoryStructure;
  readonly previousVersionId: StructureVersionId | null;
  readonly createdAtPageId: PageId | null;
  readonly rewriteReason: string | null;
  readonly preservedBeatIds: readonly string[];
  readonly createdAt: Date;
}

/**
 * Creates a new structure version ID.
 */
export function createStructureVersionId(): StructureVersionId;

/**
 * Type guard for StructureVersionId.
 */
export function isStructureVersionId(value: unknown): value is StructureVersionId;

/**
 * Parses a string to StructureVersionId (throws if invalid).
 */
export function parseStructureVersionId(value: string): StructureVersionId;

/**
 * Creates the initial versioned structure from a generated structure.
 */
export function createInitialVersionedStructure(
  structure: StoryStructure
): VersionedStoryStructure;

/**
 * Creates a rewritten versioned structure preserving completed beats.
 */
export function createRewrittenVersionedStructure(
  previousVersion: VersionedStoryStructure,
  newStructure: StoryStructure,
  preservedBeatIds: readonly string[],
  rewriteReason: string,
  createdAtPageId: PageId
): VersionedStoryStructure;

/**
 * Type guard for VersionedStoryStructure.
 */
export function isVersionedStoryStructure(value: unknown): value is VersionedStoryStructure;
```

### `src/models/index.ts` Updates

Add exports:
```typescript
export {
  StructureVersionId,
  VersionedStoryStructure,
  createStructureVersionId,
  isStructureVersionId,
  parseStructureVersionId,
  createInitialVersionedStructure,
  createRewrittenVersionedStructure,
  isVersionedStoryStructure,
} from './structure-version';
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/models/structure-version.test.ts`
- Existing unit tests that cover model barrel exports remain passing

### Invariants That Must Remain True
1. **I8: Immutable Structure Versions** - All fields are `readonly`
2. **StructureVersionId format** - Must match pattern `sv-{timestamp}-{random}`
3. **Initial version has no parent** - `createInitialVersionedStructure` sets `previousVersionId` to `null`
4. **Rewritten version links to parent** - `createRewrittenVersionedStructure` correctly sets `previousVersionId`
5. **Existing tests pass** - `npm run test:unit` passes without modification

## Technical Notes
- Use `crypto.randomBytes(2).toString('hex')` for random suffix (or `Math.random().toString(16).slice(2, 6)` for browser compatibility)
- Follow existing model immutability conventions (readonly shapes + returning new objects); avoid unnecessary deep-clone/freeze behavior changes
- Follow existing patterns in `src/models/id.ts` for ID generation

## Status
Completed on 2026-02-07.

## Outcome
- Implemented `src/models/structure-version.ts` with all requested exported types/functions and runtime guards.
- Updated `src/models/index.ts` to export structure-version symbols.
- Added `test/unit/models/structure-version.test.ts` in this ticket (instead of deferring entirely to STRREWSYS-002) to validate core behavior immediately.
- Preserved existing model API surface and avoided unrelated model/persistence changes.
