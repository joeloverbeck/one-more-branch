# Suggested Protagonist Speech Spec

**Status**: 📝 DRAFT
**Date**: 2026-02-12
**Owner**: Play UI + Engine + LLM Prompting

## Objective

Add an optional "suggested speech for the protagonist" input on `/play/:storyId` that is:

1. Available to the player before selecting a choice.
2. Sent only with continuation generation requests (`POST /play/:storyId/choice`).
3. Used only by the continuation writer prompt (never opening prompt, never page planner prompt).
4. Interpreted as optional, adaptive intent:
   - the protagonist has considered saying it
   - they only say it if circumstances allow
   - wording may be adapted naturally to fit the scene
5. Treated as one-turn guidance that persists only until consumed by an actual generated page (`wasGenerated: true`), not by branch replay (`wasGenerated: false`).

## 1) What Needs To Change / Be Added

### 1.1 Play page UI and client behavior

Files:
- `src/server/views/pages/play.ejs`
- `public/js/app.js`
- `public/css/styles.css` (only if styling is needed)

Changes:
1. Add an optional text input for suggested protagonist speech in the play choices area.
2. Add client-side collection + trim for this input when posting to `/play/:storyId/choice`.
3. Add payload field in choice request body:
   - `suggestedProtagonistSpeech?: string`
4. Add client behavior for one-turn-until-consumed semantics:
   - If response has `wasGenerated: true`, clear the input.
   - If response has `wasGenerated: false`, keep the input value.
5. Keep existing behavior unchanged when input is blank.

### 1.2 Route/API contract

File:
- `src/server/routes/play.ts`

Changes:
1. Extend request body type for `/play/:storyId/choice` with optional `suggestedProtagonistSpeech`.
2. Validate/normalize:
   - allow undefined
   - trim whitespace
   - convert empty-after-trim to `undefined`
   - enforce max length (recommendation: 500 chars, aligned with custom-choice bounds unless product decides otherwise)
3. Pass normalized value into engine choice call.
4. Maintain backward compatibility for callers that do not send this field.

### 1.3 Engine pass-through

Files:
- `src/engine/types.ts`
- `src/engine/story-engine.ts`
- `src/engine/page-service.ts`

Changes:
1. Extend `MakeChoiceOptions` with optional `suggestedProtagonistSpeech?: string`.
2. Thread this optional value through:
   - route -> `storyEngine.makeChoice(...)`
   - `getOrGeneratePage(...)` / `generateNextPage(...)`
   - continuation context assembly for writer generation
3. Do not persist this value in story/page storage.

### 1.4 LLM context and continuation prompt

Files:
- `src/llm/types.ts`
- `src/llm/prompts/continuation-prompt.ts`
- optional helper in `src/llm/prompts/continuation/*.ts` if extraction improves clarity

Changes:
1. Extend `ContinuationContext` with optional `suggestedProtagonistSpeech?: string`.
2. In continuation prompt composition, add a conditional section only when the field is present.
3. Section language should instruct the writer model:
   - this is something the protagonist has considered saying
   - include it only if contextually natural
   - adapt phrasing/tone/timing to circumstances as a real person would
   - skip using it when circumstances do not support it
4. Ensure this field is not referenced in:
   - `src/llm/prompts/opening-prompt.ts`
   - `src/llm/prompts/page-planner-prompt.ts`
   - `src/llm/prompts/sections/planner/*`

## 2) Invariants That Must Pass

1. Backward compatibility:
   - Choice generation works exactly as before when no suggested speech is provided.
2. Scope isolation:
   - Suggested speech influences continuation writer prompt only.
   - It never appears in opening prompt or planner prompt content.
3. Optional semantics:
   - Suggested speech is advisory, not mandatory output.
   - The writer may adapt or omit it based on scene plausibility.
4. One-turn-until-consumed behavior:
   - Input is cleared only after actual generation (`wasGenerated: true`).
   - Input is retained when replaying an existing branch (`wasGenerated: false`).
5. Data handling:
   - Input is trimmed and validated before use.
   - No persistence to story/page schema.
6. Safety/logging consistency:
   - No additional terminal/browser logging of prompt payload beyond existing prompt file sink behavior.

## 3) Tests That Must Pass

### 3.1 Unit tests

1. `test/unit/llm/prompts/continuation-prompt.test.ts`
   - includes suggested-speech instruction block when `suggestedProtagonistSpeech` is provided.
   - omits the block when absent/blank.
   - instruction text reflects "considered saying", "only if circumstances allow", and "adapt naturally".
2. `test/unit/llm/prompts/page-planner-prompt.test.ts` (or planner section tests)
   - confirms no suggested-speech content in planner prompt.
3. `test/unit/llm/prompts/opening-prompt.test.ts`
   - confirms no suggested-speech content in opening prompt path.
4. `test/unit/server/routes/play.test.ts`
   - `/play/:storyId/choice` accepts optional field.
   - trims and forwards valid value.
   - rejects over-limit input with `400`.
   - omitting field still succeeds.

### 3.2 Integration tests

1. `test/integration/server/play-flow.test.ts`
   - continuation generation path receives and uses optional suggested speech in writer-context call.
   - existing branch replay path remains no-regression and does not require field.

### 3.3 Frontend behavior tests (if current test harness covers browser JS)

1. `public/js/app.js` behavior coverage:
   - request body includes field when non-empty.
   - field omitted or undefined when empty.
   - input clears only when `wasGenerated === true`.
   - input remains when `wasGenerated === false`.

If no frontend test harness exists for this behavior, document manual verification steps in PR notes and keep server/prompt automated coverage mandatory.

### 3.4 Full suites expected green

1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run test:e2e`
4. `npm run typecheck`

## Out of Scope

1. Persisting suggested speech across reloads/sessions.
2. Story model/schema changes for storing suggested speech.
3. Applying suggested speech to opening generation.
4. Applying suggested speech to planner generation.
