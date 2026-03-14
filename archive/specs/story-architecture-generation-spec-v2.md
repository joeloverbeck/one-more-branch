# Story Architecture Generation Spec v2

## Status

**Status**: COMPLETED

## Decision

Replace the current one-shot `Structure` generation with a **3-call pipeline** (Enriched Split). Rename `beat` to `milestone` throughout the codebase. Add 7 new high-signal fields that directly address the observed weaknesses of generic milestones and insignificant act breaks.

Do **not** implement the full 6-stage pipeline from the ChatGPT review. Stages 0 (Architecture Brief), 4 (Branch Topology), and 5 (NPC Agenda Seeder) are overengineered for current needs. The core insight is valid: **macro architecture should be designed before milestone details**.

Rename status note:
- The `beat` -> `milestone` vocabulary migration has already been completed as a single end-to-end change under archived ticket `STOARCGEN-001`.
- The earlier staged rename plan was rejected because it would have left mixed terminology and temporary compatibility debt in the codebase.

## Problem Statement

The current structure stage tries to do too many narratively dependent jobs in a single LLM call:

- choose macro shape
- choose act turns
- choose midpoint placement
- allocate premise promises and genre obligations
- place setpieces
- generate act-level milestones
- invent causal links
- seed NPC agendas

This produces **generic milestones** (weak uniqueScenarioHooks, vague descriptions) and **insignificant act breaks** (acts feel like containers rather than distinct dramatic turning units).

## Core Principles

1. **Hierarchy first**: story -> acts -> milestones -> scenes.
2. **Acts are turning units**, not empty containers for beat-sheet slots.
3. **Milestones must be causal**, not merely sequential.
4. **Premise promises and genre obligations are allocated before milestone writing**.
5. **Validation is a separate stage** from invention.

## Terminology Cleanup

- Keep `spine` as the invariant dramatic backbone.
- Rename current structure-level `beat` to `milestone`.
- Reserve `scene` for page-scale dramatic units.

This is not cosmetic. The current "beat" object is not a McKee/Swain beat. It behaves like a sequence-level milestone.

### Codebase Rename: `beat` -> `milestone`

| Old Name | New Name |
|----------|----------|
| `StoryBeat` | `StoryMilestone` |
| `BeatRole` | `MilestoneRole` |
| `BeatStatus` | `MilestoneStatus` |
| `BeatProgression` | `MilestoneProgression` |
| `BeatDeviation` | `MilestoneDeviation` |
| `GeneratedBeat` | `GeneratedMilestone` |
| `BEAT_ROLES` | `MILESTONE_ROLES` |
| `currentBeatIndex` | `currentMilestoneIndex` |
| `pagesInCurrentBeat` | `pagesInCurrentMilestone` |
| `beatProgressions` | `milestoneProgressions` |
| `invalidatedBeatIds` | `invalidatedMilestoneIds` |
| `pageBeatIndex` | `pageMilestoneIndex` |
| `beat-conclusion.ts` | `milestone-conclusion.ts` |
| `beat-alignment.ts` | `milestone-alignment.ts` |
| `beat-utils.ts` | `milestone-utils.ts` |

Functions to rename:
- `getCurrentBeat()` -> `getCurrentMilestone()`
- `getBeatProgression()` -> `getMilestoneProgression()`
- `isLastBeatOfAct()` -> `isLastMilestoneOfAct()`
- `createBeatDeviation()` -> `createMilestoneDeviation()`
- `parseBeatIndices()` -> `parseMilestoneIndices()`
- `getBeatOrThrow()` -> `getMilestoneOrThrow()`
- `upsertBeatProgression()` -> `upsertMilestoneProgression()`

All prompt text, schema keys, parser functions, and test files follow the same rename pattern. The `StoryAct.beats` property becomes `StoryAct.milestones`.
No backward-compatibility aliases or dual-read persistence mappings should be introduced for this rename.

---

## The 3-Call Pipeline

### Call 1: Macro Architecture Designer

**Purpose**: Forces deliberate macro shape design — act count, distinct dramatic questions per act, reversals, and promise/obligation pre-allocation — before any milestone writing.

**Input**: Same `StructureContext` as today:
- `spine`
- `decomposedCharacters`
- `decomposedWorld`
- `conceptSpec`
- `storyKernel`
- `conceptVerification`
- `toneFeel` / `toneAvoid`
- `startingSituation`

**Output** (`MacroArchitectureResult`):

