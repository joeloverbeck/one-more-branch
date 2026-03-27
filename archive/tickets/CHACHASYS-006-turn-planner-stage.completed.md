# CHACHASYS-006: Turn Planner LLM Stage

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (chat data models), CHACHASYS-004 (chat stage registration)

## Problem

The Turn Planner is the second LLM stage in the per-turn pipeline. It should receive the curated chat bible, the target character decomposition, recent turns, and the latest user turn, then produce a structured hidden plan for the character's next response. That plan must stay aligned with the already-established chat data models and the standardized `runLlmStage()` chat-stage architecture now used by `chat-bible`.

## Assumption Reassessment (2026-03-27)

1. `TurnPlannerOutput` and its enum/value sources already exist in [src/models/chat/chat-turn-plan.ts](/home/joeloverbeck/projects/one-more-branch/src/models/chat/chat-turn-plan.ts). This ticket must reuse that canonical model instead of redefining planner types.
2. Chat stage keys, model config, max tokens, and temperatures already exist in [src/config/llm-stage-registry.ts](/home/joeloverbeck/projects/one-more-branch/src/config/llm-stage-registry.ts) and [configs/default.json](/home/joeloverbeck/projects/one-more-branch/configs/default.json). This ticket must not duplicate or reintroduce those changes.
3. There is already one implemented chat stage using the intended architecture: [src/llm/chat/chat-bible-generation.ts](/home/joeloverbeck/projects/one-more-branch/src/llm/chat/chat-bible-generation.ts), [src/llm/prompts/chat/chat-bible-prompt.ts](/home/joeloverbeck/projects/one-more-branch/src/llm/prompts/chat/chat-bible-prompt.ts), and [src/llm/schemas/chat-bible-schema.ts](/home/joeloverbeck/projects/one-more-branch/src/llm/schemas/chat-bible-schema.ts). The Turn Planner should follow that pattern, not the older bespoke page-planner implementation.
4. `StandaloneDecomposedCharacter` already exposes `speechFingerprint`, `knowledgeBoundaries`, optional false-belief/secret fields, and broader behavioral context in [src/models/standalone-decomposed-character.ts](/home/joeloverbeck/projects/one-more-branch/src/models/standalone-decomposed-character.ts). The prompt should exploit that richer decomposition directly instead of narrowing itself to speech-fingerprint-only context.
5. Runtime validators already know about `TurnPlannerOutput` via [src/models/chat/chat-validation.ts](/home/joeloverbeck/projects/one-more-branch/src/models/chat/chat-validation.ts). The new schema parser should validate against that existing guard so the architecture keeps one source of truth for planner payload shape.

## Architecture Check

1. Same 3-file chat-stage pattern as `chat-bible`: schema/parser + prompt builder + generation wrapper.
2. The planner output remains internal and is stored on `ChatTurn.plannerOutput` for observability/debugging, not direct UI rendering.
3. The planner should remain a pure planning stage. It should not alias or overlap with writer/state-updater responsibilities.
4. The planner prompt should privilege the curated `ChatBible` plus target-character decomposition as the durable source of truth, because that architecture is cleaner and more extensible than rebuilding planning context ad hoc from raw fields each stage.

## What to Change

### 1. Create `src/llm/schemas/chat-planner-schema.ts`

- Strict JSON schema matching the existing `TurnPlannerOutput` model in `src/models/chat/chat-turn-plan.ts`
- Reuse existing enum/value arrays from the chat models for `SpeechAct`, `HonestyMode`, `ActionPlanKind`, target length, and block types
- Parser function name should follow the existing chat-stage pattern, e.g. `parseChatPlannerResponse(raw: unknown): TurnPlannerOutput`
- Enforce the real domain invariants from the spec where they matter architecturally:
  - nullable `suppressedEmotion` and `questionBack`
  - `blockPlan` limited to `ACTION | SPEECH`
  - `expectedImpact.relationshipDeltaHint` constrained to `-2..2`
  - `expectedImpact.tensionDeltaHint` constrained to `-2..2`
  - Note: the numeric range invariant must be enforced by the shared parser/validator layer, not JSON Schema keywords, because the repo’s Anthropic-compatible schema contract disallows `minimum`/`maximum`

### 2. Create `src/llm/prompts/chat/chat-planner-prompt.ts`

Build the planner prompt in the same style as `chat-bible`, using a single system message plus one structured user message.

System prompt requirements:
- plan exactly one character turn
- treat physical reality, knowledge boundaries, false beliefs, and secrets as hard constraints
- separate hidden reasoning/planning from visible output
- include the content policy block

