# CHABUIPIP-14: Character Stage Runner

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-06, CHABUIPIP-09, CHABUIPIP-10, CHABUIPIP-11, CHABUIPIP-12, CHABUIPIP-13
**Estimated diff size**: ~150 lines

## Summary

Create the character stage runner that orchestrates individual character development. Given a `SavedDevelopedCharacter` and a target stage, it validates prerequisites, builds context from prior stages, runs the appropriate LLM generation, and saves the result.

## File List

- `src/llm/character-stage-runner.ts` (CREATE)
- `test/unit/llm/character-stage-runner.test.ts` (CREATE)

## Out of Scope

- Do NOT create the service layer (CHABUIPIP-16)
- Do NOT create routes or views
- Do NOT modify any of the individual stage generation functions
- Do NOT modify the developed-character-repository
- Do NOT modify any models

## Detailed Changes

### `src/llm/character-stage-runner.ts`:

```typescript
interface RunCharacterStageInput {
  readonly character: SavedDevelopedCharacter;
  readonly stage: CharacterDevStage;
  readonly apiKey: string;
  readonly inputs: CastPipelineInputs;
  readonly otherDevelopedCharacters?: readonly SavedDevelopedCharacter[]; // for Stage 4
  readonly onGenerationStage?: GenerationStageCallback;
}

interface RunCharacterStageResult {
  readonly updatedCharacter: SavedDevelopedCharacter;
  readonly rawResponse: string;
}

async function runCharacterStage(input: RunCharacterStageInput): Promise<RunCharacterStageResult>
```

Logic:
1. Validate `canGenerateCharacterStage(character, stage)` — throw `EngineError` if false
2. Build `CharacterDevPromptContext` from character's existing stage data + inputs
3. Dispatch to appropriate generation function based on stage:
   - 1 → `generateCharKernel()`
   - 2 → `generateCharTridimensional()`
   - 3 → `generateCharAgency()`
   - 4 → `generateCharRelationships()` (pass otherDevelopedCharacters)
   - 5 → `generateCharPresentation()`
4. Fire `onGenerationStage` callback with appropriate stage name
5. Build updated `SavedDevelopedCharacter` with new stage result + updated `completedStages`
6. Return updated character (caller is responsible for persistence)

**Key design**: The runner does NOT persist. It returns the updated character, and the service layer (CHABUIPIP-16) handles saving. This keeps the runner pure and testable.

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/character-stage-runner.test.ts`:
  - Throws EngineError when prerequisites not met (e.g., stage 2 without stage 1)
  - Stage 1: calls char-kernel generation with correct context
  - Stage 2: calls char-tridimensional generation with stage 1 data
  - Stage 3: calls char-agency generation with stages 1-2 data
  - Stage 4: calls char-relationships generation with stages 1-3 data + other characters
  - Stage 5: calls char-presentation generation with stages 1-4 data
  - Returns updated character with new stage data and updated completedStages
  - Fires onGenerationStage callback with correct stage name
  - Does NOT call any persistence functions (pure function)

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Runner is a pure function (no side effects except LLM call)
- Caller responsible for persistence
- Each stage receives ALL prior stage outputs as context (progressive accumulation)
- No existing code modified
