# NARARCAUD-15: Genre Obligations — Structure Wiring

**Status**: COMPLETED
**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: NARARCAUD-14
**Spec reference**: C1-C3 (part 2) — Genre Contract gaps

## Summary

Wire the genre obligations registry into the structure generation pipeline end-to-end. Add `obligatorySceneTag` to structure beats, inject the genre obligation list into the structure prompt, and post-validate coverage (warn when required tags are missing).

## Assumption Reassessment (Current Code)

- The original ticket assumed structure data moved directly from schema/prompt into `StoryBeat`; this is inaccurate.
- Actual pipeline is: `structure-schema` -> `structure-response-parser` -> `models/structure-generation` -> `engine/structure-factory` -> `models/story-arc`.
- Therefore, adding a new beat field must be threaded through parser + intermediate generation model + factory (not only schema + story-arc).
- Rewrite flows (`structure-rewrite-types`, `structure-rewrite-support`, `structure-rewriter`) also carry beat-shape payloads and must keep the field to avoid data loss.
- `src/engine/structure-types.ts` is only a type re-export and does not require direct changes for this ticket.
- This ticket should stay focused on structure-generation wiring and coverage warnings only; analyst/rewrite prompt obligations remain out of scope per Wave split.

## Scope (Corrected)

1. Add `obligatorySceneTag: string | null` to beat models used by structure generation.
2. Update structure schema with required nullable `obligatorySceneTag` beat field.
3. Inject genre obligation tags into structure prompt when `conceptSpec.genreFrame` is available.
4. Require beat-level tagging in prompt instructions and output shape.
5. Add post-generation warning when concept genre has obligations not covered by any beat tags.
6. Thread field through structure parser/factory/rewrite-support types so it is preserved end-to-end.
7. Update prompt docs and tests to align with implementation.

## Files Touched

- `src/models/story-arc.ts`
- `src/models/structure-generation.ts`
- `src/llm/schemas/structure-schema.ts`
- `src/llm/prompts/structure-prompt.ts`
- `src/llm/structure-response-parser.ts`
- `src/llm/structure-generator.ts`
- `src/engine/structure-factory.ts`
- `src/llm/structure-rewrite-types.ts`
- `src/engine/structure-rewrite-support.ts`
- `src/engine/structure-rewriter.ts`
- `src/persistence/story-serializer.ts`
- `src/persistence/story-serializer-types.ts`
- `test/unit/llm/schemas/structure-schema.test.ts`
- `test/unit/llm/prompts/structure-prompt.test.ts`
- `test/unit/llm/structure-response-parser.test.ts`
- `test/unit/llm/structure-generator.test.ts`
- `prompts/structure-prompt.md`

## Out of Scope

- Analyst evaluation of obligatory scenes (NARARCAUD-16)
- Structure rewrite prompt obligations enforcement (future ticket)
- Backward compatibility aliases or dual fields (explicitly avoid)

## Architecture Rationale

- This makes `genreFrame` load-bearing in structure generation rather than passive metadata.
- Tag-level obligations are extensible: analyst/planner stages can consume the same field without further schema redesign.
- Using one canonical field (`obligatorySceneTag`) avoids aliasing and keeps contracts strict.

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Unit test: structure schema requires nullable `obligatorySceneTag`
- [x] Unit test: `buildStructurePrompt` includes genre obligation list when `conceptSpec.genreFrame` is provided
- [x] Unit test: parser/factory preserve `obligatorySceneTag` when valid and normalize invalid values to `null`
- [x] Unit test: structure post-validation warns when required genre obligation tags are missing
- [x] Invariant: all relevant existing tests pass

## Outcome

**Completion date**: 2026-02-27

**What was actually changed**:
- Added `obligatorySceneTag` to the structure beat contract and threaded it through schema, parser, generation model, factory, rewrite support, rewriter merge, and persistence serialization.
- Added genre-obligation prompt injection based on `conceptSpec.genreFrame`, including explicit tagging constraints and output shape requirements.
- Added structure post-validation warning for missing required genre obligation tags.
- Updated prompt documentation and expanded targeted unit coverage for schema, prompt, parser normalization, and generator warnings.

**Deviations from original ticket plan**:
- Added persistence-layer wiring (`story-serializer*`) because adding a required `StoryBeat` field without persistence support caused a concrete typecheck failure and data-loss risk.
- Did not modify `src/engine/structure-types.ts` because reassessment confirmed it is only a re-export and does not own beat shape.

**Verification results**:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/schemas/structure-schema.test.ts test/unit/llm/prompts/structure-prompt.test.ts test/unit/llm/structure-response-parser.test.ts test/unit/llm/structure-generator.test.ts test/unit/engine/structure-factory.test.ts test/unit/persistence/story-serializer.test.ts` passed (6 suites, 118 tests).
