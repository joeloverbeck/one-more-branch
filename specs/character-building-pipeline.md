# Character-Building Pipeline

**Status**: IN PROGRESS

## Implementation Progress

### Already Implemented (Step 2 + partial Step 3)

| File | Status | Notes |
|------|--------|-------|
| `src/models/character-enums.ts` | DONE | 7 enums + value arrays + type guards |
| `src/models/character-pipeline-types.ts` | DONE | All 6 stage output interfaces + CastPipelineStage type |
| `src/models/saved-cast.ts` | DONE | SavedCast interface + isSavedCast guard + helper functions |
| `src/config/schemas.ts` | DONE | `castsDir` added to StorageConfigSchema |

### Remaining Steps

| Step | Description | Status |
|------|-------------|--------|
| 1 | Write spec file | This file |
| 2 | Enums and data models | DONE |
| 3 | Persistence layer | `castsDir` schema done; cast-repository.ts + file-utils.ts functions NOT YET |
| 4 | LLM pipeline (6 prompts + 6 schemas + orchestrator) | NOT STARTED |
| 5 | Cast-to-DecomposedCharacter converter | NOT STARTED |
| 6 | Service layer | NOT STARTED |
| 7 | Express routes | NOT STARTED |
| 8 | EJS view and client JS | NOT STARTED |
| 9 | Entity decomposer adaptation | NOT STARTED |
| 10 | Story creation integration | NOT STARTED |
| 11 | Progress tracking | NOT STARTED |

---

## Context

The app has a comprehensive story generation pipeline (kernel -> concept -> spine -> structure) but lacks a pipeline for creating characters. Currently, characters enter as free text on `/stories/new` and are decomposed in a single LLM call by the entity decomposer. This produces acceptable results but suffers from implicit dependency degradation: the LLM must simultaneously reason about narrative function, objectives, motivation, agency, relationships, AND speech patterns in one shot.

Research from narrative theory (Greimas, Propp, Egri, Stanislavski, Rimmon-Kenan) and LLM prompting evidence (least-to-most decomposition, tree-of-thoughts) confirms that character creation has real dependencies that degrade when flattened. The solution: a 6-stage pipeline where each stage constrains the next, with enum taxonomies where they improve downstream behavior.

## Design Decisions

- **Standalone `/characters` route** — reusable across stories, like /kernels and /concepts
- **6-stage pipeline**: Cast Roles -> Character Kernels -> Motivation -> Agency -> Social Web -> Presentation
- **Selective taxonomy** (~7 enums where they drive behavior, freeform prose where creativity matters)
- **User reviews each stage** before proceeding (approve/regenerate)
- **Protagonist included** in the cast alongside NPCs
- **Entity decomposer adaptation**: worldbuilding-only mode when pipeline characters are used
- **All prior stages as context** for each prompt (maximum coherence)

---

## Data Models

### Enums (`src/models/character-enums.ts`) — IMPLEMENTED

```
StoryFunction: ANTAGONIST | RIVAL | ALLY | MENTOR | CATALYST | OBSTACLE | FOIL | TRICKSTER | INNOCENT
CharacterDepth: FLAT | ROUND
ReplanningPolicy: NEVER | ON_FAILURE | ON_NEW_INFORMATION | PERIODIC
EmotionSalience: LOW | MEDIUM | HIGH
PipelineRelationshipType: KIN | ALLY | RIVAL | PATRON | CLIENT | MENTOR | SUBORDINATE | ROMANTIC | EX_ROMANTIC | INFORMANT
RelationshipValence: POSITIVE | NEGATIVE | AMBIVALENT
VoiceRegister: FORMAL | NEUTRAL | COLLOQUIAL | CEREMONIAL | TECHNICAL | VULGAR | POETIC
```

Each enum has a corresponding `is*` type guard and `*_VALUES` constant array.

### Per-Stage Output Interfaces (`src/models/character-pipeline-types.ts`) — IMPLEMENTED

