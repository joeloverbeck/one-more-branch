# Beat Names In Structure + Play Header

## Status
**Status**: Proposed

## Problem
`StoryBeat` currently has:
- `id`
- `description`
- `objective`
- `role`

It does not include a short `name`, so:
- structure generation/rewrite prompts do not request or return beat names,
- parsed structure results do not validate/store beat names,
- persisted `story.json` / `structureVersions` beat objects do not contain names,
- `/play/:storyId` header can only show `Act N: [ACT_NAME]`, not beat label + beat name.

## Goal
Introduce required `beat.name` across the architecture and render it in play header as:

`Act 1: [ACT_NAME] - Beat 1.1: [BEAT_NAME]`

## Scope
- Update architecture-level structure contracts (generation + rewrite).
- Update domain/persistence contracts so beat names are first-class required data.
- Update play view display model to include current beat label/name.
- Update tests to enforce the new contract.

## Non-Goals
- No backward compatibility for legacy stories/files missing `beat.name`.
- No migration path.
- No “best effort” fallback to description/objective when name is missing.

## Design Decisions
1. `StoryBeat.name` is required and non-empty.
2. `beat.id` remains the canonical beat label (e.g., `1.1`) for UI numbering.
3. Beat name generation happens only in structure architecture prompts:
   - `src/llm/prompts/structure-prompt.ts`
   - `src/llm/prompts/structure-rewrite-prompt.ts`
4. `story.json` and every `structureVersions[*].structure` beat must include `name`.
5. `page_*.json` continues storing state only; beat name is resolved from active structure version + `accumulatedStructureState`.

## Required Contract Changes

### 1) Domain model
Update `StoryBeat` in `src/models/story-arc.ts`:
- add `readonly name: string;`

Any constructors/factories that create beats must require `name`.

### 2) LLM schema + prompt contracts
Update `STRUCTURE_GENERATION_SCHEMA` in `src/llm/schemas/structure-schema.ts`:
- beat required fields become: `name`, `description`, `objective`, `role`.

Update prompt output-shape requirements and few-shot examples:
- `src/llm/prompts/structure-prompt.ts`
- `src/llm/prompts/structure-rewrite-prompt.ts`

Each beat in examples + instructions includes:
- `name`: short evocative beat title
- `description`
- `objective`
- `role`

### 3) Parse and typed generation results
Update beat result types and parsers:
- `src/llm/structure-generator.ts`
- `src/engine/structure-types.ts`
- `src/engine/structure-rewriter.ts` (local parse path)

Validation requirement:
- reject any beat missing `name` (`STRUCTURE_PARSE_ERROR`).

### 4) Structure factory and rewrite merge
Update structure assembly paths:
- `src/engine/structure-factory.ts`
- `src/engine/structure-rewriter.ts` (`mergePreservedWithRegenerated`)

Rules:
- generated beats map `name` directly into `StoryBeat`.
- preserved completed beats carry forward unchanged `name` in rewrites.

### 5) Rewrite context for completed beats
Update completed-beat contract:
- `src/llm/types.ts` (`CompletedBeat`) add `name: string`.
- any producer/formatter using completed beats includes and displays beat names where relevant.

### 6) Persistence shape (story + versioned structures)
Update repository file data types and converters:
- `src/persistence/story-repository.ts`

Beat file shape in both:
- `structure.acts[*].beats[*]`
- `structureVersions[*].structure.acts[*].beats[*]`

must include:
- `id`, `name`, `description`, `objective`, `role`

### 7) Play header display model + template
Update view helper:
- `src/server/utils/view-helpers.ts`

`ActDisplayInfo` should include beat fields, for example:
- `beatId`
- `beatName`
- combined `displayString`

Display format:
- `Act ${actNumber}: ${actName} - Beat ${beatId}: ${beatName}`

Update template consumption:
- `src/server/views/pages/play.ejs`

No fallback rendering for missing beat name in the new architecture path.

## Validation and Failure Policy
- Treat missing `beat.name` as invalid structure data.
- Fail fast during parse/validation rather than silently defaulting.
- Because no legacy path is supported, stories lacking beat names are invalid inputs.

## Test Plan

### Unit tests to update/add
- `test/unit/llm/schemas/structure-schema.test.ts`
  - beat required fields include `name`.
- `test/unit/llm/structure-generator.test.ts`
  - parse fails when name missing.
  - parsed beats include `name`.
- `test/unit/engine/structure-rewriter.test.ts`
  - merged/rewritten beats preserve/include names.
- `test/unit/persistence/story-repository.test.ts`
  - round-trip includes beat names in `structure` and `structureVersions`.
- `test/unit/server/utils/view-helpers.test.ts`
  - display string includes beat segment and beat name.

### Integration/E2E adjustments
- any fixture builders constructing beats must include `name`.
- expected play header text assertions updated to include beat segment.

## Acceptance Criteria
1. Newly generated structures always include `beat.name`.
2. Rewritten structures always include `beat.name`, including preserved completed beats.
3. Persisted story files store beat names in both active and versioned structures.
4. `/play/:storyId` displays:
   - `Act 1: [ACT_NAME] - Beat 1.1: [BEAT_NAME]`
5. Tests fail if a beat is created/parsed/persisted without `name`.
6. No backward-compatibility code paths are introduced for missing beat names.

## Implementation Order
1. Update model + shared types.
2. Update schemas/prompts/few-shot.
3. Update parse + structure assembly/rewrite merge.
4. Update persistence converters/repository.
5. Update play view-helper + EJS output.
6. Update tests/fixtures and run full test suite.
