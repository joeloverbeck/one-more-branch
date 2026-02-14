# Protagonist Guidance Block

**Status**: COMPLETED
**Priority**: Enhancement
**Scope**: UI + client payload + route normalization + engine context threading + planner prompt + tests

## Corrected Assumptions

1. The existing implementation is not isolated to one field in one layer. `suggestedProtagonistSpeech` is currently threaded across route, engine, context model, planner prompt, server view, client source, generated client bundle, fixtures, and multiple unit/integration tests.
2. Client rendering is split between server-rendered initial HTML (`play.ejs`) and dynamic rebuild logic in `public/js/src/05-choice-renderers.js`; both must be updated together.
3. Test impact is broader than initially assumed. In addition to route/engine/planner tests, the following are directly coupled and must be updated: client fixture tests, rebuild/click client tests, server template tests, public bundle content tests, LLM context type tests, and continuation prompt tests.
4. Architecture directive for this ticket is strict replacement, not compatibility layering. `suggestedProtagonistSpeech` must be removed as an input contract and replaced with `protagonistGuidance` only.

## Architecture Decision

Replace the single string with a typed guidance object:

- `protagonistGuidance.suggestedEmotions`
- `protagonistGuidance.suggestedThoughts`
- `protagonistGuidance.suggestedSpeech`

Rationale:

- Cleaner domain model than a single overloaded speech string.
- Extensible for future planner-only guidance dimensions without widening route/engine signatures repeatedly.
- Eliminates alias fields and fallback paths, which reduces ambiguity and maintenance overhead.

## Implementation Scope

### 1. Domain Type

- Add `src/models/protagonist-guidance.ts`:
  - `ProtagonistGuidance` interface.
  - `isProtagonistGuidanceEmpty()` helper.
- Export from `src/models/index.ts`.

### 2. Server-rendered Play UI

- Replace the old speech input in `src/server/views/pages/play.ejs` with a collapsible `<details>` guidance block containing three `<textarea>` fields (`maxlength=500` each).
- Keep custom choice UI unchanged below guidance block.

### 3. CSS

- Remove old `.suggested-protagonist-speech-*` styles from `public/css/styles.css`.
- Add `.protagonist-guidance*` styles for summary/fields/labels/textareas.

### 4. Client Source + Generated Bundle

- Update `public/js/src/05-choice-renderers.js`:
  - Replace single-input renderer with guidance-block renderer.
  - Update `rebuildChoicesSection` to pass/restore structured guidance values.
- Update `public/js/src/09-controllers.js`:
  - Replace single-value getter with `getProtagonistGuidanceValues()`.
  - Build `body.protagonistGuidance` from non-empty trimmed fields only.
  - On generated new page: clear guidance fields.
  - On custom-choice rebuild: preserve current guidance values.
- Regenerate `public/js/app.js` via `node scripts/concat-client-js.js`.

### 5. Route Contract

- Update `src/server/routes/play.ts`:
  - `ChoiceBody` accepts `protagonistGuidance?: unknown` only.
  - Remove `suggestedProtagonistSpeech` handling entirely.
  - Replace speech normalizer with `normalizeProtagonistGuidance(rawGuidance)`.
  - Enforce per-field trim and truncation to 500 chars.
  - Remove explicit 400 validation branch for old speech string length.

### 6. Engine + LLM Context Threading

- Update `src/engine/types.ts` (`MakeChoiceOptions`) to use `protagonistGuidance?: ProtagonistGuidance`.
- Update `src/engine/story-engine.ts`, `src/engine/page-service.ts`, `src/engine/continuation-context-builder.ts` to thread the object.
- Update `src/llm/context-types.ts` (`ContinuationContext`) to expose `protagonistGuidance?: ProtagonistGuidance`.

### 7. Planner Prompt

- Replace speech-only section in `src/llm/prompts/sections/planner/continuation-context.ts` with a guidance section that conditionally emits emotions/thoughts/speech subsections.
- Keep guidance planner-only; writer receives it via planner outputs, not direct writer prompt fields.

### 8. Tests

- Add `test/unit/models/protagonist-guidance.test.ts` for empty/non-empty semantics.
- Update route tests in `test/unit/server/routes/play.test.ts` for new payload and normalization behavior.
- Update planner section tests in `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`.
- Update engine/context tests:
  - `test/unit/engine/continuation-context-builder.test.ts`
  - `test/unit/engine/page-service.test.ts`
  - `test/unit/engine/story-engine.test.ts`
- Update client and HTML/tests:
  - `test/unit/client/play-page/rebuild-choices.test.ts`
  - `test/unit/client/play-page/choice-click.test.ts`
  - `test/unit/client/fixtures/html-fixtures.ts`
  - `test/unit/server/views/play.test.ts`
  - `test/unit/server/public/app.test.ts`
- Update context typing tests:
  - `test/unit/llm/types.test.ts`
  - `test/unit/llm/prompts/continuation-prompt.test.ts`
- Update integration flow coverage in `test/integration/server/play-flow.test.ts`.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`

## Notes

- No backward compatibility or aliasing in route/body contracts for this ticket.
- Avoid broad rewrites; patch impacted functions/blocks only.

## Outcome

- **Completed on**: 2026-02-14
- **What changed**:
  - Replaced single speech input with a 3-field protagonist guidance block (emotions/thoughts/speech) in both server-rendered and client-rebuilt UI.
  - Replaced `suggestedProtagonistSpeech` with typed `protagonistGuidance` through route, engine, continuation context, and planner prompt layers.
  - Added new domain model helper (`ProtagonistGuidance`, `isProtagonistGuidanceEmpty`) and expanded tests across unit/integration/client/server surfaces.
  - Regenerated `public/js/app.js` from updated `public/js/src/*`.
- **Deviation from original plan**:
  - Dropped fallback/legacy alias handling entirely to enforce clean contract replacement.
  - Removed deprecated continuation API parameter for old speech field instead of keeping transitional compatibility logic.
- **Verification**:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed (all suites).
