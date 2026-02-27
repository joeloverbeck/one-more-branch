# NARARCAUD-16: Genre Obligations — Analyst & Rewrite Wiring

**Status**: COMPLETED
**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: NARARCAUD-15
**Spec reference**: C1-C3 (part 3) — Genre Contract gaps

## Summary

Close the remaining genre-obligation gap by:
1. Adding analyst-level obligation fulfillment reporting (`obligatorySceneFulfilled`), and
2. Making rewrite prompts obligation-aware so completed obligation tags are preserved and remaining genre obligations are explicitly required in regenerated beats.

## Reassessed Assumptions (2026-02-27)

- `genre-obligations` registry is already implemented in `src/models/genre-obligations.ts` with tests.
- `StoryBeat.obligatorySceneTag` is already present in `src/models/story-arc.ts` and is threaded through structure schema/parser/factory/serializer.
- `structure-prompt` already injects genre obligations and requires `obligatorySceneTag` coverage.
- `structure-generator` already warns when obligation tags are missing in generated structures.
- Rewrite support/types already carry `obligatorySceneTag`, but `structure-rewrite` prompt instructions do not yet enforce preserving/covering obligation tags explicitly.
- Analyst currently tracks `premisePromiseFulfilled` but does not yet report obligation fulfillment.

## Corrected Scope (source of truth)

### Must implement

- `src/llm/analyst-types.ts`
  - Add `obligatorySceneFulfilled: string | null` to `AnalystResult`.
- `src/llm/schemas/analyst-schema.ts`
  - Add `obligatorySceneFulfilled` (required, nullable string).
- `src/llm/schemas/analyst-validation-schema.ts`
  - Validate/normalize `obligatorySceneFulfilled`.
- `src/llm/schemas/analyst-response-transformer.ts`
  - Sanitize and pass through `obligatorySceneFulfilled`.
- `src/llm/prompts/analyst-prompt.ts`
  - Add obligation-fulfillment instructions scoped to active beat/structure context.
- `src/llm/prompts/structure-rewrite-prompt.ts`
  - Preserve completed beat obligation tags and require remaining obligations on regenerated beats when a genre contract exists.
- `src/persistence/converters/analyst-result-converter.ts`
  - Persist and restore `obligatorySceneFulfilled`.
- `src/persistence/page-serializer-types.ts`
  - Add file-data field for `obligatorySceneFulfilled`.
- `prompts/analyst-prompt.md`
  - Document obligation-fulfillment output field and behavior.
- `prompts/structure-rewrite-prompt.md`
  - Document rewrite obligation preservation/coverage requirements.

### Expected tests to add/update

- `test/unit/llm/schemas/analyst-schema.test.ts`
  - Assert `obligatorySceneFulfilled` is required + nullable.
- `test/unit/llm/prompts/analyst-prompt.test.ts`
  - Assert prompt includes obligation evaluation guidance when active beat has a tag.
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
  - Assert rewrite prompt includes obligation preservation + remaining obligation coverage instructions.
- Any typed fixtures/mocks constructing `AnalystResult` literals.

## Out of Scope

- Genre registry creation (already completed in prior ticket)
- Structure generation prompt/schema wiring for obligations (already completed)
- New story-level accumulation model for fulfilled obligations (future ticket if needed)

## Architectural Rationale

- This is additive but load-bearing: obligation tags already exist at structure level; analyst and rewrite flows should explicitly reason over the same contract to avoid silent drift.
- Keeping obligation fulfillment as a dedicated field (rather than overloading `premisePromiseFulfilled`) preserves separation of concerns:
  - `premisePromiseFulfilled` = concept-delivery contract
  - `obligatorySceneFulfilled` = genre contract

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Unit test: analyst schema includes required nullable `obligatorySceneFulfilled`
- [x] Unit test: `buildAnalystPrompt` includes obligation fulfillment instructions
- [x] Unit test: `buildStructureRewritePrompt` requires preserving completed obligation tags and covering remaining obligations in regenerated beats
- [x] Relevant unit/integration tests pass

## Outcome

- Completion date: 2026-02-27
- What changed vs originally planned:
  - Implemented `obligatorySceneFulfilled` end-to-end across analyst contract/schema/validation/transformer/persistence.
  - Added analyst prompt instructions + active-beat obligation context block for obligation fulfillment evaluation.
  - Upgraded structure rewrite prompt to include genre obligation contract context, preserve completed obligation tags, and require coverage of remaining obligation tags.
  - Updated prompt docs (`prompts/analyst-prompt.md`, `prompts/structure-rewrite-prompt.md`) and targeted tests.
- Deviations from original ticket wording:
  - Ticket file list was expanded to include required wiring files (`analyst-validation-schema`, `analyst-response-transformer`, persistence converter/types) discovered during reassessment.
  - Scope remained constrained; no new story-level accumulation model for fulfilled obligations was introduced.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/analyst-schema.test.ts test/unit/llm/schemas/analyst-response-transformer.test.ts test/unit/llm/prompts/analyst-prompt.test.ts test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/persistence/page-serializer-converters.test.ts`
  - `npm run typecheck`
  - `npm run lint`
