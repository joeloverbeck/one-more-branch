# CHATSPKNAM-001: Use character names instead of USER/CHARACTER in chat LLM prompts

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

Chat turn history sent to the LLM uses generic `[USER]` and `[CHARACTER]` labels (e.g., `TURN 1 [USER]`), even though actual character names are available on the `ChatSession`. This forces the LLM to mentally map generic roles to specific characters. Using actual names (e.g., `TURN 1 [Nahia Lasa]`) makes the conversation history more natural and less ambiguous for the model.

## Assumption Reassessment (2026-03-28)

1. **`formatRecentTurns` is the single formatter** — Confirmed. All 5 prompt builders (planner, writer, state-updater, summary, context-prompt-sections) call `formatRecentTurns` from `chat-prompt-formatters.ts`. Changing this function's output changes all prompts.
2. **Character names are available** — Confirmed. `ChatSession` has `targetCharacterName` and `interlocutorCharacterName`. `ChatGenerationContext` has `targetCharacter.name` and `interlocutorCharacter.name`. Individual prompt contexts (`ChatPlannerContext`, `ChatWriterContext`) have `targetCharacter.name` but NOT `interlocutorCharacterName`.
3. **Storage stays unchanged** — Confirmed. The `ChatSpeaker` type (`'USER' | 'CHARACTER'`) is a structural enum used for role-based logic in UI rendering and service layer. It should remain as-is in stored JSON.

## Architecture Check

1. **Single-point change in formatter**: Adding name params to `formatRecentTurns` means all prompt stages benefit without scattered mapping logic. The formatter already owns the responsibility of converting turn data to prompt text.
2. **No backwards-compatibility shims**: The `ChatSpeaker` enum stays. No migration needed. The change is purely in prompt presentation.

## What to Change

### 1. Add `interlocutorCharacterName` to prompt context types

Each context type that carries `recentTurns` or `latestUserTurn` needs the interlocutor name (target name is already available via `targetCharacter.name`):

- `ChatPlannerContext` in `src/llm/chat/chat-planner-generation.ts` — add `readonly interlocutorCharacterName: string`
- `ChatWriterContext` in `src/llm/chat/chat-writer-generation.ts` — add `readonly interlocutorCharacterName: string`
- `ChatStateUpdaterContext` in `src/llm/chat/chat-state-updater-generation.ts` — add `readonly interlocutorCharacterName: string`
- `ChatSummaryContext` in `src/llm/chat/chat-summary-generation.ts` — add `readonly interlocutorCharacterName: string`

### 2. Update `formatRecentTurns` signature

In `src/llm/prompts/chat/chat-prompt-formatters.ts`:

```typescript
export function formatRecentTurns(
  turns: readonly ChatTurn[],
  speakerNames: { readonly target: string; readonly interlocutor: string }
): string {
```

Change the header line from:
```typescript
const lines = [`TURN ${turn.turnNumber} [${turn.speaker}]`];
```
To:
```typescript
const speakerName = turn.speaker === 'CHARACTER' ? speakerNames.target : speakerNames.interlocutor;
const lines = [`TURN ${turn.turnNumber} [${speakerName}]`];
```

### 3. Update all callers of `formatRecentTurns`

Each caller must pass the speaker names object:

- `src/llm/prompts/chat/chat-planner-prompt.ts` — `formatRecentTurns(context.recentTurns, { target: context.targetCharacter.name, interlocutor: context.interlocutorCharacterName })` and update `formatLatestUserTurn` similarly
- `src/llm/prompts/chat/chat-writer-prompt.ts` — same pattern
- `src/llm/prompts/chat/chat-state-updater-prompt.ts` — same pattern
- `src/llm/prompts/chat/chat-summary-prompt.ts` — needs names threaded from `ChatSummaryContext`
- `src/llm/prompts/chat/chat-context-prompt-sections.ts` — use `context.targetCharacter.name` and `context.interlocutorCharacter.name` from `ChatGenerationContext`

### 4. Thread names through pipeline

