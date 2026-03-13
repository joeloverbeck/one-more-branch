# Worldbuilding Generation, Canonicalization, and Prompt-Preparation Pipeline

**Status**: IMPLEMENTED (Phase 1 — core pipeline, storage, routes, character/story integration)
**Supersedes**: the earlier 2-stage worldbuilding proposal

## Implementation Notes (2026-03-13)

**Corrections applied from the implementation plan:**
- Section 2.3 (`WorldRequirements`) and Section 4.0 (requirements derivation) DELETED — worldbuilding is standalone, not concept-coupled. Seed prompt takes free-form user inputs.
- Section 10.5 (runtime reveal system) DEFERRED — all facts available to all prompts for now. No `visibility`, `revealTier`, `WorldVisibility`, `RevealTier`, `WorldMutability` on WorldFact.
- `WorldFactType` keeps codebase values (NORM, DISPUTED) and adds PRACTICE, TABOO — total 8 values.
- `DecomposedWorld.rawWorldbuilding` kept as optional for backward compatibility.
- Story creation and character web forms accept worldbuildingId for dropdown selection.
- `FormatDecomposedWorldOptions` simplified to consumer-only filtering (no reveal tracking).

## Context

The project has mature pipelines for story kernels, concepts, spines, character webs, and character development, but worldbuilding is still treated too much like raw prose plus late decomposition. That is not enough for branching interactive storytelling where:

- the player is always the protagonist,
- each page is generated individually,
- world information must be revealed gradually,
- choices must feel enabled by the world rather than stapled on top of it,
- and the same world must stay coherent across spines, character generation, page generation, and long-term state.

This spec replaces the earlier proposal with a **unified world asset pipeline** that does four jobs at once:

1. creates a compelling author-facing world,
2. produces a stable machine-readable canon,
3. prepares filtered prompt views for different consumers,
4. supports protagonist-facing reveal in runtime story generation.

The pipeline remains **2 LLM stages** for cost control, but adds a deterministic canonicalization layer and shared prompt-section builders. It also integrates worldbuilding into the **character pipeline**, not just the spine path.

---

## 0. Design Principles

### 0.1 Meaningful departure, not novelty spam

Do **not** reward random strangeness. The pipeline should specify what meaningfully departs from ordinary reality, what that departure enables, what it forbids, and what it costs. Unmarked assumptions may remain inferable.

### 0.2 Worldbuilding is a pressure system

The world is not just background lore. It must generate pressure, friction, asymmetry, taboo, opportunity, scarcity, and mistaken belief.

### 0.3 Lived world beats encyclopedia

The pipeline must privilege:

- what daily life feels like,
- how institutions touch bodies and habits,
- what people believe publicly,
- what is hidden or misread,
- and what the protagonist can actually notice or act on.

### 0.4 Preserve strategic incompleteness

Not everything should be canonized. Some areas should remain open on purpose so later stories/pages can discover rather than contradict them. The world asset must explicitly track **open questions**.

### 0.5 Filter by focalization

Different consumers should not receive the same world dump.

- **Author-side prompts** (spine, character web, character dev) may receive hidden world pressures.
- **Player-facing runtime page prompts** should receive only public or already-revealed facts by default.

### 0.6 Every major world system must afford actual choices

If a world detail cannot plausibly shape a page-level decision, scene conflict, or interpretive tension, it should not be prioritized.

### 0.7 Coverage is subordinate to dramatic utility

Do not aim for equal coverage of all world domains. Expand only the domains that bear conflict, atmosphere, perception, or choice.

---

## 1. Core Architecture Changes

### 1.1 Use one saved world asset model

Remove the split between “generated worldbuilding” and “saved decomposed worldbuilding.” Both pipelines should converge to the same downstream asset:

- pipeline-generated worlds,
- pasted-and-decomposed worlds,
- imported worlds.

All of them must end as a single `SavedWorldbuilding` containing a canonical `DecomposedWorld`.

### 1.2 Keep 2 LLM stages, add deterministic canonicalization

The pipeline remains:

1. **World Seed**
2. **World Elaboration**

After stage 2, run a deterministic canonicalization layer that:

- validates IDs,
- converts elaboration output into `DecomposedWorld`,
- builds consumer-specific prompt sections,
- enforces hidden/public filtering rules.

### 1.3 Replace flat prompt insertion with consumer-specific world sections

Worldbuilding should no longer be shoved into prompts as one raw prose blob or one flat fact dump. Add shared builders that format the same world differently for:

- spine generation,
- character web generation,
- character dev stages,
- runtime page generation.

### 1.4 Integrate worldbuilding into the character pipeline

