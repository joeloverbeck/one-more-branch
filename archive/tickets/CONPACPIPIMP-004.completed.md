# CONPACPIPIMP-004: Add playerRole, want, counterforce, deepPatternRef to ContentSpark

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None (`TasteProfile.deepPatterns` and `ContentKind` values `PLACE` / `SECRET` already exist in the current codebase)

## Problem

Sparkstormer produces "charged fragments" that are atmospheric but imply nothing about protagonist position, desire, or opposition. This forces the Packeter to invent interactive structure from pure mood — too much deferred work. Adding agency-grounding fields to sparks ensures every spark carries a protagonist position, a want, and an opposing force.

## Assumption Reassessment (2026-03-25)

1. `ContentSpark` in [src/models/content-generation-contracts.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/src/models/content-generation-contracts.ts) currently has 5 fields: `sparkId`, `contentKind`, `spark`, `imageSeed`, `collisionTags` — confirmed.
2. `TasteProfile.deepPatterns` already exists in [src/models/content-generation-contracts.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/src/models/content-generation-contracts.ts), so this ticket does not depend on adding it first.
3. `CONTENT_KIND_VALUES` in [src/models/content-taxonomy.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/src/models/content-taxonomy.ts) already includes `PLACE` and `SECRET`, so content-kind expansion is not part of this ticket.
4. `buildContentSparkstormerSchema()` in [src/llm/schemas/content-sparkstormer-schema.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/src/llm/schemas/content-sparkstormer-schema.ts) still exposes the old 5-field spark contract and must be updated.
5. `parseSparkstormerResponse()` in [src/llm/content-sparkstormer-generation.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/src/llm/content-sparkstormer-generation.ts) validates each spark object and is the correct enforcement point for non-empty-string guarantees on the new fields.
6. The live Sparkstormer prompt in [src/llm/prompts/content-sparkstormer-prompt.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/src/llm/prompts/content-sparkstormer-prompt.ts) still instructs the LLM to emit only the old 5-field spark shape. Treating this ticket as parser/schema-only would make the pipeline more brittle, not more robust.
7. The repository contains the prompt reference doc at [prompts/content-sparkstormer-prompt.md](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/prompts/content-sparkstormer-prompt.md); because this is a prompt-pipeline contract change, that doc must be updated in the same pass.
8. The ticket’s original file list was stale. The relevant tests that actually exist are [test/unit/llm/content-sparkstormer.test.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/test/unit/llm/content-sparkstormer.test.ts), [test/unit/models/content-generation-contracts.test.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/test/unit/models/content-generation-contracts.test.ts), and [test/unit/server/services/content-service.test.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/test/unit/server/services/content-service.test.ts) if saved spark provenance is intentionally affected.

## Architecture Check

1. The current architecture benefits from making agency-grounding part of the spark contract itself. Right now the packeter receives sparks that are visually vivid but structurally underspecified, which pushes protagonist position and conflict invention downstream. Moving that responsibility into Sparkstormer is a net improvement because it makes stage boundaries sharper: Sparkstormer produces agency-bearing sparks; Packeter shapes them into packets.
2. This should remain a strict contract change, not an aliasing or fallback exercise. New spark fields should be required everywhere the Sparkstormer contract is defined or validated.
3. The change is not truly "pure additive" unless the prompt contract is updated too. Schema and parser strictness without prompt alignment would create a fragile architecture that fails at runtime more often.
4. `ContentPacketSourceArtifact` should remain unchanged in this ticket. It is a saved provenance summary, not a serialized clone of the full spark schema. Duplicating every spark field into saved artifacts would increase persistence surface area without a demonstrated read-path need. If later provenance UX needs these fields, add them deliberately in a separate ticket.
5. No persistence upcaster is needed for this ticket because saved packets do not persist raw `ContentSpark` objects.

## What to Change

### 1. `ContentSpark` interface

Add 4 fields:
```typescript
readonly playerRole: string;
readonly want: string;
readonly counterforce: string;
readonly deepPatternRef: string;
```

### 2. Sparkstormer JSON schema

Add 4 required string properties to the spark object schema:
- `playerRole`: `{ type: 'string' }`
- `want`: `{ type: 'string' }`
- `counterforce`: `{ type: 'string' }`
- `deepPatternRef`: `{ type: 'string' }`

Add all 4 to the spark object's `required` array.

### 3. Sparkstormer response transformer