In `src/llm/chat/chat-pipeline.ts`, when constructing each sub-context, include `interlocutorCharacterName` from the session:

```typescript
interlocutorCharacterName: session.interlocutorCharacterName
```

The pipeline already has access to the `ChatSession` (or equivalent) to build these contexts.

## Files to Touch

- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify) — add name params to `formatRecentTurns`
- `src/llm/chat/chat-planner-generation.ts` (modify) — add `interlocutorCharacterName` to `ChatPlannerContext`
- `src/llm/chat/chat-writer-generation.ts` (modify) — add `interlocutorCharacterName` to `ChatWriterContext`
- `src/llm/chat/chat-state-updater-generation.ts` (modify) — add `interlocutorCharacterName` to `ChatStateUpdaterContext`
- `src/llm/chat/chat-summary-generation.ts` (modify) — add `interlocutorCharacterName` to `ChatSummaryContext`
- `src/llm/prompts/chat/chat-planner-prompt.ts` (modify) — pass names to formatter
- `src/llm/prompts/chat/chat-writer-prompt.ts` (modify) — pass names to formatter
- `src/llm/prompts/chat/chat-state-updater-prompt.ts` (modify) — pass names to formatter
- `src/llm/prompts/chat/chat-summary-prompt.ts` (modify) — pass names to formatter
- `src/llm/prompts/chat/chat-context-prompt-sections.ts` (modify) — pass names to formatter
- `src/llm/chat/chat-pipeline.ts` (modify) — thread `interlocutorCharacterName` into sub-contexts

## Out of Scope

- Changing the `ChatSpeaker` enum or stored JSON format
- Changing UI rendering logic (already uses character names)
- Adding `speakerName` field to `ChatTurn` model
- Modifying system prompt text that references "target character" / "interlocutor"

## Acceptance Criteria

### Tests That Must Pass

1. `formatRecentTurns` with speaker names produces `TURN N [CharacterName]` instead of `TURN N [USER]`/`TURN N [CHARACTER]`
2. All existing chat pipeline tests pass with updated mock contexts (adding `interlocutorCharacterName`)
3. Existing suite: `npm test`

### Invariants

1. Stored chat JSON (`chats/*/*.json`) must not change — `speaker` remains `'USER'` | `'CHARACTER'`
2. UI rendering must not change — already maps speaker to character names
3. All prompt builders that use `formatRecentTurns` must pass speaker names

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts` — update existing `formatRecentTurns` tests to pass speaker names; verify output uses character names
2. `test/unit/llm/chat/chat-pipeline.test.ts` — update mock contexts to include `interlocutorCharacterName`
3. Any other test files that construct `ChatPlannerContext`, `ChatWriterContext`, `ChatStateUpdaterContext`, or `ChatSummaryContext` mocks — add the new required field

### Commands

1. `npm run test:unit -- --testPathPattern="chat"` (targeted chat tests)
2. `npm test` (full suite)
3. `npm run typecheck` (verify all context types are satisfied)
4. `npm run lint` (style compliance)

## Outcome

**Completed**: 2026-03-28

**What was changed**:
- Added `SpeakerNames` interface and `speakerNames` param to `formatRecentTurns` in `chat-prompt-formatters.ts`
- Added `interlocutorCharacterName` to `ChatPlannerContext`, `ChatWriterContext`; added both `targetCharacterName` and `interlocutorCharacterName` to `ChatStateUpdaterContext`, `ChatSummaryContext`
- Updated all 5 prompt builders (planner, writer, state-updater, summary, context-prompt-sections) to pass speaker names
- Threaded names through `chat-pipeline.ts` from `ChatSession` into all sub-contexts
- Removed unused `formatLatestUserTurn` helper functions from 3 prompt files
- Updated 4 test files with new mock fields and updated assertions

**Deviations from ticket**: None. `ChatStateUpdaterContext` and `ChatSummaryContext` needed `targetCharacterName` as a separate string (they don't carry a `targetCharacter` object), which was not explicitly called out in the ticket but was the correct approach.

**Verification**: typecheck clean, lint clean, 4046/4046 tests pass
