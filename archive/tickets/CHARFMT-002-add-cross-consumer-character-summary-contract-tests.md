# CHARFMT-002: Add cross-consumer contract tests for standalone character summaries

**Status**: COMPLETED
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

1. The shared formatter seam already exists in `src/models/standalone-decomposed-character.ts` as `formatStandaloneCharacterPromptSummary()`, and chat, spine, and character-contextualizer prompts already route through it — CONFIRMED.
2. Current coverage exists, but it is still fragmented between one formatter unit test and multiple prompt-specific tests that each re-assert overlapping field details — CONFIRMED.
3. There is still no single canonical test matrix that owns the summary contract across all supported views from one fully populated fixture — CONFIRMED.
4. Representative non-chat consumer coverage already exists in `spine-foundation-prompt.test.ts` and `character-contextualizer-prompt.test.ts`; the remaining architectural gap is duplication, not absence of downstream coverage — CONFIRMED.

## Architecture Check

1. The current production architecture is already the right direction: one formatter owns the rendering contract, and prompt builders choose only which view they need. That is cleaner and more extensible than letting each consumer assemble its own summary.
2. The missing improvement is in test architecture. Contract tests are more robust than scattered incidental assertions because they lock the formatter invariants at the shared seam instead of only checking nearby strings inside individual prompts.
3. This is cleaner than copying large field-by-field expectations into every prompt test. One canonical fixture and one contract matrix reduce duplication while making regressions easier to diagnose.
4. No backwards-compatibility shims or aliasing are needed. If a formatter contract changes intentionally, consumers and tests should be updated directly.

## What to Change

### 1. Strengthen the canonical standalone character formatter contract test

Keep the existing shared formatter unit test as the single source of truth for the contract. Expand it into a focused canonical matrix that defines one representative `StandaloneDecomposedCharacter` fixture with all relevant structured fields populated and then verifies:

- identity output contains only the identity contract
- psychology output contains the psychology contract
- standalone/shared output contains the expected shared profile
- `rawDescription` is absent where forbidden

### 2. Convert prompt tests to rely on contract-level assertions where appropriate

Keep prompt tests that verify section placement, prompt-specific assembly, and correct view selection, but stop repeating large field matrices if the same behavior is already asserted centrally.

The test architecture should separate:

- shared summary contract assertions
- prompt-specific section wiring assertions

### 3. Cover representative consumers beyond chat

Retain at least one representative non-chat consumer using the shared standalone summary path so formatter changes cannot silently break downstream prompt builders outside the chat stack. Existing tests may be kept and slimmed rather than replaced.

## Files to Touch

- `test/unit/models/standalone-decomposed-character.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` (modify)
- `test/unit/llm/prompts/spine-foundation-prompt.test.ts` and/or `test/unit/llm/prompts/character-contextualizer-prompt.test.ts` (modify only if needed)

## Out of Scope

- Refactoring formatter production code beyond what testability requires
- Changing prompt wording or prompt-stage responsibilities
- Expanding the `StandaloneDecomposedCharacter` schema

## Acceptance Criteria

### Tests That Must Pass

1. A canonical contract test asserts the summary behavior for each supported detail level from one fully populated fixture.
2. Prompt tests focus on consumer wiring and section assembly rather than re-owning the entire summary-field matrix.
3. At least one non-chat consumer of the shared standalone summary remains covered.
4. Existing suite: `npm test`

### Invariants

1. Summary-contract regressions should fail in one obvious canonical test location.
2. Prompt tests should verify composition, not become the only place where field ownership is specified.

## Test Plan

### New/Modified Tests

1. `test/unit/models/standalone-decomposed-character.test.ts` — expand into the canonical contract matrix for supported detail levels.
2. `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts` — keep a light consumer assertion that the identity summary is wired into the expected section.
3. `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` — keep a light consumer assertion that the psychology summary view is wired into the prompt and still excludes `rawDescription`.
4. `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` — keep a light consumer assertion that the shared standalone summary view is wired into planner prompts.
5. One non-chat consumer test, such as `test/unit/llm/prompts/spine-foundation-prompt.test.ts` or `test/unit/llm/prompts/character-contextualizer-prompt.test.ts` — verify a representative non-chat consumer still receives the shared standalone summary contract without duplicating the full matrix.

### Commands

1. `npm run test:unit -- --runInBand test/unit/models/standalone-decomposed-character.test.ts test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts test/unit/llm/prompts/spine-foundation-prompt.test.ts test/unit/llm/prompts/character-contextualizer-prompt.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

## Outcome

- Completion date: 2026-03-28
- Actual changes:
  - Corrected the ticket scope to reflect the existing centralized formatter seam and the non-chat consumer coverage already present in the repo.
  - Expanded `test/unit/models/standalone-decomposed-character.test.ts` into the canonical contract owner for the three summary views.
  - Slimmed chat consumer tests so they assert view selection and prompt wiring instead of duplicating the full formatter field matrix.
  - Kept representative non-chat standalone-summary coverage and tightened the spine prompt assertion slightly.
- Deviations from original plan:
  - No production code changes were needed. The architecture was already correct at the formatter seam; the needed work was entirely test-architecture cleanup.
  - No new non-chat consumer test file was added because existing spine and character-contextualizer coverage already satisfied that requirement.
- Verification results:
  - `npm run test:unit -- --runInBand test/unit/models/standalone-decomposed-character.test.ts test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts test/unit/llm/prompts/spine-foundation-prompt.test.ts test/unit/llm/prompts/character-contextualizer-prompt.test.ts`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
