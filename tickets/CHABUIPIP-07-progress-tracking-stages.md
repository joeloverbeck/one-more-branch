# CHABUIPIP-07: Add Character Pipeline Generation Stages

**Status**: NOT STARTED
**Dependencies**: None
**Estimated diff size**: ~60 lines across 3 files

## Summary

Register 6 new generation stages for the character pipeline: `GENERATING_CHARACTER_WEB`, `GENERATING_CHAR_KERNEL`, `GENERATING_CHAR_TRIDIMENSIONAL`, `GENERATING_CHAR_AGENCY`, `GENERATING_CHAR_RELATIONSHIPS`, `GENERATING_CHAR_PRESENTATION`. Add corresponding LlmStage entries and client-side display names + phrase pools.

## File List

- `src/config/generation-stage-metadata.json` (MODIFY — add 6 new stage entries with displayName and phrasePools)
- `src/config/stage-model.ts` (MODIFY — add LlmStage entries for the 6 new stages)
- `src/config/llm-stage-registry.ts` (MODIFY — register the 6 new stages if this is how stages are registered)

Check first: the actual stage registration mechanism. Grep for how existing stages like `GENERATING_SPINE` are registered to follow the exact pattern.

## Out of Scope

- Do NOT modify any LLM prompt builders or schemas
- Do NOT modify any service or route code
- Do NOT modify the progress tracking service itself
- Do NOT modify `app.js` or any EJS templates
- Do NOT create any new generation code

## Detailed Changes

### Generation stages to add:

| Stage | Display Name | Example Phrase Pool |
|-------|-------------|-------------------|
| `GENERATING_CHARACTER_WEB` | "Weaving Character Web" | ["Mapping cast dynamics...", "Discovering relationships...", "Building character connections..."] |
| `GENERATING_CHAR_KERNEL` | "Building Character Kernel" | ["Defining core drives...", "Shaping character essence...", "Crystallizing motivations..."] |
| `GENERATING_CHAR_TRIDIMENSIONAL` | "Creating Tridimensional Profile" | ["Exploring character depth...", "Building character layers...", "Mapping character dimensions..."] |
| `GENERATING_CHAR_AGENCY` | "Modeling Agency" | ["Defining decision patterns...", "Mapping beliefs and desires...", "Building behavioral model..."] |
| `GENERATING_CHAR_RELATIONSHIPS` | "Deepening Relationships" | ["Exploring connections...", "Revealing relationship dynamics...", "Uncovering character tensions..."] |
| `GENERATING_CHAR_PRESENTATION` | "Crafting Presentation" | ["Defining voice and speech...", "Shaping appearance...", "Building textual presence..."] |

### LlmStage entries:

Each new stage needs a default model assignment in `stage-model.ts`. Follow the pattern of existing stages (likely default to the same model as `DECOMPOSING_ENTITIES` or a similar non-story-critical stage).

### Client-side metadata:

Add entries to `generation-stage-metadata.json` which auto-generates into `00-stage-metadata.js`. Then run `node scripts/concat-client-js.js` to regenerate `app.js`.

## Pre-Implementation Check

```bash
grep -r "GENERATING_SPINE\|DECOMPOSING_ENTITIES" src/config/ src/engine/types.ts
```
Follow the exact same registration pattern for the new stages.

## Acceptance Criteria

### Tests that must pass

- Existing tests pass unchanged
- `npm run typecheck` passes (new stages are valid `GenerationStage` values)
- `npm run lint` passes

### Invariants

- All existing generation stages remain unchanged
- The new stages follow the exact same registration pattern as existing stages
- Client-side `STAGE_DISPLAY_NAMES` and `STAGE_PHRASE_POOLS` include all 6 new stages
- `app.js` is regenerated after metadata changes
