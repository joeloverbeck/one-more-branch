# CHABUIPIP-06: Developed Character Repository

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-03, CHABUIPIP-04
**Estimated diff size**: ~100 lines

## Summary

Create the persistence layer for `SavedDevelopedCharacter` using the `createJsonEntityRepository` pattern. Add a `listDevelopedCharactersByWebId` helper that filters by `sourceWebId`.

## File List

- `src/persistence/developed-character-repository.ts` (CREATE)
- `src/persistence/file-utils.ts` (MODIFY — add `getDevelopedCharactersDir`, `ensureDevelopedCharactersDir`, `getDevelopedCharacterFilePath`)
- `test/unit/persistence/developed-character-repository.test.ts` (CREATE)

## Out of Scope

- Do NOT modify `character-web-repository.ts`
- Do NOT create any service, route, or LLM code
- Do NOT modify any models
- Do NOT modify `json-entity-repository.ts`

## Detailed Changes

### In `file-utils.ts`:

Add:
- `getDevelopedCharactersDir()` — returns `path.join(getCharacterWebsDir(), 'characters')`
- `ensureDevelopedCharactersDir()` — ensures the directory exists
- `getDevelopedCharacterFilePath(charId: string)` — returns `path.join(getDevelopedCharactersDir(), charId + '.json')`

### New file `src/persistence/developed-character-repository.ts`:

```typescript
const developedCharacterRepository = createJsonEntityRepository<SavedDevelopedCharacter>({
  lockPrefix: 'developed-character',
  entityLabel: 'developed character',
  notFoundLabel: 'Developed character',
  ensureDir: ensureDevelopedCharactersDir,
  getDir: getDevelopedCharactersDir,
  getFilePath: getDevelopedCharacterFilePath,
  isEntity: isSavedDevelopedCharacter,
});
```

Export named functions:
- `saveDevelopedCharacter(char: SavedDevelopedCharacter): Promise<void>`
- `loadDevelopedCharacter(id: string): Promise<SavedDevelopedCharacter>`
- `updateDevelopedCharacter(id: string, updater: (char: SavedDevelopedCharacter) => SavedDevelopedCharacter): Promise<SavedDevelopedCharacter>`
- `deleteDevelopedCharacter(id: string): Promise<void>`
- `listDevelopedCharacters(): Promise<SavedDevelopedCharacter[]>`
- `listDevelopedCharactersByWebId(webId: string): Promise<SavedDevelopedCharacter[]>` — filters `listDevelopedCharacters()` by `sourceWebId === webId`

Storage path: `character-webs/characters/{id}.json`.

## Acceptance Criteria

### Tests that must pass

- `test/unit/persistence/developed-character-repository.test.ts`:
  - `saveDevelopedCharacter` writes a valid character to disk
  - `loadDevelopedCharacter` reads a previously saved character
  - `loadDevelopedCharacter` throws for non-existent ID
  - `updateDevelopedCharacter` applies updater and persists
  - `deleteDevelopedCharacter` removes the file
  - `listDevelopedCharacters` returns all saved characters
  - `listDevelopedCharactersByWebId` returns only characters matching the webId
  - `listDevelopedCharactersByWebId` returns empty array when no matches

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Repository uses atomic writes (via `createJsonEntityRepository`)
- Repository validates loaded data with `isSavedDevelopedCharacter` type guard
- Developed characters are stored under the character-webs directory (nested)
- No existing tests are modified

## Outcome

- **Completed**: 2026-03-08
- **Files created**: `src/persistence/developed-character-repository.ts`, `test/unit/persistence/developed-character-repository.test.ts`
- **Files modified**: `src/persistence/file-utils.ts` (added `getDevelopedCharactersDir`, `ensureDevelopedCharactersDir`, `getDevelopedCharacterFilePath`)
- **Design note**: `loadDevelopedCharacter` throws on not-found (wrapping the null-returning internal repo), unlike `loadCharacterWeb` which returns null
- **Deviations**: None
- **Verification**: 8/8 tests pass, typecheck clean, lint clean, no regressions
