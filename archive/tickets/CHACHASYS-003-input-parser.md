# CHACHASYS-003: Chat User Input Parser

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: Existing `src/models/chat` domain contracts

## Problem

User free-text input must be parsed into structured `ChatBlock[]` arrays. Text wrapped in `*asterisks*` becomes ACTION blocks; everything else becomes SPEECH blocks. This must remain a pure function with no side effects, but it should now live with the chat domain contracts rather than as an isolated server utility.

## Assumption Reassessment (2026-03-27)

1. `ChatBlock` already exists in `src/models/chat/chat-turn.ts`, exported through `src/models/chat/index.ts` and `src/models/index.ts`.
2. There is still no existing parser implementation for this format in `src/` or `test/`.
3. The repo already treats chat as a first-class domain module (`src/models/chat`, `src/persistence/chat-repository.ts`), so adding the parser under `src/server/utils/` would split a chat invariant away from the rest of the chat model layer.
4. `src/server/utils/` does exist, but it currently houses request/view helpers and route support, not chat-domain parsing contracts.

## Architecture Check

1. Pure function, no dependencies beyond the existing `ChatBlock` type.
2. Preferred location: `src/models/chat/chat-input-parser.ts`, exported from the chat barrel. This keeps `ChatBlock` creation rules colocated with the `ChatBlock` contract and makes future chat pipeline/server usage import the canonical parser from one domain boundary.
3. Client-side JS remains out of scope for this ticket. CHACHASYS-014 can mirror the same rules in plain JS, but this ticket should not force the server layer to own a domain parser just because the client cannot reuse the TypeScript module directly.

## Architectural Rationale

The proposed parser is more beneficial than the current architecture because the current architecture has a gap: `ChatBlock` is a validated persisted domain type, but the repo lacks a canonical domain-level constructor/parser for user-authored block sequences. Adding that parser improves consistency and robustness without introducing alias layers or backwards-compatibility shims.

The original ticket's proposed location (`src/server/utils/chat-input-parser.ts`) is not more beneficial than the current architecture. It would make a core chat invariant depend on the HTTP/server layer and encourage duplicate logic when the chat pipeline or persistence-adjacent code needs the same transformation. The cleaner long-term architecture is to keep parsing near the chat model itself and let routes/services consume it.

## What to Change

### 1. Create `src/models/chat/chat-input-parser.ts`

```typescript
function parseChatInput(rawText: string): ChatBlock[]
```

Rules:
- Split on `*...*` boundaries using regex
- Text between `*` pairs → ACTION block (trim whitespace)
- All other text → SPEECH block (trim whitespace, skip empty)
- If no asterisks, entire input is one SPEECH block
- Empty or whitespace-only blocks are omitted
- Raw text is NOT stored in blocks — it's stored separately on the ChatTurn

Edge cases:
- Unmatched single `*` → treat as literal text (no ACTION)
- Nested `**` → treat as literal text (not bold, just text)
- Empty `**` → skip
- Multiple consecutive ACTION blocks → preserve as separate blocks

### 2. Export parser from chat barrels

- `src/models/chat/index.ts`
- `src/models/index.ts`

## Files to Touch

- `src/models/chat/chat-input-parser.ts` (new)
- `src/models/chat/index.ts`
- `src/models/index.ts`

## Out of Scope

- Client-side JS parser (CHACHASYS-014)
- Server routes or services unless they already need the parser for compilation
- LLM pipeline
- Any broad chat refactor unrelated to canonicalizing parser placement

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `*leans forward* "I don't believe you." *taps the table*` → `[ACTION("leans forward"), SPEECH('"I don\'t believe you."'), ACTION("taps the table")]`
2. Unit test: `Hello there` (no asterisks) → `[SPEECH("Hello there")]`
3. Unit test: `*nods*` → `[ACTION("nods")]`
4. Unit test: empty string → `[]`
5. Unit test: `*  *` (whitespace-only action) → `[]`
6. Unit test: unmatched `*` → single SPEECH block with the literal `*`
7. Unit test: `"Fine." *shrugs* "Whatever."` → `[SPEECH('"Fine."'), ACTION("shrugs"), SPEECH('"Whatever."')]`
8. Unit test: consecutive action segments such as `*nods**steps back*` remain two ACTION blocks
9. Existing relevant suites and static checks pass

### Invariants

1. Pure function — no side effects, no I/O
2. Never returns blocks with empty `text`
3. Output block count ≥ 0 and ≤ input complexity
4. ACTION blocks never contain asterisks in their text
5. The parser is the canonical TypeScript entry point for constructing `ChatBlock[]` from raw user input on the server/domain side

## Test Plan

### New/Modified Tests

1. `test/unit/models/chat/chat-input-parser.test.ts` — comprehensive parsing tests covering all edge cases above
2. `test/unit/models/chat/chat-models.test.ts` — only if barrel exports need direct coverage beyond the new parser test

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/models/chat/chat-input-parser.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completed: 2026-03-27
- Actually changed:
  - Added `parseChatInput(rawText)` in `src/models/chat/chat-input-parser.ts`
  - Exported the parser from `src/models/chat/index.ts` and `src/models/index.ts`
  - Added focused parser coverage in `test/unit/models/chat/chat-input-parser.test.ts`
- Deviations from original plan:
  - Implemented the parser in `src/models/chat/` instead of `src/server/utils/` because the current codebase already centralizes chat contracts in the chat domain layer, and that placement is cleaner and more extensible than a server-owned parser
  - Kept server routes/services unchanged because no existing callers required integration in this ticket
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/models/chat/chat-input-parser.test.ts test/unit/models/chat/chat-models.test.ts`
  - `npm run typecheck`
  - `npm run lint`