```typescript
interface MacroArchitectureResult {
  overallTheme: string;
  premise: string;
  openingImage: string;
  closingImage: string;
  pacingBudget: PacingBudget;
  anchorMoments: AnchorMoments;
  initialNpcAgendas: NpcAgenda[];  // stays here, not separated
  acts: MacroAct[];
  rawResponse: string;
}

interface MacroAct {
  name: string;
  objective: string;
  stakes: string;
  entryCondition: string;
  actQuestion: string;           // Dramatic question this act answers
  exitReversal: string;          // What reversal/shift ends this act (empty for final act)
  promiseTargets: string[];      // Which premise promises this act advances
  obligationTargets: string[];   // Which genre obligations are placed in this act
}

interface AnchorMoments {
  incitingIncident: { actIndex: number; description: string };
  midpoint: { actIndex: number; milestoneSlot: number; midpointType: MidpointType };
  climax: { actIndex: number; description: string };
  signatureScenarioPlacement: { actIndex: number; description: string } | null;
}
```

**Hard Rules**:
- The midpoint is chosen here, not retrofitted later.
- Each act must end in a larger turn than the previous act.
- Every premise promise must be mapped to at least one act via `promiseTargets`.
- Every genre obligation must be assigned to at least one act via `obligationTargets`.
- `signatureScenarioPlacement` must be explicit when `conceptVerification` is provided.
- 4 or 5 acts require explicit justification. Default is 3.

### Call 2: Milestone Generator

**Purpose**: Generates milestones grounded in concrete act-level constraints, producing more specific and dramatically purposeful milestones.

**Input**: `MacroArchitectureResult` + original `StructureContext`

**Output**: 2-4 milestones per act with all current fields (renamed from beat) plus new `exitCondition` field.

Act-level fields from Call 1 are **immutable** — the milestone generator cannot modify them.

**Milestone fields** (on `GeneratedMilestone`):

```typescript
interface GeneratedMilestone {
  name: string;
  description: string;
  objective: string;
  causalLink: string;
  role: string;                        // MilestoneRole
  escalationType?: string | null;
  secondaryEscalationType?: string | null;
  crisisType?: string | null;
  expectedGapMagnitude?: string | null;
  isMidpoint?: boolean;
  midpointType?: string | null;
  uniqueScenarioHook?: string | null;
  approachVectors?: string[] | null;
  setpieceSourceIndex?: number | null;
  obligatorySceneTag?: string | null;
  exitCondition: string;               // NEW: concrete condition for milestone conclusion
}
```

**Rules**:
- Every milestone must have a concrete `exitCondition`.
- Every escalation or turning-point milestone must either trace to a verified setpiece or prove concept-specificity.
- Exactly one milestone across all acts must have `isMidpoint: true`, matching the `anchorMoments.midpoint` placement.

### Call 3: Structure Validator

**Purpose**: Perform analytical testing in a separate pass.

**Implementation**: Code-side checks first, LLM repair only for failures.

**Code-side checks**:
1. Exactly 1 midpoint across all milestones
2. 2-4 milestones per act
3. `escalationType` non-null for escalation/turning_point milestones
4. Setpiece coverage >= 4 (when `conceptVerification` provided)
5. Genre obligation coverage (all allocated tags present; fall back to the full genre list only when no obligations were allocated)
6. `exitCondition` non-empty for every milestone
7. `actQuestion` distinct across acts
8. `exitReversal` present for all non-final acts
9. `promiseTargets` cover all premise promises
10. `obligationTargets` define the structure's active genre-obligation coverage contract

**LLM repair**: Only when checks fail. Targeted repair of failing milestones/acts, not full regeneration.

**Repair policy**:
- Rewrite only the failing act or milestone cluster.
- Do not regenerate the whole structure unless macro architecture itself fails.

---

## Data Model Changes

### New fields on `StoryMilestone` (runtime type)

```typescript
export interface StoryMilestone {
  // ... all existing fields (renamed from StoryBeat) ...
  readonly exitCondition: string;  // NEW
}
```

### New fields on `StoryAct`

```typescript
export interface StoryAct {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly stakes: string;
  readonly entryCondition: string;
  readonly milestones: readonly StoryMilestone[];  // renamed from beats
  // NEW fields:
  readonly actQuestion: string;
  readonly exitReversal: string;
  readonly promiseTargets: readonly string[];
  readonly obligationTargets: readonly string[];
}
```