The world must not only feed the spine. Character naming, occupations, taboos, factions, dress, dialect, leverage, and social roles all depend on it. The character web and later character stages must accept structured world input.

### 1.5 Add runtime reveal scaffolding

The story engine should track which world facts are currently revealed, so page prompts stop leaking hidden truths.

---

## 2. Data Models

## 2.1 Enhance `src/models/decomposed-world.ts`

### Required changes

- Replace index-based fact references with stable IDs
- Add reveal/access metadata
- Add interactive affordance metadata
- Add world-level deliberate unknowns
- Expand `formatDecomposedWorldForPrompt()` into a filtered formatter

```typescript
export type NarrativeWeight = 'LOW' | 'MEDIUM' | 'HIGH';
export type WorldVisibility = 'PUBLIC' | 'DISCOVERABLE' | 'HIDDEN';
export type RevealTier = 'EARLY' | 'MID' | 'LATE';
export type WorldStoryFunction =
  | 'EPIC'
  | 'EPISTEMIC'
  | 'DRAMATIC'
  | 'ATMOSPHERIC'
  | 'THEMATIC';
export type WorldMutability = 'STATIC' | 'STATEFUL';

export type WorldFactType =
  | 'LAW'
  | 'BELIEF'
  | 'RUMOR'
  | 'MYSTERY'
  | 'PRACTICE'
  | 'TABOO';

export interface WorldFact {
  readonly id: string; // stable ID, never array index
  readonly domain: WorldFactDomain;
  readonly fact: string;
  readonly scope: string;
  readonly factType?: WorldFactType;

  // importance / thematics
  readonly narrativeWeight?: NarrativeWeight;
  readonly thematicTag?: string;

  // concreteness / presentation
  readonly sensoryHook?: string;
  readonly exampleEvidence?: string; // how this fact shows up in-scene

  // graph structure
  readonly tensionWithIds?: readonly string[];
  readonly implicationOfIds?: readonly string[];

  // reveal control
  readonly visibility?: WorldVisibility;
  readonly revealTier?: RevealTier;

  // interactive utility
  readonly storyFunctions?: readonly WorldStoryFunction[];
  readonly sceneAffordances?: readonly string[]; // actual choices/conflicts this fact enables
  readonly mutability?: WorldMutability; // candidate runtime state track vs fixed canon
}

export interface DecomposedWorld {
  readonly worldLogline?: string; // 1-2 sentence summary of world logic + pressure
  readonly facts: readonly WorldFact[];
  readonly openQuestions?: readonly string[]; // intentionally left uncanonized
}

export interface FormatDecomposedWorldOptions {
  readonly consumer: 'SPINE' | 'CHARACTER_WEB' | 'CHARACTER_DEV' | 'PAGE';
  readonly includeHidden?: boolean;
  readonly revealedFactIds?: readonly string[];
  readonly currentLocationHint?: string;
  readonly maxFactsPerSection?: number;
}
```

### Formatter behavior

Update `formatDecomposedWorldForPrompt(world, options)` so it:

- sorts by `narrativeWeight` first, then by relevance to the consumer,
- never relies on array order or `#N` references,
- groups facts into sections instead of rendering one flat list,
- includes `openQuestions` only for author-side consumers,
- excludes unrevealed hidden facts for `consumer: 'PAGE'`,
- prioritizes facts whose `sceneAffordances` are usable in the current scene,
- renders:
  - `[HIGH]` / `[MEDIUM]` tags,
  - sensory hooks,
  - evidence signals,
  - tension / implication links by stable ID.

### Important correction

The earlier proposal used `tensionWith` and `implicationOf` as indices. That is brittle under reordering, regeneration, or partial filtering. Use stable IDs only.

---

## 2.2 Add revised world seed model (`src/models/world-seed.ts` — NEW)

The seed must generate not just ontology, but **playable pressure**.

