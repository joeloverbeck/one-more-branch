# WILCONPIP-05: Sparkstormer Prompt (Stage 0b)

**Effort**: M
**Dependencies**: WILCONPIP-01, WILCONPIP-04
**Spec reference**: "Stage 0b -- Sparkstormer"

## Summary

Implement the Sparkstormer LLM stage. Given a taste profile, it generates 30-40 raw divergent imaginative sparks -- compact blasts of story matter that imply desire, danger, social consequence, and branching play. Each spark is 1-2 sentences max.

## Files to Touch

- `src/llm/prompts/content-sparkstormer-prompt.ts` — NEW: `buildSparkstormerPrompt`. Must include `CONTENT_POLICY` via `content-policy.ts`
- `src/llm/schemas/content-sparkstormer-schema.ts` — NEW: JSON Schema for `sparks` array output
- `src/llm/content-sparkstormer-generation.ts` — NEW: `generateSparks(context, apiKey)` with response parsing
- `src/models/content-packet.ts` — add `SparkstormerContext` and `SparkstormerResult` interfaces (if not already from WILCONPIP-01)

## Out of Scope

- Content Packeter — WILCONPIP-06
- Content Evaluator — WILCONPIP-07
- ContentService — WILCONPIP-08
- Taste Distiller changes (already done in WILCONPIP-04)
- Concept pipeline integration

## Acceptance Criteria

### Tests

- [ ] Unit test: `buildSparkstormerPrompt` includes CONTENT_POLICY section
- [ ] Unit test: `buildSparkstormerPrompt` injects JSON taste profile into user prompt
- [ ] Unit test: `buildSparkstormerPrompt` injects optional kernel block when provided
- [ ] Unit test: `buildSparkstormerPrompt` injects optional user content preferences when provided
- [ ] Unit test: response parser validates each spark has `sparkId`, `contentKind`, `spark`, `imageSeed`, `collisionTags`
- [ ] Unit test: response parser validates `contentKind` against valid ContentKind values
- [ ] Unit test: response parser rejects sparks with missing fields
- [ ] Unit test: response parser rejects empty `sparks` array

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] Uses `runLlmStage` for LLM call