User prompt sections should include at minimum:
- `CHAT BIBLE`
- `TARGET CHARACTER DECOMPOSITION`
- `TARGET CHARACTER SPEECH FINGERPRINT`
- `RECENT CHAT TURNS`
- `LATEST USER TURN`

The prompt should not overfit to just speech mimicry. Clean architecture here means planning from motivation, knowledge, and constraints first, then using speech fingerprint as one execution dimension.

### 3. Create `src/llm/chat/chat-planner-generation.ts`

- Define a `ChatPlannerContext` that matches the actual prompt inputs, not the earlier ticket shorthand
- Implement `generateChatTurnPlan(context: ChatPlannerContext, apiKey: string, options?: Partial<GenerationOptions>)`
- Follow the existing `generateChatBible()` contract style:
  - build messages with the prompt builder
  - call `runLlmStage()` with `stageModel: 'chatPlanner'` and `promptType: 'chatPlanner'`
  - return both parsed planner output and `rawResponse`

### 4. Wire exports only where needed

- Add exports if needed from shared indices touched by the new modules
- Avoid unrelated refactors or wide file rewrites unless they are required to keep the architecture coherent

## Files to Touch

- `tickets/CHACHASYS-006-turn-planner-stage.md` (update assumptions/scope first)
- `src/llm/schemas/chat-planner-schema.ts` (new)
- `src/llm/prompts/chat/chat-planner-prompt.ts` (new)
- `src/llm/chat/chat-planner-generation.ts` (new)
- shared export files only if required by the implementation/tests

## Out of Scope

- Stage registration and config model entries already present in the codebase
- Pipeline orchestration and turn execution flow (CHACHASYS-010)
- Writer, state updater, summarizer, server routes, or UI
- Broad refactors of existing page-planner architecture
- Prompt documentation markdown files unless this ticket ends up changing prompt ownership/scope in a way that would make existing docs stale

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema defines a strict `json_schema` response format for the planner stage
2. Unit test: schema requires the full `TurnPlannerOutput` top-level shape
3. Unit test: schema constrains `speechAct`, `honestyMode`, `blockPlan`, and `targetLength` to the canonical enum/value sets
4. Unit test: schema uses `anyOf` for nullable `suppressedEmotion` and `questionBack`
5. Unit test: parser accepts a valid planner payload and rejects invalid shapes, including out-of-range expected-impact hints, via the existing chat validator
6. Unit test: prompt builder includes the content policy in the system prompt
7. Unit test: prompt builder renders the required planner context sections and includes the latest user turn
8. Unit test: generation wrapper calls `runLlmStage()` with `'chatPlanner'` stage metadata, correct schema, and parser
9. Relevant targeted unit suites, `npm run typecheck`, and `npm run lint` pass
10. Full `npm test` passes

### Invariants

1. Content policy block always present in system prompt
2. Planner output shape is defined once in the chat models and reused everywhere else
3. Schema uses `anyOf` for nullable fields (`suppressedEmotion`, `questionBack`)
4. `blockPlan` array only allows `ACTION` or `SPEECH`
5. `expectedImpact.relationshipDeltaHint` constrained to `-2..2` by shared runtime validation
6. `expectedImpact.tensionDeltaHint` constrained to `-2..2` by shared runtime validation

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-planner-schema.test.ts` — schema contract and parser behavior
2. `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` — planner prompt structure and required sections
3. `test/unit/llm/chat/chat-planner-generation.test.ts` — generation wrapper delegation to `runLlmStage`

### Commands

1. `npm run test:unit -- --testPathPatterns='chat-planner|anthropic-schema-compatibility'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completed on 2026-03-27.
- Implemented the missing Turn Planner chat stage in the established chat-stage architecture:
  - `src/llm/schemas/chat-planner-schema.ts`
  - `src/llm/prompts/chat/chat-planner-prompt.ts`
  - `src/llm/chat/chat-planner-generation.ts`
- Added focused unit coverage for the schema/parser, prompt builder, and generation wrapper.
- Strengthened shared runtime validation in `src/models/chat/chat-validation.ts` so `expectedImpact.relationshipDeltaHint` and `expectedImpact.tensionDeltaHint` are constrained to `-2..2`.
- Added a shared chat prompt formatter helper to keep chat prompt builders DRY.
- Deviations from the original ticket plan:
  - Reused existing chat models, stage registration, and config rather than recreating them.
  - Enforced expected-impact numeric ranges in shared runtime validation instead of JSON Schema keywords because the repo's Anthropic-compatible schema contract forbids `minimum` and `maximum`.
- Verification:
  - `npm run test:unit -- --testPathPatterns='chat-planner|anthropic-schema-compatibility'`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
