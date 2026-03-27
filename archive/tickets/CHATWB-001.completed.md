# CHATWB-001: Add chat-specific worldbuilding formatter

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Prompt formatting only
**Deps**: None

## Problem

The chat pipeline has no worldbuilding context. Before threading worldbuilding through the pipeline (CHATWB-003), we need a consumer-specific formatter that filters world facts for conversation relevance — social norms, cultural context, geography, language patterns — without including plot-heavy or technical facts irrelevant to dialogue.

## Assumption Reassessment (2026-03-27)

1. `worldbuilding-sections.ts` exists at `src/llm/prompts/sections/shared/worldbuilding-sections.ts` with 4 exported consumer-specific builders (`Spine`, `CharacterWeb`, `CharacterDev`, `Page`) and the private helpers needed to add a fifth one — confirmed.
2. The generic `WorldPromptConsumer` union in `src/models/decomposed-world.ts` is not what the existing consumer-specific prompt builders use. It is only consumed by `formatDecomposedWorldForPrompt()` in the model layer, where it currently gates open-question rendering. Adding `'CHAT'` there would widen a public type without wiring any chat-specific behavior — confirmed.
3. The current chat prompt pipeline does not accept decomposed worldbuilding in any chat stage context yet. `ChatBibleContext`, `ChatPlannerContext`, `ChatWriterContext`, `ChatStateUpdaterContext`, and `ChatSummaryContext` have no worldbuilding field, and `runChatPipeline()` does not pass one through — confirmed.
4. There is currently no dedicated test file for `worldbuilding-sections.ts`; coverage for world formatting lives in `test/unit/models/decomposed-models.test.ts`, which exercises only the generic formatter in `src/models/decomposed-world.ts` — confirmed.
5. `WorldFact` domain values and fact types assumed by the ticket are valid: `geography`, `society`, `culture`, `religion`, `governance`, `language`, plus fact types such as `NORM`, `PRACTICE`, `TABOO`, `BELIEF`, and `LAW` all exist in `src/models/decomposed-world.ts` — confirmed.

## Architecture Check

1. The clean architecture for this ticket is to extend the existing consumer-specific formatter module in `src/llm/prompts/sections/shared/worldbuilding-sections.ts`, because that is where prompt-facing worldbuilding selection already lives for specialized consumers.
2. This ticket should not widen `WorldPromptConsumer` yet. Doing so would create a misleading API surface suggesting chat support in the generic formatter, while the chat pipeline still cannot consume decomposed worldbuilding.
3. No backwards-compatibility aliasing/shims introduced.

## What to Change

### 1. Add `buildWorldSectionForChat()` to `worldbuilding-sections.ts`

Add a new exported function following the existing formatter pattern:

**Domains**: `society`, `culture`, `language`, `geography`, `religion`, `governance`
**Fact types**: `NORM`, `PRACTICE`, `TABOO`, `BELIEF`, `LAW`

Sections to render:
- World logline (if present)
- `[SOCIAL & CULTURAL CONTEXT]` — facts matching social domains OR social fact types, rendered with `renderFactWithSensory()`
- `[GEOGRAPHY & SETTING]` — geography-domain facts, rendered with `renderFactLine()`
- `[NAMING & LANGUAGE]` — language-domain facts, rendered with `renderFactLine()`

Header: `WORLDBUILDING (structured for chat):`.

De-duplicate facts that match multiple sections (a fact appearing in social should not repeat in geography).

### 2. Add dedicated unit coverage for the chat formatter

Create a focused test file for `worldbuilding-sections.ts` rather than extending the model-layer formatter tests. This keeps the specialized prompt-builder tests close to the specialized prompt-builder code.

## Files to Touch

- `src/llm/prompts/sections/shared/worldbuilding-sections.ts` (modify) — add `buildWorldSectionForChat()`
- `test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts` (new) — cover chat-specific formatter behavior

## Out of Scope

- Threading worldbuilding into the chat pipeline (CHATWB-003)
- UI changes (CHATWB-002)
- Changes to the `formatDecomposedWorldForPrompt()` generic formatter
- Adding `CHAT` to `WorldPromptConsumer` before generic consumer dispatch exists

## Acceptance Criteria

### Tests That Must Pass

1. `buildWorldSectionForChat()` returns empty string when `facts` array is empty
2. `buildWorldSectionForChat()` includes world logline when present
3. `buildWorldSectionForChat()` includes social/cultural facts (society, culture domain) under `[SOCIAL & CULTURAL CONTEXT]`
4. `buildWorldSectionForChat()` includes geography facts under `[GEOGRAPHY & SETTING]`
5. `buildWorldSectionForChat()` includes language facts under `[NAMING & LANGUAGE]`
6. `buildWorldSectionForChat()` excludes facts from irrelevant domains (e.g., `technology`, `magic`, `ecology`) unless they have social fact types
7. `buildWorldSectionForChat()` sorts facts by narrative weight (HIGH first)
8. `buildWorldSectionForChat()` does not duplicate the same fact across multiple rendered sections
9. Existing suite: relevant targeted tests plus `npm run lint`, `npm run typecheck`, and `npm test`

### Invariants

1. Existing 4 formatters remain unchanged
2. No changes to the generic formatter contract in `src/models/decomposed-world.ts`

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts` — new test cases for `buildWorldSectionForChat()` covering all acceptance criteria above

### Commands

1. `npx jest test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts`
2. `npx jest test/unit/models/decomposed-models.test.ts`
3. `npx jest test/unit/llm/prompts/chat`
4. `npm run lint`
5. `npm run typecheck`
6. `npm test`

## Outcome

- Completed on 2026-03-27.
- Added `buildWorldSectionForChat()` to `src/llm/prompts/sections/shared/worldbuilding-sections.ts`.
- Added dedicated unit coverage in `test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts`.
- Corrected the original plan by removing the proposed `WorldPromptConsumer` change. That change would have widened the generic model-layer API without adding real chat consumer wiring, so it was intentionally left out to keep the architecture cleaner and more honest.
- Verification: `npx jest test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts`, `npx jest test/unit/models/decomposed-models.test.ts`, `npx jest test/unit/llm/prompts/chat`, `npm run lint`, `npm run typecheck`, and `npm test` all passed.
