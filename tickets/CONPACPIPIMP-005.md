# CONPACPIPIMP-005: Update Sparkstormer prompt with new field descriptions and portfolio constraints

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CONPACPIPIMP-003 (PLACE/SECRET must exist), CONPACPIPIMP-004 (ContentSpark must have new fields)

## Problem

The Sparkstormer prompt does not instruct the LLM to produce `playerRole`, `want`, `counterforce`, or `deepPatternRef`. It also lacks portfolio-level constraints that prevent mode collapse (all sparks of the same kind, all referencing the same deep pattern, no novelty diversity).

## Assumption Reassessment (2026-03-25)

1. `src/llm/prompts/content-sparkstormer-prompt.ts` builds the system prompt — confirmed.
2. `prompts/content-sparkstormer-prompt.md` is the human-readable prompt doc — confirmed.
3. The prompt currently describes the 5 existing spark fields — confirmed; must add descriptions for the 4 new fields.

## Architecture Check

1. Prompt-only change — no model or schema modifications.
2. Portfolio constraints are prompt-level guidance only, not enforced in schema or validation.

## What to Change

### 1. Sparkstormer prompt builder

Add field descriptions for the 4 new fields:
- `playerRole`: "Every spark must imply a protagonist position. Who would the player be in this world? Not a generic hero — a specific person with a specific relationship to the spark's tension."
- `want`: "What does the player-as-this-character urgently want? This is the narrative engine — without desire, there is no story."
- `counterforce`: "What opposes the want? Name the specific force — person, institution, system, or condition — that makes the desire difficult or dangerous to pursue."
- `deepPatternRef`: "Each spark must be grounded in one of the taste profile's deep patterns. Name the deep pattern this spark instantiates. This prevents random-cool-idea drift."

Add portfolio constraints:
1. **Kind cap**: "No more than 4 sparks of the same contentKind. Spread across the full taxonomy."
2. **Taste stretch**: "20-30% of sparks should be 'taste stretch' — ideas that fit the user's deep patterns but extend them into unfamiliar territory."
3. **Deep pattern diversity**: "Spread sparks across multiple deepPatterns from the taste profile. Do not let all sparks reference the same deep pattern."
4. **Novelty diversity**: "Include a mix of novelty types: combinational (novel combinations of existing elements), exploratory (pushing within a conceptual space), and transformational (breaking a conceptual assumption entirely)."

### 2. Prompt documentation

Update `prompts/content-sparkstormer-prompt.md` to reflect the new JSON response shape and portfolio constraint notes.

## Files to Touch

- `src/llm/prompts/content-sparkstormer-prompt.ts` (modify)
- `prompts/content-sparkstormer-prompt.md` (modify)

## Out of Scope

- Model/interface changes (CONPACPIPIMP-004)
- Schema changes (CONPACPIPIMP-004)
- ContentKind additions (CONPACPIPIMP-003)
- Response transformer changes (CONPACPIPIMP-004)
- Packeter or evaluator prompt changes

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: The built prompt string contains "playerRole", "want", "counterforce", "deepPatternRef"
2. Unit test: The built prompt string contains portfolio constraint text (e.g., "No more than 4 sparks of the same contentKind")
3. Unit test: The built prompt string contains novelty diversity guidance (e.g., "combinational", "exploratory", "transformational")
4. Existing suite: `npm test` — no regressions

### Invariants

1. Prompt still includes all original field descriptions (no removals)
2. Prompt doc in `prompts/` matches the actual prompt builder output structure

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-sparkstormer.test.ts` — add assertions that prompt output contains new field names and portfolio constraint text

### Commands

1. `npm run test:unit -- --testPathPattern="content-sparkstormer"`
2. `npm run typecheck && npm run lint && npm test`
