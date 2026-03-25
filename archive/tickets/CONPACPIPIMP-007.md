# CONPACPIPIMP-007: Reconcile Packeter and One-Shot prompt docs/tests with playerPosition and interactionVerbs guidance

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CONPACPIPIMP-006 (playerPosition must exist in schema/model)

## Problem

The original assumption for this ticket is outdated. The runtime Packeter and One-Shot prompt builders already use `playerPosition` and already instruct the LLM to avoid generic `interactionVerbs` unless the packet makes them unusually concrete. The real gap is weaker than originally stated:

1. the ticket still assumes prompt-builder work is missing when that work is already present
2. prompt documentation is not the authoritative runtime source and has drifted in wording/shape from the actual builders
3. existing tests verify `playerPosition` replaced `viewpointPressure`, but they do not fully lock in the stronger specificity guidance this ticket cares about

## Assumption Reassessment (2026-03-25)

1. `src/llm/prompts/content-packeter-prompt.ts` builds the packeter prompt contract — confirmed.
2. `src/llm/prompts/content-one-shot-prompt.ts` builds the one-shot prompt contract — confirmed.
3. Both runtime prompt builders already reference `playerPosition` and do not reference `viewpointPressure` — confirmed.
4. Both runtime prompt builders already contain generic-verb rejection guidance for `interactionVerbs` — confirmed.
5. `prompts/content-packeter-prompt.md` and `prompts/content-one-shot-prompt.md` exist, but their wording is a partial summary rather than a tight reflection of the actual runtime contract — confirmed.
6. `test/unit/llm/content-packeter.test.ts` and `test/unit/llm/content-one-shot.test.ts` exist and already cover the `playerPosition` rename at a basic level — confirmed.
7. `test/unit/llm/prompt-doc-alignment.test.ts` does not currently include these two prompt docs in its source/doc mapping registry, so doc drift for this area is less protected than it should be — confirmed.

## Architecture Check

1. No model, schema, persistence, or parser work belongs here. Those concerns were handled elsewhere and are already reflected in code.
2. The runtime prompt builders are already on the cleaner architecture: `playerPosition` is the single canonical field, with no aliasing and no backward-compatibility wording in the prompt layer.
3. The durable architecture problem here is contract drift between prompt builders, prompt docs, and tests. The highest-value work is to tighten those contracts rather than re-edit already-correct prompt code.
4. Keeping Packeter and One-Shot together is still correct because they share the same packet contract and should be verified together.

## What to Change

### 1. Reassess prompt-builder changes before editing runtime text

- Do not rewrite prompt builders if the current runtime wording already satisfies the ticket intent.
- Only change runtime prompt text if inspection finds a concrete mismatch between:
  - the actual builder output
  - the intended packet contract from `specs/content-packets-pipeline-improvements.md`
  - the tests we want to lock in

### 2. Tighten prompt-builder tests

- Strengthen Packeter prompt tests to assert the prompt contract includes:
  - `playerPosition`
  - no `viewpointPressure`
  - the required-pressure wording for `playerPosition`
  - generic-verb rejection guidance for `interactionVerbs`
- Strengthen One-Shot prompt tests with the same assertions.

### 3. Reconcile prompt documentation to the runtime contract

- Update `prompts/content-packeter-prompt.md` so its documented system/user contract matches the live builder more closely, especially around:
  - mandatory `playerPosition`
  - explicit setup-field separation
  - story-specific/generic-verb rejection guidance for `interactionVerbs`
- Update `prompts/content-one-shot-prompt.md` with the same level of fidelity.
- Avoid pretending docs are code-generated if they are not; instead, document the actual contract clearly and test its anchoring.

### 4. Extend prompt-doc alignment coverage

- Add `contentPacketer` and `contentOneShot` to `test/unit/llm/prompt-doc-alignment.test.ts` so future drift between prompt sources and docs is caught sooner.

## Files to Touch

- `src/llm/prompts/content-packeter-prompt.ts` (modify only if real contract drift is found)
- `src/llm/prompts/content-one-shot-prompt.ts` (modify only if real contract drift is found)
- `prompts/content-packeter-prompt.md` (modify)
- `prompts/content-one-shot-prompt.md` (modify)
- `test/unit/llm/content-packeter.test.ts` (modify)
- `test/unit/llm/content-one-shot.test.ts` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify)

## Out of Scope

- Model/interface changes (CONPACPIPIMP-006)
- Schema changes (CONPACPIPIMP-006)
- Persistence upcaster (CONPACPIPIMP-006)
- Evaluator changes (CONPACPIPIMP-008, CONPACPIPIMP-009)
- Taste Distiller or Sparkstormer prompts
- Reworking the prompt system into generated docs/templates in this ticket

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: Packeter prompt string contains `playerPosition` and does not contain `viewpointPressure`
2. Unit test: Packeter prompt string contains the required `playerPosition` pressure/specificity guidance
3. Unit test: Packeter prompt string contains generic-verb rejection guidance for `interactionVerbs`
4. Unit test: One-shot prompt string contains `playerPosition` and does not contain `viewpointPressure`
5. Unit test: One-shot prompt string contains the required `playerPosition` pressure/specificity guidance
6. Unit test: One-shot prompt string contains generic-verb rejection guidance for `interactionVerbs`
7. Prompt doc alignment test includes both prompt docs in the source/doc registry
8. Relevant targeted suites pass

### Invariants

1. `playerPosition` remains the only canonical player-facing field in these prompt contracts
2. Prompt builders still include all unchanged packet fields
3. Prompt docs reflect the runtime contract closely enough to serve as accurate maintenance documentation
4. Tests guard the contract strongly enough that future prompt drift is obvious

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-packeter.test.ts` — strengthen prompt string assertions for `playerPosition` and generic-verb rejection guidance
2. `test/unit/llm/content-one-shot.test.ts` — strengthen prompt string assertions for `playerPosition` and generic-verb rejection guidance
3. `test/unit/llm/prompt-doc-alignment.test.ts` — add source/doc registry coverage for content packeter and content one-shot prompt docs

### Commands

1. `npm run test:unit -- --runInBand --testPathPatterns="content-packeter|content-one-shot|prompt-doc-alignment"`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completion date: 2026-03-25
- What actually changed:
  - Corrected the ticket scope after verifying the runtime Packeter and One-Shot prompt builders were already using `playerPosition` and already rejecting generic `interactionVerbs` unless made concrete.
  - Updated `prompts/content-packeter-prompt.md` and `prompts/content-one-shot-prompt.md` to reflect the live prompt contract more accurately, including the mandatory `playerPosition` guidance, setup-field separation, and generic-verb rejection language.
  - Fixed both prompt docs to reference the real model contract file: `src/models/content-generation-contracts.ts`.
  - Strengthened `test/unit/llm/content-packeter.test.ts` and `test/unit/llm/content-one-shot.test.ts` to assert the required `playerPosition` pressure wording and generic-verb rejection guidance.
  - Extended `test/unit/llm/prompt-doc-alignment.test.ts` to cover the content packeter and content one-shot prompt docs, plus doc assertions for `playerPosition` and `interactionVerbs` guidance.
- Deviations from original plan:
  - No runtime prompt-builder code changes were needed because the builder contract was already correct.
  - The valuable architectural fix was contract-hardening across docs and tests rather than rewriting prompt logic that already matched the intended architecture.
- Verification results:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed.