```typescript
export interface WorldInvariant {
  readonly invariant: string;   // what is always true in this world
  readonly consequence: string; // what it enables/constrains
  readonly humanCost: string;   // what this does to actual people
}

export interface PowerStructure {
  readonly holder: string;
  readonly mechanism: string;
  readonly vulnerability: string;
}

export interface CulturalFaultLine {
  readonly tension: string;
  readonly groups: readonly string[];
  readonly narrativePotential: string;
}

export interface WorldPressure {
  readonly pressure: string;
  readonly affectedGroups: readonly string[];
  readonly escalationPath: string;
  readonly storyFunction: 'EPIC' | 'EPISTEMIC' | 'DRAMATIC';
}

export interface AnchorLocation {
  readonly name: string;
  readonly publicFace: string;
  readonly hiddenPressure: string;
  readonly sensorySignature: string;
  readonly likelySceneUse: string;
}

export interface EverydayPractice {
  readonly practice: string;
  readonly whoPerformsIt: string;
  readonly socialMeaning: string;
  readonly costOfRefusal: string;
  readonly sensoryCue: string;
}

export interface PublicMystery {
  readonly mystery: string;
  readonly commonExplanation: string;
  readonly hiddenTruthHint: string;
}

export interface NamingLexicon {
  readonly personNameStyle: string;
  readonly placeNameStyle: string;
  readonly titles: readonly string[];
  readonly idioms: readonly string[];
  readonly tabooTerms: readonly string[];
}

export interface StoryVector {
  readonly vector: string;
  readonly type: 'EPIC' | 'EPISTEMIC' | 'DRAMATIC';
  readonly centralQuestion: string;
  readonly stakes: string;
  readonly likelyOpposition: string;
}

export interface SensoryPalette {
  readonly textures: readonly string[];
  readonly sounds: readonly string[];
  readonly smells: readonly string[];
  readonly colors: readonly string[];
}

export interface WorldSeed {
  readonly signatureElements: readonly string[];          // 3-5
  readonly invariants: readonly WorldInvariant[];         // 3-6
  readonly powerStructures: readonly PowerStructure[];    // 1-4
  readonly culturalFaultLines: readonly CulturalFaultLine[]; // 1-4
  readonly pressures: readonly WorldPressure[];           // 2-5
  readonly anchorLocations: readonly AnchorLocation[];    // 2-5
  readonly everydayPractices: readonly EverydayPractice[]; // 3-6
  readonly publicMysteries: readonly PublicMystery[];     // 1-3
  readonly namingLexicon: NamingLexicon;
  readonly storyVectors: readonly StoryVector[];          // 2-5
  readonly sensoryPalette: SensoryPalette;
}
```

### Why this seed is better than the earlier version

The earlier seed model was close, but still too abstract. It needed:

- **anchor locations** for spatial play,
- **everyday practices** for lived-world texture,
- **public mysteries** for epistemic play,
- **story vectors** for branchable narrative pressure,
- **naming lexicon** for linguistic consistency.

---

## 2.3 Add requirements model (`src/models/worldbuilding-requirements.ts` — NEW)

This is a deterministic bridge from concept/kernel to worldbuilding prompt context.

```typescript
export interface WorldRequirements {
  readonly conflictAxis?: string;
  readonly valueAtStake?: string;
  readonly dramaticQuestion?: string;
  readonly protagonistRole?: string;
  readonly playerFantasy?: string;
  readonly startingSituation?: string;
  readonly preferredPlotModes: readonly ('EPIC' | 'EPISTEMIC' | 'DRAMATIC')[];
  readonly hardConstraints: readonly string[];
}
```

### Notes

- This is **not** an LLM stage.
- It is derived from `ConceptSpec`, `StoryKernel`, `ConceptVerification`, tone, and user notes.
- It ensures the world seed prompt is fed with actual story requirements instead of only raw concept text.

---

## 2.4 Replace split saved models with one unified saved asset

### Delete

- `src/models/saved-decomposed-worldbuilding.ts`

### Add / revise

`src/models/saved-worldbuilding.ts` becomes the single asset model for both generated and raw-decomposed worlds.

```typescript
export type WorldbuildingSourceKind =
  | 'PIPELINE'
  | 'RAW_DECOMPOSED'
  | 'IMPORTED';

export interface WorldbuildingPipelineInputs {
  readonly userNotes?: string;
  readonly contentPreferences?: string;
  readonly startingSituation?: string;
}

export interface SavedWorldbuilding {
  readonly id: string;
  readonly name: string;
  readonly sourceKind: WorldbuildingSourceKind;
  readonly createdAt: string;
  readonly updatedAt: string;

  // linkage
  readonly sourceConceptId?: string;

  // inputs
  readonly inputs: WorldbuildingPipelineInputs;

  // author-facing build artifacts
  readonly worldSeed: WorldSeed | null;
  readonly rawWorldMarkdown: string | null;

  // import/decompose support
  readonly rawSourceText: string | null;

  // engine-facing canon
  readonly decomposedWorld: DecomposedWorld | null;

  // only relevant to sourceKind === 'PIPELINE'
  readonly completedStages: readonly WorldbuildingDevStage[];
}
```

### Why unify

There is no downstream reason to treat “generated” and “decomposed” worlds as different asset classes once both have a canonical `DecomposedWorld`. A unified model simplifies:

- storage,
- routing,
- list UIs,
- story creation selection,
- character pipeline integration.

---

## 2.5 Worldbuilding stage types (`src/models/worldbuilding-pipeline-types.ts` — NEW)

