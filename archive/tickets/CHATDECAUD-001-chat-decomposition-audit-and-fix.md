# CHATDECAUD-001: Audit and fix character decomposition usage in chat prompts

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None

## Problem

Chat LLM prompt stages misuse character decomposition data in two ways:

1. **`rawDescription` leaked into prompts**: `formatCharacterIdentitySummary()` and `formatCharacterPsychologySummary()` in `chat-context-prompt-sections.ts` include `Description: ${character.rawDescription}` — the ~50KB raw narrative text that was the INPUT to the decomposition process. This is the opposite of using the decomposition: it wastes tokens massively and provides unstructured redundant data. The project-wide principle is that `rawDescription` is never read by LLM stages (only the structured fields matter).

2. **Deep psychology fields missing from `'full'` formatter**: The `formatCharacterPsychologySummary()` function (used by the character context stage for both target and interlocutor) omits 11 properties that the planner's `formatStandaloneCharacterSummary()` includes. The character context stage synthesizes the character's psychological state for the conversation but doesn't receive the raw psychology data that would inform it.

3. **`stressVariants` and `focalizationFilter` missing everywhere**: No chat stage uses these properties despite their direct relevance to in-character conversation (how the character behaves under threat, in intimacy, when lying, when ashamed; what they notice first, systematically miss, misread).

## Assumption Reassessment (2026-03-28)

1. `rawDescription` is included on lines 18 and 27 of `src/llm/prompts/chat/chat-context-prompt-sections.ts` — CONFIRMED by direct code read.
2. `formatCharacterPsychologySummary()` omits: stakes, pressurePoint, personalDilemmas, emotionSalience, moralLine, worstFear, formativeWound, misbelief, escalationLadder, sociology, stressVariants, focalizationFilter — CONFIRMED by comparing function body against `StandaloneDecomposedCharacter` interface.
3. `formatStandaloneCharacterSummary()` in `standalone-decomposed-character.ts` includes most fields but also omits stressVariants and focalizationFilter — CONFIRMED.
4. The relevant chat prompt coverage already lives in `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts`, `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts`, and `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` — CONFIRMED. The test files originally proposed in this ticket do not exist and should not be created unless existing coverage proves insufficient.
5. `formatStandaloneCharacterSummary()` is reused outside chat prompts (for example `src/llm/prompts/character-contextualizer-prompt.ts`, `src/llm/prompts/spine-foundation-prompt.ts`, and `src/llm/spine-generator.ts`) — CONFIRMED. Adding missing fields there is therefore an intentional shared formatter improvement, not a planner-only change.
6. Writer, state updater, and summarizer stages do not reference standalone character decomposition directly — CONFIRMED. They rely on chatBible, turnPlan, and speechFingerprint.

## Architecture Check

1. Removing `rawDescription` and filling property gaps in existing formatter functions is a clean, localized change — no new abstractions, no new files, no API changes.
2. No backwards-compatibility aliasing or shims needed. The formatters are internal to the chat prompt system.
3. There is real formatter duplication between `formatCharacterPsychologySummary()` and `formatStandaloneCharacterSummary()`, which is why these field sets drifted apart. For this ticket, the most robust change is still a surgical fix plus stronger tests. A larger formatter unification would be a separate refactor ticket, not part of this bugfix.

## What to Change

### 1. Remove `rawDescription` from both formatters in `chat-context-prompt-sections.ts`

- `formatCharacterIdentitySummary()` (line 18): Remove `Description: ${contextCharacter.rawDescription}` line.
- `formatCharacterPsychologySummary()` (line 27): Remove `Description: ${character.rawDescription}` line.

### 2. Fill missing deep-psychology fields in `formatCharacterPsychologySummary()`

Add conditional inclusion (matching the pattern already used for optional fields like `falseBeliefs`) for:
- `stakes` — what the character stands to lose
- `pressurePoint` — the specific unbearable vulnerability
- `personalDilemmas` — active moral/practical dilemmas
- `emotionSalience` — emotional sensitivity profile
- `moralLine` — what the character will not cross
- `worstFear` — deepest fear
- `formativeWound` — defining past trauma
- `misbelief` — false self-narrative
- `escalationLadder` — how the character escalates under pressure
- `sociology` — social context and class markers
- `stressVariants` — behavioral shifts under specific emotional conditions (underThreat, inIntimacy, whenLying, whenAshamed, whenWinning)
- `focalizationFilter` — perceptual biases (noticesFirst, systematicallyMisses, misreadsAs)

