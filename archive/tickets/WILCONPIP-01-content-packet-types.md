**Status**: COMPLETED

# WILCONPIP-01: Content Packet and Taste Profile Types

**Effort**: S
**Dependencies**: None (foundational)
**Spec reference**: "The Missing Artifact Class", "Persistence Design"

## Summary

Define the core data types for content packets, taste profiles, and related enums. These are the foundational types that all other tickets depend on.

## Files to Touch

- `src/models/content-packet.ts` — NEW: `ContentKind`, `ContentPacketRole`, `ContentPacket`, `TasteProfile`, `RiskAppetite`, `ContentSpark`, `ContentEvaluation` types and type guards
- `src/models/saved-content-packet.ts` — NEW: `SavedContentPacket`, `SavedTasteProfile` types with `isSavedContentPacket`, `isSavedTasteProfile` guards
- `src/models/index.ts` — re-export new types

## Out of Scope

- Persistence (repositories, file I/O) — WILCONPIP-02
- LLM prompts and schemas — WILCONPIP-03 through WILCONPIP-06
- Any changes to existing concept pipeline types
- Routes or UI

## Acceptance Criteria

### Tests

- [x] Unit test: `isContentKind()` accepts all 10 valid values and rejects invalid strings
- [x] Unit test: `isContentPacketRole()` accepts `PRIMARY_SEED`, `SECONDARY_MUTAGEN`, `IMAGE_ONLY`, `REJECT`
- [x] Unit test: `isRiskAppetite()` accepts `LOW`, `MEDIUM`, `HIGH`, `MAXIMAL`
- [x] Unit test: `isSavedContentPacket()` validates all required fields (id, name, createdAt, updatedAt, contentKind, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, interactionVerbs, pinned, recommendedRole)
- [x] Unit test: `isSavedContentPacket()` rejects objects missing required fields
- [x] Unit test: `isSavedTasteProfile()` validates all required fields

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] No changes to any existing type definitions

## Outcome

- **Completed**: 2026-03-07
- **Files created**: `src/models/content-packet.ts`, `src/models/saved-content-packet.ts`, `test/unit/models/content-packet.test.ts`
- **Files modified**: `src/models/index.ts` (added re-exports)
- **Tests**: 69 new tests, all passing. 232 existing suites unchanged.
- **No deviations** from the ticket. Also added `ContentEvaluationScores` as a separate interface (used by `ContentEvaluation`) for clean type guard decomposition.
