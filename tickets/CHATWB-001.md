# CHATWB-001: Add chat-specific worldbuilding formatter

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The chat pipeline has no worldbuilding context. Before threading worldbuilding through the pipeline (CHATWB-003), we need a consumer-specific formatter that filters world facts for conversation relevance — social norms, cultural context, geography, language patterns — without including plot-heavy or technical facts irrelevant to dialogue.

## Assumption Reassessment (2026-03-27)

1. `worldbuilding-sections.ts` exists at `src/llm/prompts/sections/shared/worldbuilding-sections.ts` with 4 existing formatters (Spine, CharacterWeb, CharacterDev, Page) — confirmed.
2. `WorldPromptConsumer` type exists at `src/models/decomposed-world.ts` with values `'SPINE' | 'CHARACTER_WEB' | 'CHARACTER_DEV' | 'PAGE'` — confirmed.
3. Helper functions `sortByWeight`, `hasDomain`, `hasFactType`, `renderFactWithSensory`, `renderFactLine` are available as module-private functions in `worldbuilding-sections.ts` — confirmed.
4. `WorldFact` domain values include `geography`, `society`, `culture`, `religion`, `governance`, `language` — confirmed via `decomposed-world.ts`.
5. `WorldFact` factType values include `NORM`, `PRACTICE`, `TABOO`, `BELIEF`, `LAW` — confirmed.

## Architecture Check

1. Follows the exact same pattern as the existing 4 consumer-specific formatters: filter by domain/factType → sort by weight → group into labeled sections → render with metadata. No new abstractions or patterns introduced.
2. No backwards-compatibility aliasing/shims introduced.

## What to Change

### 1. Add `CHAT` to `WorldPromptConsumer` union type

In `src/models/decomposed-world.ts`, add `'CHAT'` to the `WorldPromptConsumer` type union.

### 2. Add `buildWorldSectionForChat()` to worldbuilding-sections.ts

New exported function following the existing formatter pattern:

**Domains**: `society`, `culture`, `language`, `geography`, `religion`, `governance`
**Fact types**: `NORM`, `PRACTICE`, `TABOO`, `BELIEF`, `LAW`

Sections to render:
- World logline (if present)
- `[SOCIAL & CULTURAL CONTEXT]` — facts matching social domains OR social fact types, rendered with `renderFactWithSensory()`
- `[GEOGRAPHY & SETTING]` — geography-domain facts, rendered with `renderFactLine()`
- `[NAMING & LANGUAGE]` — language-domain facts, rendered with `renderFactLine()`

Header: `WORLDBUILDING (structured for chat):`.

De-duplicate facts that match multiple sections (a fact appearing in social should not repeat in geography).

## Files to Touch

- `src/models/decomposed-world.ts` (modify) — add `'CHAT'` to `WorldPromptConsumer`
- `src/llm/prompts/sections/shared/worldbuilding-sections.ts` (modify) — add `buildWorldSectionForChat()`

## Out of Scope

- Threading worldbuilding into the chat pipeline (CHATWB-003)
- UI changes (CHATWB-002)
- Changes to the `formatDecomposedWorldForPrompt()` generic formatter

## Acceptance Criteria

### Tests That Must Pass

1. `buildWorldSectionForChat()` returns empty string when `facts` array is empty
2. `buildWorldSectionForChat()` includes world logline when present
3. `buildWorldSectionForChat()` includes social/cultural facts (society, culture domain) under `[SOCIAL & CULTURAL CONTEXT]`
4. `buildWorldSectionForChat()` includes geography facts under `[GEOGRAPHY & SETTING]`
5. `buildWorldSectionForChat()` includes language facts under `[NAMING & LANGUAGE]`
6. `buildWorldSectionForChat()` excludes facts from irrelevant domains (e.g., `technology`, `magic`, `ecology`) unless they have social fact types
7. `buildWorldSectionForChat()` sorts facts by narrative weight (HIGH first)
8. Existing suite: `npm test`

### Invariants

1. Existing 4 formatters remain unchanged
2. `WorldPromptConsumer` type is extended, not replaced

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts` — new test cases for `buildWorldSectionForChat()` covering all acceptance criteria above

### Commands

1. `npx jest test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts`
2. `npm run lint && npm run typecheck && npm test`
