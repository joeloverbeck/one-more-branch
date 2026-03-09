# CHABUIPIP-14: Character Stage Runner

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-06, CHABUIPIP-09, CHABUIPIP-10, CHABUIPIP-11, CHABUIPIP-12, CHABUIPIP-13
**Estimated diff size**: ~150 lines

## Summary

Create the character stage runner that orchestrates one in-memory character development stage. Given a `SavedDevelopedCharacter`, a target stage, and shared pipeline inputs, it validates prerequisites, builds the stage-specific prompt context from prior stages, runs the appropriate LLM generation, emits the existing generation-progress events, and returns the updated character without persisting it.

## File List

- `src/llm/character-stage-runner.ts` (CREATE)
- `test/unit/llm/character-stage-runner.test.ts` (CREATE)

## Out of Scope

- Do NOT create the service layer (CHABUIPIP-16)
- Do NOT create routes or views
- Do NOT modify any of the individual stage generation functions
- Do NOT modify the developed-character-repository
- Do NOT modify any models
- Do NOT load from or save to repositories in this runner

## Detailed Changes

### `src/llm/character-stage-runner.ts`:

```typescript
interface RunCharacterStageInput {
  readonly character: SavedDevelopedCharacter;
  readonly stage: CharacterDevStage;
  readonly apiKey: string;
  readonly inputs: CastPipelineInputs;
  readonly otherDevelopedCharacters?: readonly SavedDevelopedCharacter[]; // caller-provided, Stage 4 only
  readonly onGenerationStage?: GenerationStageCallback;
}

interface RunCharacterStageResult {
  readonly updatedCharacter: SavedDevelopedCharacter;
  readonly rawResponse: string;
}

interface CharacterStageRunnerDeps {
  readonly generateCharKernel: typeof generateCharKernel;
  readonly generateCharTridimensional: typeof generateCharTridimensional;
  readonly generateCharAgency: typeof generateCharAgency;
  readonly generateCharRelationships: typeof generateCharRelationships;
  readonly generateCharPresentation: typeof generateCharPresentation;
}

async function runCharacterStage(
  input: RunCharacterStageInput,
  deps?: CharacterStageRunnerDeps,
): Promise<RunCharacterStageResult>
```

Logic:
1. Validate `canGenerateCharacterStage(character, stage)` — throw `EngineError` if false
2. Build the exact prompt context required by the selected stage from `character.webContext`, `inputs`, and already-completed prior stage outputs
3. Dispatch to appropriate generation function based on stage:
   - 1 → `generateCharKernel()`
   - 2 → `generateCharTridimensional()`
   - 3 → `generateCharAgency()`
   - 4 → `generateCharRelationships()` (pass caller-provided `otherDevelopedCharacters`)
   - 5 → `generateCharPresentation()`
4. Emit `onGenerationStage` events using the existing registered engine stages:
   - 1 → `GENERATING_CHAR_KERNEL`
   - 2 → `GENERATING_CHAR_TRIDIMENSIONAL`
   - 3 → `GENERATING_CHAR_AGENCY`
   - 4 → `GENERATING_CHAR_RELATIONSHIPS`
   - 5 → `GENERATING_CHAR_PRESENTATION`
5. Build updated `SavedDevelopedCharacter` with the new stage result, refreshed `updatedAt`, and `completedStages` including the target stage exactly once
6. Return updated character (caller is responsible for persistence and any cross-character loading)

**Key design**: The runner does NOT persist and does NOT query repositories. It is a pure orchestration unit over already-implemented generation modules. Stage 4 sibling-character loading belongs in the service layer (CHABUIPIP-16), which is the right boundary for repository coordination and retry policy.

## Assumption Corrections

- The five per-stage generation modules already exist in `src/llm/`; this ticket should orchestrate them rather than introduce new stage logic.
- `GenerationStageCallback` is already suitable here because character-generation progress stages are already registered in `src/engine/generated-generation-stages.ts`.
- The current `SavedDevelopedCharacter` helpers only validate prerequisite completion. The runner must still guard stage-specific required data before calling downstream generators.
- The broader spec still contains older wording that says the runner loads/saves characters. For the current architecture, that repository coordination belongs in CHABUIPIP-16, not here.

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/character-stage-runner.test.ts`:
  - Throws EngineError when prerequisites not met (e.g., stage 2 without stage 1)
  - Throws when a required prior-stage payload is unexpectedly missing even if `completedStages` says it is complete
  - Stage 1: calls char-kernel generation with correct context
  - Stage 2: calls char-tridimensional generation with stage 1 data
  - Stage 3: calls char-agency generation with stages 1-2 data
  - Stage 4: calls char-relationships generation with stages 1-3 data + other characters
  - Stage 5: calls char-presentation generation with stages 1-4 data
  - Returns updated character with new stage data, refreshed `updatedAt`, and deduplicated `completedStages`
  - Fires `onGenerationStage` callback with the correct existing engine stage IDs and started/completed events
  - Does NOT import or call any persistence functions

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Runner is a pure function (no side effects except LLM call)
- Caller responsible for persistence
- Each stage receives ALL prior stage outputs as context (progressive accumulation)
- Stage 4 receives sibling characters only when the caller explicitly provides them
- Prefer isolated implementation; touch existing files only if required for wiring/exports/tests

## Outcome

- **Completion date**: 2026-03-09
- **What changed**:
  - Added `src/llm/character-stage-runner.ts` as a pure orchestration layer over the existing five character stage generators
  - Added `test/unit/llm/character-stage-runner.test.ts` covering prerequisite validation, missing-stage-data guards, stage dispatch for all five stages, stage-4 sibling-character injection, progress-event emission, and completed-stage deduplication
- **Deviations from original plan**:
  - Kept repository loading/persistence out of the runner entirely; Stage 4 sibling-character loading remains a service-layer concern for CHABUIPIP-16
  - Used the existing registered engine progress stage IDs (`GENERATING_CHAR_*`) rather than introducing a new callback contract
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/character-stage-runner.test.ts`
  - `npm run typecheck`
  - `npm run lint`
