# CONPACPIPIMP-004: Add playerRole, want, counterforce, deepPatternRef to ContentSpark

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CONPACPIPIMP-001 (TasteProfile must have `deepPatterns` for `deepPatternRef` to reference)

## Problem

Sparkstormer produces "charged fragments" that are atmospheric but imply nothing about protagonist position, desire, or opposition. This forces the Packeter to invent interactive structure from pure mood — too much deferred work. Adding agency-grounding fields to sparks ensures every spark carries a protagonist position, a want, and an opposing force.

## Assumption Reassessment (2026-03-25)

1. `ContentSpark` in `src/models/content-generation-contracts.ts` currently has 5 fields: `sparkId`, `contentKind`, `spark`, `imageSeed`, `collisionTags` — confirmed.
2. `buildContentSparkstormerSchema()` in `src/llm/schemas/content-sparkstormer-schema.ts` returns a schema with those 5 fields, all required — confirmed.
3. `parseSparkstormerResponse()` in `src/llm/content-sparkstormer-generation.ts` validates each spark object — confirmed; must be updated to validate new fields.
4. `ContentPacketSourceArtifact` has a `summary` field that may suffice for origin tracing of new spark fields — confirmed per spec note.

## Architecture Check

1. Pure additive change — 4 new required string fields on `ContentSpark`.
2. No backward-compatibility concern for in-memory types. Saved content packets store `sourceArtifacts` with a `summary` field, not raw sparks — no persistence upcasting needed for spark fields.
3. The response transformer must validate the 4 new fields are non-empty strings.

## What to Change

### 1. `ContentSpark` interface

Add 4 fields:
```typescript
readonly playerRole: string;
readonly want: string;
readonly counterforce: string;
readonly deepPatternRef: string;
```

### 2. Sparkstormer JSON schema

Add 4 required string properties to the spark object schema:
- `playerRole`: `{ type: 'string' }`
- `want`: `{ type: 'string' }`
- `counterforce`: `{ type: 'string' }`
- `deepPatternRef`: `{ type: 'string' }`

Add all 4 to the spark object's `required` array.

### 3. Sparkstormer response transformer

Update `parseSparkstormerResponse()` to validate the 4 new fields exist and are non-empty strings on each spark object.

## Files to Touch

- `src/models/content-generation-contracts.ts` (modify)
- `src/llm/schemas/content-sparkstormer-schema.ts` (modify)
- `src/llm/content-sparkstormer-generation.ts` (modify)
- `test/unit/models/content-generation-contracts.test.ts` (modify)
- `test/unit/llm/content-sparkstormer.test.ts` (modify)

## Out of Scope

- Sparkstormer prompt text changes (CONPACPIPIMP-005)
- `ContentPacketSourceArtifact` changes — the spec notes the existing `summary` field suffices for origin tracing
- Packeter or evaluator changes
- PLACE/SECRET content kinds (CONPACPIPIMP-003)
- Prompt doc updates (CONPACPIPIMP-005)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `ContentSpark` objects with all 9 fields (5 existing + 4 new) typecheck correctly
2. Unit test: `parseSparkstormerResponse` accepts valid sparks with the 4 new fields
3. Unit test: `parseSparkstormerResponse` rejects sparks missing `playerRole`, `want`, `counterforce`, or `deepPatternRef`
4. Unit test: `buildContentSparkstormerSchema()` output includes the 4 new properties in required array
5. Existing suite: `npm test` — all tests pass with updated mocks

### Invariants

1. All 5 existing `ContentSpark` fields remain unchanged
2. Schema `strict: true` mode is preserved
3. Response transformer throws `LLMError` on validation failure (existing pattern preserved)

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-generation-contracts.test.ts` — update ContentSpark mock objects with new fields
2. `test/unit/llm/content-sparkstormer.test.ts` — add validation cases for new fields; update valid mock sparks

### Commands

1. `npm run test:unit -- --testPathPattern="content-sparkstormer|content-generation-contracts"`
2. `npm run typecheck && npm run lint && npm test`
