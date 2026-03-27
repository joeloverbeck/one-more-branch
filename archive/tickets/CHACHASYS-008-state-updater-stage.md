# CHACHASYS-008: Chat State Updater LLM Stage

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models), CHACHASYS-004 (stage registration)

## Problem

The Chat State Updater is the fourth LLM stage. After the writer produces the character's turn, this stage extracts state changes: relationship shifts, knowledge changes, conversation updates, physical state updates, and signals for bible refresh or summary generation.

## Assumption Reassessment (2026-03-27)

1. `ChatStateUpdate` and its nested chat-state interfaces already exist in [`src/models/chat/chat-state-update.ts`](/home/joeloverbeck/projects/one-more-branch/src/models/chat/chat-state-update.ts), are exported through the chat barrels, and already have a runtime guard in [`src/models/chat/chat-validation.ts`](/home/joeloverbeck/projects/one-more-branch/src/models/chat/chat-validation.ts).
2. `chatStateUpdater` is already a registered LLM stage with configured model/temperature coverage, so this ticket should plug into the existing `runLlmStage` infrastructure instead of introducing a parallel stage path.
3. Existing chat stages (`chat-bible`, `chat-planner`, `chat-writer`) follow a concrete repository pattern: prompt builder in `src/llm/prompts/chat/`, schema parser in `src/llm/schemas/`, generation wrapper in `src/llm/chat/`, and the generation function returns both the parsed domain object and `rawResponse`.
4. The state updater should receive the pre-turn chat bible, the structured latest user turn, the planner output, and the structured writer output. It should not receive or mutate `ChatSession` directly.

## Architecture Check

1. Follow the existing chat-stage architecture exactly; do not invent a second response-transformer naming/style. The parser should mirror the existing `parseChatBibleResponse` / `parseChatPlannerResponse` / `parseChatWriterResponse` pattern.
2. Keep the stage thin: prompt construction + schema/parser + `runLlmStage` wrapper. Applying state remains in CHACHASYS-010.
3. This stage is intentionally conservative (temperature 0.2) because it extracts state, not prose.
4. The `shouldRefreshChatBible` and `shouldTriggerSummary` booleans are orchestration signals consumed later by the pipeline.
5. Clean architecture here means tightening the canonical chat-state validation instead of layering a separate alias/compatibility validator just for LLM output. The spec-level `-2..+2` delta invariant should be enforced in the canonical validation path.

## What to Change

### 1. Create `src/llm/schemas/chat-state-updater-schema.ts`

- Add a strict OpenRouter `json_schema` for `ChatStateUpdate`
- Include nested schemas for relationship shifts, knowledge changes, conversation updates, and physical state updates
- Use the canonical chat model value sets for enum-backed fields (for example `DistanceBand`)
- Export `parseChatStateUpdaterResponse(raw: unknown): ChatStateUpdate`
- Reuse the existing canonical validator path instead of inventing a duplicate shape check
- Strengthen validation so `suggestedValenceChange` and `suggestedTensionChange` are rejected outside `-2..+2`

### 2. Create `src/llm/prompts/chat/chat-state-updater-prompt.ts`

Build system and user messages per spec:
- System: extract only actual state changes, track relationship shifts when meaningful, track knowledge asymmetry, track commitments/threats/questions, track physical changes only if shown, signal bible/summary refresh, NC-21 content policy
- User sections: PRE-TURN CHAT BIBLE, LATEST USER TURN, TURN PLAN, FINAL WRITTEN TURN
- Match the existing prompt-builder conventions used by the other chat stages, including reuse of shared chat prompt formatters where that keeps formatting consistent

### 3. Create `src/llm/chat/chat-state-updater-generation.ts`

- Define `ChatStateUpdaterContext` using the existing chat domain types:
  - `chatBible: ChatBible`
  - `latestUserTurn: ChatTurn`
  - `turnPlan: TurnPlannerOutput`
  - `writerTurn: ChatWriterTurn`
- Implement `generateChatStateUpdate(context, apiKey, options?)`
- Use `runLlmStage` with `stageModel: 'chatStateUpdater'` and `promptType: 'chatStateUpdater'`
- Return `{ stateUpdate, rawResponse }`, matching the existing chat-stage generation pattern instead of returning only the parsed object

## Files to Touch

