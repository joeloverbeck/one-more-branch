# CHARFMT-002: Add cross-consumer contract tests for standalone character summaries

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: `archive/tickets/CHATDECAUD-001-chat-decomposition-audit-and-fix.md`, `tickets/CHARFMT-001-unify-standalone-character-prompt-formatters.md`

## Problem

The repository currently verifies standalone character formatting mostly through per-prompt assertions. That catches local regressions, but it does not enforce the higher-level contract that multiple prompt consumers must remain aligned on:

- identity summaries stay minimal
- psychology summaries include the intended structured fields
- shared standalone summaries expose the expected shared profile
- `rawDescription` never leaks into chat prompts

Without a cross-consumer contract test seam, formatter drift can reappear even if individual prompt tests remain superficially green.

## Assumption Reassessment (2026-03-28)

1. Current coverage exists, but it is fragmented across prompt-specific tests such as chat scene, chat character, chat planner, and the newly added standalone formatter test — CONFIRMED.
2. There is no single test file that asserts the summary contract across detail levels and consumers from one canonical fixture — CONFIRMED.
3. The `CHATDECAUD-001` bug was an architectural drift bug, so a direct contract-level test seam would have been the most robust guardrail — CONFIRMED by the nature of the failure.
4. If `CHARFMT-001` centralizes renderer ownership, contract tests can then validate behavior at the shared seam and at a few representative consumers without duplicating full-field assertions everywhere — CONFIRMED.

## Architecture Check

1. Contract tests are more robust than scattered incidental assertions because they lock the architectural invariants instead of only checking nearby strings in isolated prompts.
2. This is cleaner than copying large field-by-field expectations into every prompt test. One canonical fixture and one contract matrix reduce duplication while making regressions easier to diagnose.
3. No backwards-compatibility shims or aliasing are needed. This is purely a test architecture improvement around the current prompt contract.

## What to Change

### 1. Add a canonical standalone character formatter contract test

Create a focused test seam that defines one representative `StandaloneDecomposedCharacter` fixture with all relevant structured fields populated and then verifies:

- identity output contains only the identity contract
- psychology output contains the psychology contract
- standalone/shared output contains the expected shared profile
- `rawDescription` is absent where forbidden

### 2. Convert prompt tests to rely on contract-level assertions where appropriate

Keep prompt tests that verify section placement and prompt-specific assembly, but stop repeating large field matrices if the same behavior is already asserted centrally.

The test architecture should separate:

- shared summary contract assertions
- prompt-specific section wiring assertions

### 3. Cover representative consumers beyond chat

Ensure at least one non-chat consumer using the shared standalone summary path is covered, so formatter changes cannot silently break downstream prompt builders outside the chat stack.

## Files to Touch

- `test/unit/models/standalone-decomposed-character.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` (modify)
- Additional relevant consumer tests under `test/unit/llm/prompts/` or `test/unit/llm/` (modify or add)

## Out of Scope

- Refactoring formatter production code beyond what testability requires
- Changing prompt wording or prompt-stage responsibilities
- Expanding the `StandaloneDecomposedCharacter` schema

## Acceptance Criteria

### Tests That Must Pass

1. A canonical contract test asserts the summary behavior for each supported detail level from one fully populated fixture.
2. Prompt tests focus on consumer wiring and section assembly rather than re-owning the entire summary-field matrix.
3. At least one non-chat consumer of the shared standalone summary is covered.
4. Existing suite: `npm test`

### Invariants

1. Summary-contract regressions should fail in one obvious canonical test location.
2. Prompt tests should verify composition, not become the only place where field ownership is specified.

## Test Plan

### New/Modified Tests

1. `test/unit/models/standalone-decomposed-character.test.ts` — expand into the canonical contract matrix for supported detail levels.
2. `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts` — keep a light consumer assertion that the identity summary is wired into the expected section.
3. `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` — keep a light consumer assertion that the psychology summary is wired into the prompt and still excludes `rawDescription`.
4. `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` — keep a light consumer assertion that the shared standalone summary is wired into planner prompts.
5. One non-chat consumer test, such as `test/unit/llm/prompts/spine-foundation-prompt.test.ts` or a new focused test — verify a representative non-chat consumer still receives the shared standalone summary contract.

### Commands

1. `npm run test:unit -- --runInBand test/unit/models/standalone-decomposed-character.test.ts test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