**Stage 1 — CastRoleAssignment**: `{ characterName, isProtagonist, storyFunction, characterDepth, narrativeRole, conflictRelationship }`
**Stage 1 — CastRolesResult**: `{ assignments[], castDynamicsSummary }`

**Stage 2 — CharacterKernel**: `{ characterName, superObjective, immediateObjectives[], primaryOpposition, stakes[], constraints[], pressurePoint }`

**Stage 3 — TridimensionalProfile**: `{ characterName, physiology, sociology, psychology, derivationChain, coreTraits[] }`

**Stage 4 — AgencyModel**: `{ characterName, replanningPolicy, emotionSalience, coreBeliefs[], desires[], currentIntentions[], falseBeliefs[], decisionPattern }`

**Stage 5 — CastRelationship**: `{ fromCharacter, toCharacter, relationshipType, valence, numericValence, history, currentTension, leverage }`
**Stage 5 — SocialWebResult**: `{ relationships[], secrets[], dilemmas[] }`
**Stage 5 — CastSecret**: `{ characterName, secret }`

**Stage 6 — TextualPresentation**: `{ characterName, voiceRegister, speechFingerprint (reuses SpeechFingerprint from decomposed-character.ts), appearance, knowledgeBoundaries, conflictPriority }`

**CastPipelineStage**: `1 | 2 | 3 | 4 | 5 | 6`

### SavedCast (`src/models/saved-cast.ts`) — IMPLEMENTED

```typescript
{
  id, name, createdAt, updatedAt,
  sourceKernelId?, sourceConceptId?,
  pipelineInputs: { kernelSummary?, conceptSummary?, userNotes? },
  castRoles: CastRolesResult | null,
  characterKernels: CharacterKernel[] | null,
  tridimensionalProfiles: TridimensionalProfile[] | null,
  agencyModels: AgencyModel[] | null,
  socialWeb: SocialWebResult | null,
  textualPresentations: TextualPresentation[] | null,
  completedStages: CastPipelineStage[]
}
```

Includes `isSavedCast` type guard, `isStageComplete`, `canGenerateStage`, `isFullyComplete` helpers.

---

## Step 3: Persistence Layer

### Files to create:
- `src/persistence/cast-repository.ts` — Uses `createJsonEntityRepository<SavedCast>` pattern from `json-entity-repository.ts`

### Files to modify:
- `src/config/schemas.ts` — Add `castsDir` to StorageConfigSchema — **DONE**
- `src/persistence/file-utils.ts` — Add `getCastsDir()`, `ensureCastsDir()`, `getCastFilePath(castId)` following the kernel pattern

### Repository exports:
```
saveCast(cast: SavedCast): Promise<void>
loadCast(castId: string): Promise<SavedCast | null>
updateCast(castId: string, updater: (existing: SavedCast) => SavedCast): Promise<SavedCast>
deleteCast(castId: string): Promise<void>
listCasts(): Promise<SavedCast[]>
castExists(castId: string): Promise<boolean>
```

---

## Step 4: LLM Pipeline (6 Prompt Builders + 6 Schemas + Orchestrator)

### Files to create:

**Prompt builders:**
- `src/llm/prompts/cast-roles-prompt.ts` — Stage 1. Input: kernel + concept + user notes. Output: CastRolesResult
- `src/llm/prompts/character-kernel-prompt.ts` — Stage 2. Input: cast roles + kernel + concept. Output: CharacterKernel[]
- `src/llm/prompts/tridimensional-prompt.ts` — Stage 3. Input: stages 1-2 + kernel + concept. Output: TridimensionalProfile[]
- `src/llm/prompts/agency-model-prompt.ts` — Stage 4. Input: stages 1-3 + kernel + concept. Output: AgencyModel[]
- `src/llm/prompts/social-web-prompt.ts` — Stage 5. Input: stages 1-4 + kernel + concept. Output: SocialWebResult
- `src/llm/prompts/presentation-prompt.ts` — Stage 6. Input: stages 1-5 + kernel + concept. Output: TextualPresentation[]

