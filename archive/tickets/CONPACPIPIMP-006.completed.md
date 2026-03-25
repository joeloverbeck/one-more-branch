# CONPACPIPIMP-006: Replace viewpointPressure with playerPosition in ContentPacketContext

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (independent model change)

## Problem

The Packeter's `viewpointPressure` is optional, but protagonist position is mandatory for interactive fiction seeds. Player agency depends on having a position from which to act. Renaming to `playerPosition` and making it required enforces this.

## Assumption Reassessment (2026-03-25)

1. `ContentPacketContext` in `src/models/content-generation-contracts.ts` has `viewpointPressure?: string` (optional) — confirmed.
2. `isContentPacketContext` guard and `cloneContentPacketContext` both still use `viewpointPressure` — confirmed.
3. `buildContentPacketerSchema()` and `buildContentOneShotSchema()` both expose `viewpointPressure` as optional instead of `playerPosition` as required — confirmed.
4. `parseContentPacketerResponse()` and `parseContentOneShotResponse()` still parse optional `viewpointPressure` — confirmed. The ticket originally missed these response transformers.
5. `buildPacketContext()` in `src/server/services/content-service.ts` still projects `viewpointPressure` into saved/generated packet context — confirmed. The ticket originally missed this shaping layer.
6. `SavedContentPacket` persists `context: ContentPacketContext`, and `src/persistence/json-entity-repository.ts` already supports a `parseEntity` hook, but `saved-content-packet-repository.ts` does not currently use it — confirmed. This is the correct place for persistence upcasting.
7. `CONTENT_PACKET_CONTEXT_FIELD_REGISTRY` in `src/server/presenters/content-packet-card.ts` still references `viewpointPressure` — confirmed. Although broader UI work remains in CONPACPIPIMP-010, this direct type-coupled consumer must be updated in this ticket so the repo still compiles after the model rename.
8. `src/llm/prompts/content-packeter-prompt.ts`, `src/llm/prompts/content-one-shot-prompt.ts`, and the matching `prompts/*.md` docs still instruct the model to emit `viewpointPressure` — confirmed. The original split into CONPACPIPIMP-007 would leave schema/parsers and prompts disagreeing in the same branch, which is not an acceptable steady state.

## Architecture Check

1. This is a schema-contract correction, not a cosmetic rename. `playerPosition` is a better long-lived abstraction than `viewpointPressure` because it names the actual domain concept instead of one effect of that concept.
2. The clean architecture is: canonical runtime model uses only `playerPosition`; persistence normalizes old saved payloads at load boundaries via a repository upcaster. No runtime aliasing, no dual-field model, no "support both forever".
3. The `ConceptSeedOneShotPacket` and `ConceptSeedPacketerPacket` extend `ContentPacketContext`, but parser and service projection layers must also be updated or the rename stays inconsistent in practice.
4. Compile-coupled consumers that reference `keyof ContentPacketContext` are in scope for this ticket when required to keep the codebase valid. Larger UI/presentation follow-ups still belong in CONPACPIPIMP-010.
5. Prompt/schema alignment is part of the same contract boundary. Requiring `playerPosition` in schemas while still prompting for `viewpointPressure` is a broken architecture, so the prompt builders and prompt docs are in scope here.

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

### 6. Response transformers

In both `parseContentPacketerResponse()` and `parseContentOneShotResponse()`:

- require `playerPosition` as a non-empty string
- remove `viewpointPressure` handling entirely

### 7. Service projection layer

In `buildPacketContext()` inside `src/server/services/content-service.ts`, project `playerPosition` into the saved/generated `ContentPacketContext`.

### 8. Persistence upcaster for `SavedContentPacket`

In the content-packet repository's `parseEntity` hook, add:
```typescript
if ('viewpointPressure' in context && !('playerPosition' in context)) {
  context.playerPosition = context.viewpointPressure ?? 'Unspecified protagonist position';
  delete context.viewpointPressure;
}
```
If `playerPosition` is missing entirely (very old packets), set default.

### 9. `isSavedContentPacket` guard

Update to check for `playerPosition` instead of `viewpointPressure` in the context object.

### 10. Compile-required presenter update

Update `CONTENT_PACKET_CONTEXT_FIELD_REGISTRY` in `src/server/presenters/content-packet-card.ts` from `viewpointPressure` to `playerPosition`. This is not the broader UI ticket; it is the minimal compile-safe fallout of the model rename.

### 11. Prompt and prompt-doc alignment

Update both one-shot and packeter prompt builders, plus their `prompts/*.md` docs, to require `playerPosition` and to remove stale `viewpointPressure` references in the same pass. This keeps the runtime contract, the prompt contract, and the human-facing prompt docs aligned.

## Files to Touch

