# CHABRA-003: Character brainstormer prompt builder

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHABRA-002

## Problem

The character brainstormer needs a prompt builder that assembles the system message (narrative theory toolkit, quality gates, content policy) and user message (concept, kernel, worldbuilding, existing characters, user notes) into the LLM message array.

## Assumption Reassessment (2026-03-25)

1. Prompt builders follow the sections-array-join pattern — confirmed in existing prompt files.
2. Shared prompt sections exist for concept/kernel rendering (`concept-kernel-sections.ts`) and worldbuilding (`worldbuilding-sections.ts` or `decomposed-world.ts` `formatDecomposedWorldForPrompt()`).
3. Content policy is injected via `getContentPolicy()` from `src/llm/prompts/content-policy.ts`.
4. The `CharacterBrainstormerContext` interface includes `conceptSpec`, `storyKernel`, `decomposedWorld`, `rawWorldbuilding`, `existingCharacterNames`, and `userNotes`.

## Architecture Check

1. Reuses existing shared section builders for concept, kernel, and worldbuilding rendering — no duplication.
2. The system message is a single long string with the narrative theory toolkit — this is intentional and self-contained.
3. No backwards-compatibility shims needed.

## What to Change

### 1. Create the prompt builder

File: `src/llm/prompts/character-brainstormer-prompt.ts`

Functions:
- `buildCharacterBrainstormerMessages(context: CharacterBrainstormerContext): ChatMessage[]` — returns `[systemMessage, userMessage]`

System message contains:
- Role introduction (character concept brainstormer)
- Content policy (`{{CONTENT_POLICY}}` replaced with actual policy)
- Diagnostic uniqueness test mandate
- 10 narrative theory techniques (Egri, McKee, Weiland/Hurst, Diaz/Seger, archetype subversion, Matt Bird, Truby/McKee, technique rotation, worldview fingerprinting, functional diversity)
- Quality gates

User message contains:
- Concept analysis (rendered via shared builders)
- Thematic kernel (rendered via shared builders)
- World context (decomposedWorld if available, else rawWorldbuilding if available)
- Existing characters anti-similarity block (if any exist)
- User creative direction (if userNotes provided)
- Output requirements

### 2. Create prompt documentation

File: `prompts/character-brainstormer-prompt.md`

Document the prompt's purpose, input context, system message structure, user message structure, and output contract.

## Files to Touch

- `src/llm/prompts/character-brainstormer-prompt.ts` (new)
- `prompts/character-brainstormer-prompt.md` (new)

## Out of Scope

- JSON schema (CHABRA-002)
- Generation orchestration (CHABRA-004)
- Route handler (CHABRA-005)
- Any modification to existing prompt builders or shared sections
- Content policy text changes
- Shared section builder modifications (use existing APIs as-is)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `buildCharacterBrainstormerMessages()` returns exactly 2 messages (system + user) with role `'system'` and `'user'`
2. Unit test: system message contains content policy text
3. Unit test: system message contains narrative theory technique keywords ("CAUSAL CHAIN", "PRESSURE REVEAL", "SPECIFIC WOUND", etc.)
4. Unit test: user message includes concept and kernel sections when provided
5. Unit test: user message includes worldbuilding section when `decomposedWorld` is provided
6. Unit test: user message includes existing characters block when `existingCharacterNames` is non-empty
7. Unit test: user message includes user notes block when `userNotes` is non-empty
8. Unit test: user message omits worldbuilding section when both `decomposedWorld` and `rawWorldbuilding` are null
9. Unit test: user message omits existing characters block when `existingCharacterNames` is empty
10. `npm run typecheck` passes
11. `npm run lint` passes
12. Existing suite: `npm test` — no regressions

### Invariants

1. System message always contains the content policy
2. System message always contains the diagnostic uniqueness test mandate
3. User message always contains concept and kernel sections
4. No mutation of the input `CharacterBrainstormerContext`
5. The prompt builder does NOT make LLM calls — it only constructs messages

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/character-brainstormer-prompt.test.ts` — message construction, conditional sections, content verification

### Commands

1. `npm run test:unit -- --testPathPattern="character-brainstormer-prompt"` — targeted test
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` — full suite