### New type on `StoryStructure`

```typescript
export interface StoryStructure {
  readonly acts: readonly StoryAct[];
  readonly overallTheme: string;
  readonly premise: string;
  readonly openingImage: string;
  readonly closingImage: string;
  readonly pacingBudget: PacingBudget;
  readonly anchorMoments: AnchorMoments;  // NEW
  readonly generatedAt: Date;
}
```

### `AccumulatedStructureState` rename

```typescript
export interface AccumulatedStructureState {
  readonly currentActIndex: number;
  readonly currentMilestoneIndex: number;       // was currentBeatIndex
  readonly milestoneProgressions: readonly MilestoneProgression[];  // was beatProgressions
  readonly pagesInCurrentMilestone: number;     // was pagesInCurrentBeat
  readonly pacingNudge: string | null;
}
```

### `StructureGenerationResult` update

```typescript
export interface StructureGenerationResult {
  overallTheme: string;
  premise: string;
  openingImage: string;
  closingImage: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  anchorMoments: AnchorMoments;  // NEW
  acts: GeneratedAct[];
  initialNpcAgendas?: NpcAgenda[];
  rawResponse: string;
}

export interface GeneratedAct {
  name: string;
  objective: string;
  stakes: string;
  entryCondition: string;
  milestones: GeneratedMilestone[];  // was beats: GeneratedBeat[]
  // NEW fields:
  actQuestion: string;
  exitReversal: string;
  promiseTargets: string[];
  obligationTargets: string[];
}
```

### Persistence Direction

For the completed rename, persistence now uses canonical `milestone` terminology only.

For the future new fields in this spec:
- Missing `exitCondition` on milestones may default to `''` only if this field is introduced in a separate migration.
- Missing `actQuestion` on acts may default to `''` only if this field is introduced in a separate migration.
- Missing `exitReversal` on acts may default to `''` only if this field is introduced in a separate migration.
- Missing `promiseTargets`/`obligationTargets` on acts may default to `[]` only if this field is introduced in a separate migration.
- Missing `anchorMoments` on structure may get a sensible default only if this field is introduced in a separate migration.

Do not reintroduce `beat`-named persistence keys or translation hooks as part of later work on this spec.

---

## Structure Rewrite Pipeline

### Tiered rewrite matching staged generation

**Milestone-level deviation** (spine + act frame intact):
- Skip Call 1
- Run Call 2 (regenerate milestones for affected + downstream acts)
- Run Call 3

**Act-level deviation** (spine intact, act frame broken):
- Run Call 1 (preserve completed acts, regenerate remaining act frames)
- Run Call 2
- Run Call 3

**Spine-level deviation**:
- Spine rewrite first (existing flow)
- Then act-level rewrite (full 3-call pipeline)

### Rewrite prompts split into:
- **Macro rewrite prompt**: Receives completed acts (preserved), regenerates remaining act frames
- **Milestone rewrite prompt**: Receives completed milestones (preserved) + regenerated act frames, generates new milestones

---

## Downstream Consumer Changes

### Planner prompt
- Gains access to active act's `actQuestion` and active milestone's `exitCondition`
- Uses `promiseTargets` to know which promises the current act should advance
- Additive context injections, no structural changes to planner output

