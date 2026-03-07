# WILCONPIP-04: Content Taste Distiller Prompt (Stage 0a)

**Status**: COMPLETED
**Effort**: M
**Dependencies**: WILCONPIP-01
**Spec reference**: "Stage 0a -- Content Taste Distiller"

## Summary

Implement the Content Taste Distiller LLM stage. Given user exemplar ideas, it infers the user's imaginative DNA (collision patterns, favored mechanisms, human anchors, social engines, tone blend, scene appetites, anti-patterns, risk appetite) without copying surface nouns.

## Files to Touch

- `src/llm/prompts/content-taste-distiller-prompt.ts` — NEW: `buildContentTasteDistillerPrompt`. Must include `CONTENT_POLICY` via `content-policy.ts`
- `src/llm/schemas/content-taste-distiller-schema.ts` — NEW: JSON Schema for `tasteProfile` output
- `src/llm/content-taste-distiller-generation.ts` — NEW: `generateTasteProfile(context, apiKey)` with response parsing
- `src/models/content-packet.ts` — add `TasteDistillerContext` and `TasteDistillerResult` interfaces (if not already from WILCONPIP-01)

## Out of Scope

- Sparkstormer — WILCONPIP-05
- Content Packeter — WILCONPIP-06
- Content Evaluator — WILCONPIP-07
- ContentService — WILCONPIP-08
- Taste profile persistence (saving) — WILCONPIP-02
- Concept pipeline integration

## Acceptance Criteria

### Tests

- [x] Unit test: `buildContentTasteDistillerPrompt` includes CONTENT_POLICY section
- [x] Unit test: `buildContentTasteDistillerPrompt` injects exemplar ideas array
- [x] Unit test: `buildContentTasteDistillerPrompt` injects optional mood/genre/content preference block when provided
- [x] Unit test: response parser validates `tasteProfile` has all 9 required fields
- [x] Unit test: response parser validates `riskAppetite` is one of LOW/MEDIUM/HIGH/MAXIMAL
- [x] Unit test: response parser validates string arrays have 1+ items each
- [x] Unit test: response parser rejects missing or empty fields
- [x] Unit test: JSON schema matches spec output shape

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] Uses `runLlmStage` for LLM call

## Outcome

- **Completed**: 2026-03-07
- **Files created**: `src/llm/prompts/content-taste-distiller-prompt.ts`, `src/llm/schemas/content-taste-distiller-schema.ts`, `src/llm/content-taste-distiller-generation.ts`, `test/unit/llm/content-taste-distiller.test.ts`
- **Files modified**: `src/models/content-packet.ts` (added TasteDistillerContext/Result), `src/config/llm-stage-registry.ts` (added contentTasteDistiller), `src/logging/prompt-formatter.ts` (added contentTasteDistiller PromptType)
- **Deviations**: Added LlmStage registry and PromptType entries (implicit requirement not listed in ticket)
- **Verification**: 266 test suites pass, 3153 tests pass, typecheck and lint clean