```typescript
export type WorldbuildingDevStage = 1 | 2;

export const WORLDBUILDING_STAGE_NAMES: Record<WorldbuildingDevStage, string> = {
  1: 'World Seed',
  2: 'World Elaboration',
};
```

---

## 3. Storage

## 3.1 Directory structure

Use one directory:

```text
worldbuilding/
  {id}.json   # SavedWorldbuilding
```

No `decomposed/` subdirectory.

## 3.2 Config (`src/config/schemas.ts` — MODIFY)

Add `worldbuildingDir` to `StorageConfigSchema` with default `'worldbuilding'`.

## 3.3 File utils (`src/persistence/file-utils.ts` — MODIFY)

Add helpers:

- `getWorldbuildingDir()`
- `ensureWorldbuildingDir()`
- `getWorldbuildingFilePath(id)`

## 3.4 Repository (`src/persistence/worldbuilding-repository.ts` — NEW)

CRUD only for the unified asset:

- `saveWorldbuilding`
- `loadWorldbuilding`
- `listWorldbuildings`
- `deleteWorldbuilding`
- `listWorldbuildingsByConcept(conceptId)` (recommended)

---

## 4. Generation Pipeline

## 4.0 Deterministic requirements derivation

**File**: `src/services/worldbuilding-requirements.ts` — NEW

Build `WorldRequirements` from:

- `ConceptSpec`
- `StoryKernel`
- `ConceptVerification`
- tone
- user notes
- content preferences
- optional starting situation

### Responsibilities

- derive the protagonist-facing needs of the world,
- infer whether the concept wants more epic / epistemic / dramatic support,
- collect hard content constraints,
- surface player fantasy / protagonist role if present.

No new generation stage is needed.

---

## 4.1 Stage 1: World Seed Generation

**Files**:

- `src/llm/worldbuilding-seed-generation.ts` — NEW
- `src/llm/prompts/worldbuilding-seed-prompt.ts` — NEW
- `src/llm/schemas/worldbuilding-seed-schema.ts` — NEW

### Prompt context

```typescript
export interface WorldSeedPromptContext {
  readonly requirements: WorldRequirements;
  readonly conceptSpec?: ConceptSpec;
  readonly storyKernel?: StoryKernel;
  readonly conceptVerification?: ConceptVerification;
  readonly userNotes?: string;
  readonly contentPreferences?: string;
  readonly tone?: string;
}
```

### Output

`WorldSeed`

### Stage goal

Generate the **deep logic and dramatic engines** of the world, not a finished encyclopedia.

### Prompt rules

1. Specify only meaningful departures from default reality.
2. Every invariant must include consequence **and** human cost.
3. Build from conflict axis and value-at-stake outward.
4. Generate multiple story vectors, not a single corridor.
5. Create places scenes can happen, not just abstract institutions.
6. Show daily-life practices, not only macro lore.
7. Include public misunderstandings / mysteries where useful.
8. Produce naming and idiom guidance so later character prompts stay culturally coherent.
9. Do **not** attempt full domain coverage.

### Bad outcomes to explicitly forbid

- generic fantasy boilerplate,
- pure lore accumulation,
- novelty without consequence,
- heavy macro-history with no lived effect,
- worlds that only support one obvious story.

### Generation stage

- `GENERATING_WORLD_SEED`
- display: `"Seeding World"`

---

## 4.2 Stage 2: World Elaboration

**Files**:

- `src/llm/worldbuilding-elaboration-generation.ts` — NEW
- `src/llm/prompts/worldbuilding-elaboration-prompt.ts` — NEW
- `src/llm/schemas/worldbuilding-elaboration-schema.ts` — NEW

### Prompt context

```typescript
export interface WorldElaborationPromptContext {
  readonly worldSeed: WorldSeed;
  readonly requirements: WorldRequirements;
  readonly conceptSpec?: ConceptSpec;
  readonly storyKernel?: StoryKernel;
  readonly userNotes?: string;
  readonly tone?: string;
}
```

### Output

```typescript
export interface WorldElaborationResult {
  readonly worldLogline: string;
  readonly rawWorldMarkdown: string;
  readonly worldFacts: readonly WorldFact[];
  readonly openQuestions: readonly string[];
}
```

### Stage goal

Turn the seed into a **writer-usable** and **engine-usable** world.

### Prompt rules

1. Expand only domains with dramatic utility.
2. Every fact must do at least one of the following:
   - constrain action,
   - create opportunity,
   - shape perception,
   - define status/power,
   - generate mystery,
   - support a likely choice.
