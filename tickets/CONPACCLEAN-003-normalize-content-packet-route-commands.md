# CONPACCLEAN-003: Normalize content-packet route commands at the HTTP boundary

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: `archive/tickets/CONPACCLEAN-001-remove-one-shot-generation.md`

## Problem

The content-packets feature is now architecturally pipeline-only, but request parsing and normalization still live in three places:

1. `POST /content-packets/api/generate`
2. `POST /content-packets/taste-profiles/api/generate`
3. `src/server/services/content-service.ts`

That leaves the route layer and service layer sharing ownership of the same concerns: API key trimming, exemplar filtering, empty-input rejection, and optional string normalization. The result is avoidable duplication, broader tests than necessary, and a fuzzy boundary between HTTP parsing and domain orchestration.

The cleaner architecture is for the route boundary to fully parse and normalize the incoming command once, then pass a normalized command object into the service. The service should orchestrate LLM stages and lineage assembly, not sanitize HTTP payloads.

## Assumption Reassessment (2026-03-25)

1. `src/server/routes/content-packets.ts` currently duplicates the same validation and trimming logic in both `POST /api/generate` and `POST /taste-profiles/api/generate`. Confirmed.
2. `src/server/services/content-service.ts` still owns overlapping route-facing sanitation via `requireApiKey`, `requireExemplarIdeas`, and repeated `?.trim() ?? undefined` normalization inside `generateContentPipeline()` and `distillTaste()`. Confirmed.
3. The lower-level stage methods (`generateSparks`, `packageContent`, `evaluatePackets`) also validate API keys, but they are not HTTP-body entry points and are still called as service APIs. They should not be folded into this ticket unless the parser extraction naturally simplifies shared helpers without expanding scope.
4. Existing route coverage already lives in `test/unit/server/routes/content-packets-routes.test.ts`, and service coverage already lives in `test/unit/server/services/content-service.test.ts`. A dedicated parser test file should be added instead of overloading those files with parser edge cases.
5. The original cleanup note only mentioned `content-packets.ts` and `content-service.ts`. That was incomplete: the taste-profile generation route inside the same route file duplicates the same parsing logic and must be part of scope.

## Architecture Check

1. Moving normalization to a dedicated route-boundary parser is cleaner than keeping parallel validation in routes and services because it gives one owner to HTTP coercion, trimming, and 400-level request rejection.
2. This is cleaner than "just extract shared helpers into the route file" because the result should be an explicit parsed command contract, not hidden utility calls sprinkled through handlers.
3. The service layer remains responsible for stage orchestration, lineage assembly, and cross-stage invariants; it should not keep re-trimming request strings that the route has already normalized.
4. No backwards-compatibility shims or alias paths should be introduced. If the service contract changes from "raw-ish route input" to "normalized command", update tests and call sites directly.

## What to Change

### 1. Introduce explicit route-boundary command parsers for content-packets

Create a focused parser module for the content-packets routes, for example:

- `parseGenerateContentCommand(body)`
- `parseGenerateTasteProfileCommand(body)`

Each parser should:

- validate the raw request body shape
- trim and normalize optional strings to `undefined`
- filter exemplar ideas down to non-empty trimmed strings
- reject invalid API keys and missing/empty exemplars with the existing 400-level messages
- return a normalized command object plus the route-owned `progressId` if needed

The parser should be the only place in this feature that knows how to coerce raw HTTP body payloads into route commands.

### 2. Update `content-packets.ts` to consume parsed commands instead of re-implementing normalization

Refactor both:

- `POST /api/generate`
- `POST /taste-profiles/api/generate`

so they:

- call the parser first
- return parser-produced validation errors as 400 responses
- pass normalized command objects into `contentService.generateContentPipeline()` / `contentService.distillTaste()`

After this refactor, the route should no longer manually trim `apiKey`, `moodOrGenre`, `contentPreferences`, or `kernelBlock`, and should no longer duplicate exemplar filtering logic inline.

### 3. Narrow route-driven service methods to normalized command input

Refactor `src/server/services/content-service.ts` so `generateContentPipeline()` and `distillTaste()` accept already-normalized command objects and stop re-owning route-level sanitation.

Concretely:

- remove redundant trimming inside those two methods
- remove overlapping route-owned validation helpers if they are no longer needed there
- keep only service-level invariants that are still necessary once inputs are normalized

If some shared helper remains useful, it should reflect a domain invariant, not an HTTP parsing concern.

### 4. Keep lower-level stage methods out of scope unless a minimal helper cleanup is unavoidable

`generateSparks()`, `packageContent()`, and `evaluatePackets()` are not HTTP-body parsers. Do not broaden this ticket into a generic service API redesign unless a very small shared cleanup falls out naturally from the route-command refactor.

## Files to Touch

- `src/server/routes/content-packets.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `src/server/services/index.ts` (modify, only if exported route-facing types change)
- `src/server/routes/content-packets-request-parser.ts` (new, or equivalent route-local parser module)
- `test/unit/server/routes/content-packets-request-parser.test.ts` (new)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify)

## Out of Scope

- Changing the four-stage content packet pipeline itself
- Refactoring `generateSparks`, `packageContent`, or `evaluatePackets` into a different service architecture
- Changing progress tracking behavior
- Changing persistence, presenter, or client-side rendering contracts

## Acceptance Criteria

### Tests That Must Pass

1. `POST /api/generate` accepts trimmed valid input and delegates a normalized command to `contentService.generateContentPipeline()`.
2. `POST /taste-profiles/api/generate` accepts trimmed valid input and delegates a normalized command to `contentService.distillTaste()`.
3. Both routes still return the existing 400 responses for invalid API keys, missing exemplar arrays, and all-whitespace exemplar arrays.
4. `generateContentPipeline()` no longer re-trims route-owned optional fields internally.
5. `distillTaste()` no longer re-trims route-owned optional fields internally.
6. Existing suite: `npm test`

### Invariants

1. HTTP request parsing and normalization for content-packets is owned by one dedicated parser layer.
2. Route-driven content service methods receive already-normalized command objects rather than raw request payload shapes.

## Test Plan

### New/Modified Tests

1. `test/unit/server/routes/content-packets-request-parser.test.ts` — new parser-focused coverage for valid normalization and invalid-body rejection without coupling every edge case to route handler tests.
2. `test/unit/server/routes/content-packets-routes.test.ts` — verify both route handlers delegate normalized commands and preserve the current 400/500 response behavior.
3. `test/unit/server/services/content-service.test.ts` — verify route-driven methods consume normalized inputs without duplicating route-level trimming/validation responsibilities.

### Commands

1. `npm run test:unit -- --runInBand test/unit/server/routes/content-packets-request-parser.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/server/services/content-service.test.ts`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
