# Spinner Stage Progress Spec

**Status**: ✅ COMPLETED
**Date**: 2026-02-11
**Owner**: App/Web + Engine

## 0) Viability Assessment

This feature is viable with moderate scope and no model/prompt schema changes.

Key finding: the current frontend receives only one final JSON response per long-running action (`POST /stories/create-ajax`, `POST /play/:storyId/choice`). To show real stage progress ("prompt started" -> "prompt response received"), the server must expose intermediate progress while those requests are in flight.

Recommended approach: add a lightweight in-memory progress session + polling endpoint, and thread stage callbacks through generation code.

## 1) Changes / Additions

### 1.1 Backend progress reporting

Add a progress domain in server layer:

- New module: `src/server/services/generation-progress.ts`
- In-memory map keyed by `progressId` with TTL cleanup
- Public API:
  - `start(progressId, flowType)`
  - `markStageStarted(progressId, stage, attempt?)`
  - `markStageCompleted(progressId, stage, attempt?)`
  - `complete(progressId)`
  - `fail(progressId, publicMessage?)`
  - `get(progressId)`

Add read endpoint:

- `GET /generation-progress/:progressId`
- Response shape:
  - `status`: `running | completed | failed | unknown`
  - `activeStage`: nullable stage id
  - `completedStages`: ordered stage list
  - `updatedAt`: epoch ms
  - `flowType`: `new-story | choice`

### 1.2 Stage model and callback plumbing

Add a shared stage enum/type used by engine + server:

- `PLANNING_PAGE` (planner prompt)
- `WRITING_OPENING_PAGE` (opening writer prompt)
- `WRITING_CONTINUING_PAGE` (continuation writer prompt)
- `ANALYZING_SCENE` (analyst prompt)
- `RESTRUCTURING_STORY` (structure rewrite prompt)

Add optional progress callback to generation call chain (`storyEngine.startStory`, `storyEngine.makeChoice`, relevant service methods) so prompt-stage boundaries are emitted:

- Stage start immediately before each prompt call
- Stage complete immediately after successful prompt response parse
- If a stage retries, emit stage start/complete again with `attempt`

Notes:
- New-story flow may run structure generation before page planner; map that period to `RESTRUCTURING_STORY` or add `PLANNING_STORY_ARC` as an explicit extension stage. Decision: keep MVP mapping to existing five stages for UX simplicity.
- Reconciler is not a prompt stage and should not be exposed as one.

### 1.3 Route updates

Update:

- `POST /stories/create-ajax`
- `POST /play/:storyId/choice`

Add optional request body field `progressId` (string UUID preferred). If provided:

- Start progress session at request start
- Forward callback into generation pipeline
- Mark final state `completed` or `failed`

If omitted, behavior remains backward compatible (no progress side effects).

### 1.4 Frontend spinner behavior

Update `public/js/app.js` and play/new-story templates to support dynamic status line:

- Maintain a stage->phrase pool dictionary with ~20 total silly Sims-style phrases.
- At runtime, while `status=running`, show random phrase from current stage pool.
- Rotate phrase every 1.5-2.5s while stage is active.
- On stage transition, immediately swap to a phrase from the new stage pool.
- Stop polling and hide overlay on final success/failure.

Phrase pool requirements:

- About 20 total phrases.
- Distinct buckets for:
  - planning page
  - writing opening page
  - writing continuing page
  - analyzing scene
  - restructuring story

### 1.5 UX/error handling

- If progress endpoint returns `unknown`, keep existing generic loading text.
- If progress polling fails temporarily, keep spinner running and retry polling.
- Never expose API key, raw prompt text, or raw LLM response in spinner status.

## 2) Invariants That Must Pass

1. Existing story-generation behavior remains unchanged when `progressId` is absent.
2. Progress status ordering is monotonic per request:
   - started -> zero or more stage updates -> completed|failed.
3. Only prompt-stage events are surfaced; no internal non-prompt stages are shown as fake prompt milestones.
4. Spinner overlay is always dismissed on terminal state (`completed` or `failed`) and on client-side fatal error.
5. Stage labels/phrases are presentation-only and must not include prompt payloads, API keys, or raw model output.
6. Current branching invariants remain untouched:
   - ending pages have zero choices
   - non-ending pages have at least two choices
7. No persistence side effects from progress tracking (in-memory only; no story/page schema changes).

## 3) Tests That Must Pass

### 3.1 New unit tests

1. `test/unit/server/services/generation-progress.test.ts`
   - start/get/update/complete/fail lifecycle
   - unknown id behavior
   - TTL eviction behavior
2. `test/unit/server/routes/progress.test.ts`
   - `GET /generation-progress/:id` response contract
3. `test/unit/engine/page-service-progress.test.ts` (or nearest existing page-service test file)
   - planner/writer/analyst/restructure stage callbacks fire at the correct boundaries
   - retries emit repeated stage events with incremented attempt
4. `test/unit/server/public/app.test.ts` additions
   - phrase pools exist for each required stage bucket
   - polling logic references `/generation-progress/`
   - fallback generic message remains when progress is unavailable

### 3.2 Route-level regression tests

1. `test/unit/server/routes/stories.test.ts`
   - `POST /create-ajax` accepts optional `progressId`
   - completes/fails progress session on success/error
2. `test/unit/server/routes/play.test.ts`
   - `POST /:storyId/choice` accepts optional `progressId`
   - completes/fails progress session on success/error

### 3.3 Existing suites that must remain green

1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run test:e2e`
4. `npm run typecheck`

## 4) Out of Scope (for this spec)

1. SSE/WebSocket transport.
2. Persisting progress events to disk.
3. Any prompt-content visualization.
4. Redesign of spinner visuals beyond text behavior.

## Outcome
- Completion date: 2026-02-11
- What was actually changed:
  - In-memory generation progress service, read endpoint, route lifecycle wiring, and frontend spinner polling/stage phrases are implemented and covered by tests.
  - Stage callback coverage is implemented in `test/unit/engine/page-service.test.ts` (using the existing page-service suite rather than creating a separate `page-service-progress` file).
  - Regression hardening added for the `progressId`-absent invariant in:
    - `test/unit/server/routes/stories.test.ts`
    - `test/unit/server/routes/play.test.ts`
  - Full verification passed:
    - `npm run test:unit`
    - `npm run test:integration`
    - `npm run test:e2e`
    - `npm run typecheck`
- Deviations from the initial plan:
  - No production code changes were necessary during this final verification ticket; implementation already matched spec behavior.
