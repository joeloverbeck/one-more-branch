# CONPACPIPIMP-003: Add PLACE and SECRET to ContentKind enum

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None (independent of other tickets)

## Problem

The `ContentKind` enum lacks PLACE and SECRET — two categories fundamental to interactive fiction. PLACE enables environmental storytelling (Jenkins: "Game Design as Narrative Architecture") where the setting itself drives narrative. SECRET enables information-asymmetry premises where hidden knowledge drives interactive engagement.

## Assumption Reassessment (2026-03-25)

1. `CONTENT_KIND_VALUES` in `src/models/content-taxonomy.ts` currently has 10 values: ENTITY, INSTITUTION, RELATIONSHIP, TRANSFORMATION, WORLD_INTRUSION, RITUAL, POLICY, JOB, SUBCULTURE, ECONOMY — confirmed.
2. `isContentKind()` type guard derives from this array — confirmed; auto-updates.
3. Sparkstormer schema's `contentKind` enum pulls from `CONTENT_KIND_VALUES` — confirmed; auto-updates.
4. Packeter and one-shot schemas also reference `CONTENT_KIND_VALUES` — need to verify, but likely auto-update.

## Architecture Check

1. Pure additive change — appending 2 new string literals to an existing const array.
2. All downstream schemas and guards that derive from `CONTENT_KIND_VALUES` auto-update — no manual sync needed.
3. No backward-compatibility concern — existing saved packets with old kinds remain valid.

## What to Change

### 1. ContentKind values

Add `'PLACE'` and `'SECRET'` to the `CONTENT_KIND_VALUES` array in `src/models/content-taxonomy.ts`.

## Files to Touch

- `src/models/content-taxonomy.ts` (modify)
- `test/unit/models/content-taxonomy.test.ts` (modify)

## Out of Scope

- Sparkstormer prompt changes describing when to use PLACE/SECRET (CONPACPIPIMP-005)
- Schema changes — they auto-derive from `CONTENT_KIND_VALUES`
- UI changes — content kind display is data-driven
- Packeter or evaluator changes

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `isContentKind('PLACE')` returns `true`
2. Unit test: `isContentKind('SECRET')` returns `true`
3. Unit test: `CONTENT_KIND_VALUES` has exactly 12 elements
4. Existing suite: `npm test` — all existing tests pass

### Invariants

1. All 10 existing ContentKind values remain present and unchanged
2. `isContentKind` guard correctly accepts new values and rejects invalid ones
3. TypeScript strict compilation passes

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-taxonomy.test.ts` — add `isContentKind` assertions for PLACE and SECRET; update count assertion

### Commands

1. `npm run test:unit -- --testPathPattern="content-taxonomy"`
2. `npm run typecheck && npm run lint && npm test`
