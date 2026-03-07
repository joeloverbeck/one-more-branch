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

- [ ] Unit test: `isContentKind()` accepts all 10 valid values and rejects invalid strings
- [ ] Unit test: `isContentPacketRole()` accepts `PRIMARY_SEED`, `SECONDARY_MUTAGEN`, `IMAGE_ONLY`, `REJECT`
- [ ] Unit test: `isRiskAppetite()` accepts `LOW`, `MEDIUM`, `HIGH`, `MAXIMAL`
- [ ] Unit test: `isSavedContentPacket()` validates all required fields (id, name, createdAt, updatedAt, contentKind, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, interactionVerbs, pinned, recommendedRole)
- [ ] Unit test: `isSavedContentPacket()` rejects objects missing required fields
- [ ] Unit test: `isSavedTasteProfile()` validates all required fields

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] No changes to any existing type definitions
