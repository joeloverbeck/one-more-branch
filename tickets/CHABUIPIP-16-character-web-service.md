# CHABUIPIP-16: Character Web Service

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-05, CHABUIPIP-06, CHABUIPIP-08, CHABUIPIP-14, CHABUIPIP-15
**Estimated diff size**: ~250 lines

## Summary

Create the `CharacterWebService` that wraps repositories, LLM generation, and converters into a cohesive service layer. Follows the `kernel-service.ts` factory pattern.

## File List

- `src/server/services/character-web-service.ts` (CREATE)
- `test/unit/server/services/character-web-service.test.ts` (CREATE)

## Out of Scope

- Do NOT create Express routes (CHABUIPIP-17)
- Do NOT create EJS views or client JS (CHABUIPIP-20)
- Do NOT modify the entity decomposer (CHABUIPIP-18)
- Do NOT modify story creation flow (CHABUIPIP-19)
- Do NOT modify any existing services
- Do NOT redesign repositories or models beyond wiring the already-shipped protagonist identity contract

## Detailed Changes

### `src/server/services/character-web-service.ts`:

Factory pattern: `createCharacterWebService(deps?)` returning service object.

```typescript
interface CharacterWebService {
  // Web management
  createWeb(name: string, inputs: CastPipelineInputs): Promise<SavedCharacterWeb>;
  generateWeb(webId: string, apiKey: string, onStage?: GenerationStageCallback): Promise<SavedCharacterWeb>;
  regenerateWeb(webId: string, apiKey: string, onStage?: GenerationStageCallback): Promise<SavedCharacterWeb>;
  loadWeb(webId: string): Promise<SavedCharacterWeb | null>;
  listWebs(): Promise<SavedCharacterWeb[]>;
  deleteWeb(webId: string): Promise<void>;

  // Individual character development
  initializeCharacter(webId: string, characterName: string): Promise<SavedDevelopedCharacter>;
  generateCharacterStage(charId: string, stage: CharacterDevStage, apiKey: string, onStage?: GenerationStageCallback): Promise<SavedDevelopedCharacter>;
  regenerateCharacterStage(charId: string, stage: CharacterDevStage, apiKey: string, onStage?: GenerationStageCallback): Promise<SavedDevelopedCharacter>;
  loadCharacter(charId: string): Promise<SavedDevelopedCharacter | null>;
  listCharactersForWeb(webId: string): Promise<SavedDevelopedCharacter[]>;
  deleteCharacter(charId: string): Promise<void>;

  // Conversion for story creation
  toDecomposedCharacters(webId: string): Promise<DecomposedCharacter[]>;
}
```

Key behaviors:

- **`createWeb`**: Creates metadata-only web (no LLM call), persists to repository. `protagonistName` starts empty until assignments exist.
- **`generateWeb`**: Loads web, calls character-web-generation LLM, derives the sole protagonist via `getProtagonistAssignment()`, and saves `protagonistName` alongside assignments/archetypes
- **`regenerateWeb`**: Clears web assignments/archetypes, re-generates. Does NOT delete existing developed characters
- **`initializeCharacter`**: Creates a SavedDevelopedCharacter with null stages, snapshots `webContext` from current web including `protagonistName`
- **`generateCharacterStage`**: Loads character, loads other chars (for Stage 4), runs stage runner, saves result
- **`regenerateCharacterStage`**: Clears target stage + all downstream stages, then generates
- **`deleteWeb`**: Deletes web + all associated developed characters
- **`toDecomposedCharacters`**: Loads web + all chars. Developed → full conversion via each character snapshot. Undeveloped → lightweight conversion using `web.protagonistName`.
- **`toDecomposedCharacters`**: Returns characters with the protagonist first because downstream story prep still treats index `0` as the protagonist.

Export singleton: `export const characterWebService = createCharacterWebService()`

## Acceptance Criteria

### Tests that must pass

- `test/unit/server/services/character-web-service.test.ts`:
  - `createWeb` persists a new web with metadata and empty assignments
  - `generateWeb` calls LLM and updates web with assignments + archetypes + `protagonistName`
  - `regenerateWeb` clears web data and re-generates without deleting characters
  - `initializeCharacter` creates character with webContext snapshot, including `protagonistName`, and null stages
  - `generateCharacterStage` runs stage runner and persists updated character
  - `generateCharacterStage` for Stage 4 loads other developed characters
  - `regenerateCharacterStage` clears downstream stages before regenerating
  - `deleteWeb` removes web and all associated characters
  - `toDecomposedCharacters` returns mix of full and lightweight conversions
  - `toDecomposedCharacters` uses full conversion for completed characters
  - `toDecomposedCharacters` uses lightweight conversion for undeveloped characters
  - `toDecomposedCharacters` keeps the protagonist first in the returned array
  - `loadWeb` returns null for non-existent web

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Service uses dependency injection via factory pattern
- Service delegates to repositories (no direct file I/O)
- Service delegates to stage runner (no direct LLM calls for character stages)
- Service treats protagonist identity as persisted web data, not caller-supplied ambient state
- No existing services are modified