### Analyst prompt
- Uses `exitCondition` for concrete milestone completion judgment (vs current objective-based heuristic)
- Uses `actQuestion` for deviation detection (narrative drift from act's core question)
- Uses `exitReversal` to judge act transition dramatic weight

### Structure state machine (`structure-state.ts`)
- Rename-only changes, no logic changes

---

## UI Changes

### Play page — act structure details (expandable section)

Currently shows: Act Objective, Act Stakes, Milestone Objective. **Add**:
- `actQuestion` — dramatic question display
- `exitCondition` — milestone exit criteria
- `exitReversal` — shown on concluded act transitions

### Briefing page

Currently shows: Theme, Premise, Pacing Budget. **Add**:
- `anchorMoments` summary — key turning points overview

### Analyst insights modal

**Add**: `actQuestion` in structural context, `exitCondition` in completion assessment

### View helper changes
- `ActDisplayInfo` interface gains new fields
- `getActDisplayInfo()` returns new fields from milestone and act data

---

## Critical Files to Modify

### Core model & types
- `src/models/story-arc.ts` — rename + new fields + AnchorMoments type
- `src/models/structure-generation.ts` — rename StructureGenerationResult types
- `src/models/index.ts` — re-exports
- `src/models/structure-version.ts` — rename references

### Engine files (rename + logic)
- `src/engine/beat-utils.ts` -> `src/engine/milestone-utils.ts`
- `src/engine/beat-conclusion.ts` -> `src/engine/milestone-conclusion.ts`
- `src/engine/beat-alignment.ts` -> `src/engine/milestone-alignment.ts`
- `src/engine/structure-state.ts` — rename
- `src/engine/structure-factory.ts` — rename
- `src/engine/structure-types.ts` — rename
- `src/engine/deviation-processing.ts` — rename
- `src/engine/spine-deviation-processing.ts` — rename
- `src/engine/structure-rewriter.ts` — tiered rewrite logic
- `src/engine/structure-rewrite-support.ts` — rename
- `src/engine/pacing-response.ts` — rename
- `src/engine/pacing-rewrite.ts` — rename
- `src/engine/page-builder.ts` — rename
- `src/engine/post-generation-processor.ts` — rename
- `src/engine/analyst-evaluation.ts` — rename
- `src/engine/deviation-handler.ts` — tiered deviation detection
- `src/engine/page-service.ts` — rename
- `src/engine/story-service.ts` — update pipeline orchestration
- `src/engine/npc-agenda-pipeline.ts` — rename

### Generation pipeline (split + new)
- `src/llm/structure-generator.ts` — orchestrate 3-call pipeline
- `src/llm/prompts/structure-prompt.ts` — becomes macro-architecture prompt (Call 1)
- **NEW**: `src/llm/prompts/milestone-generation-prompt.ts` — Call 2 prompt
- `src/llm/schemas/structure-schema.ts` — split into macro schema + milestone schema
- `src/llm/structure-response-parser.ts` — split into macro parser + milestone parser
- `src/llm/prompts/structure-rewrite-prompt.ts` — split into macro-rewrite + milestone-rewrite

### Downstream consumers
- `src/llm/prompts/continuation/story-structure-section.ts` — use new fields
- `src/llm/prompts/opening-prompt.ts` — rename
- `src/llm/prompts/continuation-prompt.ts` — rename
- `src/llm/prompts/choice-generator-prompt.ts` — rename
- `src/llm/prompts/state-accountant-prompt.ts` — rename
- `src/llm/prompts/lorekeeper-prompt.ts` — rename
- `src/llm/prompts/agenda-resolver-prompt.ts` — rename
- `src/llm/prompts/scene-ideator-prompt.ts` — rename
- `src/llm/prompts/sections/planner/continuation-context.ts` — rename + new fields
- `src/llm/prompts/sections/planner/thread-pacing-directive.ts` — rename
- `src/llm/analyst-types.ts` — rename
- `src/llm/planner-types.ts` — rename
- `src/llm/page-planner-contract.ts` — rename
- `src/llm/structure-rewrite-types.ts` — rename
- `src/llm/generation-pipeline-types.ts` — rename

### Persistence
- `src/persistence/page-serializer.ts` — handle new fields
- `src/persistence/page-serializer-types.ts` — rename
- `src/persistence/story-serializer.ts` — rename + new fields
- `src/persistence/story-serializer-types.ts` — rename
- `src/persistence/converters/structure-state-converter.ts` — rename
- `src/persistence/converters/analyst-result-converter.ts` — rename

### UI
- `src/server/utils/view-helpers.ts` — expand ActDisplayInfo
- `src/server/utils/page-panel-data.ts` — rename
- `src/server/views/pages/play.ejs` — display new fields, rename beat references
- `src/server/views/pages/briefing.ejs` — display anchorMoments
- `public/js/src/04c-act-indicator.js` — rename beat -> milestone, display new fields
- `public/js/src/05c-analyst-insights.js` — display structural context
- `public/js/src/06-state-renderers.js` — rename beat references
- `public/js/src/00-stage-metadata.js` — rename beat references
- `public/js/src/09-controllers.js` — rename beat references
- Run `node scripts/concat-client-js.js` to regenerate `app.js`

### Tests
- All test files referencing `beat` need renaming (see Blast Radius section)
- New tests for 3-call pipeline orchestration
- New tests for code-side validator
- New tests for tiered rewrite logic
- Updated mock shapes for new fields

---

## What NOT to Implement (from ChatGPT proposal)

The following proposals from the ChatGPT review are explicitly **rejected** as overengineered:

1. **Stage 0 — Architecture Brief Compiler**: The existing `StructureContext` already serves this purpose. Adding an intermediary normalization layer adds complexity without clear benefit.

2. **choiceSurface per milestone**: Choice type selection is already handled well by the Choice Generator stage (which generates choices from the written scene). Pre-specifying choice modes at structure time is premature and constraining.

3. **stateContract per milestone**: State management is already handled by the State Accountant stage. Pre-specifying thread operations at structure time would create conflicts with the reconciler.

4. **sceneEnvelope per milestone**: Scene pacing is already handled by the Planner and Analyst. Adding per-milestone scene envelopes duplicates existing functionality.

5. **Stage 4 — Branch Topology Annotator**: Branch topology is emergent from choices, not pre-planned. The current system already handles branch/bottleneck patterns via the spine's story pattern.

6. **Stage 5 — NPC Agenda Seeder**: NPC agendas are already generated as part of structure generation. Separating them into their own stage adds an LLM call for minimal benefit.

7. **Per-act milestone generation (one LLM call per act)**: Generating all milestones in a single call (Call 2) is sufficient when the macro architecture is already locked. Per-act calls add latency without proportional quality gain.

## What ChatGPT Got Right

1. **Terminology**: `beat` should be `milestone` — correct, implementing fully.
2. **Macro-first**: Design act structure before milestone details — correct, this is Call 1.
3. **Validator separation**: Validation as a separate stage — correct, this is Call 3.
4. **Act questions**: Each act should answer a distinct dramatic question — correct, adding `actQuestion`.
5. **Exit reversals**: Acts should end with meaningful reversals — correct, adding `exitReversal`.
6. **Anchor moments**: Explicit placement of inciting incident, midpoint, climax — correct, adding `AnchorMoments`.
7. **Promise/obligation allocation**: Pre-allocate before milestone writing — correct, adding `promiseTargets`/`obligationTargets`.

---

## Acceptance Criteria

A structure is valid only if:

- Act count is justified and stable
- Exactly one midpoint exists across all milestones
- Every non-final act ends with a non-empty `exitReversal`
- Every act has a distinct `actQuestion`
- Every milestone has a non-empty `exitCondition`
- Every milestone is caused by prior state (non-empty `causalLink`)
- Every premise promise is mapped via `promiseTargets` to at least one act
- The active genre-obligation contract is represented via `obligationTargets`; if no obligations are allocated, the full genre list remains the fallback contract
- Signature scenario has explicit placement (when `conceptVerification` provided)
- Setpiece coverage >= 4 unique traced setpieces (when `conceptVerification` provided)
- `escalationType` is non-null for all escalation/turning_point milestones
- 2-4 milestones per act

## Verification Plan

1. **Unit tests**: New tests for macro architecture parser, milestone parser, code-side validator
2. **Integration tests**: 3-call pipeline end-to-end with mocked LLM responses
3. **Rewrite tests**: Tiered rewrite scenarios (milestone-level, act-level, spine-level)
4. **Persistence tests**: Backward compatibility for stories saved with old schema
5. **Typecheck**: `npm run typecheck` passes
6. **Lint**: `npm run lint` passes
7. **Coverage**: `npm run test:coverage` maintains 70% thresholds
8. **Manual test**: Create a story and verify the structure has distinct act questions, meaningful exit reversals, concrete exit conditions, and specific (non-generic) milestone hooks

## Outcome

- Completion date: 2026-03-14
- What was actually changed:
  - Landed the macro-architecture, milestone-generation, and validation split with the new structure fields (`anchorMoments`, `actQuestion`, `exitReversal`, `promiseTargets`, `obligationTargets`, `exitCondition`)
  - Completed the downstream consumer and UI surfaces needed to expose those fields in the play page, briefing page, and analyst insights modal
  - Preserved canonical `milestone` terminology without reintroducing `beat` aliases
- Deviations from the original plan:
  - The compact act indicator was preserved; richer structure context was added to the existing expandable details panel and analyst insights modal instead of turning the indicator into a denser multi-line component
  - The briefing route remained co-located in `src/server/routes/play.ts` rather than moving to a separate route module
- Verification results:
  - `npm run concat:js`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/utils/view-helpers.test.ts test/unit/server/routes/play.test.ts test/unit/server/views/play.test.ts test/unit/server/views/briefing.test.ts`
  - `npm run test:client`
  - `npm run typecheck`
  - `npm run lint`
