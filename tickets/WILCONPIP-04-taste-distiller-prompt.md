# WILCONPIP-04: Content Taste Distiller Prompt (Stage 0a)

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

- [ ] Unit test: `buildContentTasteDistillerPrompt` includes CONTENT_POLICY section
- [ ] Unit test: `buildContentTasteDistillerPrompt` injects exemplar ideas array
- [ ] Unit test: `buildContentTasteDistillerPrompt` injects optional mood/genre/content preference block when provided
- [ ] Unit test: response parser validates `tasteProfile` has all 9 required fields
- [ ] Unit test: response parser validates `riskAppetite` is one of LOW/MEDIUM/HIGH/MAXIMAL
- [ ] Unit test: response parser validates string arrays have 1+ items each
- [ ] Unit test: response parser rejects missing or empty fields
- [ ] Unit test: JSON schema matches spec output shape

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] Uses `runLlmStage` for LLM call
