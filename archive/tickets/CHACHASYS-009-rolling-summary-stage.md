# CHACHASYS-009: Chat Rolling Summary LLM Stage

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models), CHACHASYS-004 (stage registration)

## Problem

The Rolling Summary stage compresses older chat turns into a factual summary for long conversation memory management. It runs every 8 turns (or on session resume with >8 turns and no existing summary). The summary focuses on facts, commitments, power dynamics — not sentiment.

## Assumption Reassessment (2026-03-27)

1. `RollingSummaryOutput` already exists in [src/models/chat/chat-rolling-summary.ts](/home/joeloverbeck/projects/one-more-branch/src/models/chat/chat-rolling-summary.ts), and runtime validation already exists in [src/models/chat/chat-validation.ts](/home/joeloverbeck/projects/one-more-branch/src/models/chat/chat-validation.ts). This ticket should not add or reshape chat domain models.
2. The chat subsystem is already partially implemented. `chatSummarizer` is already registered in [src/config/llm-stage-registry.ts](/home/joeloverbeck/projects/one-more-branch/src/config/llm-stage-registry.ts), and the neighboring chat stages already follow the pattern `context interface -> prompt builder -> schema/parser -> generation wrapper`.
3. The existing chat generation wrappers return `{ typedResult, rawResponse }` and accept `options?: Partial<GenerationOptions>`. This ticket should follow that convention for architectural consistency instead of introducing a special-case API.
4. The additive-summary assumption is still valid, but it belongs in the prompt contract and orchestration inputs, not in persistence or model changes. This stage should summarize `existingSummary + turnsToCompress` into a fresh `RollingSummaryOutput` without mutating session state directly.
5. The ticket originally claimed no content policy block was needed. That does not match the current chat prompt architecture, where all existing chat stages append `CONTENT_POLICY`. The summary prompt should follow the same shared convention unless a deliberate cross-stage exception is introduced elsewhere.

## Architecture Check

1. The proposed addition is beneficial relative to the current architecture because the chat stage surface is incomplete without a dedicated summary stage, while the registry, models, and adjacent stages already assume a modular per-stage design.
2. The right implementation is not a new architectural direction; it is filling the existing gap using the current stage pattern. Introducing aliases, bespoke return shapes, or persistence-side behavior here would make the chat pipeline less coherent, not more extensible.
3. Temperature `0.2` and the `chatSummarizer` stage key are already part of the current stage configuration contract and should be reused rather than redefined here.
4. The summary stage must remain pure with respect to persistence: it returns a parsed summary result, and downstream orchestration decides whether and how to write `chatSession.rollingSummary`.
5. Raw turns remain authoritative in `turns.json`; rolling summary is a compressed memory aid for future LLM context, not a replacement for turn history.

## What to Change

### 1. Create `src/llm/schemas/chat-summary-schema.ts`

- JSON Schema matching the existing `RollingSummaryOutput` interface
- Parser: `parseChatSummaryResponse(raw: unknown): RollingSummaryOutput`
- Mirror the error/reporting pattern used by the other chat stage schema files (`LLMError` with raw payload attached)

### 2. Create `src/llm/prompts/chat/chat-summary-prompt.ts`

Build system and user messages per spec:
- System: compress turns into factual summary, focus on commitments/lies/confessions/unresolved questions/leverage shifts/exact factual disclosures, do not summarize sentiment, preserve continuity info
- User sections: `EXISTING ROLLING SUMMARY`, `TURNS TO COMPRESS`
- Reuse the existing chat prompt formatting helpers for turn rendering where possible instead of duplicating ad hoc formatting
- Include `CONTENT_POLICY` to stay aligned with the existing chat prompt-builder convention

### 3. Create `src/llm/chat/chat-summary-generation.ts`

- `ChatSummaryContext` should be introduced here, not in the model layer
- Preferred shape:
  `generateChatSummary(context: ChatSummaryContext, apiKey: string, options?: Partial<GenerationOptions>): Promise<ChatSummaryGenerationResult>`
- Result should follow existing chat stage conventions:
  `{ summary: RollingSummaryOutput; rawResponse: string }`
- Uses `runLlmStage` with `stageModel: 'chatSummarizer'` and `promptType: 'chatSummarizer'`

## Files to Touch

- `src/llm/schemas/chat-summary-schema.ts` (new)
- `src/llm/prompts/chat/chat-summary-prompt.ts` (new)
- `src/llm/chat/chat-summary-generation.ts` (new)

## Out of Scope

- Any changes to chat domain models under `src/models/chat/`
- Summary trigger logic and pipeline orchestration in CHACHASYS-010
- Persistence/repository changes
- Server routes or UI
- Prompt documentation markdown files (CHACHASYS-015)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema validates a well-formed RollingSummaryOutput
2. Unit test: parser accepts a valid RollingSummaryOutput and rejects invalid payloads
3. Unit test: prompt builder includes existing summary section when provided
4. Unit test: prompt builder omits existing summary section when null
5. Unit test: prompt builder formats turns-to-compress with speaker labels, block text, and any available turn metadata using the shared formatter conventions
6. Unit test: generation function uses `stageModel: 'chatSummarizer'`, `promptType: 'chatSummarizer'`, and the new schema/parser
7. Relevant chat/model suites and the project lint/typecheck/test commands pass

### Invariants

1. Summary is always a string (never null in the output — null is only valid in `ChatSession.rollingSummary` before first generation)
2. Raw turns in turns.json are never deleted by this stage
3. Summary focuses on facts, not sentiment (enforced by prompt, not schema)
4. Stage does not modify ChatSession — it returns a result for the pipeline to apply

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-summary-schema.test.ts` — schema and parser
2. `test/unit/llm/prompts/chat/chat-summary-prompt.test.ts` — prompt structure
3. `test/unit/llm/chat/chat-summary-generation.test.ts` — generation with mocked runner
4. `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` — schema inventory and Anthropic compatibility coverage for the new static schema export

### Commands

1. `npx jest --testPathPatterns='test/unit/.*/chat-summary.*\.test\.ts$'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completed on 2026-03-27.
- Added the missing rolling summary LLM stage pieces only: strict schema/parser, prompt builder, and generation wrapper.
- Followed the existing chat-stage architecture instead of the original ticket's greenfield assumptions: reused the existing `RollingSummaryOutput` model, reused shared turn formatting, matched the `{ typedResult, rawResponse }` generation pattern, and kept persistence/orchestration out of scope.
- Added focused unit coverage for the new schema, prompt, and generation wrapper, and extended the Anthropic schema compatibility inventory so new static schemas remain covered by the repo-wide meta-test.
- Verification: `npx jest --testPathPatterns='test/unit/.*/chat-summary.*\.test\.ts$'`, `npm run typecheck`, `npm run lint`, `npx jest test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`, and `npm test` all passed.
