# Character-Building Pipeline (Redesigned)

**Status**: IN PROGRESS (redesign — supersedes original batch pipeline)

## Redesign Summary

The original spec proposed a 6-stage batch pipeline processing ALL characters simultaneously through every stage as a "cast." This has been **superseded** by a two-phase architecture:

1. **Character Web** (new artifact) — generates cast roles + lightweight relationship archetypes as a saved, reusable artifact
2. **Individual Character Development** — lets users develop any character from the web through a 5-stage pipeline independently

**Rationale**: The batch pipeline forced users to develop ALL characters simultaneously, with no ability to focus on individuals. The redesign matches the app's established pattern of independent, reusable artifacts (kernels, concept seeds, concepts).

## Implementation Progress

### Implemented

| File | Status | Notes |
|------|--------|-------|
| `src/models/character-enums.ts` | DONE | Shared enums and guards reused by web + stage pipelines |
| `src/models/character-pipeline-types.ts` | DONE | Includes `CastPipelineInputs`, `RelationshipArchetype`, `DeepRelationshipResult`, and `CharacterDevStage` |
| `src/models/saved-character-web.ts` | DONE | Web artifact model with persisted `protagonistName` contract |
| `src/models/saved-developed-character.ts` | DONE | Per-character artifact model plus completion/prerequisite helpers |
| `src/persistence/character-web-repository.ts` | DONE | JSON repository for saved webs |
| `src/persistence/developed-character-repository.ts` | DONE | JSON repository for developed characters |
| `src/llm/character-web-generation.ts` | DONE | Web generation orchestrator over prompt + schema |
| `src/llm/character-stage-runner.ts` | DONE | Pure in-memory stage orchestrator; no repository access |
| `src/models/character-web-converter.ts` | DONE | Full + lightweight `DecomposedCharacter` conversion |
| `src/services/character-web-service.ts` | DONE | Thin coordination layer over repositories, runner, and converter |
| `src/config/schemas.ts` | DONE | `characterWebsDir` is the active storage config |
| `src/config/generation-stage-metadata.json` | DONE | Character-web and character-stage progress events registered |

### Remaining Steps

| Step | Description | Status |
|------|-------------|--------|
| 1 | Update spec file | This file |
| 2 | New data models (SavedCharacterWeb, SavedDevelopedCharacter) | DONE |
| 3 | Persistence layer (two repositories + file-utils) | DONE |
| 4 | LLM pipeline — Web generation (1 prompt + schema + orchestrator) | DONE |
| 5 | LLM pipeline — Individual character development (5 prompts + 5 schemas + stage runner) | DONE |
| 6 | Converters (full + lightweight DecomposedCharacter conversion) | DONE |
| 7 | Service layer (CharacterWebService) | DONE |
| 8 | Express routes | DONE |
| 9 | EJS view + client JS | NOT STARTED |
| 10 | Entity decomposer adaptation (worldbuilding-only mode) | DONE |
| 11 | Story creation integration | DONE |
| 12 | Progress tracking | DONE |

### Boundary Corrections

- `runCharacterStage()` is intentionally pure. It validates prerequisites, builds stage context from the in-memory character, dispatches to the correct generation module, emits progress events, and returns an updated character payload. It does **not** load from or save to repositories.
- Repository coordination belongs in `CharacterWebService`, not in the runner. That service loads webs/characters, handles stage-reset rules, supplies Stage 4 sibling context, persists updated artifacts, and assembles mixed full/lightweight decomposition output.
- Protagonist identity is now a persisted data contract:
  - `SavedCharacterWeb.protagonistName`
  - `SavedDevelopedCharacter.webContext.protagonistName`
- `toDecomposedCharacter()` reads protagonist identity from the saved character snapshot. Only the lightweight conversion still takes `protagonistName` explicitly because it converts from web-level assignment data rather than a developed snapshot.

---

## Architecture Overview

