# WILCONPIP-03: One-Shot Content Generation Prompt (Default Path)

**Effort**: M
**Dependencies**: WILCONPIP-01
**Spec reference**: "Minimal One-Shot Prompt (Default Path)"

## Summary

Implement the one-shot content generation prompt -- the default path for generating content packets from user exemplar ideas. This is a single LLM call that infers taste and generates 18 content packets in one pass. Includes prompt builder, JSON schema, response parser, and generation function.

## Files to Touch

- `src/llm/prompts/content-one-shot-prompt.ts` — NEW: `buildContentOneShotPrompt` returning system + user prompt pair. Must include `CONTENT_POLICY` via `content-policy.ts`
- `src/llm/schemas/content-one-shot-schema.ts` — NEW: JSON Schema for the one-shot output (`packets` array with all fields)
- `src/llm/content-one-shot-generation.ts` — NEW: `generateContentOneShot(context, apiKey)` function with response parsing and validation
- `src/models/content-packet.ts` — add `ContentOneShotContext` and `ContentOneShotResult` interfaces (if not already from WILCONPIP-01)

## Out of Scope

- The 4-stage pipeline prompts (Taste Distiller, Sparkstormer, Packeter, Evaluator) — WILCONPIP-04 through WILCONPIP-07
- ContentService orchestration — WILCONPIP-08
- Routes or UI — WILCONPIP-09
- Concept pipeline integration — WILCONPIP-10+

## Acceptance Criteria

### Tests

- [ ] Unit test: `buildContentOneShotPrompt` includes CONTENT_POLICY section in system prompt
- [ ] Unit test: `buildContentOneShotPrompt` injects exemplar ideas into user prompt
- [ ] Unit test: `buildContentOneShotPrompt` injects optional genre vibes / mood keywords / kernel block when provided
- [ ] Unit test: `buildContentOneShotPrompt` omits optional sections when not provided
- [ ] Unit test: response parser validates all required packet fields (title, contentKind, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationHint, wildnessInvariant, dullCollapse)
- [ ] Unit test: response parser rejects packets with invalid `contentKind` values
- [ ] Unit test: response parser rejects responses with fewer than 1 packet
- [ ] Unit test: JSON schema defines `packets` array with correct property types and required fields

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] Prompt follows existing prompt builder patterns (pure function returning `{ systemPrompt, userPrompt }`)
- [ ] Uses `runLlmStage` from `llm-stage-runner.ts` for LLM call