**JSON Schemas (for OpenRouter `response_format`):**
- `src/llm/schemas/cast-roles-schema.ts`
- `src/llm/schemas/character-kernel-schema.ts`
- `src/llm/schemas/tridimensional-schema.ts`
- `src/llm/schemas/agency-model-schema.ts`
- `src/llm/schemas/social-web-schema.ts`
- `src/llm/schemas/presentation-schema.ts`

**Orchestrator:**
- `src/llm/cast-stage-runner.ts` — Loads cast, validates prerequisites, runs prompt, parses response, saves result

### Files to modify:
- `src/config/stage-model.ts` — Add LlmStage entries: `castRoles`, `characterKernel`, `tridimensional`, `agencyModel`, `socialWeb`, `presentation`
- `src/engine/types.ts` — Add GenerationStage entries: `CASTING_ROLES`, `GENERATING_KERNELS_CAST`, `GENERATING_TRIDIMENSIONAL`, `GENERATING_AGENCY`, `GENERATING_SOCIAL_WEB`, `GENERATING_PRESENTATION`

Note: `GENERATING_KERNELS` already exists for kernel ideation, so the cast version uses `GENERATING_KERNELS_CAST` to avoid collision.

### Key prompt design rule:
Each prompt receives ALL prior stage outputs as context. The prompt builder accumulates context progressively. Stage 6 prompt sees the full character build from stages 1-5.

### Prompt context type:

```typescript
interface CastPromptContext {
  kernelSummary?: string;
  conceptSummary?: string;
  userNotes?: string;
  castRoles?: CastRolesResult;           // available from stage 2+
  characterKernels?: CharacterKernel[];   // available from stage 3+
  tridimensionalProfiles?: TridimensionalProfile[];  // available from stage 4+
  agencyModels?: AgencyModel[];           // available from stage 5+
  socialWeb?: SocialWebResult;            // available from stage 6
}
```

### LLM call pattern (follows spine-generator.ts):
1. Build messages via prompt builder
2. Log prompt via `logPrompt()`
3. Call OpenRouter with `response_format` schema
4. Parse JSON response
5. Validate enum values with type guards
6. Return typed result

---

## Step 5: Cast-to-DecomposedCharacter Converter

### Files to create:
- `src/models/cast-converter.ts` — `toDecomposedCharacters(cast: SavedCast): DecomposedCharacter[]`

### Field mapping:

| DecomposedCharacter field | Source |
|---------------------------|--------|
| name | castRoles.characterName |
| coreTraits | tridimensionalProfiles.coreTraits |
| motivations | characterKernels.superObjective |
| protagonistRelationship | socialWeb (protagonist gets null; NPCs get their relationship with protagonist, mapped to DecomposedRelationship) |
| knowledgeBoundaries | textualPresentations.knowledgeBoundaries |
| falseBeliefs | agencyModels.falseBeliefs |
| secretsKept | socialWeb.secrets (filtered per character) |
| decisionPattern | agencyModels.decisionPattern |
| coreBeliefs | agencyModels.coreBeliefs |
| conflictPriority | textualPresentations.conflictPriority |
| appearance | textualPresentations.appearance |
| speechFingerprint | textualPresentations.speechFingerprint |
| rawDescription | Synthesized from kernel + tridimensional profile |

### Relationship mapping:

```
CastRelationship -> DecomposedRelationship:
  valence: numericValence (already -5 to +5)
  dynamic: relationshipType enum value (e.g., "MENTOR", "RIVAL")
  history: history
  currentTension: currentTension
  leverage: leverage
```

The converter only maps relationships where `toCharacter` is the protagonist (for NPC->protagonist relationships).

---

## Step 6: Service Layer

