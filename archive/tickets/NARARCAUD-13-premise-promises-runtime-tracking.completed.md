# NARARCAUD-13: Premise Promises — Runtime Tracking

**Status**: COMPLETED
**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: NARARCAUD-12
**Spec reference**: D1 (part 2) — Concept-to-Delivery Pipeline gaps

## Reassessed Assumptions (Codebase Reality)

1. `ConceptVerification.premisePromises` already exists and is validated.
- Present in `src/models/concept-generator.ts` and concept verifier parser/tests.
- This ticket must not re-implement concept-verifier schema/model work.

2. Branch-progress state in this codebase is page-local, not story-global.
- Existing accumulated progression fields (`accumulatedPromises`, thread ages, active state) are stored on `Page` and inherited by descendants.
- Storing fulfilled premise promises on `Story` would collapse branch-specific truth into global state and break branching semantics.

3. `conceptVerification` is currently transient during story creation and structure generation.
- It is passed through `StartStoryOptions` and used in structure/spine prompts but is not persisted on `Story`.
- Runtime premise-promise tracking requires a persisted story-level source for the original promise list.

4. Planner warning placement belongs in continuation planner context generation.
- Late-act warnings should be emitted from `src/llm/prompts/sections/planner/continuation-context.ts`, with data threaded through continuation context builders.

## Corrected Scope

Implement premise-promise runtime tracking with branch-safe state and persisted source-of-truth:

- Add analyst output field:
  - `AnalystResult.premisePromiseFulfilled: string | null`
  - Schema + validation transformer updates
  - Analyst prompt instructions + context section for premise promises

- Persist premise promises on story creation as immutable story metadata:
  - `Story.premisePromises: readonly string[]` (default `[]`)
  - Populate from `StartStoryOptions.conceptVerification?.premisePromises`
  - Serialize/deserialize story field

- Track fulfilled premise promises per branch on page state:
  - `Page.accumulatedFulfilledPremisePromises: readonly string[]`
  - Compute in `page-builder` from parent + analyst signal (deduped)
  - Serialize/deserialize page field

- Thread promise fulfillment context into planner continuation context:
  - Extend `ContinuationContext` / `ContinuationPagePlanContext`
  - Include `premisePromises` and `fulfilledPremisePromises`
  - In late acts, add explicit warning section for remaining unfulfilled premise promises

- Thread premise promises into structure planning contract:
  - `buildStructurePrompt` includes a premise-promise contract section when available
  - Keep this constraint-oriented (no new structural fields)

- Prompt docs alignment updates:
  - `prompts/analyst-prompt.md`
  - `prompts/structure-prompt.md`
  - `prompts/page-planner-prompt.md`

## Architectural Rationale

- **Why not `Story.fulfilledPremisePromises`?**
  Branches can fulfill different premise promises at different times. Global storage on story conflates divergent playthroughs and introduces correctness bugs.

- **Why store `Story.premisePromises`?**
  It is immutable source metadata for all branches and required during continuation runtime; currently it is otherwise unavailable after creation.

- **Why singular analyst field (`string | null`) instead of array?**
  Keep payload small and deterministic per scene; page-level accumulator captures cumulative fulfillment over time.

## Files Touched

- `src/llm/analyst-types.ts`
- `src/llm/schemas/analyst-schema.ts`
- `src/llm/schemas/analyst-validation-schema.ts`
- `src/llm/schemas/analyst-response-transformer.ts`
- `src/llm/prompts/analyst-prompt.ts`
- `src/llm/prompts/structure-prompt.ts`
- `src/models/story.ts`
- `src/models/page.ts`
- `src/engine/story-service.ts`
- `src/engine/analyst-evaluation.ts`
- `src/engine/post-generation-processor.ts`
- `src/engine/page-builder.ts`
- `src/engine/continuation-context-builder.ts`
- `src/llm/context-types.ts`
- `src/llm/prompts/sections/planner/continuation-context.ts`
- `src/persistence/story-serializer-types.ts`
- `src/persistence/story-serializer.ts`
- `src/persistence/page-serializer-types.ts`
- `src/persistence/page-serializer.ts`
- `src/persistence/converters/analyst-result-converter.ts`
- `test/unit/llm/schemas/analyst-schema.test.ts`
- `test/unit/llm/prompts/analyst-prompt.test.ts`
- `test/unit/llm/prompts/structure-prompt.test.ts`
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- `test/unit/engine/continuation-context-builder.test.ts`
- `test/unit/engine/page-builder.test.ts`
- `test/fixtures/llm-results.ts`
- `test/integration/persistence/page-serializer-converters.test.ts`
- `prompts/analyst-prompt.md`
- `prompts/structure-prompt.md`
- `prompts/page-planner-prompt.md`

## Out of Scope

- Concept generation/verifier model changes for `premisePromises` (already implemented)
- Backward compatibility or migration logic

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit tests cover analyst schema/prompt support for `premisePromiseFulfilled`
- [x] Unit tests cover structure prompt premise-promise contract inclusion
- [x] Unit tests cover continuation planner late-act unfulfilled premise warnings
- [x] Unit tests cover page-level accumulation of fulfilled premise promises
- [x] Persistence tests cover story/page round-trip for new fields
- [x] Relevant test suites pass

## Outcome

**Completion date**: 2026-02-27

**What changed**:
- Implemented premise-promise fulfillment detection in analyst output and schema validation.
- Persisted premise promises on `Story` and introduced branch-local fulfilled premise accumulation on `Page`.
- Threaded premise promise data through analyst runtime and planner continuation context.
- Added late-act planner warnings for unfulfilled premise promises.
- Added structure-prompt premise promise contract guidance.
- Updated persistence converters/serializers and prompt docs.
- Added and updated targeted unit/integration tests covering schema, prompts, context threading, page accumulation, and persistence round-trips.

**Deviation from original plan**:
- Original ticket proposed `Story.fulfilledPremisePromises`; implementation moved fulfilled tracking to `Page.accumulatedFulfilledPremisePromises` to preserve branch correctness.
- Added defensive serializer defaults for absent new fields to keep tests and runtime resilient.

**Verification results**:
- `npm run typecheck` passed.
- `npm run lint` passed.
- Relevant targeted unit/integration suites passed (analyst/schema/prompts, continuation context, page builder, prompt-doc alignment, story/page persistence).
