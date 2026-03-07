# WILCONPIP-07: Content Evaluator Prompt (Stage 0d)

**Effort**: S
**Dependencies**: WILCONPIP-01, WILCONPIP-06
**Spec reference**: "Stage 0d -- Content Evaluator"

## Summary

Implement the Content Evaluator LLM stage. This is a lightweight filter that scores packets on 8 dimensions and assigns role labels (PRIMARY_SEED, SECONDARY_MUTAGEN, IMAGE_ONLY, REJECT). It is not a full scorer -- packets are re-evaluated implicitly through concept evaluation downstream.

## Files to Touch

- `src/llm/prompts/content-evaluator-prompt.ts` — NEW: `buildContentEvaluatorPrompt`. Must include `CONTENT_POLICY` via `content-policy.ts`
- `src/llm/schemas/content-evaluator-schema.ts` — NEW: JSON Schema for `evaluations` array output
- `src/llm/content-evaluator-generation.ts` — NEW: `evaluateContentPackets(context, apiKey)` with response parsing
- `src/models/content-packet.ts` — add `ContentEvaluatorContext` and `ContentEvaluatorResult` interfaces (if not already from WILCONPIP-01)

## Out of Scope

- Concept evaluator `contentCharge` dimension — WILCONPIP-12
- ContentService — WILCONPIP-08
- Packet persistence — WILCONPIP-02
- Full scoring system (this is intentionally lightweight)

## Acceptance Criteria

### Tests

- [ ] Unit test: `buildContentEvaluatorPrompt` includes CONTENT_POLICY section
- [ ] Unit test: response parser validates each evaluation has `contentId`, `scores`, `strengths`, `weaknesses`, `recommendedRole`
- [ ] Unit test: response parser validates `recommendedRole` is one of PRIMARY_SEED/SECONDARY_MUTAGEN/IMAGE_ONLY/REJECT
- [ ] Unit test: response parser validates all 8 score dimensions are present and numeric (0-5 range)
- [ ] Unit test: response parser rejects evaluations with missing fields

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] Uses `runLlmStage` for LLM call
