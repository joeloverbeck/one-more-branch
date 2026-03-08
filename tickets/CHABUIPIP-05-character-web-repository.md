# CHABUIPIP-05: Character Web Repository + File Utils

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-02, CHABUIPIP-04
**Estimated diff size**: ~80 lines

## Summary

Create the persistence layer for `SavedCharacterWeb` using the `createJsonEntityRepository` pattern. Add directory helper functions to `file-utils.ts` if not already done in CHABUIPIP-04.

## File List

- `src/persistence/character-web-repository.ts` (CREATE)
- `test/unit/persistence/character-web-repository.test.ts` (CREATE)

## Out of Scope

- Do NOT create `developed-character-repository.ts` (CHABUIPIP-06)
- Do NOT create any service, route, or LLM code
- Do NOT modify any models
- Do NOT modify `json-entity-repository.ts`

## Detailed Changes

### New file `src/persistence/character-web-repository.ts`:

Follow the `createJsonEntityRepository` pattern (see kernel-repository.ts or concept-repository.ts):

```typescript
const characterWebRepository = createJsonEntityRepository<SavedCharacterWeb>({
  lockPrefix: 'character-web',
  entityLabel: 'character web',
  notFoundLabel: 'Character web',
  ensureDir: ensureCharacterWebsDir,
  getDir: getCharacterWebsDir,
  getFilePath: getCharacterWebFilePath,
  isEntity: isSavedCharacterWeb,
});
```

Export named functions:
- `saveCharacterWeb(web: SavedCharacterWeb): Promise<void>`
- `loadCharacterWeb(id: string): Promise<SavedCharacterWeb>`
- `updateCharacterWeb(id: string, updater: (web: SavedCharacterWeb) => SavedCharacterWeb): Promise<SavedCharacterWeb>`
- `deleteCharacterWeb(id: string): Promise<void>`
- `listCharacterWebs(): Promise<SavedCharacterWeb[]>`
- `characterWebExists(id: string): Promise<boolean>`

Storage path: `character-webs/{id}.json` (managed by file-utils).

## Acceptance Criteria

### Tests that must pass

- `test/unit/persistence/character-web-repository.test.ts`:
  - `saveCharacterWeb` writes a valid web to disk
  - `loadCharacterWeb` reads a previously saved web
  - `loadCharacterWeb` throws for non-existent ID
  - `updateCharacterWeb` applies updater function and persists
  - `deleteCharacterWeb` removes the file
  - `listCharacterWebs` returns all saved webs sorted by updatedAt desc
  - `characterWebExists` returns true/false appropriately

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Repository uses atomic writes (via `createJsonEntityRepository`)
- Repository validates loaded data with `isSavedCharacterWeb` type guard
- No existing tests are modified