3. Facts must use stable IDs.
4. Facts must include visibility / reveal metadata where inferable.
5. Facts must include `storyFunctions` so later prompt builders can select facts by use case.
6. Facts should include `sceneAffordances` whenever a detail can drive an actual page choice.
7. Distinguish:
   - public truth,
   - contested belief,
   - rumor,
   - hidden pressure,
   - unresolved mystery.
8. Keep some `openQuestions` on purpose.
9. Produce author-facing markdown sections, not just JSON.

### Required author-facing markdown structure

The stage should generate `rawWorldMarkdown` with these sections:

1. **World Logline**
2. **What Is Always True Here**
3. **What Daily Life Feels Like**
4. **Power, Hierarchy, and Enforcement**
5. **Anchor Locations**
6. **Public Beliefs, Rumors, and Taboos**
7. **Hidden Pressures and Misread Truths**
8. **Story Vectors / Choice Pressures**
9. **Naming, Idiom, and Surface Texture**
10. **Open Questions**

### Domain rule correction

The earlier proposal leaned toward expanding “relevant domains” from a 12-domain set. Keep the domain taxonomy, but do **not** optimize for domain coverage. Optimize for world details that produce story pressure or experiential texture.

### Generation stage

- `ELABORATING_WORLD`
- display: `"Elaborating World"`

---

## 4.3 Raw decomposition / import path

**Files**:

- `src/llm/worldbuilding-decomposer.ts` — MODIFY
- `src/llm/schemas/entity-decomposer-schema.ts` — MODIFY

### Behavior

Pasted raw worldbuilding should still be supported, but it must end in the same unified asset:

- `sourceKind: 'RAW_DECOMPOSED'`
- `rawSourceText` populated
- `decomposedWorld` populated
- `worldSeed` null
- `rawWorldMarkdown` null unless a later optional “writer-format” pass is added

### Schema updates

Update `WORLD_FACTS_ARRAY_SCHEMA` so raw decomposition can emit:

- `id`
- `narrativeWeight`
- `thematicTag`
- `sensoryHook`
- `exampleEvidence`
- `tensionWithIds`
- `implicationOfIds`
- `visibility`
- `revealTier`
- `storyFunctions`
- `sceneAffordances`
- `mutability`

Also allow:

- `worldLogline`
- `openQuestions`

### Backward compatibility

All new fields remain optional for legacy decompositions.

### Generation stage

Reuse existing `DECOMPOSING_WORLD`.

---

## 4.4 Deterministic canonicalization layer

**File**: `src/services/worldbuilding-canonicalizer.ts` — NEW

This runs after stage 2 and after raw decomposition.

### Responsibilities

- validate unique fact IDs,
- coerce missing arrays to `[]`,
- reject broken fact references,
- wrap `worldLogline`, `worldFacts`, and `openQuestions` into `DecomposedWorld`,
- normalize empty optional strings to `undefined`,
- sort facts deterministically for stable storage,
- generate any derived lookup maps needed by prompt formatters.

### Important note

This is **not** an LLM stage and should not get its own model override.

---

## 5. Shared World Prompt Section Builders

**File**: `src/llm/prompts/sections/shared/worldbuilding-sections.ts` — NEW

This is the missing architectural glue.

### Purpose

Build consumer-specific world sections from `DecomposedWorld` instead of passing raw prose or an undifferentiated fact list.

### Required builders

- `buildWorldSectionForSpine(world: DecomposedWorld): string`
- `buildWorldSectionForCharacterWeb(world: DecomposedWorld): string`
- `buildWorldSectionForCharacterDev(world: DecomposedWorld): string`
- `buildWorldSectionForPage(world: DecomposedWorld, options: { revealedFactIds: readonly string[]; currentLocationHint?: string }): string`

A single internal helper may power these, but the consumer-specific entry points should exist because the selection logic differs.

### Required section behavior by consumer

#### SPINE

Include:

- world logline,
- highest-weight invariants,
- power systems,
- major fault lines,
- hidden pressures,
- story vectors,
- open questions.

Purpose: help build the story’s conflict architecture.

#### CHARACTER_WEB

Include:

- institutions,
- occupations,
- class / caste signals,
- faction landscape,
- naming lexicon,
- taboo structure,
- status markers,
- likely leverage points.

Purpose: make the cast plausible inside the world.

#### CHARACTER_DEV

Include:

- sociology-bearing facts,
- linguistic / idiomatic cues,
- dress / ritual / taboo cues,
- relational pressure points,
- authority patterns,
- public-vs-hidden contradictions relevant to character choices.

Purpose: make character psychology, presentation, and relationships world-specific.

#### PAGE

Include only:

- `PUBLIC` facts,
- `DISCOVERABLE` facts that are already revealed,
- current-location-relevant facts,
- sensory hooks,
- 3-6 actionable `sceneAffordances`,
- 0-2 discoverable clues if relevant to current scene.

Do **not** include unrevealed `HIDDEN` facts by default.

Purpose: keep page generation protagonist-facing and non-omniscient.

---

## 6. Service Layer

**File**: `src/services/worldbuilding-service.ts` — NEW

```typescript
export interface WorldbuildingService {
  createFromConcept(
    name: string,
    sourceConceptId: string,
    inputs?: WorldbuildingPipelineInputs,
  ): Promise<SavedWorldbuilding>;

  decomposeRawText(
    name: string,
    rawText: string,
    apiKey: string,
    onStage?: StageCallback,
  ): Promise<SavedWorldbuilding>;

  generateSeed(
    id: string,
    apiKey: string,
    onStage?: StageCallback,
  ): Promise<SavedWorldbuilding>;

  generateElaboration(
    id: string,
    apiKey: string,
    onStage?: StageCallback,
  ): Promise<SavedWorldbuilding>;

  regenerateSeed(
    id: string,
    apiKey: string,
    onStage?: StageCallback,
  ): Promise<SavedWorldbuilding>;

  regenerateElaboration(
    id: string,
    apiKey: string,
    onStage?: StageCallback,
  ): Promise<SavedWorldbuilding>;

  load(id: string): Promise<SavedWorldbuilding | null>;
  list(): Promise<SavedWorldbuilding[]>;
  listByConcept(conceptId: string): Promise<SavedWorldbuilding[]>;
  patch(
    id: string,
    updates: Partial<Pick<SavedWorldbuilding, 'name' | 'inputs'>>,
  ): Promise<SavedWorldbuilding>;
  delete(id: string): Promise<void>;
}
```

### Key behaviors

- `createFromConcept()` stores an empty `SavedWorldbuilding` with `sourceKind: 'PIPELINE'`
- `generateSeed()` derives `WorldRequirements`, calls the seed stage, stores `worldSeed`
- `generateElaboration()` requires `worldSeed`, calls elaboration, canonicalizes result, stores:
  - `rawWorldMarkdown`
  - `decomposedWorld`
- `regenerateSeed()` resets elaboration artifacts
- `decomposeRawText()` produces a unified `SavedWorldbuilding` with `sourceKind: 'RAW_DECOMPOSED'`
- `listByConcept()` is recommended for UI and for character pipeline selection

---

## 7. Routes

**File**: `src/server/routes/worldbuilding.ts` — NEW

```text
GET    /worldbuilding
GET    /worldbuilding/api/list
GET    /worldbuilding/api/by-concept/:conceptId
GET    /worldbuilding/api/:id

POST   /worldbuilding/api/create-from-concept
POST   /worldbuilding/api/decompose-raw

POST   /worldbuilding/api/:id/generate-seed
POST   /worldbuilding/api/:id/generate-elaboration
POST   /worldbuilding/api/:id/regenerate-seed
POST   /worldbuilding/api/:id/regenerate-elaboration

PATCH  /worldbuilding/api/:id
DELETE /worldbuilding/api/:id
```

### Notes

- No separate `decomposed` routes.
- Register alongside character and story routes.

---

## 8. Views & Client JS

## 8.1 Template: `src/server/views/pages/worldbuilding.ejs` — NEW

Single page with three zones:

### A. Generate from concept

- concept selector
- name input
- user notes
- optional starting situation
- content preferences
- “Create Worldbuilding” button
- “Generate Seed”
- “Generate Elaboration”

### B. Import / paste and decompose

- name input
- raw worldbuilding textarea
- “Decompose Into World Asset” button

### C. Saved worlds list

Single list, not split list.

Each item should support:

- load
- delete
- filter by concept
- badge for `PIPELINE` vs `RAW_DECOMPOSED`
- preview tabs:
  - Seed
  - World Markdown
  - Decomposed Facts
  - Prompt Preview (Spine / Character / Page)

### Recommended preview feature

Add prompt preview selectors so authors can inspect how the same world is rendered for:

- spine,
- character web,
- character dev,
- page.

That will help debug whether the world is too encyclopedic or too vague.

## 8.2 Client JS

**File**: `public/js/src/18-worldbuilding-controller.js` — NEW

Follow the existing page-controller pattern.

Then regenerate:

```text
node scripts/concat-client-js.js
```

## 8.3 Header

Add the Worldbuilding dropdown exactly as proposed earlier.

---

## 9. Character Pipeline Integration

This is a required correction.

The world cannot remain isolated to the spine flow.

## 9.1 Modify character pipeline inputs

Wherever character pipeline inputs currently use:

```typescript
readonly worldbuilding: string;
```

change them to:

```typescript
readonly sourceWorldbuildingId?: string;
readonly decomposedWorld?: DecomposedWorld;
```

### Minimum affected files

- `src/llm/prompts/character-web-prompt.ts`
- `src/llm/prompts/char-tridimensional-prompt.ts`
- `src/llm/prompts/char-relationships-prompt.ts`
- `src/llm/prompts/char-presentation-prompt.ts`

Also audit any earlier character stages that currently accept raw worldbuilding.

## 9.2 Character web service integration

Update `character-web-service.ts` (and any related route/UI) so a character web can optionally select a worldbuilding asset.

### Recommended behavior

- when a concept is selected, show linked worldbuilding assets first,
- persist `sourceWorldbuildingId` on the saved character web,
- all downstream character dev stages inherit and reload the same world.

### Why this matters

Without this, the world may influence the spine but not the cast, producing:

- generic names,
- implausible occupations,
- mismatched status systems,
- dialect/idiom drift,
- relationship structures that ignore the world’s institutions.

## 9.3 Prompt-section usage

- `Character Web` should use `buildWorldSectionForCharacterWeb()`
- character development stages should use `buildWorldSectionForCharacterDev()`

Do not continue passing raw worldbuilding prose into these prompts.

---

## 10. Story Creation & Runtime Integration

## 10.1 Spine prompt (`src/llm/prompts/spine-prompt.ts` — MODIFY)

Replace raw `worldbuilding: string` with structured world input:

```typescript
export interface SpinePromptContext {
  characterConcept: string;
  decomposedWorld?: DecomposedWorld;
  tone: string;
  npcs?: readonly Npc[];
  decomposedCharacters?: readonly StandaloneDecomposedCharacter[];
  startingSituation?: string;
  conceptSpec?: ConceptSpec;
  storyKernel?: StoryKernel;
  conceptVerification?: ConceptVerification;
  contentPreferences?: string;
}
```

Use `buildWorldSectionForSpine()` instead of inserting raw prose.

## 10.2 Story creation form (`src/server/views/pages/new-story.ejs` — MODIFY)

Replace the raw worldbuilding textarea with:

- a saved-worldbuilding selector,
- concept-linked sorting,
- an inline “Paste & decompose” helper/modal for one-off cases.

### Important correction

The structured flow should require a saved world asset, but **do not** force users to leave the page to create one. Inline import/decompose is the right compromise.

Use:

- hidden input `worldbuildingId`
- no raw `worldbuilding` text field in the canonical request payload

## 10.3 Stories route (`src/server/routes/stories.ts` — MODIFY)

`POST /stories/generate-spines`
- accept `worldbuildingId: string`
- load unified `SavedWorldbuilding`
- pass `decomposedWorld` to the spine generator

`POST /stories/create-ajax`
- accept `worldbuildingId: string`
- pass through to story engine

## 10.4 Story service (`src/engine/story-service.ts` — MODIFY)

In `StartStoryOptions`:

```typescript
worldbuildingId?: string;
```

In `buildPreparedStory()`:

- load world asset by ID
- set `story.decomposedWorld`
- initialize world-reveal state
- remove inline world decomposition

## 10.5 Add runtime reveal scaffold

**File**: `src/engine/story-world-state.ts` — NEW

```typescript
export interface StoryWorldState {
  readonly revealedFactIds: readonly string[];
  readonly currentLocationHint?: string;
  readonly worldTrackValues?: Record<string, string | number | boolean>;
}
```

### Initialization rule

At story start, reveal:

- all `PUBLIC` facts,
- optionally some `DISCOVERABLE` + `EARLY` facts explicitly implied by the starting situation.

### Runtime prompt rule

Any page-level prompt builder must use:

- `buildWorldSectionForPage(world, { revealedFactIds, currentLocationHint })`

and must not receive unrevealed hidden facts unless a later explicit override is added.

## 10.6 Legacy pipeline cleanup

Remove inline world decomposition from both the new and legacy story-prep flows.

World decomposition is now prebuilt.

If the legacy path still needs to decompose raw NPC text, that remains character-only.

---

## 11. Stage Registration

### Add stage metadata

- `GENERATING_WORLD_SEED` — `"Seeding World"`
- `ELABORATING_WORLD` — `"Elaborating World"`

### Update model config

**File**: `src/config/stage-model.ts` — MODIFY

Add per-stage model entries for both world stages.

### Update client constants

**File**: `public/js/src/01-constants.js` — MODIFY

Add display names and phrase pools for the two new world stages.

---

## 12. Prompt Documentation

Create or update:

