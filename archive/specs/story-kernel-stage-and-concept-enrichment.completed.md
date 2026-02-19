# Story Kernel Stage & Concept Enrichment

**Status**: COMPLETED
**Priority**: Feature
**Scope**: Models, LLM pipeline (ideator + evaluator), persistence, routes, services, UI, concept enrichment, prompt docs

## Overview

External review and narrative theory research (Egri, McKee, Truby, Snyder, McDonald, Brooks, Barthes/Chatman) confirm that a **story kernel** -- the irreducible dramatic proposition -- is a theoretically distinct stage from story concept generation. Every major narrative theorist distinguishes between:

- **Kernel** (Egri's Premise / McKee's Controlling Idea / McDonald's Armature): The dramatic thesis specifying a value at stake, a force of conflict, and a direction of change
- **Concept** (Truby's Designing Principle / Brooks' Concept / Snyder's "What is it?"): The generative engine that operationalizes the kernel into a producible interactive fiction framework
- **Spine** (structural backbone): Inherits from concept, adds arc/pacing/tone commitment

The external review also suggested adding `whatIfQuestion`, `ironicTwist`, `rulesOfThePremise`, `iconicSetpieces`, and `playerFantasy` fields. The research classifies them as follows:

| Suggested Field | Correct Level | Action |
|---|---|---|
| `whatIfQuestion` | Concept | Add to ConceptSpec |
| `ironicTwist` | Concept | Add to ConceptSpec |
| `playerFantasy` | Concept | Add to ConceptSpec |
| `rulesOfThePremise` | Concept (already covered by `settingAxioms` + `constraintSet`) | Skip |
| `iconicSetpieces` | Execution/premise level | Skip -- too concrete for concept stage |

## Pipeline Change

**Before**: Concept -> Spine -> Structure -> Pages

**After**: **Kernel -> Concept -> Spine -> Structure -> Pages**

- Kernel generation requires thematic seed inputs (no genre, no setting)
- Concept generation requires a selected kernel as input
- Spine inherits `conflictAxis` and `conflictType` from concept (already the case, but prompt should explicitly enforce inheritance rather than reinvention)

---

## Phase 1: Kernel Data Model

### 1a. StoryKernel Type

**File to create**: `src/models/story-kernel.ts`

```typescript
export const DIRECTION_OF_CHANGE_VALUES = [
  'POSITIVE',
  'NEGATIVE',
  'IRONIC',
  'AMBIGUOUS',
] as const;

export type DirectionOfChange = (typeof DIRECTION_OF_CHANGE_VALUES)[number];

export function isDirectionOfChange(value: unknown): value is DirectionOfChange {
  return (
    typeof value === 'string' &&
    (DIRECTION_OF_CHANGE_VALUES as readonly string[]).includes(value)
  );
}

export interface StoryKernel {
  readonly dramaticThesis: string;
  readonly valueAtStake: string;
  readonly opposingForce: string;
  readonly directionOfChange: DirectionOfChange;
  readonly thematicQuestion: string;
}

export function isStoryKernel(value: unknown): value is StoryKernel {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const k = value as Record<string, unknown>;
  return (
    isNonEmptyString(k['dramaticThesis']) &&
    isNonEmptyString(k['valueAtStake']) &&
    isNonEmptyString(k['opposingForce']) &&
    isDirectionOfChange(k['directionOfChange']) &&
    isNonEmptyString(k['thematicQuestion'])
  );
}
```

Field definitions:

| Field | Type | Constraint | Theory Source | Example |
|---|---|---|---|---|
| `dramaticThesis` | string | 1-2 sentences, "X leads to Y" format | Egri's Premise | "Obsessive control destroys what it tries to protect" |
| `valueAtStake` | string | 1-3 words, a fundamental human value | McKee's Value at Stake | "Trust" / "Autonomy" / "Identity" |
| `opposingForce` | string | 1-2 sentences, abstract force opposing the value | McKee's Force of Antagonism | "Fear of loss drives the need to control" |
| `directionOfChange` | DirectionOfChange | Enum | McKee's Arc Direction | POSITIVE / NEGATIVE / IRONIC / AMBIGUOUS |
| `thematicQuestion` | string | 1 sentence ending with "?" | McDonald's Armature (question form) | "Can you protect someone without controlling them?" |

CRITICAL: No genre, no setting, no characters, no plot, no game mechanics. The kernel is purely dramatic thesis.

### 1b. Kernel Seed Input

**File**: `src/models/story-kernel.ts` (same file)

```typescript
export interface KernelSeedInput {
  readonly thematicInterests?: string;
  readonly emotionalCore?: string;
  readonly sparkLine?: string;
  readonly apiKey: string;
}
```

Three thematic-only seed fields (no genre vibes, no mood keywords -- those are concept-level):

| Field | Description | Example |
|---|---|---|
| `thematicInterests` | What themes fascinate the user | "power, corruption, the cost of ambition" |
| `emotionalCore` | What emotional experience they want | "dread that builds slowly, betrayal from someone trusted" |
| `sparkLine` | A raw idea or inspiration | "A leader who must sacrifice the people they protect" |

### 1c. Kernel Evaluation Types

**File**: `src/models/story-kernel.ts` (same file)

```typescript
export interface KernelDimensionScores {
  readonly dramaticClarity: number;
  readonly thematicUniversality: number;
  readonly generativePotential: number;
  readonly conflictTension: number;
  readonly emotionalDepth: number;
}

export interface KernelScoreEvidence {
  readonly dramaticClarity: readonly string[];
  readonly thematicUniversality: readonly string[];
  readonly generativePotential: readonly string[];
  readonly conflictTension: readonly string[];
  readonly emotionalDepth: readonly string[];
}

export interface ScoredKernel {
  readonly kernel: StoryKernel;
  readonly scores: KernelDimensionScores;
  readonly scoreEvidence: KernelScoreEvidence;
  readonly overallScore: number;
}

export interface EvaluatedKernel {
  readonly kernel: StoryKernel;
  readonly scores: KernelDimensionScores;
  readonly overallScore: number;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly tradeoffSummary: string;
}

export const KERNEL_SCORING_WEIGHTS = {
  dramaticClarity: 20,
  thematicUniversality: 15,
  generativePotential: 25,
  conflictTension: 25,
  emotionalDepth: 15,
} as const;

export const KERNEL_PASS_THRESHOLDS = {
  dramaticClarity: 3,
  thematicUniversality: 2,
  generativePotential: 3,
  conflictTension: 3,
  emotionalDepth: 2,
} as const;

export function computeKernelOverallScore(scores: KernelDimensionScores): number {
  return (
    (scores.dramaticClarity * KERNEL_SCORING_WEIGHTS.dramaticClarity) / 5 +
    (scores.thematicUniversality * KERNEL_SCORING_WEIGHTS.thematicUniversality) / 5 +
    (scores.generativePotential * KERNEL_SCORING_WEIGHTS.generativePotential) / 5 +
    (scores.conflictTension * KERNEL_SCORING_WEIGHTS.conflictTension) / 5 +
    (scores.emotionalDepth * KERNEL_SCORING_WEIGHTS.emotionalDepth) / 5
  );
}
```

Evaluation dimensions (0-5 scale):

| Dimension | Weight | Threshold | Measures |
|---|---|---|---|
| `dramaticClarity` | 20 | >=3 | Is the thesis specific and falsifiable? Not vague platitudes like "love is important." |
| `thematicUniversality` | 15 | >=2 | Does the value resonate across audiences and cultures? |
| `generativePotential` | 25 | >=3 | How many diverse concepts could spring from this kernel? A good kernel supports horror AND drama AND sci-fi. |
| `conflictTension` | 25 | >=3 | Is the opposing force genuinely irreconcilable with the value? Does it create real dramatic pressure? |
| `emotionalDepth` | 15 | >=2 | Does it tap into deep, felt human experience rather than abstract philosophy? |

`generativePotential` and `conflictTension` are weighted highest because a kernel's primary job is to seed diverse, compelling concepts.

### 1d. Saved Kernel Type

**File to create**: `src/models/saved-kernel.ts`

```typescript
import type {
  EvaluatedKernel,
  KernelSeedInput,
} from './story-kernel.js';

export interface SavedKernel {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly seeds: Omit<KernelSeedInput, 'apiKey'>;
  readonly evaluatedKernel: EvaluatedKernel;
}
```

Mirror `SavedConcept` pattern from `src/models/saved-concept.ts`. API key is stripped before persistence (same as concepts).

---

## Phase 2: Kernel Persistence

### 2a. Kernel Repository

**File to create**: `src/persistence/kernel-repository.ts`

Mirror `src/persistence/concept-repository.ts` exactly. Same patterns: file-based JSON, lock manager, atomic writes.

Storage structure:
```
kernels/
  {uuid}.json              # SavedKernel
  generations/
    {uuid}.json            # GeneratedKernelBatch (all 6-8 with evaluations)
```

Interface:

```typescript
export interface KernelRepository {
  listKernels(): Promise<SavedKernel[]>;
  getKernel(id: string): Promise<SavedKernel | null>;
  saveKernel(kernel: SavedKernel): Promise<void>;
  updateKernel(id: string, updates: Partial<Pick<SavedKernel, 'name'> & { kernelFields: Partial<StoryKernel> }>): Promise<SavedKernel>;
  deleteKernel(id: string): Promise<void>;
  saveGenerationBatch(batch: GeneratedKernelBatch): Promise<void>;
}
```

### 2b. Generated Kernel Batch

```typescript
export interface GeneratedKernelBatch {
  readonly id: string;
  readonly createdAt: string;
  readonly seeds: Omit<KernelSeedInput, 'apiKey'>;
  readonly evaluatedKernels: readonly EvaluatedKernel[];
}
```

ALL 6-8 generated kernels are stored with their evaluations, not just the top ones.

---

## Phase 3: Kernel LLM Pipeline

### 3a. Kernel Ideator

**Files to create**:
- `src/llm/kernel-ideator.ts` -- Generation function (mirror `src/llm/concept-ideator.ts`)
- `src/llm/prompts/kernel-ideator-prompt.ts` -- Prompt builder
- `src/llm/schemas/kernel-ideator-schema.ts` -- JSON schema for structured output

**Prompt design**:

System message role: "You are a dramatic theorist who distills stories to their irreducible dramatic proposition. You produce story kernels -- not plots, not concepts, not characters, not settings. A kernel is the dramatic thesis: a value at stake, a force opposing it, and how life changes."

Quality anchors:
- `dramaticThesis` must follow "X leads to Y" pattern (Egri) -- a causal dramatic claim, not a topic or theme
- `valueAtStake` must be a fundamental human value, not a plot goal
- `opposingForce` must be abstract enough to operate across genres/settings
- `thematicQuestion` must be the thesis in question form, genuinely answerable both ways
- NO genre, setting, characters, plot, game mechanics, or specific situations

Diversity constraints:
- Generate 6-8 kernels
- No two kernels share the same `valueAtStake`
- No two kernels share the same `opposingForce`
- Use at least 3 distinct `directionOfChange` values
- Each kernel explores a categorically different domain of human experience

Taxonomy guidance for `directionOfChange`:
- POSITIVE: The value prevails; the protagonist grows toward it
- NEGATIVE: The opposing force wins; the value is lost or corrupted
- IRONIC: The value is gained but at a cost that transforms its meaning, or the opposing force is defeated but victory feels hollow
- AMBIGUOUS: The direction depends on choices -- the kernel is structured so either direction is dramatically valid

**Schema**: Array of 6-8 `StoryKernel` objects matching the interface.

### 3b. Kernel Evaluator

**Files to create**:
- `src/llm/kernel-evaluator.ts` -- Evaluation function (mirror `src/llm/concept-evaluator.ts`)
- `src/llm/prompts/kernel-evaluator-prompt.ts` -- Prompt builder
- `src/llm/schemas/kernel-evaluator-schema.ts` -- JSON schema

**Two-phase evaluation** (same pattern as concept evaluator):

**Phase 1 -- Scoring**: Score all 6-8 kernels across 5 dimensions (0-5 scale) with evidence for each score.

**Phase 2 -- Deep evaluation**: For all kernels, produce strengths (2-3 bullets), weaknesses (2-3 bullets), and tradeoff summary (1-2 sentences).

Scoring rubric guidance per dimension:

**dramaticClarity** (0-5):
- 0-1: Vague topic or truism ("love matters")
- 2-3: Identifiable thesis but could be sharper
- 4-5: Crisp, falsifiable dramatic claim with clear causality

**thematicUniversality** (0-5):
- 0-1: Culturally narrow or niche concern
- 2-3: Resonates with broad audiences but not universally
- 4-5: Taps into fundamental human experience across cultures

**generativePotential** (0-5):
- 0-1: Locks into one genre or one story
- 2-3: Supports 2-3 genre/concept variations
- 4-5: Rich enough to seed 5+ wildly different concepts across genres

**conflictTension** (0-5):
- 0-1: Opposing force easily defeated or irrelevant
- 2-3: Real tension but resolution path is obvious
- 4-5: Genuinely irreconcilable -- both sides have legitimate claims

**emotionalDepth** (0-5):
- 0-1: Intellectual exercise without felt experience
- 2-3: Emotionally engaging but surface-level
- 4-5: Reaches into visceral, deeply human territory

### 3c. Kernel Stage Runner

**File to create**: `src/llm/kernel-stage-runner.ts` (mirror `src/llm/concept-stage-runner.ts`)

Orchestrates: ideator -> evaluator. Reports progress stages:
- `GENERATING_KERNELS`
- `EVALUATING_KERNELS`

Returns all evaluated kernels (not just top N).

---

## Phase 4: Kernel Routes & Service

### 4a. Kernel Service

**File to create**: `src/server/services/kernel-service.ts` (mirror `src/server/services/concept-service.ts`)

Methods:
- `generateKernels(seeds: KernelSeedInput, progressId?: string): Promise<EvaluatedKernel[]>`
- Calls kernel stage runner
- Stores generation batch
- Returns all evaluated kernels

### 4b. Kernel Routes

**File to create**: `src/server/routes/kernels.ts`

Endpoints (mirror concept routes from `src/server/routes/concepts.ts`):

| Method | Path | Description |
|---|---|---|
| GET | `/kernels` | Render kernels page |
| GET | `/kernels/api/list` | List all saved kernels |
| GET | `/kernels/api/:kernelId` | Get single saved kernel |
| POST | `/kernels/api/generate` | Generate + evaluate 6-8 kernels |
| POST | `/kernels/api/save` | Save a kernel (with evaluation) |
| PUT | `/kernels/api/:kernelId` | Update kernel name/fields |
| DELETE | `/kernels/api/:kernelId` | Delete kernel |

`POST /kernels/api/generate` accepts:
```json
{
  "thematicInterests": "optional string",
  "emotionalCore": "optional string",
  "sparkLine": "optional string",
  "apiKey": "required string",
  "progressId": "optional string"
}
```

Register routes in `src/server/routes/index.ts` (or wherever routes are registered).

---

## Phase 5: Kernel UI

### 5a. Kernels Page

**File to create**: `src/server/views/pages/kernels.ejs`

Mirror `src/server/views/pages/concepts.ejs` structure:
- Header with title and description
- Seed input form with 3 text areas: thematicInterests, emotionalCore, sparkLine
- API key input (same pattern as concepts page)
- Generate button with progress spinner
- Generated kernels card grid (generated results, not yet saved)
- Saved kernels library section

### 5b. Kernel Renderer

**File to create**: `public/js/src/04e-kernel-renderer.js`

Kernel card layout:
- **Title**: `dramaticThesis` (truncated if long)
- **Badges**: `directionOfChange` badge + overall score badge
- **Body**:
  - "Value at Stake: {valueAtStake}" / "Opposing Force: {opposingForce}"
  - "Thematic Question: {thematicQuestion}" (displayed prominently, italic)
  - 5-dimension score grid with pip visualization (reuse `getScoreColorClass()` from `04d-concept-renderer.js`)
  - Strengths/weaknesses bullets
  - Tradeoff summary
- **Actions**: "Save to Library" button (for generated), "Edit" / "Delete" buttons (for saved)

### 5c. Kernels Controller

**File to create**: `public/js/src/12-kernels-controller.js`

Mirror `public/js/src/11-concepts-controller.js`:
- Initialize on page load
- Handle generate button click -> POST to `/kernels/api/generate`
- Poll progress via existing progress service
- Render generated kernel cards
- Handle save/edit/delete CRUD operations
- Handle API key input (session storage, same pattern as concepts)

### 5d. Regenerate app.js

After creating the new JS files, run `node scripts/concat-client-js.js` to regenerate `public/js/app.js`.

---

## Phase 6: Concept Enrichment

### 6a. Add 3 New Fields to ConceptSpec

**File to modify**: `src/models/concept-generator.ts`

Add to `ConceptSpec` interface:
```typescript
readonly whatIfQuestion: string;
readonly ironicTwist: string;
readonly playerFantasy: string;
```

Field definitions:

| Field | Type | Constraint | Theory Source | Example |
|---|---|---|---|---|
| `whatIfQuestion` | string | 1 sentence ending with "?" | Brooks' Concept | "What if a paranoid father must cross an ocean of dangers to find his lost son?" |
| `ironicTwist` | string | 1-2 sentences | Snyder's Irony | "The father's overprotection is exactly what put his son in danger, and his rescue journey requires him to do the thing he fears most: let go of control." |
| `playerFantasy` | string | 1 sentence | Experiential promise | "You feel the terrifying exhilaration of releasing control over someone you love." |

`whatIfQuestion` operationalizes the kernel's `dramaticThesis` into a specific situation.
`ironicTwist` is the built-in irony where the solution creates the problem or the strength becomes the weakness.
`playerFantasy` is what it FEELS LIKE to be the protagonist (not what they do).

### 6b. Update Validation

**File to modify**: `src/models/concept-generator.ts` (`isConceptSpec` function)

Add validation for the 3 new required string fields.

### 6c. Update Concept Ideator Schema

**File to modify**: `src/llm/schemas/concept-ideator-schema.ts`

Add 3 new required string properties to the JSON schema.

### 6d. Update Concept Ideator Prompt

**File to modify**: `src/llm/prompts/concept-ideator-prompt.ts`

Changes:
1. Accept kernel data as input (new parameter in `buildConceptIdeatorPrompt`)
2. Add kernel constraint block to system message: "The concept MUST operationalize the provided kernel's dramatic thesis. The kernel's value at stake and opposing force must be the foundation of the concept's conflict engine."
3. Add quality guidance for the 3 new fields:
   - `whatIfQuestion`: "A single question ending with '?' that translates the kernel's dramatic thesis into a specific, producible situation. Should create dramatic possibility space."
   - `ironicTwist`: "1-2 sentences describing the built-in irony -- how the protagonist's strength becomes their weakness, or how the solution to the problem creates the problem."
   - `playerFantasy`: "1 sentence describing what it FEELS LIKE to be the protagonist. Not what they do, but the experiential promise. Should create immediate desire to play."

### 6e. Update Concept Spec Parser

**File to modify**: `src/llm/concept-spec-parser.ts`

Add parsing/validation for the 3 new fields.

### 6f. Update Concept Evaluator Prompt

**File to modify**: `src/llm/prompts/concept-evaluator-prompt.ts`

The `hookStrength` dimension should now also evaluate `whatIfQuestion` quality and `playerFantasy` appeal. The `conflictEngine` dimension should evaluate `ironicTwist` quality. Update scoring rubric descriptions accordingly.

---

## Phase 7: Concept Page Kernel Integration

### 7a. Concept Page Template

**File to modify**: `src/server/views/pages/concepts.ejs`

Add at top of page (before seed inputs):
- Kernel selector: dropdown populated with saved kernels from `/kernels/api/list`
- Selected kernel summary card (shows dramaticThesis, valueAtStake, opposingForce, thematicQuestion, scores)
- Generate button disabled until a kernel is selected
- Visual indication that kernel selection is required

### 7b. Concepts Controller

**File to modify**: `public/js/src/11-concepts-controller.js`

Changes:
- On page load, fetch saved kernels via `GET /kernels/api/list`
- Populate kernel selector dropdown
- When kernel selected, display kernel summary card
- Enable/disable generate button based on kernel selection
- Send `kernelId` with generate request

### 7c. Concept Routes

**File to modify**: `src/server/routes/concepts.ts`

`POST /concepts/api/generate` now requires `kernelId` parameter:
- Load kernel data from kernel repository
- Pass kernel data to concept service
- Return 400 if `kernelId` missing or kernel not found

### 7d. Concept Service

**File to modify**: `src/server/services/concept-service.ts`

Accept kernel data as input parameter. Pass to concept ideator prompt builder.

### 7e. Concept Renderer

**File to modify**: `public/js/src/04d-concept-renderer.js`

Render 3 new fields in concept cards:
- `whatIfQuestion` displayed prominently (italic, question format)
- `ironicTwist` in a distinct section
- `playerFantasy` highlighted (e.g., italic or distinct styling)

---

## Phase 8: Spine Inheritance

### 8a. Spine Generator Prompt

**File to modify**: `src/llm/prompts/spine-prompt.ts` (or equivalent spine prompt builder)

Add instruction: "The conflictAxis and conflictType are inherited from the selected concept. Do NOT reinvent them. Use the provided values exactly."

This is a prompt-only change. The `StorySpine` interface already has these fields. The change ensures the spine generator respects the concept's choices rather than potentially diverging.

---

## Phase 9: Navigation

### 9a. Home Page

**File to modify**: `src/server/views/pages/home.ejs` (or equivalent navigation template)

Add "Kernels" link. Suggested flow ordering: Home -> Kernels -> Concepts -> New Story

The flow is linear (kernel before concept) but users should be able to navigate directly to any page.

---

## Phase 10: Prompt Documentation

### 10a. New Prompt Docs

**File to create**: `prompts/kernel-ideator-prompt.md`
- Mirror format of `prompts/concept-ideator-prompt.md`
- Document: source files, pipeline position, messages sent to model, schema, response format

**File to create**: `prompts/kernel-evaluator-prompt.md`
- Mirror format of `prompts/concept-evaluator-prompt.md`
- Document: source files, pipeline position, scoring dimensions, messages sent to model, schema, response format

### 10b. Update Existing Prompt Docs

**File to modify**: `prompts/concept-ideator-prompt.md`
- Document kernel input requirement
- Document 3 new fields (whatIfQuestion, ironicTwist, playerFantasy)
- Update pipeline position to show kernel stage before concept stage

**File to modify**: `prompts/concept-evaluator-prompt.md`
- Document updated scoring rubric for hookStrength and conflictEngine dimensions

**File to modify**: `prompts/spine-prompt.md`
- Document conflictAxis/conflictType inheritance from concept

---

## Phase 11: Tests

### Unit Tests

**Files to create**:
- `test/unit/models/story-kernel.test.ts` -- Type guards, score computation, threshold checks
- `test/unit/models/saved-kernel.test.ts` -- SavedKernel structure
- `test/unit/persistence/kernel-repository.test.ts` -- CRUD operations
- `test/unit/llm/kernel-ideator.test.ts` -- Ideator prompt construction, response parsing
- `test/unit/llm/kernel-evaluator.test.ts` -- Evaluator prompt construction, scoring
- `test/unit/llm/kernel-stage-runner.test.ts` -- Pipeline orchestration

**Files to modify**:
- Tests touching `ConceptSpec` that need the 3 new fields in mocks
- Tests touching concept ideator that need kernel input parameter

### Integration Tests

**File to create**: `test/integration/kernel-pipeline.test.ts` -- Full kernel ideator -> evaluator pipeline with mocked LLM

---

## Files Summary

### New Files (~17)

| File | Purpose |
|---|---|
| `src/models/story-kernel.ts` | Kernel types, validation, scoring |
| `src/models/saved-kernel.ts` | Saved kernel type |
| `src/llm/kernel-ideator.ts` | Kernel generation |
| `src/llm/kernel-evaluator.ts` | Kernel evaluation |
| `src/llm/kernel-stage-runner.ts` | Pipeline orchestration |
| `src/llm/prompts/kernel-ideator-prompt.ts` | Ideator prompt builder |
| `src/llm/prompts/kernel-evaluator-prompt.ts` | Evaluator prompt builder |
| `src/llm/schemas/kernel-ideator-schema.ts` | Ideator JSON schema |
| `src/llm/schemas/kernel-evaluator-schema.ts` | Evaluator JSON schema |
| `src/persistence/kernel-repository.ts` | File-based kernel storage |
| `src/server/routes/kernels.ts` | Kernel API routes |
| `src/server/services/kernel-service.ts` | Kernel service layer |
| `src/server/views/pages/kernels.ejs` | Kernels page template |
| `public/js/src/04e-kernel-renderer.js` | Kernel card rendering |
| `public/js/src/12-kernels-controller.js` | Kernels page controller |
| `prompts/kernel-ideator-prompt.md` | Ideator prompt documentation |
| `prompts/kernel-evaluator-prompt.md` | Evaluator prompt documentation |

### Modified Files (~12)

| File | Change |
|---|---|
| `src/models/concept-generator.ts` | Add 3 fields to ConceptSpec + update isConceptSpec |
| `src/llm/prompts/concept-ideator-prompt.ts` | Accept kernel input + 3 new field instructions |
| `src/llm/schemas/concept-ideator-schema.ts` | Add 3 fields to schema |
| `src/llm/concept-spec-parser.ts` | Validate 3 new fields |
| `src/llm/prompts/concept-evaluator-prompt.ts` | Update scoring rubric for new fields |
| `src/server/views/pages/concepts.ejs` | Kernel selector + new field display |
| `src/server/routes/concepts.ts` | Require kernelId in generate |
| `src/server/services/concept-service.ts` | Accept kernel input |
| `public/js/src/11-concepts-controller.js` | Kernel selection logic + new fields |
| `public/js/src/04d-concept-renderer.js` | Render 3 new fields |
| `prompts/concept-ideator-prompt.md` | Document kernel input + new fields |
| `prompts/concept-evaluator-prompt.md` | Document updated scoring |
| `prompts/spine-prompt.md` | Document conflict inheritance |

### Regenerate

- `public/js/app.js` via `node scripts/concat-client-js.js`

---

## Verification

1. **Kernel generation**: Navigate to `/kernels`, enter thematic seeds, generate. Verify 6-8 kernel cards appear with 5-dimension scores.
2. **Kernel persistence**: Save kernels, refresh page, verify persistence. Test edit name, delete.
3. **Concept prerequisite**: Navigate to `/concepts`, verify kernel selector appears and generate is disabled without kernel selected.
4. **Concept generation with kernel**: Select a kernel, enter concept seeds, generate. Verify:
   - Concepts reference the kernel's dramatic thesis
   - 3 new fields (whatIfQuestion, ironicTwist, playerFantasy) appear in cards
   - Concept conflict engine is grounded in the kernel's value/opposing force
5. **Full pipeline**: Kernel -> Concept -> Spine -> Story creation. Verify spine inherits conflictAxis/conflictType.
6. **Build**: `npm run build` passes
7. **Lint**: `npm run lint` passes
8. **Typecheck**: `npm run typecheck` passes
9. **Tests**: `npm test` passes with existing + new tests

---

## Outcome

- Completion date: 2026-02-19
- What was actually changed:
  - Kernel stage, persistence, routes, UI, and concept-enrichment pipeline work were implemented across prior `STOKERSTAANDCONENR-*` tickets.
  - Final alignment in this pass closed remaining documentation gaps:
    - added `prompts/kernel-evaluator-prompt.md`
    - updated `prompts/concept-evaluator-prompt.md` rubric documentation
    - verified spine inheritance docs/code/test alignment.
- Deviations from original plan:
  - No additional runtime changes were needed in spine prompt generation because conflict inheritance had already been implemented and tested.
  - Remaining work was documentation synchronization rather than further architecture changes.
- Verification results:
  - Relevant prompt/evaluator unit tests pass.
  - Typecheck and lint pass.