### Files to create:
- `src/server/services/cast-service.ts` — `createCastService()` factory

### Interface:

```typescript
interface CastService {
  generateStage(stage: CastPipelineStage, castId: string, apiKey: string, onGenerationStage?: GenerationStageCallback): Promise<SavedCast>;
  regenerateStage(stage: CastPipelineStage, castId: string, apiKey: string, onGenerationStage?: GenerationStageCallback): Promise<SavedCast>;
  createCast(name: string, inputs: CastPipelineInputs): Promise<SavedCast>;
  saveCast(cast: SavedCast): Promise<void>;
  loadCast(castId: string): Promise<SavedCast | null>;
  listCasts(): Promise<SavedCast[]>;
  deleteCast(castId: string): Promise<void>;
  toDecomposedCharacters(cast: SavedCast): DecomposedCharacter[];
}
```

### Behavior:
- `generateStage`: Validates prerequisites via `canGenerateStage`, loads cast, runs `cast-stage-runner`, saves updated cast
- `regenerateStage`: Same as generate but clears the stage output first (and all downstream stages), then generates
- `createCast`: Creates a new SavedCast with null stages and `completedStages: []`
- `toDecomposedCharacters`: Delegates to cast-converter.ts; requires `isFullyComplete(cast)` or throws

### Files to modify:
- `src/server/services/index.ts` — Export cast service

---

## Step 7: Express Routes

### Files to create:
- `src/server/routes/characters.ts`

### Routes:

```
GET  /characters                      -> Render characters.ejs
GET  /characters/api/list             -> List saved casts (JSON)
GET  /characters/api/:castId          -> Load cast (JSON)
POST /characters/api/create           -> Create empty cast (body: { name, inputs })
POST /characters/api/:castId/generate -> Generate specific stage (body: { stage, apiKey, progressId? })
POST /characters/api/:castId/regenerate -> Regenerate specific stage (body: { stage, apiKey, progressId? })
POST /characters/api/:castId/save     -> Save/update cast
DELETE /characters/api/:castId        -> Delete cast
```

### Files to modify:
- `src/server/routes/index.ts` — Register `/characters` route: `router.use('/characters', characterRoutes);`

### Error handling:
Follows the kernel routes pattern — catches LLMError separately with structured debug info in non-production mode.

---

## Step 8: EJS View and Client JS

### Files to create:
- `src/server/views/pages/characters.ejs` — Single page with progressive accordion sections
- `public/js/src/11-characters-controller.js` — Client-side controller

### UI structure:

1. **Input panel**: Load kernel dropdown, load concept dropdown, cast name input, user notes textarea
2. **Stages 1-6**: Each section locked until prior approved. Generate/Regenerate/Approve buttons. Stage output rendered in structured display.
3. **Save panel**: Active when all 6 stages complete.

### Stage display:
Each stage section shows:
- Stage name and number
- Lock icon if prerequisites not met
- Generate button (if prerequisites met, stage not yet generated)
- Regenerate button (if stage already generated)
- Structured display of stage output (when generated)
- Warning that regenerating clears downstream stages

### After creating client JS:
Run `node scripts/concat-client-js.js` to regenerate `public/js/app.js`

### Files to modify:
- `src/server/views/pages/home.ejs` — Add "Build Characters" card/link

---

## Step 9: Entity Decomposer Adaptation

### Files to create:
- `src/llm/prompts/world-decomposer-prompt.ts` — Worldbuilding-only prompt (no character decomposition)

### Files to modify:
- `src/llm/entity-decomposer.ts` — Add `decomposeWorldbuildingOnly(context, apiKey)` method that only produces `{ decomposedWorld, rawResponse }` (no `decomposedCharacters`)
- `src/llm/entity-decomposer-types.ts` — Add `WorldDecomposerContext` interface (same as EntityDecomposerContext but without character fields)

