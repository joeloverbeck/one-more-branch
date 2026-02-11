**Status**: ✅ COMPLETED

# Spec 09: Page Planner

## Objective

Introduce an LLM planner step that outputs machine-validated scene intent and state-intent proposals before prose generation.

## Planner Responsibilities

1. Decide immediate scene direction from player choice or opening setup.
2. Propose state transition intents (not final deltas) for:
   - threats
   - constraints
   - threads
   - inventory
   - health
   - character state
   - canon
3. Provide concise writing guidance for the writer.

## Planner Must Not

1. Produce narrative prose.
2. Produce player choices.
3. Assign server IDs.

## New Data Contract

### `PagePlan` in `src/llm/types.ts`

Required fields:

- `sceneIntent: string`
- `continuityAnchors: string[]`
- `stateIntents: {
  threats: { add: string[]; removeIds: string[]; replace: Array<{ removeId: string; addText: string }> };
  constraints: { add: string[]; removeIds: string[]; replace: Array<{ removeId: string; addText: string }> };
  threads: {
    add: Array<{ text: string; threadType: ThreadType; urgency: Urgency }>;
    resolveIds: string[];
    replace: Array<{ resolveId: string; add: { text: string; threadType: ThreadType; urgency: Urgency } }>;
  };
  inventory: { add: string[]; removeIds: string[]; replace: Array<{ removeId: string; addText: string }> };
  health: { add: string[]; removeIds: string[]; replace: Array<{ removeId: string; addText: string }> };
  characterState: {
    add: Array<{ characterName: string; states: string[] }>;
    removeIds: string[];
    replace: Array<{ removeId: string; add: { characterName: string; state: string } }>;
  };
  canon: {
    worldAdd: string[];
    characterAdd: Array<{ characterName: string; facts: string[] }>;
  };
}`
- `writerBrief: {
  openingLineDirective: string;
  mustIncludeBeats: string[];
  forbiddenRecaps: string[];
}`

## Planner Prompt

### New files

- `src/llm/prompts/page-planner-prompt.ts`
- `src/llm/prompts/sections/planner/*`

### Inputs

- Opening: character concept, worldbuilding, tone, optional starting situation, structure (if present), empty current state.
- Continuation: selected choice, worldbuilding, tone, active structured state, inventory, health, character state, canon, previous context slices.

### Output schema

- Add `src/llm/schemas/page-planner-schema.ts` with strict JSON schema.
- Add `src/llm/schemas/page-planner-validation-schema.ts` (zod).
- Add transformer file mirroring existing writer transformer style.

## Deterministic Planner Validation

Validation layer must reject:

1. ID prefix mismatch in remove/resolve fields.
2. Empty thread text.
3. `replace` operations that do not include both removal and replacement payload.
4. Duplicate intents within each category after normalization.
5. Invalid thread taxonomy enum.

## Engine Integration

In `src/engine/page-service.ts`:

1. Build `PagePlanContext` from current story + parent state.
2. Call `generatePagePlan()` before writer call.
3. Pass plan to writer and reconciler.
4. Include planner observability context: `storyId`, `pageId`, `requestId`.

## Acceptance Criteria

1. Planner returns valid `PagePlan` for both opening and continuation.
2. Planner output is strict-schema validated before downstream use.
3. Invalid plan fails generation attempt with machine-readable errors.

## Required Tests

1. Unit: planner prompt composition for opening and continuation.
2. Unit: planner schema validation and transformer trimming.
3. Unit: planner ID validation and duplicate-intent rejection.
4. Integration: planner output is consumed by writer/reconciler in page generation flow.

## Outcome

- Completion date: 2026-02-11
- What was changed:
  - Implemented planner data contracts (`PagePlan`, planner context/result types) in `src/llm/types.ts`.
  - Implemented planner prompt + sections and planner client flow (`generatePagePlan`) with structured output schema/validation.
  - Implemented deterministic planner validation and response transformer behavior for malformed/invalid planner outputs.
  - Integrated planner into `page-service` first-page and continuation generation before writer invocation.
  - Passed planner guidance into writer/opening prompt contexts and included observability metadata (`storyId`, `pageId`, `requestId`) for planner calls.
  - Added/updated unit and integration tests covering planner prompt, schema validation, and planner integration sequencing.
- Deviations from original plan:
  - Reconciler integration remains deferred; planner output is currently consumed by writer path and integration seam only.
- Verification:
  - Full repository tests and lint pass (`npm run test`, `npm run lint`).
