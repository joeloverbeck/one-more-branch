# CHACHASYS-003: Chat User Input Parser

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHACHASYS-001 (ChatBlock type)

## Problem

User free-text input must be parsed into structured `ChatBlock[]` arrays. Text wrapped in `*asterisks*` becomes ACTION blocks; everything else becomes SPEECH blocks. This is a pure utility function with no side effects, used by both the server route and the client-side JS.

## Assumption Reassessment (2026-03-27)

1. `ChatBlock` type will be defined in CHACHASYS-001 with `type: 'ACTION' | 'SPEECH'` and `text: string`.
2. No existing input parser in the codebase for this format.
3. `src/server/utils/` directory exists and contains other utility functions.

## Architecture Check

1. Pure function, no dependencies beyond the ChatBlock type.
2. Server-side TypeScript parser in `src/server/utils/`. Client-side JS will have its own parser (CHACHASYS-014) following the same logic, since the client code is plain JS not TS.

## What to Change

### 1. Create `src/server/utils/chat-input-parser.ts`

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

## Files to Touch

- `src/server/utils/chat-input-parser.ts` (new)

## Out of Scope

- Client-side JS parser (CHACHASYS-014)
- Server routes or services
- LLM pipeline
- Any existing utility files

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `*leans forward* "I don't believe you." *taps the table*` → `[ACTION("leans forward"), SPEECH('"I don\'t believe you."'), ACTION("taps the table")]`
2. Unit test: `Hello there` (no asterisks) → `[SPEECH("Hello there")]`
3. Unit test: `*nods*` → `[ACTION("nods")]`
4. Unit test: empty string → `[]`
5. Unit test: `*  *` (whitespace-only action) → `[]`
6. Unit test: unmatched `*` → single SPEECH block with the literal `*`
7. Unit test: `"Fine." *shrugs* "Whatever."` → `[SPEECH('"Fine."'), ACTION("shrugs"), SPEECH('"Whatever."')]`
8. Existing suite: `npm test` passes

### Invariants

1. Pure function — no side effects, no I/O
2. Never returns blocks with empty `text`
3. Output block count ≥ 0 and ≤ input complexity
4. ACTION blocks never contain asterisks in their text

## Test Plan

### New/Modified Tests

1. `test/unit/server/utils/chat-input-parser.test.ts` — comprehensive parsing tests covering all edge cases above

### Commands

1. `npm run test:unit -- --testPathPattern='chat-input-parser'`
2. `npm run typecheck`
