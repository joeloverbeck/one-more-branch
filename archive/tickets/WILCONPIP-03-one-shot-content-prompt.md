# WILCONPIP-03: One-Shot Content Generation Prompt (Default Path)

**Status**: COMPLETED

**Effort**: M
**Dependencies**: WILCONPIP-01
**Spec reference**: "Minimal One-Shot Prompt (Default Path)"

## Summary

Implement the one-shot content generation prompt -- the default path for generating content packets from user exemplar ideas. This is a single LLM call that infers taste and generates 18 content packets in one pass. Includes prompt builder, JSON schema, response parser, and generation function.

## Files to Touch

- `src/llm/prompts/content-one-shot-prompt.ts` — NEW: `buildContentOneShotPrompt` returning system + user prompt pair. Must include `CONTENT_POLICY` via `content-policy.ts`
- `src/llm/schemas/content-one-shot-schema.ts` — NEW: JSON Schema for the one-shot output (`packets` array with all fields)
- `src/llm/content-one-shot-generation.ts` — NEW: `generateContentOneShot(context, apiKey)` function with response parsing and validation
- `src/models/content-packet.ts` — add `ContentOneShotContext`, `ContentOneShotPacket`, and `ContentOneShotResult` interfaces
- `src/config/llm-stage-registry.ts` — add `'contentOneShot'` to `LLM_STAGE_KEYS`
- `src/logging/prompt-formatter.ts` — add `'contentOneShot'` to `PromptType`

## Out of Scope

- The 4-stage pipeline prompts (Taste Distiller, Sparkstormer, Packeter, Evaluator) — WILCONPIP-04 through WILCONPIP-07
- ContentService orchestration — WILCONPIP-08
- Routes or UI — WILCONPIP-09
- Concept pipeline integration — WILCONPIP-10+

## Acceptance Criteria

### Tests

- [x] Unit test: `buildContentOneShotPrompt` includes CONTENT_POLICY section in system prompt
- [x] Unit test: `buildContentOneShotPrompt` injects exemplar ideas into user prompt
- [x] Unit test: `buildContentOneShotPrompt` injects optional genre vibes / mood keywords / kernel block when provided
- [x] Unit test: `buildContentOneShotPrompt` omits optional sections when not provided
- [x] Unit test: response parser validates all required packet fields (title, contentKind, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationHint, wildnessInvariant, dullCollapse)
- [x] Unit test: response parser rejects packets with invalid `contentKind` values
- [x] Unit test: response parser rejects responses with fewer than 1 packet
- [x] Unit test: JSON schema defines `packets` array with correct property types and required fields

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] Prompt follows existing prompt builder patterns (pure function returning `{ systemPrompt, userPrompt }`)
- [x] Uses `runLlmStage` from `llm-stage-runner.ts` for LLM call

## Outcome

- **Completed**: 2026-03-07
- **Files created**: `src/llm/prompts/content-one-shot-prompt.ts`, `src/llm/schemas/content-one-shot-schema.ts`, `src/llm/content-one-shot-generation.ts`, `test/unit/llm/content-one-shot.test.ts`
- **Files modified**: `src/models/content-packet.ts`, `src/models/index.ts`, `src/config/llm-stage-registry.ts`, `src/logging/prompt-formatter.ts`
- **Ticket correction**: Added missing `LLM_STAGE_KEYS` and `PromptType` registration to Files to Touch (not in original ticket)
- **Tests**: 12 new tests, all passing. 2887 existing tests unaffected.
