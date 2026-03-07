# WILCONPIP-06: Content Packeter Prompt (Stage 0c)

**Status**: COMPLETED

**Effort**: M
**Dependencies**: WILCONPIP-01, WILCONPIP-05
**Spec reference**: "Stage 0c -- Content Packeter"

## Summary

Implement the Content Packeter LLM stage. Given a taste profile and raw sparks, it expands the best sparks into 12-16 load-bearing content packets with full structure (coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, interactionVerbs).

## Files to Touch

- `src/llm/prompts/content-packeter-prompt.ts` — NEW: `buildContentPacketerPrompt`. Must include `CONTENT_POLICY` via `content-policy.ts`
- `src/llm/schemas/content-packeter-schema.ts` — NEW: JSON Schema for `packets` array output
- `src/llm/content-packeter-generation.ts` — NEW: `generateContentPackets(context, apiKey)` with response parsing
- `src/models/content-packet.ts` — add `ContentPacketerContext` and `ContentPacketerResult` interfaces (if not already from WILCONPIP-01)

## Out of Scope

- Content Evaluator — WILCONPIP-07
- ContentService — WILCONPIP-08
- One-shot prompt — WILCONPIP-03
- Concept pipeline integration
- Persistence (saving packets) — handled by WILCONPIP-02 + WILCONPIP-08

## Acceptance Criteria

### Tests

- [x] Unit test: `buildContentPacketerPrompt` includes CONTENT_POLICY section
- [x] Unit test: `buildContentPacketerPrompt` injects taste profile and sparks array into user prompt
- [x] Unit test: `buildContentPacketerPrompt` injects optional kernel block when provided
- [x] Unit test: response parser validates all required packet fields (contentId, sourceSparkIds, contentKind, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, interactionVerbs)
- [x] Unit test: response parser validates `interactionVerbs` has 4-6 items
- [x] Unit test: response parser validates `contentKind` against valid ContentKind values
- [x] Unit test: response parser rejects packets with missing required fields
- [x] Unit test: response parser rejects empty `packets` array

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] Uses `runLlmStage` for LLM call

## Outcome

- **Completion date**: 2026-03-07
- **Files created**: `src/llm/prompts/content-packeter-prompt.ts`, `src/llm/schemas/content-packeter-schema.ts`, `src/llm/content-packeter-generation.ts`, `test/unit/llm/content-packeter.test.ts`
- **Files modified**: `src/models/content-packet.ts`, `src/models/index.ts`, `src/config/llm-stage-registry.ts`, `src/logging/prompt-formatter.ts`
- **Deviations**: None. `ContentPacketerContext` and `ContentPacketerResult` were added to `content-packet.ts` as they were not present from WILCONPIP-01.
- **Verification**: 17 new tests pass, 2936 existing tests pass (238 suites), typecheck clean, lint clean.