### Worldbuilding-only prompt:
Same world decomposition logic but the prompt explicitly instructs: "Decompose ONLY the worldbuilding into structured world facts. Character data is provided separately — do NOT generate character profiles."

### Schema:
A new `WORLD_DECOMPOSITION_SCHEMA` that only has the `worldFacts` array, not the `characters` array.

---

## Step 10: Story Creation Integration

### Files to modify:

- `src/models/story.ts` — Add optional `castId?: string` to Story interface
- `src/engine/types.ts` — Add optional `castId?: string` to StartStoryOptions
- `src/engine/story-service.ts` — In `buildPreparedStory()`: if castId present, load cast -> `toDecomposedCharacters()` -> `decomposeWorldbuildingOnly()` -> skip full entity decomposition
- `src/server/views/pages/new-story.ejs` — Add "Load Cast" dropdown that populates character data from a saved cast
- `src/server/routes/stories.ts` — Accept castId in story creation, pass to storyEngine

### Flow when castId is provided:
1. Load SavedCast by castId
2. Convert to DecomposedCharacter[] via cast-converter
3. Run worldbuilding-only decomposition (no character decomposition)
4. Proceed with spine -> structure -> first page as normal

### Flow when castId is NOT provided:
Unchanged — full entity decomposition (characters + world) as before.

---

## Step 11: Progress Tracking

### Files to modify:

- `src/server/services/generation-progress.ts` — Add `'cast-generation'` to `GenerationFlowType`
- `src/engine/types.ts` — New GenerationStage values: `CASTING_ROLES`, `GENERATING_KERNELS_CAST`, `GENERATING_TRIDIMENSIONAL`, `GENERATING_AGENCY`, `GENERATING_SOCIAL_WEB`, `GENERATING_PRESENTATION`
- `public/js/src/01-constants.js` — Add `STAGE_DISPLAY_NAMES` and `STAGE_PHRASE_POOLS` for the 6 new stages

### Stage display names:
```
CASTING_ROLES: "Assigning Cast Roles"
GENERATING_KERNELS_CAST: "Building Character Kernels"
GENERATING_TRIDIMENSIONAL: "Creating Tridimensional Profiles"
GENERATING_AGENCY: "Modeling Agency"
GENERATING_SOCIAL_WEB: "Weaving Social Web"
GENERATING_PRESENTATION: "Crafting Presentation"
```

---

## Verification Criteria

1. **Unit tests**: Test each stage's prompt builder, schema validation, and response parsing. Test cast-converter mapping to DecomposedCharacter. Test cast-service CRUD operations.
2. **Integration test**: Full 6-stage pipeline execution with mocked LLM responses. Verify each stage output feeds correctly into the next.
3. **Manual E2E**: Start at localhost:3000/characters, load a concept, generate all 6 stages, save cast. Go to /stories/new, load the saved cast, generate spine, create story. Verify the story's decomposedCharacters match the cast output.
4. **Backwards compatibility**: Create a story WITHOUT a cast (free-text characters). Verify the full entity decomposition path still works unchanged.
5. **Worldbuilding-only decomposition**: Create a story WITH a cast. Verify entity decomposition only produces worldFacts, no character data.

---

## Critical Files to Reuse (existing patterns)

- `src/persistence/json-entity-repository.ts` — Repository factory pattern
- `src/server/services/kernel-service.ts` — Service factory pattern with LLM generation
- `src/server/routes/kernels.ts` — Route pattern with progress tracking
- `src/llm/entity-decomposition-contract.ts` — SpeechFingerprint schema fields (reuse in Stage 6)
- `src/models/decomposed-character.ts` — Target interface for converter
- `src/server/services/generation-progress.ts` — Progress tracking service
- `src/llm/spine-generator.ts` — LLM call pattern (fetch + parse + retry)
- `src/llm/schemas/spine-schema.ts` — JSON Schema structure for `response_format`
- `src/server/routes/generation-progress-route.ts` — Route-level progress helper