- `src/llm/schemas/chat-state-updater-schema.ts` (new)
- `src/llm/prompts/chat/chat-state-updater-prompt.ts` (new)
- `src/llm/chat/chat-state-updater-generation.ts` (new)
- `src/models/chat/chat-validation.ts` (modify to enforce the canonical relationship-delta bounds if needed)
- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify only if a shared formatter is the smallest clean way to serialize the writer turn)

## Out of Scope

- Applying state updates to ChatSession (CHACHASYS-010)
- Pipeline orchestration (CHACHASYS-010)
- Other LLM stages
- Server routes or UI
- Prompt documentation markdown files (CHACHASYS-015)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema defines a strict `json_schema` response format for the full `ChatStateUpdate` shape
2. Unit test: parser accepts a fully populated valid `ChatStateUpdate`
3. Unit test: parser accepts nullable physical fields (`newLocation`, `newMicroLocation`, `newDistanceBand`) when set to `null`
4. Unit test: parser rejects relationship deltas outside `-2..+2`
5. Unit test: prompt builder includes all 4 required user sections
6. Unit test: prompt builder includes the content policy in the system message
7. Unit test: generation function uses `stageModel: 'chatStateUpdater'`, `promptType: 'chatStateUpdater'`, and the new schema/parser
8. Unit test: generation function returns both `stateUpdate` and `rawResponse`
9. Relevant existing chat unit suites continue to pass

### Invariants

1. Content policy block always present in system prompt
2. `suggestedValenceChange` constrained to -2..+2
3. `suggestedTensionChange` constrained to -2..+2
4. `shouldRefreshChatBible` and `shouldTriggerSummary` are always boolean (never nullable)
5. Stage does not modify any state — it only returns a description of changes
6. No compatibility aliasing or duplicate validation path is introduced for the same domain shape

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-state-updater-schema.test.ts` — schema and transformer
2. `test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts` — prompt structure
3. `test/unit/llm/chat/chat-state-updater-generation.test.ts` — generation with mocked runner
4. `test/unit/models/chat/chat-models.test.ts` or `test/unit/llm/schemas/chat-state-updater-schema.test.ts` — delta bound regression coverage for the canonical validator/parser path

### Commands

1. `npm run test:unit -- --testPathPattern='chat-state-updater'`
2. `npm run test:unit -- --testPathPattern='chat|stage-model-config'`
3. `npm run typecheck`
4. `npm run lint`

## Outcome

- **Completion date**: 2026-03-27
- **What actually changed**:
  - Added the missing Chat State Updater stage files:
    - `src/llm/schemas/chat-state-updater-schema.ts`
    - `src/llm/prompts/chat/chat-state-updater-prompt.ts`
    - `src/llm/chat/chat-state-updater-generation.ts`
  - Extended shared chat prompt formatting with a dedicated writer-turn serializer so the updater prompt can reuse the existing chat prompt conventions instead of hand-rolling a divergent format.
  - Tightened the canonical `ChatStateUpdate` runtime validation so relationship deltas outside `-2..+2` are rejected in the model validator path, not only in LLM-specific parsing.
  - Added focused tests for the new schema/parser, prompt builder, generation wrapper, and the canonical delta-bound regression.
  - Registered the new schema in the Anthropic compatibility inventory so future schema additions continue to be tracked.
- **Deviations from the original plan**:
  - The original ticket assumed a brand-new `ChatStateUpdate` contract and a stage function that returned only the parsed object. The implementation aligned with the existing chat-stage pattern instead and returns `{ stateUpdate, rawResponse }`.
  - The original plan implied schema-level numeric bounds. Those were intentionally not encoded with `minimum`/`maximum` because this repository enforces Anthropic-compatible static schemas; the invariant is enforced in the canonical parser/model validation path instead.
  - The actual implementation needed one small shared-formatter addition and one schema-compatibility test update that were not listed in the original ticket.
- **Verification results**:
  - `npm run test:unit -- --runInBand --testPathPatterns='test/unit/llm/chat/chat-state-updater-generation.test.ts|test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts|test/unit/llm/schemas/chat-state-updater-schema.test.ts|test/unit/models/chat/chat-models.test.ts|test/unit/llm/schemas/anthropic-schema-compatibility.test.ts'`
  - `npm run test:unit`
  - `npm run typecheck`
  - `npm run lint`
