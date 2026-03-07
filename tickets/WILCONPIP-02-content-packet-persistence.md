# WILCONPIP-02: Content Packet and Taste Profile Persistence

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