```
Kernel/Concept (existing) ──> Character Web (new artifact)
                                  │
                    ┌─────────────┼──────────────┐
                    ▼             ▼              ▼
              Character A   Character B    Character C
              (5 stages)    (5 stages)     (undeveloped)
                    │             │              │
                    ▼             ▼              ▼
              Full Decomposed  Full Decomposed  Lightweight
              Character        Character        Decomposed
                    │             │              │
                    └─────────────┼──────────────┘
                                  ▼
                          Story Creation
```

---

## Step 2: Data Models

### 2a: `SavedCharacterWeb` (new file: `src/models/saved-character-web.ts`)

Replaces `SavedCast` conceptually. Contains the web-level artifact data.

```typescript
interface SavedCharacterWeb {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceKernelId?: string;
  readonly sourceConceptId?: string;
  readonly protagonistName: string;
  readonly inputs: CastPipelineInputs; // reuse from saved-cast.ts (extract to shared location)
  readonly assignments: readonly CastRoleAssignment[];
  readonly relationshipArchetypes: readonly RelationshipArchetype[];
  readonly castDynamicsSummary: string;
}
```

Includes `isSavedCharacterWeb` type guard and a helper that enforces exactly one protagonist assignment when a generated web is persisted.

### 2b: `SavedDevelopedCharacter` (new file: `src/models/saved-developed-character.ts`)

Per-character artifact with 5 development stages:

```typescript
interface SavedDevelopedCharacter {
  readonly id: string;
  readonly characterName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceWebId: string;
  readonly sourceWebName: string;
  readonly webContext: CharacterWebContext; // snapshot of this character's web data
  readonly characterKernel: CharacterKernel | null;        // Stage 1
  readonly tridimensionalProfile: TridimensionalProfile | null; // Stage 2
  readonly agencyModel: AgencyModel | null;                // Stage 3
  readonly deepRelationships: DeepRelationshipResult | null;   // Stage 4
  readonly textualPresentation: TextualPresentation | null;    // Stage 5
  readonly completedStages: readonly CharacterDevStage[];
}
```

Includes `isSavedDevelopedCharacter` type guard, `isCharacterStageComplete`, `canGenerateCharacterStage`, `isCharacterFullyComplete` helpers.

