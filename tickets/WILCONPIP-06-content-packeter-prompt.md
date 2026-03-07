# WILCONPIP-06: Content Packeter Prompt (Stage 0c)

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

- [ ] Unit test: `buildContentPacketerPrompt` includes CONTENT_POLICY section
- [ ] Unit test: `buildContentPacketerPrompt` injects taste profile and sparks array into user prompt
- [ ] Unit test: `buildContentPacketerPrompt` injects optional kernel block when provided
- [ ] Unit test: response parser validates all required packet fields (contentId, sourceSparkIds, contentKind, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, interactionVerbs)
- [ ] Unit test: response parser validates `interactionVerbs` has 4-6 items
- [ ] Unit test: response parser validates `contentKind` against valid ContentKind values
- [ ] Unit test: response parser rejects packets with missing required fields
- [ ] Unit test: response parser rejects empty `packets` array

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] Uses `runLlmStage` for LLM call