- `src/models/content-generation-contracts.ts` (modify)
- `src/llm/schemas/content-packeter-schema.ts` (modify)
- `src/llm/schemas/content-one-shot-schema.ts` (modify)
- `src/llm/content-packeter-generation.ts` (modify)
- `src/llm/content-one-shot-generation.ts` (modify)
- `src/llm/prompts/content-packeter-prompt.ts` (modify)
- `src/llm/prompts/content-one-shot-prompt.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `src/models/saved-content-packet.ts` (modify)
- `src/persistence/saved-content-packet-repository.ts` (modify)
- `src/server/presenters/content-packet-card.ts` (modify, compile-required only)
- `prompts/content-packeter-prompt.md` (modify)
- `prompts/content-one-shot-prompt.md` (modify)
- `test/unit/models/content-generation-contracts.test.ts` (modify)
- `test/unit/models/saved-content-packet.test.ts` (modify)
- `test/unit/llm/content-packeter.test.ts` (modify)
- `test/unit/llm/content-one-shot.test.ts` (modify)
- `test/unit/persistence/saved-content-packet-repository.test.ts` (modify)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify, compile-required only)

## Out of Scope

- UI presentation redesign or additional client rendering work (CONPACPIPIMP-010)
- Evaluator changes (CONPACPIPIMP-008)
- TasteProfile changes (CONPACPIPIMP-001)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `ContentPacketContext` with `playerPosition: string` typechecks; `viewpointPressure` is a compile error
2. Unit test: `isContentPacketContext` accepts objects with `playerPosition` and rejects those without
3. Unit test: `cloneContentPacketContext` preserves `playerPosition`
4. Unit test: Packeter schema output has `playerPosition` in required, no `viewpointPressure` property
5. Unit test: One-shot schema output has `playerPosition` in required, no `viewpointPressure` property
6. Unit test: `parseContentPacketerResponse()` requires `playerPosition` and returns it on parsed packets
7. Unit test: `parseContentOneShotResponse()` requires `playerPosition` and returns it on parsed packets
8. Unit test: `buildPacketContext()` preserves `playerPosition` in saved/generated packets via service or route-level behavior
9. Unit test: Persistence upcaster converts `{ viewpointPressure: 'old value' }` to `{ playerPosition: 'old value' }`
10. Unit test: Persistence upcaster handles missing both fields (defaults to `'Unspecified protagonist position'`)
11. Unit test: Packeter prompt and one-shot prompt reference `playerPosition` and do not reference `viewpointPressure`
12. Prompt docs in `prompts/` contain `playerPosition` and no stale `viewpointPressure` references
13. Existing suite: `npm test` — all tests pass with updated mocks

### Invariants

1. All other `ContentPacketContext` fields remain unchanged
2. Saved content packets with old `viewpointPressure` load without errors
3. Schema `strict: true` mode is preserved
4. `ConceptSeedOneShotPacket` and `ConceptSeedPacketerPacket` inherit the change via extension
5. Runtime code has a single canonical context field name: `playerPosition`

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-generation-contracts.test.ts` — update all ContentPacketContext mocks; add guard tests
2. `test/unit/models/saved-content-packet.test.ts` — add upcaster tests for viewpointPressure->playerPosition migration
3. `test/unit/llm/content-packeter.test.ts` — update schema assertion and mock packets
4. `test/unit/llm/content-one-shot.test.ts` — update schema assertion and mock packets
5. `test/unit/persistence/saved-content-packet-repository.test.ts` — test loading legacy packets with viewpointPressure
6. `test/unit/server/presenters/content-packet-card.test.ts` — update context detail assertions for `playerPosition`
7. `test/unit/llm/content-packeter.test.ts` and `test/unit/llm/content-one-shot.test.ts` — add prompt assertions for `playerPosition`

### Commands

1. `npm run test:unit -- --testPathPatterns="content-generation-contracts|saved-content-packet|content-packeter|content-one-shot|saved-content-packet-repository|content-packet-card|saved-content-packet-artifact|content-packets-routes"`
2. `npm run typecheck && npm run lint && npm test`

## Outcome

- Completion date: 2026-03-25
- Actual changes:
  - Replaced `viewpointPressure` with required `playerPosition` in the canonical runtime model, schemas, response parsers, service projection layer, saved-packet validation, prompt builders, prompt docs, and the compile-coupled presenter registry.
  - Added repository-level persistence normalization so legacy saved packets with `viewpointPressure` still load as canonical `playerPosition` packets, with a default when neither field exists.
  - Strengthened tests around parser/schema requirements, prompt/schema alignment, presenter output, route output, saved artifact creation, and legacy repository loading.
- Deviations from original plan:
  - Expanded scope to include prompt builders and prompt docs because leaving them on `viewpointPressure` while schemas/parsers required `playerPosition` would have broken the runtime contract.
  - Included minimal presenter updates because the model rename would otherwise leave the repo uncompilable.
  - The Jest CLI in this repo expects `--testPathPatterns` rather than the older `--testPathPattern` form from the original ticket.
- Verification:
  - `npm run test:unit -- --testPathPatterns="content-generation-contracts|saved-content-packet|content-packeter|content-one-shot|saved-content-packet-repository|content-packet-card|saved-content-packet-artifact|content-packets-routes"` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed.