**`CharacterWebContext`** (embedded snapshot of this character's web data):

```typescript
interface CharacterWebContext {
  readonly assignment: CastRoleAssignment;
  readonly protagonistName: string;
  readonly relationshipArchetypes: readonly RelationshipArchetype[];
  readonly castDynamicsSummary: string;
}
```

### 2c: Update `character-pipeline-types.ts`

Add these new types (keep all existing types — they're reused):

```typescript
// NEW — lightweight relationship for the web artifact
interface RelationshipArchetype {
  readonly fromCharacter: string;
  readonly toCharacter: string;
  readonly relationshipType: PipelineRelationshipType;
  readonly valence: RelationshipValence;
  readonly essentialTension: string; // one-line dramatic summary
}

// NEW — deep relationships result (Stage 4 of individual development)
interface DeepRelationshipResult {
  readonly relationships: readonly CastRelationship[]; // full version with history/leverage
  readonly secrets: readonly string[];
  readonly personalDilemmas: readonly string[];
}

// NEW — individual character development stage numbering
type CharacterDevStage = 1 | 2 | 3 | 4 | 5;

const CHARACTER_DEV_STAGE_NAMES: Record<CharacterDevStage, string> = {
  1: 'Character Kernel',
  2: 'Tridimensional Profile',
  3: 'Agency Model',
  4: 'Deep Relationships',
  5: 'Textual Presentation',
};
```

Note: `CastRelationship` (the full version with history/leverage/numericValence) is kept for Stage 4 (Deep Relationships). `RelationshipArchetype` is the lightweight version for the web.

### 2d: Retire `SavedCast`

- Delete `src/models/saved-cast.ts` (nothing uses it in production)
- Extract `CastPipelineInputs` to `character-pipeline-types.ts` before deletion
- Remove `CastPipelineStage` type and `CAST_PIPELINE_STAGE_NAMES` from `character-pipeline-types.ts`
- In `src/config/schemas.ts`: rename `castsDir` to `characterWebsDir`

---

## Step 3: Persistence Layer

### 3a: `src/persistence/character-web-repository.ts`

Uses `createJsonEntityRepository<SavedCharacterWeb>` pattern.

- Storage path: `character-webs/{id}.json`
- Exports: `saveCharacterWeb`, `loadCharacterWeb`, `updateCharacterWeb`, `deleteCharacterWeb`, `listCharacterWebs`, `characterWebExists`

### 3b: `src/persistence/developed-character-repository.ts`

Uses `createJsonEntityRepository<SavedDevelopedCharacter>` pattern.

- Storage path: `character-webs/characters/{id}.json`
- Exports: `saveDevelopedCharacter`, `loadDevelopedCharacter`, `updateDevelopedCharacter`, `deleteDevelopedCharacter`, `listDevelopedCharacters`, `listDevelopedCharactersByWebId`

### 3c: `src/persistence/file-utils.ts`

Add:
- `getCharacterWebsDir()`, `ensureCharacterWebsDir()`, `getCharacterWebFilePath(webId)`
- `getDevelopedCharactersDir()`, `ensureDevelopedCharactersDir()`, `getDevelopedCharacterFilePath(charId)`

### 3d: `src/config/schemas.ts`

Replace `castsDir` with `characterWebsDir`.

---

## Step 4: LLM Pipeline — Web Generation

Single LLM call that generates the character web (cast roles + lightweight relationship archetypes + cast dynamics summary).

### 4a: `src/llm/prompts/character-web-prompt.ts`

- Input: kernel summary + concept summary + user notes
- Output: `{ assignments: CastRoleAssignment[], relationshipArchetypes: RelationshipArchetype[], castDynamicsSummary: string }`

### 4b: `src/llm/schemas/character-web-schema.ts`

JSON Schema for structured LLM output. Uses existing enums (StoryFunction, CharacterDepth, PipelineRelationshipType, RelationshipValence).

### 4c: `src/llm/character-web-generation.ts`

Orchestrator: build messages -> logPrompt -> call OpenRouter -> parse -> validate -> return typed result. Follows `spine-generator.ts` pattern.

---

## Step 5: LLM Pipeline — Individual Character Development (5 stages)

### Prompt builders (new files in `src/llm/prompts/`):

| File | Stage | Input | Output |
|------|-------|-------|--------|
| `char-kernel-prompt.ts` | 1 | webContext + kernel/concept | CharacterKernel |
| `char-tridimensional-prompt.ts` | 2 | webContext + stage 1 + kernel/concept | TridimensionalProfile |
| `char-agency-prompt.ts` | 3 | webContext + stages 1-2 + kernel/concept | AgencyModel |
| `char-relationships-prompt.ts` | 4 | webContext + stages 1-3 + other developed chars + kernel/concept | DeepRelationshipResult |
| `char-presentation-prompt.ts` | 5 | webContext + stages 1-4 + kernel/concept | TextualPresentation |

### Schemas (new files in `src/llm/schemas/`):

- `char-kernel-schema.ts`
- `char-tridimensional-schema.ts`
- `char-agency-schema.ts`
- `char-relationships-schema.ts`
- `char-presentation-schema.ts`

### Stage runner: `src/llm/character-stage-runner.ts`

Pure orchestration unit over the five stage generators. It validates prerequisites, builds the prompt context from the provided in-memory character plus shared inputs, emits the existing `GENERATING_CHAR_*` progress events, and returns an updated character payload without persistence.

**Stage 4 special**: sibling developed characters are caller-provided. The runner does not query repositories.

### Context type:

```typescript
interface CharacterDevPromptContext {
  readonly kernelSummary?: string;
  readonly conceptSummary?: string;
  readonly userNotes?: string;
  readonly webContext: CharacterWebContext;
  readonly characterKernel?: CharacterKernel;            // from stage 1+
  readonly tridimensionalProfile?: TridimensionalProfile; // from stage 2+
  readonly agencyModel?: AgencyModel;                    // from stage 3+
  readonly deepRelationships?: DeepRelationshipResult;   // from stage 4+
  readonly otherDevelopedCharacters?: readonly SavedDevelopedCharacter[]; // for stage 4
}
```

### Key prompt design rule:

Each prompt receives ALL prior stage outputs as context. The prompt builder accumulates context progressively. Stage 5 prompt sees the full character build from stages 1-4 plus the web context.

### LLM call pattern (follows spine-generator.ts):

1. Build messages via prompt builder
2. Log prompt via `logPrompt()`
3. Call OpenRouter with `response_format` schema
4. Parse JSON response
5. Validate enum values with type guards
6. Return typed result

---

## Step 6: Converters

Status: DONE

### `src/models/character-web-converter.ts`

Two conversion modes:

**Full conversion** (for developed characters):
`toDecomposedCharacter(char: SavedDevelopedCharacter): DecomposedCharacter`

| DecomposedCharacter field | Source |
|---------------------------|--------|
| name | webContext.assignment.characterName |
| coreTraits | tridimensionalProfile.coreTraits |
| motivations | characterKernel.superObjective |
| protagonistRelationship | deepRelationships (protagonist gets null; NPCs get their relationship with protagonist, mapped to DecomposedRelationship) |
| knowledgeBoundaries | textualPresentation.knowledgeBoundaries |
| falseBeliefs | agencyModel.falseBeliefs |
| secretsKept | deepRelationships.secrets (filtered per character) |
| decisionPattern | agencyModel.decisionPattern |
| coreBeliefs | agencyModel.coreBeliefs |
| conflictPriority | textualPresentation.conflictPriority |
| appearance | textualPresentation.appearance |
| speechFingerprint | textualPresentation.speechFingerprint |
| rawDescription | Synthesized from kernel + tridimensional profile |

**Lightweight conversion** (for undeveloped characters):
`toDecomposedCharacterFromWeb(assignment: CastRoleAssignment, archetypes: RelationshipArchetype[], protagonistName: string): DecomposedCharacter`

Maps role + archetype data to a minimal DecomposedCharacter (similar quality to current entity decomposer output).

### Relationship mapping (full conversion):

```
CastRelationship -> DecomposedRelationship:
  valence: numericValence (already -5 to +5)
  dynamic: relationshipType enum value (e.g., "MENTOR", "RIVAL")
  history: history
  currentTension: currentTension
  leverage: leverage
```

Full conversion reads protagonist identity from `char.webContext.protagonistName`, not from a caller-supplied parameter.

Only maps relationships where the protagonist is involved.

---

## Step 7: Service Layer

Status: DONE

### `src/services/character-web-service.ts`

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

**`regenerateWeb`**: Re-generates the saved web and does NOT delete existing developed characters (they keep their webContext snapshot).

**`regenerateCharacterStage`**: Clears stage + all downstream stages, then generates.

**`toDecomposedCharacters`**: Loads web + all developed characters. Developed -> full conversion from each saved character snapshot. Undeveloped -> lightweight conversion using `web.protagonistName`.
**`toDecomposedCharacters`**: Returns characters with the protagonist first because downstream story prep still relies on index `0` as the protagonist.

Implemented service-level invariants:

- Input strings are trimmed at the service boundary.
- `initializeCharacter()` rejects names not present in the saved web assignments.
- `initializeCharacter()` rejects duplicate developed artifacts for the same `(webId, characterName)` pair.
- Missing character-web lookups are normalized into explicit service errors; missing developed-character lookups are normalized to `null` on `loadCharacter()`.
- Stage 4 sibling context is loaded by the service and excludes the target character itself.

---

## Step 8: Express Routes

### `src/server/routes/character-webs.ts`

```
GET  /character-webs                                    -> Render character-webs.ejs
GET  /character-webs/api/list                           -> List saved webs (JSON)
GET  /character-webs/api/:webId                         -> Load web + character statuses (JSON)
POST /character-webs/api/create                         -> Create empty web (body: { name, inputs })
POST /character-webs/api/:webId/generate                -> Generate web (body: { apiKey, progressId? })
POST /character-webs/api/:webId/regenerate              -> Regenerate web (body: { apiKey, progressId? })
DELETE /character-webs/api/:webId                       -> Delete web + all characters

GET  /character-webs/api/:webId/characters              -> List developed characters for web
POST /character-webs/api/:webId/characters/init         -> Init character (body: { characterName })
POST /character-webs/api/characters/:charId/generate    -> Generate stage (body: { stage, apiKey, progressId? })
POST /character-webs/api/characters/:charId/regenerate  -> Regenerate stage (body: { stage, apiKey, progressId? })
GET  /character-webs/api/characters/:charId             -> Load developed character
DELETE /character-webs/api/characters/:charId           -> Delete developed character
```

Register in `src/server/routes/index.ts`.

Error handling follows the kernel routes pattern — catches LLMError separately with structured debug info in non-production mode.

---

## Step 9: EJS View & Client JS

### `src/server/views/pages/character-webs.ejs`

Single page with:
1. **Web management panel**: list webs, create new (select kernel/concept, user notes), delete
2. **Web display**: cast roles + relationship archetypes in visual layout
3. **Character list**: shows each character with development status badges
4. **Character development panel**: accordion with 5 stages (Generate/Regenerate/Approve each)

### `public/js/src/11-character-webs.js`

Client controller. After creating, run `node scripts/concat-client-js.js`.

### Modify `src/server/views/pages/home.ejs`

Add "Character Webs" card/link.

---

## Step 10: Entity Decomposer Adaptation

### `src/llm/prompts/world-decomposer-prompt.ts` (new)

Worldbuilding-only prompt — decomposes world facts only, no characters. Same world decomposition logic but explicitly instructs: "Decompose ONLY the worldbuilding into structured world facts. Character data is provided separately — do NOT generate character profiles."

### Modify `src/llm/entity-decomposer.ts`

Add `decomposeWorldbuildingOnly(context, apiKey)` -> `{ decomposedWorld, rawResponse }`.

### `src/llm/schemas/world-decomposition-schema.ts` (new)

Schema with only `worldFacts` array, not the `characters` array.

---

## Step 11: Story Creation Integration

### Modify `src/models/story.ts`

Add optional `webId?: string` to Story interface.

### Modify `src/engine/types.ts`

Add optional `webId?: string` to `StartStoryOptions`.

### Modify `src/engine/story-service.ts`

In `buildPreparedStory()`:
- If `webId` present: load web -> `toDecomposedCharacters()` -> `decomposeWorldbuildingOnly()` -> skip full entity decomposition
- If `webId` absent: unchanged flow

### Modify `src/server/views/pages/new-story.ejs`

Add "Load Character Web" dropdown.

### Modify `src/server/routes/stories.ts`

Accept `webId` in story creation, pass to storyEngine.

### Flow when webId is provided:

1. Load SavedCharacterWeb by webId
2. Convert to DecomposedCharacter[] via character-web-converter (mixed: full for developed, lightweight for undeveloped)
3. Run worldbuilding-only decomposition (no character decomposition)
4. Proceed with spine -> structure -> first page as normal

### Flow when webId is NOT provided:

Unchanged — full entity decomposition (characters + world) as before.

---

## Step 12: Progress Tracking

Status: DONE

Implemented:

- `src/engine/generated-generation-stages.ts` includes:
  - `GENERATING_CHARACTER_WEB`
  - `GENERATING_CHAR_KERNEL`
  - `GENERATING_CHAR_TRIDIMENSIONAL`
  - `GENERATING_CHAR_AGENCY`
  - `GENERATING_CHAR_RELATIONSHIPS`
  - `GENERATING_CHAR_PRESENTATION`
- `src/config/generation-stage-metadata.json` registers the same stages for generated stage metadata.

Still pending:

- Any client-facing progress UI wiring required by future character-web routes and pages.

### Future UI work: `public/js/src/01-constants.js`

Add STAGE_DISPLAY_NAMES and STAGE_PHRASE_POOLS:

```
GENERATING_CHARACTER_WEB: "Weaving Character Web"
GENERATING_CHAR_KERNEL: "Building Character Kernel"
GENERATING_CHAR_TRIDIMENSIONAL: "Creating Tridimensional Profile"
GENERATING_CHAR_AGENCY: "Modeling Agency"
GENERATING_CHAR_RELATIONSHIPS: "Deepening Relationships"
GENERATING_CHAR_PRESENTATION: "Crafting Presentation"
```

---

## Existing Code Reuse

| Existing Code | Reused For |
|---------------|-----------|
| `character-enums.ts` (all 7 enums) | Web generation + all character dev stages |
| `character-pipeline-types.ts` (CastRoleAssignment, CharacterKernel, TridimensionalProfile, AgencyModel, CastRelationship, TextualPresentation) | Character dev stages — used as-is |
| `CastPipelineInputs` from `saved-cast.ts` | Web inputs — extract to shared location before retiring SavedCast |
| `createJsonEntityRepository` | Both repositories |
| `SpeechFingerprint` from `decomposed-character.ts` | Stage 5 (Presentation) |
| Kernel routes/service pattern | Web routes/service structure |
| `spine-generator.ts` LLM call pattern | Web + character stage LLM calls |

## Code to Retire

| File/Code | Reason |
|-----------|--------|
| `src/models/saved-cast.ts` | Replaced by `SavedCharacterWeb` + `SavedDevelopedCharacter` |
| `CastPipelineStage` type | Replaced by `CharacterDevStage` |
| `CAST_PIPELINE_STAGE_NAMES` | Replaced by `CHARACTER_DEV_STAGE_NAMES` |
| `castsDir` in schemas.ts | Replaced by `characterWebsDir` |

---

## Critical Files to Reuse (existing patterns)

- `src/persistence/json-entity-repository.ts` — Repository factory pattern
- `src/server/services/kernel-service.ts` — Service factory pattern with LLM generation
- `src/server/routes/kernels.ts` — Route pattern with progress tracking
- `src/llm/entity-decomposition-contract.ts` — SpeechFingerprint schema fields (reuse in Stage 5)
- `src/models/decomposed-character.ts` — Target interface for converter
- `src/server/services/generation-progress.ts` — Progress tracking service
- `src/llm/spine-generator.ts` — LLM call pattern (fetch + parse + retry)
- `src/llm/schemas/spine-schema.ts` — JSON Schema structure for `response_format`
- `src/server/routes/generation-progress-route.ts` — Route-level progress helper

---

## Verification Criteria

1. **Unit tests**: Type guards, helpers, converter mappings, stage prerequisite logic
2. **Integration tests**: Full web generation + character development pipeline with mocked LLM
3. **Manual E2E**:
   - Create web from kernel/concept -> generate -> see roles + relationships
   - Pick a character -> develop through all 5 stages -> approve each
   - Create story using the web -> verify DecomposedCharacter output
   - Create story with partially developed web -> verify mixed conversion (full + lightweight)
   - Create story without web -> verify unchanged flow (backwards compatibility)
4. **Worldbuilding-only decomposition**: Verify entity decomposer only produces worldFacts when webId is present
