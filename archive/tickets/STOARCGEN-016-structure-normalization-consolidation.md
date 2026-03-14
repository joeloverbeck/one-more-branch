# STOARCGEN-016: Consolidate Structure Normalization / Migration Seam

**Status**: COMPLETED
**Depends on**: STOARCGEN-008
**Blocks**: None

## Summary

Consolidate the current structure defaulting / migration logic for the new high-signal fields into a single shared seam owned by the structure domain.

After `STOARCGEN-008`, canonical defaults are applied correctly, but they are still duplicated across:
- current LLM response parsing
- runtime structure construction
- story deserialization
- rewrite support / merge paths that materialize structure-shaped data

That duplication is acceptable for the migration step, but it is not the ideal long-term architecture. The goal of this ticket is to make the normalization rules explicit, shared, and testable in one place without introducing aliases or compatibility debt.

## Reassessed Assumptions

Verified against current code on 2026-03-14:

- The ticket premise is still valid: normalization/defaulting is duplicated today.
- The duplication currently lives in:
  - `src/llm/structure-response-parser.ts`
  - `src/engine/structure-factory.ts`
  - `src/persistence/story-serializer.ts`
  - `src/engine/structure-rewriter.ts` (`mergePreservedWithRegenerated()`)
- `src/engine/structure-rewrite-support.ts` is not a normalization owner. It transports already-normalized runtime data into rewrite context and should only be touched if the new seam meaningfully simplifies it.
- `src/models/story-arc.ts` already owns the canonical anchor default constructor via `createDefaultAnchorMoments()`. This ticket should extend that domain ownership instead of introducing a second “normalization domain” elsewhere.
- Existing tests already cover many missing-field/defaulting cases in parser/factory/serializer. The gap is architectural duplication and cross-boundary consistency, not missing baseline coverage.

## Problem

The structure domain now has canonical fields that may be absent in:
- current one-shot generation output
- older persisted stories
- intermediate rewrite-shaped payloads

Today, each boundary performs its own normalization. That creates three risks:
- drift between parser/factory/serializer defaults
- future 3-call pipeline work duplicating the same logic again
- rewrite paths silently diverging from initial generation semantics

## Desired Architecture

One shared structure normalization layer in the structure domain should own:
- default `anchorMoments` completion
- default act-level fields (`actQuestion`, `exitReversal`, `promiseTargets`, `obligationTargets`)
- default milestone-level `exitCondition`
- shared parsing/defaulting for the new optional milestone metadata when materializing runtime structure
- persisted structure upcast/defaulting rules

Callers should delegate to that layer rather than re-encoding the rules.

## Files to Touch

- New shared helper in the structure domain
  - Recommended location: `src/models/story-structure-normalization.ts`
  - `src/models/story-arc.ts` may keep `createDefaultAnchorMoments()` or re-export helpers, but normalization ownership should remain model/domain-centric
- `src/llm/structure-response-parser.ts`
- `src/engine/structure-factory.ts`
- `src/persistence/story-serializer.ts`
- `src/engine/structure-rewriter.ts`
- `src/engine/structure-rewrite-support.ts` only if the implementation reveals a concrete simplification
- `src/models/index.ts` — export helper(s) if appropriate

## Detailed Changes

### Shared normalization API

Create explicit helpers for the structure domain, for example:

```typescript
normalizeGeneratedStructureResult(...)
normalizeStoryStructure(...)
normalizeStoryStructureFileData(...)
```

Exact function names may differ, but the responsibilities must be explicit:
- generated result normalization
- runtime structure normalization
- persisted file-data normalization / upcast
- preserved-milestone materialization for rewrite merges when that path needs the same canonical defaults/parsing

### Boundaries to update

- `parseStructureResponseObject()` should stop hand-encoding the defaults directly
- `createStoryStructure()` should stop owning a second copy of the same field defaults
- `deserializeStory()` should delegate persisted structure upcast/defaulting to the shared seam
- `mergePreservedWithRegenerated()` should preserve the same canonical semantics as initial generation/persistence
- `structure-rewrite-support` should not gain normalization responsibilities

### Constraints

- No `beat` aliases
- No backwards-compat dual schema
- No behavior change to current defaults
- Keep the helper structure-domain focused, not tied to one prompt implementation
- Avoid broad file rewrites. Prefer extracting the existing logic into shared helpers and wiring callers to it surgically.

## Out of Scope

- Changing the default values chosen in `STOARCGEN-008`
- The 3-call pipeline itself (`STOARCGEN-009` through `STOARCGEN-013`)
- UI/display changes
- New validation rules beyond current normalization/upcast behavior

## Acceptance Criteria

### Tests that must pass

- Existing `STOARCGEN-008` tests still pass unchanged or with only helper-import refactors
- Add focused unit tests for the new shared normalization helper(s)
- Add or strengthen tests that verify parser, factory, serializer, and rewrite merge paths still produce identical normalized results for the same missing-field cases
- Add or strengthen persisted-story tests for legacy/missing high-signal fields
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true

- One canonical source of truth for structure-field defaults
- Initial generation and rewrite generation normalize the same way
- Legacy stories still load without errors
- No aliasing or temporary schema forks are introduced

## Outcome

- Completion date: 2026-03-14
- Implemented a shared structure-domain normalization seam in `src/models/story-structure-normalization.ts`
- Routed parser, structure factory, persisted-story deserialization, and rewrite preserved-milestone merge through that shared seam
- Kept `structure-rewrite-support` unchanged because reassessment confirmed it is not a normalization owner
- Strengthened coverage with a focused normalization test file that verifies direct helper behavior and cross-boundary consistency
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/models/story-structure-normalization.test.ts test/unit/llm/structure-response-parser.test.ts test/unit/engine/structure-factory.test.ts test/unit/engine/structure-rewriter.test.ts test/unit/persistence/story-serializer.test.ts --coverage=false`
  - `npm run typecheck`
  - `npm run lint`