Update `parseSparkstormerResponse()` to validate the 4 new fields exist and are non-empty strings on each spark object.

### 4. Sparkstormer prompt contract

Update [src/llm/prompts/content-sparkstormer-prompt.ts](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/src/llm/prompts/content-sparkstormer-prompt.ts) so the system/user prompt explicitly requires:

- `playerRole`: a specific protagonist position in the spark
- `want`: the urgent desire implied by the spark
- `counterforce`: the resisting person/system/condition
- `deepPatternRef`: one deep pattern from the supplied taste profile

The output requirements must list all 9 spark fields, not the old 5-field shape.

### 5. Prompt reference doc

Update [prompts/content-sparkstormer-prompt.md](/home/joeloverbeck/projects/one-more-branch/.worktrees/conpacpipimp-001/prompts/content-sparkstormer-prompt.md) so the documented JSON contract and narrative guidance match the live prompt and schema.

## Files to Touch

- `src/models/content-generation-contracts.ts` (modify)
- `src/llm/schemas/content-sparkstormer-schema.ts` (modify)
- `src/llm/content-sparkstormer-generation.ts` (modify)
- `src/llm/prompts/content-sparkstormer-prompt.ts` (modify)
- `prompts/content-sparkstormer-prompt.md` (modify)
- `test/unit/models/content-generation-contracts.test.ts` (modify if adding direct contract coverage adds value)
- `test/unit/llm/content-sparkstormer.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify only if provenance expectations intentionally change; otherwise leave untouched)

## Out of Scope

- `ContentPacketSourceArtifact` changes — the existing artifact shape remains the persistence boundary for now
- Packeter or evaluator changes
- Content-kind expansion (`PLACE` / `SECRET`) because it is already implemented in the current codebase
- Replacing `viewpointPressure` with `playerPosition` in packet contexts
- Any persistence migration or upcasting work

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: valid sparks with all 9 fields parse successfully
2. Unit test: `parseSparkstormerResponse` rejects sparks missing `playerRole`, `want`, `counterforce`, or `deepPatternRef`
3. Unit test: `parseSparkstormerResponse` rejects blank-string values for the new fields
4. Unit test: `buildContentSparkstormerSchema()` output includes the 4 new properties in the spark `required` array
5. Unit test: the Sparkstormer prompt contract and prompt reference doc both describe the 9-field spark shape
6. Relevant existing tests continue to pass without changing saved provenance expectations unless explicitly intended
7. Repository verification: targeted unit tests, `npm run lint`, and the relevant broader test suite(s) pass

### Invariants

1. All 5 existing `ContentSpark` fields remain unchanged
2. The 4 new spark fields are required, not optional aliases
3. Schema `strict: true` mode is preserved
4. Response transformer throws `LLMError` on validation failure (existing pattern preserved)
5. Sparkstormer prompt, schema, parser, and docs all describe the same contract

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-sparkstormer.test.ts` — update valid spark fixtures; add missing-field and blank-string coverage for the new fields; verify prompt contract text and schema required fields stay aligned
2. `test/unit/models/content-generation-contracts.test.ts` — only add direct `ContentSpark` contract coverage if it meaningfully closes a gap not already covered by the parser tests

### Commands

1. `npm run test:unit -- --runInBand --testPathPatterns="content-sparkstormer|content-generation-contracts|content-service"`
2. `npm run lint`
3. `npm test`

## Outcome

- Completed on 2026-03-25.
- Implemented the required `ContentSpark` contract expansion in the model, Sparkstormer schema, parser, and live prompt builder.
- Updated the Sparkstormer prompt reference doc in the same pass so the documented contract matches the runtime contract.
- Strengthened Sparkstormer unit coverage for missing and blank `playerRole`, `want`, `counterforce`, and `deepPatternRef` fields.
- Updated typed spark fixtures in downstream tests that consume `ContentSpark`.
- Intentionally did not expand saved `origin.sourceArtifacts`; the existing slimmer provenance boundary remains cleaner than duplicating the full spark schema into persistence.
- Corrected the ticket scope versus the original plan: `PLACE` / `SECRET` and `TasteProfile.deepPatterns` were already implemented, while prompt-contract work was in fact required for a robust change.
- Verification: `npm run test:unit -- --runInBand --testPathPatterns="content-sparkstormer|content-generation-contracts|content-service|content-packeter"`, `npm run lint`, and `npm test` all passed.