- `prompts/worldbuilding-seed-prompt.md` — NEW
- `prompts/worldbuilding-elaboration-prompt.md` — NEW
- `prompts/worldbuilding-decomposer-prompt.md` — UPDATE
- `prompts/spine-prompt.md` — UPDATE
- `prompts/character-web-prompt.md` — UPDATE
- `prompts/char-tridimensional-prompt.md` — UPDATE
- `prompts/char-relationships-prompt.md` — UPDATE
- `prompts/char-presentation-prompt.md` — UPDATE

### Also document

- `prompts/worldbuilding-sections.md` — NEW  
  Document the shared section-builder contract and what each consumer receives.

---

## 13. Implementation Phases

## Phase 1: Model & storage foundation

1. Enhance `decomposed-world.ts`
2. Add `world-seed.ts`
3. Add `worldbuilding-requirements.ts`
4. Revise `saved-worldbuilding.ts`
5. Delete `saved-decomposed-worldbuilding.ts`
6. Add repository + file utils
7. Add world stages to stage metadata / model config

## Phase 2: LLM generation

1. Implement seed prompt + schema + generation
2. Implement elaboration prompt + schema + generation
3. Update world decomposer schema/parser for new fields
4. Add canonicalizer service

## Phase 3: Shared world prompt builders

1. Add `worldbuilding-sections.ts`
2. Expand `formatDecomposedWorldForPrompt()`
3. Add consumer-specific filtering logic
4. Add tests for public/hidden fact filtering

## Phase 4: Worldbuilding page and unified asset routes

1. Create `worldbuilding.ejs`
2. Create `18-worldbuilding-controller.js`
3. Add unified list/load/delete routes
4. Add concept-linked filtering
5. Add preview tabs and prompt preview

## Phase 5: Character pipeline integration

1. Update `CastPipelineInputs`
2. Update Character Web prompt builder/docs
3. Update Tridimensional/Relationships/Presentation prompt builders/docs
4. Add world selector to character web UI
5. Persist `sourceWorldbuildingId` through character pipeline

## Phase 6: Story creation and runtime integration

1. Update spine prompt context
2. Update story creation routes/forms to use `worldbuildingId`
3. Remove inline world decomposition
4. Add `StoryWorldState`
5. Filter page prompts by revealed facts

## Phase 7: Documentation & tests

1. Prompt docs
2. Model tests
3. Service tests
4. Formatter/filter tests
5. Route integration tests
6. Manual end-to-end checks

---

## 14. Verification

## 14.1 Build / lint / tests

1. `npm run build`
2. `npm run lint`
3. `npm test`

## 14.2 Required automated tests

### Model / canonicalization

- world fact IDs are unique
- `tensionWithIds` / `implicationOfIds` reference valid facts
- `openQuestions` round-trip correctly
- formatter excludes hidden unrevealed facts for `PAGE`

### Repository / service

- pipeline-generated and raw-decomposed worlds both persist as `SavedWorldbuilding`
- `generateElaboration()` stores canonical `decomposedWorld`
- `regenerateSeed()` clears elaboration artifacts

### Prompt builders

- `SPINE` builder includes hidden pressures and open questions
- `CHARACTER_WEB` builder includes naming / institutions / status facts
- `CHARACTER_DEV` builder includes language / taboo / sociology facts
- `PAGE` builder includes only visible or revealed facts

### Character pipeline integration

- no updated character prompt context still requires raw `worldbuilding: string`
- a selected world asset is loaded and reused across character stages

### Story engine integration

- new story creation accepts `worldbuildingId`
- no inline world decomposition stage is invoked
- page prompt builder receives filtered world context

## 14.3 Manual E2E

1. Generate a world from a concept
2. Paste raw world prose and decompose it into the same asset type
3. Verify `/worldbuilding` shows both in a single list
4. Generate a character web using a selected worldbuilding asset
5. Verify names, institutions, occupations, and social norms reflect that world
6. Create a story from `/stories/new` using the selected worldbuilding asset
7. Verify spine generation uses structured world sections
8. Verify page prompts do not leak unrevealed hidden facts
9. Verify no inline world decomposition spinner appears during story creation

---

## 15. Summary of what changed from the earlier proposal

This revised spec intentionally changes five things:

1. **Unifies saved world assets** instead of splitting generated and decomposed models.
2. **Adds reveal/focalization metadata** so runtime page generation can stay protagonist-facing.
3. **Adds story vectors, anchor locations, everyday practices, and naming lexicon** so the world is lived, playable, and memorable.
4. **Propagates structured world context into the character pipeline**, not just the spine path.
5. **Replaces lore-first formatting with consumer-specific world sections** so each prompt gets the right slice of the world.