# CONPACPIPIMP-006: Replace viewpointPressure with playerPosition in ContentPacketContext

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (independent model change)

## Problem

The Packeter's `viewpointPressure` is optional, but protagonist position is mandatory for interactive fiction seeds. Player agency depends on having a position from which to act. Renaming to `playerPosition` and making it required enforces this.

## Assumption Reassessment (2026-03-25)

1. `ContentPacketContext` in `src/models/content-generation-contracts.ts` has `viewpointPressure?: string` (optional) — confirmed.
2. `isContentPacketContext` guard checks for `viewpointPressure` — confirmed; must be updated.
3. `cloneContentPacketContext` clones `viewpointPressure` — confirmed; must be updated.
4. `buildContentPacketerSchema()` has `viewpointPressure` as optional — confirmed; must change to required `playerPosition`.
5. `buildContentOneShotSchema()` references `viewpointPressure` — need to verify; likely same pattern.
6. `SavedContentPacket` stores `context: ContentPacketContext` — existing saved packets have optional `viewpointPressure`.
7. `CONTENT_PACKET_CONTEXT_FIELD_REGISTRY` in presenter has `{ key: 'viewpointPressure', label: 'Viewpoint Pressure' }` — confirmed; UI update is in CONPACPIPIMP-010.

## Architecture Check

1. This is a rename + optionality change. The persistence upcaster pattern already exists in the project (used for `SavedConcept`).
2. No backward-compatibility shims — clean rename with upcaster for saved data.
3. The `ConceptSeedOneShotPacket` extends `ContentPacketContext`, so it inherits the change automatically.

## What to Change

### 1. `ContentPacketContext` interface

Replace:
```typescript
readonly viewpointPressure?: string;
```
With:
```typescript
readonly playerPosition: string;
```

### 2. `isContentPacketContext` guard

Replace `viewpointPressure` check with `playerPosition` check (now required, so must be `typeof === 'string'`).

### 3. `cloneContentPacketContext`

Replace `viewpointPressure` with `playerPosition` in the clone spread.

### 4. Packeter JSON schema

In `buildContentPacketerSchema()`: remove `viewpointPressure` property, add `playerPosition: { type: 'string' }` to required properties.

### 5. One-shot JSON schema

In `buildContentOneShotSchema()` / `CONTENT_ONE_SHOT_PACKET_SCHEMA`: same change — replace `viewpointPressure` with required `playerPosition`.

### 6. Persistence upcaster for `SavedContentPacket`

In the content-packet repository's `parseEntity` hook, add:
```typescript
if ('viewpointPressure' in context && !('playerPosition' in context)) {
  context.playerPosition = context.viewpointPressure ?? 'Unspecified protagonist position';
  delete context.viewpointPressure;
}
```
If `playerPosition` is missing entirely (very old packets), set default.

### 7. `isSavedContentPacket` guard

Update to check for `playerPosition` instead of `viewpointPressure` in the context object.

## Files to Touch

- `src/models/content-generation-contracts.ts` (modify)
- `src/llm/schemas/content-packeter-schema.ts` (modify)
- `src/llm/schemas/content-one-shot-schema.ts` (modify)
- `src/models/saved-content-packet.ts` (modify)
- `test/unit/models/content-generation-contracts.test.ts` (modify)
- `test/unit/models/saved-content-packet.test.ts` (modify)
- `test/unit/llm/content-packeter.test.ts` (modify)
- `test/unit/llm/content-one-shot.test.ts` (modify)
- `test/unit/persistence/saved-content-packet-repository.test.ts` (modify)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify)

## Out of Scope

- Prompt text changes (CONPACPIPIMP-007)
- UI presenter/client-side changes (CONPACPIPIMP-010)
- Evaluator changes (CONPACPIPIMP-008)
- TasteProfile changes (CONPACPIPIMP-001)
- Prompt doc updates (CONPACPIPIMP-007)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `ContentPacketContext` with `playerPosition: string` typechecks; `viewpointPressure` is a compile error
2. Unit test: `isContentPacketContext` accepts objects with `playerPosition` and rejects those without
3. Unit test: `cloneContentPacketContext` preserves `playerPosition`
4. Unit test: Packeter schema output has `playerPosition` in required, no `viewpointPressure` property
5. Unit test: One-shot schema output has `playerPosition` in required, no `viewpointPressure` property
6. Unit test: Persistence upcaster converts `{ viewpointPressure: 'old value' }` to `{ playerPosition: 'old value' }`
7. Unit test: Persistence upcaster handles missing both fields (defaults to 'Unspecified protagonist position')
8. Existing suite: `npm test` — all tests pass with updated mocks

### Invariants

1. All other `ContentPacketContext` fields remain unchanged
2. Saved content packets with old `viewpointPressure` load without errors
3. Schema `strict: true` mode is preserved
4. `ConceptSeedOneShotPacket` and `ConceptSeedPacketerPacket` inherit the change via extension

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-generation-contracts.test.ts` — update all ContentPacketContext mocks; add guard tests
2. `test/unit/models/saved-content-packet.test.ts` — add upcaster tests for viewpointPressure->playerPosition migration
3. `test/unit/llm/content-packeter.test.ts` — update schema assertion and mock packets
4. `test/unit/llm/content-one-shot.test.ts` — update schema assertion and mock packets
5. `test/unit/persistence/saved-content-packet-repository.test.ts` — test loading legacy packets with viewpointPressure

### Commands

1. `npm run test:unit -- --testPathPattern="content-generation-contracts|saved-content-packet|content-packeter|content-one-shot|saved-content-packet-repository"`
2. `npm run typecheck && npm run lint && npm test`