### 3. Add `stressVariants` and `focalizationFilter` to `formatStandaloneCharacterSummary()` in `standalone-decomposed-character.ts`

The chat planner receives this formatter's output and should have access to stress-response patterns and perceptual biases when planning in-character turns. Because this formatter is shared, the same improved structured summary will also flow to other prompt builders that intentionally consume `formatStandaloneCharacterSummary()`.

### 4. Evaluate whether `formatCharacterIdentitySummary()` needs additional fields

The `'identity'` level is used by the scene context stage, which explicitly says "Do not analyze character psychology." Current fields after rawDescription removal: name, coreTraits, appearance. This is appropriate for a scene-focused stage — no additional fields needed.

## Files to Touch

- `src/llm/prompts/chat/chat-context-prompt-sections.ts` (modify)
- `src/models/standalone-decomposed-character.ts` (modify)

## Out of Scope

- Changing which detail level each stage requests (the `'identity'` vs `'full'` vs `'legacyFull'` routing)
- Modifying the writer, state updater, or summarizer prompts (they don't use character decomposition directly)
- Changing the `StandaloneDecomposedCharacter` interface itself
- Adding new properties to the character decomposition model
- Modifying the interlocutor vs target asymmetry in planner/writer stages (planner intentionally receives target only)

## Acceptance Criteria

### Tests That Must Pass

1. No chat prompt builder covered by the existing chat prompt tests includes `rawDescription` in its output
2. `formatCharacterPsychologySummary()` output includes all non-metadata properties from `StandaloneDecomposedCharacter` (except `id`, `rawDescription`, `createdAt`, `speechFingerprint`)
3. `formatStandaloneCharacterSummary()` output includes `stressVariants` and `focalizationFilter` when present
4. `formatCharacterIdentitySummary()` output remains identity-focused and does NOT include `rawDescription`
5. Existing relevant chat prompt tests pass, plus any new formatter-level coverage added for the invariant
6. Repository verification required by finalization: lint, typecheck, and full test suite pass before archiving

### Invariants

1. `rawDescription` must never appear in any chat LLM prompt output
2. All structured decomposition properties relevant to character psychology must be available to the character context synthesis stage

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts` — verify identity-level chat context excludes `rawDescription` while staying scene-focused
2. `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` — verify psychology-level chat context includes the missing structured fields and excludes `rawDescription`
3. `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` — verify planner-visible standalone summaries include stress variants and focalization filter when present
4. `test/unit/models/standalone-decomposed-character.test.ts` — new focused formatter test for `formatStandaloneCharacterSummary()` so shared formatter behavior is covered directly

### Commands

1. `npm run test:unit -- --runInBand test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts test/unit/models/standalone-decomposed-character.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

## Outcome

- Completion date: 2026-03-28
- Actual changes:
  - Removed `rawDescription` from the identity and psychology chat decomposition formatters in `src/llm/prompts/chat/chat-context-prompt-sections.ts`
  - Added the missing structured psychology fields to the chat psychology formatter, including `stakes`, `pressurePoint`, `personalDilemmas`, `emotionSalience`, `moralLine`, `worstFear`, `formativeWound`, `misbelief`, `escalationLadder`, `sociology`, `stressVariants`, and `focalizationFilter`
  - Added `stressVariants` and `focalizationFilter` to `formatStandaloneCharacterSummary()` in `src/models/standalone-decomposed-character.ts`
  - Strengthened the existing chat prompt tests and added a focused standalone formatter test instead of introducing the originally proposed nonexistent chat-context-sections test file
  - Updated a stale stage-model test discovered during full-suite verification so the repository-wide `npm test` pass reflects the current LLM stage catalog
- Deviations from original plan:
  - The ticket scope was corrected before implementation because the originally listed prompt test files did not exist
  - The shared standalone formatter change was treated as an intentional multi-consumer improvement, not a planner-only change, because that formatter is reused outside chat prompts
- Verification results:
  - `npm run test:unit -- --runInBand test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts test/unit/models/standalone-decomposed-character.test.ts`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
