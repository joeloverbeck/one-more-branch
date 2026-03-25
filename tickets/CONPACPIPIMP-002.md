# CONPACPIPIMP-002: Update Taste Distiller prompt for new fields and surfaceDoNotRepeat softening

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CONPACPIPIMP-001 (TasteProfile interface must have the new fields)

## Problem

The Taste Distiller prompt does not instruct the LLM to produce `engagementModes`, `valueTensions`, or `deepPatterns`. Additionally, the `surfaceDoNotRepeat` rule is currently framed as absolute, but should be softened to a "soft penalty" to avoid accidentally killing deep patterns the user loves.

## Assumption Reassessment (2026-03-25)

1. `src/llm/prompts/content-taste-distiller-prompt.ts` builds the system prompt with RULES and OUTPUT REQUIREMENTS sections — confirmed.
2. `prompts/content-taste-distiller-prompt.md` is the human-readable prompt doc — confirmed.
3. No response transformer exists for the taste distiller — the schema output is parsed directly — confirmed via `content-taste-distiller-generation.ts` or equivalent.

## Architecture Check

1. Prompt-only change — no model or schema changes (those are in CONPACPIPIMP-001).
2. No backward-compatibility concerns — prompts are not persisted.

## What to Change

### 1. Taste Distiller prompt builder

In the RULES section, add:
- `surfaceDoNotRepeat` softening: "surfaceDoNotRepeat is a soft penalty, not a sacred blacklist. Avoiding superficial recycling is important, but an absolute ban can accidentally kill the very deep pattern the user loves."

In the OUTPUT REQUIREMENTS section, add field descriptions:
- `engagementModes` (3-5 items): "What kinds of agency does the user crave? How do they want to inhabit the story — as investigator, protector, transgressor, optimizer, expresser? Describe each mode as a concrete activity, not a label."
- `valueTensions` (3-6 items): "What ethical or thematic tensions recur across the exemplars? These are value collisions the user wants to inhabit, not plot elements. Express as 'X vs Y' pairs."
- `deepPatterns` (3-6 items): "What relational formulas repeat beneath the surface of the exemplars? These are patterns of transformation, revelation, or reversal — not genre tags or plot elements. Each should describe a structural movement: 'X becomes/reveals/forces Y.'"

### 2. Prompt documentation

Update `prompts/content-taste-distiller-prompt.md` to reflect the new JSON response shape and notes about the 3 new fields.

## Files to Touch

- `src/llm/prompts/content-taste-distiller-prompt.ts` (modify)
- `prompts/content-taste-distiller-prompt.md` (modify)

## Out of Scope

- Model/interface changes (CONPACPIPIMP-001)
- Schema changes (CONPACPIPIMP-001)
- Sparkstormer prompt changes (CONPACPIPIMP-005)
- Any other pipeline stage

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: The built prompt string contains the text "engagementModes", "valueTensions", "deepPatterns"
2. Unit test: The built prompt string contains the "soft penalty" guidance for surfaceDoNotRepeat
3. Existing suite: `npm test` — no regressions

### Invariants

1. Prompt still includes all original field descriptions (no removals)
2. Prompt doc in `prompts/` matches the actual prompt builder output structure

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-taste-distiller.test.ts` — add assertion that prompt output contains new field names and soft-penalty text

### Commands

1. `npm run test:unit -- --testPathPattern="content-taste-distiller"`
2. `npm run typecheck && npm run lint && npm test`
