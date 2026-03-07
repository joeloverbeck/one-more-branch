# WILCONPIP-02: Content Packet and Taste Profile Persistence

**Status**: COMPLETED

**Effort**: S
**Dependencies**: WILCONPIP-01
**Spec reference**: "Persistence Design"

## Summary

Create file-based repositories for content packets and taste profiles following the existing `createJsonEntityRepository` pattern from `src/persistence/json-entity-repository.ts`. Add file-path helpers and directory-ensuring functions.

## Files to Touch

- `src/persistence/content-packet-repository.ts` — NEW: `saveContentPacket`, `loadContentPacket`, `updateContentPacket`, `deleteContentPacket`, `listContentPackets`, `contentPacketExists` functions
- `src/persistence/taste-profile-repository.ts` — NEW: `saveTasteProfile`, `loadTasteProfile`, `deleteTasteProfile`, `listTasteProfiles` functions
- `src/persistence/file-utils.ts` — add `ensureContentPacketsDir`, `getContentPacketsDir`, `getContentPacketFilePath`, `ensureTasteProfilesDir`, `getTasteProfilesDir`, `getTasteProfileFilePath`

## Out of Scope

- Content packet generation (LLM prompts) — WILCONPIP-03+
- Routes or UI — WILCONPIP-09
- Concept repository changes
- Any changes to existing persistence files beyond `file-utils.ts`

## Acceptance Criteria

### Tests

- [ ] Unit test: `saveContentPacket` writes JSON to `content-packets/{id}.json`
- [ ] Unit test: `loadContentPacket` reads and validates with `isSavedContentPacket`
- [ ] Unit test: `loadContentPacket` returns null for nonexistent ID
- [ ] Unit test: `updateContentPacket` modifies and re-saves
- [ ] Unit test: `deleteContentPacket` removes the file
- [ ] Unit test: `listContentPackets` returns all saved packets
- [ ] Unit test: `saveTasteProfile` writes JSON to `taste-profiles/{id}.json`
- [ ] Unit test: `loadTasteProfile` reads and validates with `isSavedTasteProfile`
- [ ] Unit test: `listTasteProfiles` returns all saved profiles

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] Storage uses atomic writes with locking (following existing pattern)
- [ ] No changes to concept-repository.ts or kernel-repository.ts

## Outcome

- **Completion date**: 2026-03-07
- **What was changed**:
  - Added `contentPacketsDir` and `tasteProfilesDir` to `StorageConfigSchema` in `src/config/schemas.ts`
  - Added 6 file-path helpers to `src/persistence/file-utils.ts`
  - Created `src/persistence/content-packet-repository.ts` with all 6 functions
  - Created `src/persistence/taste-profile-repository.ts` with all 4 functions
  - Created unit tests for both repositories (11 tests total)
- **Deviations**: Added config schema entries (not mentioned in ticket but required by the existing pattern)
- **Verification**: typecheck passes, lint passes, all 2875 existing tests pass unchanged, 11 new tests pass
