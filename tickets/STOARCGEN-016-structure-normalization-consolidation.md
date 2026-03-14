# STOARCGEN-016: Consolidate Structure Normalization / Migration Seam

**Status**: TODO
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

One shared structure normalization layer should own:
- default `anchorMoments`
- default act-level fields (`actQuestion`, `exitReversal`, `promiseTargets`, `obligationTargets`)
- default milestone-level `exitCondition`
- any migration/upcast rules for persisted structure payloads

Callers should delegate to that layer rather than re-encoding the rules.

## Files to Touch

- New shared helper in the structure domain
  - Recommended location: `src/models/story-structure-normalization.ts`
  - Alternative acceptable location: `src/engine/structure-normalization.ts` if it stays domain-focused and not LLM-specific
- `src/llm/structure-response-parser.ts`
- `src/engine/structure-factory.ts`
- `src/persistence/story-serializer.ts`
- `src/engine/structure-rewriter.ts`
- `src/engine/structure-rewrite-support.ts` if needed
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

### Boundaries to update

- `parseStructureResponseObject()` should stop hand-encoding the defaults directly
- `createStoryStructure()` should stop owning a second copy of the same field defaults
- `deserializeStory()` should delegate persisted structure upcast/defaulting to the shared seam
- rewrite merge/support code should preserve the same canonical semantics as initial generation

### Constraints

- No `beat` aliases
- No backwards-compat dual schema
- No behavior change to current defaults
- Keep the helper structure-domain focused, not tied to one prompt implementation

## Out of Scope

- Changing the default values chosen in `STOARCGEN-008`
- The 3-call pipeline itself (`STOARCGEN-009` through `STOARCGEN-013`)
- UI/display changes
- New validation rules beyond current normalization/upcast behavior

## Acceptance Criteria

### Tests that must pass

- Existing `STOARCGEN-008` tests still pass unchanged or with only helper-import refactors
- Add focused unit tests for the new shared normalization helper(s)
- Verify parser, factory, serializer, and rewrite paths still produce identical normalized results for the same missing-field cases
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true

- One canonical source of truth for structure-field defaults
- Initial generation and rewrite generation normalize the same way
- Legacy stories still load without errors
- No aliasing or temporary schema forks are introduced
