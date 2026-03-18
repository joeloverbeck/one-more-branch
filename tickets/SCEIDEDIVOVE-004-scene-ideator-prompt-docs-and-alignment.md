# SCEIDEDIVOVE-004: Bring scene ideator prompt docs into the prompt-doc alignment contract

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: `tickets/SCEIDEDIVOVE-003-scene-ideator-prompt-slate-instructions.md`

## Problem

`prompts/scene-ideator-prompt.md` still documents the old 3-option contract, and `test/unit/llm/prompt-doc-alignment.test.ts` does not include the scene ideator at all. That leaves prompt-contract drift undetected.

## Assumption Reassessment (2026-03-18)

1. `prompts/scene-ideator-prompt.md` explicitly says the ideator generates exactly 3 options and that the parser rejects any count other than 3.
2. `test/unit/llm/prompt-doc-alignment.test.ts` currently omits the scene ideator from `PROMPT_DOC_CONTRACTS`.
3. Repo guidance requires prompt docs to be updated in the same pass when prompt ownership, scope, or schema changes.

## Architecture Check

1. The scene ideator should use the same doc/source alignment enforcement already used for other prompt stages instead of relying on manual discipline.
2. This ticket is intentionally documentation-only so prompt behavior changes can be reviewed separately from prose alignment.

## What to Change

### 1. Update `prompts/scene-ideator-prompt.md`

Revise the document so it matches the new production contract:

- shared count source and default 5-option slate
- lane taxonomy and `diversityLane`
- `IDEATION SLATE` section in the user prompt
- stronger diversity rules and parser/schema validation summary

Remove stale “exactly 3” references.

### 2. Add the prompt to prompt-doc alignment coverage

Update `test/unit/llm/prompt-doc-alignment.test.ts` so the scene ideator is part of the enforced doc/source mapping set.

### 3. Sweep related prompt docs for stale scene-ideator ownership statements

If any prompt markdown references the old scene-ideator contract, update those references in the same pass.

## Files to Touch

- `prompts/scene-ideator-prompt.md` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify)
- `prompts/*.md` (modify only if a targeted grep finds stale scene-ideator count/ownership references)

## Out of Scope

- Source-code prompt generation changes
- Parser/schema implementation work
- Client UI changes
- Non-scene-ideator prompt docs with no relevant stale references

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/prompt-doc-alignment.test.ts` verifies `sceneIdeator` is included in `PROMPT_DOC_CONTRACTS`.
2. `test/unit/llm/prompt-doc-alignment.test.ts` verifies `prompts/scene-ideator-prompt.md` contains the correct `- Source:` anchor.
3. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/prompt-doc-alignment.test.ts`

### Invariants

1. Prompt markdown must describe the same ownership, field set, and count contract as production source after ticket 003 lands.
2. No prompt doc may retain stale “exactly 3 options” statements for the scene ideator once this ticket is complete.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompt-doc-alignment.test.ts` — add the scene ideator doc/source pair to the enforced contract list.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/prompt-doc-alignment.test.ts`
2. `rg -n \"scene ideator|scene-ideator|exactly 3\" prompts -S`

