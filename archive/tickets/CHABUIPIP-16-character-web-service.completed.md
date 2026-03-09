# CHABUIPIP-16: Character Web Service

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-05, CHABUIPIP-06, CHABUIPIP-08, CHABUIPIP-14, CHABUIPIP-15
**Estimated diff size**: ~250 lines

## Summary

Create the `CharacterWebService` that wraps repositories, LLM generation, and converters into a cohesive service layer. Follows the `kernel-service.ts` factory pattern.

## Assumption Corrections

- The ticket dependencies are already implemented in the current codebase. `SavedCharacterWeb`, `SavedDevelopedCharacter`, both repositories, `generateCharacterWeb()`, `runCharacterStage()`, and the converter functions already exist and should be reused rather than reintroduced.
- `runCharacterStage()` is intentionally pure and does not load or save from repositories. That separation is correct architecture, so CHABUIPIP-16 should keep repository coordination in the service layer instead of pushing persistence down into the runner.
- `generateCharacterWeb()` already encapsulates the direct LLM call for web generation. The service should delegate to it rather than add another layer of raw LLM orchestration.
- `toDecomposedCharacter()` already reads protagonist identity from `SavedDevelopedCharacter.webContext.protagonistName`. Only the lightweight conversion still needs an explicit `protagonistName`, which the service should source from the saved web.
- `loadCharacterWeb()` returns `SavedCharacterWeb | null`, but `loadDevelopedCharacter()` throws when a character is missing. The service contract should normalize these repository differences into a clean service boundary.
- `listDevelopedCharactersByWebId()` currently lists all developed characters and filters in memory. That is acceptable for this ticket’s scope, but the service must avoid layering extra aliasing or duplicate filtering abstractions on top of it.
- Existing architecture already prefers thin coordination services over “god services.” This ticket should implement orchestration only: validation, repository coordination, stage/reset rules, and conversion assembly. It should not absorb repository, converter, or runner responsibilities.

## File List

- `src/server/services/character-web-service.ts` (CREATE)
- `test/unit/server/services/character-web-service.test.ts` (CREATE)
- `src/server/services/index.ts` (MODIFY: export the new service)

## Out of Scope

- Do NOT create Express routes (CHABUIPIP-17)
- Do NOT create EJS views or client JS (CHABUIPIP-20)
- Do NOT modify the entity decomposer (CHABUIPIP-18)
- Do NOT modify story creation flow (CHABUIPIP-19)
- Do NOT redesign repositories, converter logic, or stage-runner internals
- Do NOT introduce backwards-compatibility aliases or duplicate orchestration layers

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
- **`generateCharacterStage`**: Loads character, loads the source web for shared inputs, loads sibling chars for Stage 4 only, runs stage runner, saves result
- **`regenerateCharacterStage`**: Clears target stage + all downstream stages, then generates
- **`deleteWeb`**: Deletes web + all associated developed characters
- **`toDecomposedCharacters`**: Loads web + all chars. Developed → full conversion via each character snapshot. Undeveloped → lightweight conversion using `web.protagonistName`.
- **`toDecomposedCharacters`**: Returns characters with the protagonist first because downstream story prep still treats index `0` as the protagonist.

Validation and boundary rules:

- Service methods should trim string inputs where they represent user-entered identifiers or names.
- Missing `webId` / `charId` lookups should fail with explicit errors from the service boundary instead of leaking raw repository inconsistencies where avoidable.
- `initializeCharacter` should reject duplicate developed characters for the same `webId` + `characterName`; creating multiple developed artifacts for one assignment would be a worse long-term architecture than forcing a single source of truth per web character.
- `initializeCharacter` should reject names that are not present in the saved web assignments.
- `generateCharacterStage` should pass `otherDevelopedCharacters` only for stage 4 and should exclude the target character from that sibling list.
- `toDecomposedCharacters` should not infer protagonist ordering from list order returned by repositories; it must sort explicitly by saved protagonist identity.

Export singleton: `export const characterWebService = createCharacterWebService()`

## Acceptance Criteria

### Tests that must pass

- `test/unit/server/services/character-web-service.test.ts`:
  - `createWeb` persists a new web with metadata and empty assignments
  - `generateWeb` calls LLM and updates web with assignments + archetypes + `protagonistName`
  - `regenerateWeb` clears web data and re-generates without deleting characters
  - `initializeCharacter` creates character with webContext snapshot, including `protagonistName`, and null stages
  - `initializeCharacter` rejects names not present in the web assignments
  - `initializeCharacter` rejects duplicate developed entries for the same web character
  - `generateCharacterStage` runs stage runner and persists updated character
  - `generateCharacterStage` for Stage 4 loads other developed characters
  - `generateCharacterStage` for non-Stage-4 does not pass sibling characters
  - `regenerateCharacterStage` clears downstream stages before regenerating
  - `deleteWeb` removes web and all associated characters
  - `toDecomposedCharacters` returns mix of full and lightweight conversions
  - `toDecomposedCharacters` uses full conversion for completed characters
  - `toDecomposedCharacters` uses lightweight conversion for undeveloped characters
  - `toDecomposedCharacters` keeps the protagonist first in the returned array
  - `loadWeb` returns null for non-existent web
  - `loadCharacter` returns null for non-existent character
  - `generateWeb` fails if generated assignments do not contain exactly one protagonist

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Service uses dependency injection via factory pattern
- Service delegates to repositories (no direct file I/O)
- Service delegates to stage runner (no direct LLM calls for character stages)
- Service delegates to `generateCharacterWeb()` for web generation
- Service treats protagonist identity as persisted web data, not caller-supplied ambient state
- Service remains a thin orchestration layer; repositories, converter logic, and stage runner stay single-purpose
- Prefer fixing integration breakage at the source over adding aliases or compatibility shims

## Outcome

- Completed on 2026-03-09.
- What actually changed:
  - Added `src/server/services/character-web-service.ts` as the orchestration boundary for character web lifecycle, stage generation/regeneration, character initialization, and mixed conversion to `DecomposedCharacter[]`.
  - Added `test/unit/server/services/character-web-service.test.ts` covering service persistence, progress events, duplicate prevention, stage-4 sibling loading, downstream-stage reset behavior, null-on-missing loads, and protagonist-first conversion ordering.
  - Updated `src/server/services/index.ts` to export the new service.
- Deviations from the original plan:
  - Kept `regenerateWeb()` and `regenerateCharacterStage()` transactional at the service layer: they clear stale downstream state in memory before regeneration, but do not persist an intermediate “half-cleared” artifact if generation fails.
  - Normalized repository inconsistencies at the service boundary instead of modifying the repositories in this ticket. `loadCharacterWeb()` still returns `null`, while the developed-character repository still throws on missing IDs.
  - Enforced one developed artifact per `(webId, characterName)` pair. This was not explicit in the original ticket, but it is the cleaner long-term architecture than allowing duplicate developed-character records for one assignment.
- Verification results:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/services/character-web-service.test.ts`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/services/character-web-service.test.ts test/unit/models/saved-character-web.test.ts test/unit/models/saved-developed-character.test.ts test/unit/models/character-web-converter.test.ts test/unit/persistence/character-web-repository.test.ts test/unit/persistence/developed-character-repository.test.ts test/unit/llm/character-web-generation.test.ts test/unit/llm/character-stage-runner.test.ts test/unit/llm/char-kernel-generation.test.ts test/unit/llm/char-tridimensional-generation.test.ts test/unit/llm/char-agency-generation.test.ts test/unit/llm/char-relationships-generation.test.ts test/unit/llm/char-presentation-generation.test.ts`
  - `npm run typecheck`
  - `npm run lint`
