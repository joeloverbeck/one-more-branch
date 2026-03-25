# CONPACPIPIMP-005: Strengthen Sparkstormer prompt guidance and portfolio constraints

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CONPACPIPIMP-003 (PLACE/SECRET must exist), CONPACPIPIMP-004 (ContentSpark must have new fields)

## Problem

The Sparkstormer stage already requires `playerRole`, `want`, `counterforce`, and `deepPatternRef`, but the prompt guidance is still thinner than the spec intends and it does not yet include the portfolio-level anti-collapse constraints. That leaves generation quality overly dependent on the model improvising diversity rather than being explicitly steered toward it.

## Assumption Reassessment (2026-03-25)

1. `src/llm/prompts/content-sparkstormer-prompt.ts` builds the Sparkstormer prompt — confirmed.
2. `prompts/content-sparkstormer-prompt.md` is the human-readable prompt doc — confirmed.
3. `src/models/content-generation-contracts.ts` already includes `playerRole`, `want`, `counterforce`, and `deepPatternRef` on `ContentSpark` — confirmed.
4. `src/llm/schemas/content-sparkstormer-schema.ts` already requires those 4 fields and already exposes `PLACE` and `SECRET` through `CONTENT_KIND_VALUES` — confirmed.
5. `test/unit/llm/content-sparkstormer.test.ts` already covers the presence of the 4 fields in the prompt contract, parser validation for them, and schema requirements — confirmed.
6. The current prompt text uses short field bullets, but it does not yet include the spec’s portfolio constraints for kind cap, taste stretch, deep-pattern spread, or novelty diversity — confirmed.
7. The prompt doc already reflects the expanded JSON shape, but it does not yet document the portfolio constraints or explain them clearly enough as part of the contract — confirmed.

## Architecture Check

1. This should remain a prompt-and-doc change. The model interface, schema, and parser already express the contract correctly.
2. Portfolio constraints are the right layer for this behavior. They shape batch diversity without hard-coding brittle server-side validation rules for a creative generation step.
3. The main architectural value is reducing mode collapse while keeping the spark schema lean. Adding per-spark novelty fields would be worse architecture here because it bloats the contract for guidance that is inherently portfolio-level.

## What to Change

### 1. Sparkstormer prompt builder

Strengthen the existing field guidance so the 4 agency/taste-alignment fields are described with the spec’s intended specificity:
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

Update `prompts/content-sparkstormer-prompt.md` to reflect the strengthened field guidance and the portfolio constraint notes. The JSON response shape is already correct; this ticket should not rewrite it unnecessarily.

## Files to Touch

- `src/llm/prompts/content-sparkstormer-prompt.ts` (modify)
- `prompts/content-sparkstormer-prompt.md` (modify)
- `test/unit/llm/content-sparkstormer.test.ts` (modify)

## Out of Scope

- Model/interface changes to `ContentSpark`
- Schema changes to `content-sparkstormer`
- ContentKind additions
- Response transformer changes
- Packeter or evaluator prompt changes

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: The built prompt string still contains `playerRole`, `want`, `counterforce`, and `deepPatternRef`
2. Unit test: The built prompt string contains kind-cap guidance (e.g. "No more than 4 sparks of the same contentKind")
3. Unit test: The built prompt string contains taste-stretch guidance
4. Unit test: The built prompt string contains deep-pattern diversity guidance
5. Unit test: The built prompt string contains novelty diversity guidance (`combinational`, `exploratory`, `transformational`)
6. Existing targeted Sparkstormer unit suite passes
7. `npm run typecheck`, `npm run lint`, and `npm test` pass

### Invariants

1. Prompt still includes the existing field contract and output shape
2. Prompt doc in `prompts/` matches the actual prompt builder output structure and guidance
3. No schema or parser changes are introduced for behavior that belongs at prompt level

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-sparkstormer.test.ts` — strengthen prompt assertions for portfolio constraints and richer guidance text

### Commands

1. `npm run test:unit -- --testPathPatterns="content-sparkstormer"`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completion date: 2026-03-25
- What changed:
  - Strengthened the Sparkstormer prompt’s field guidance for `playerRole`, `want`, `counterforce`, and `deepPatternRef`
  - Added prompt-level portfolio constraints for kind cap, taste stretch, deep-pattern spread, and novelty diversity
  - Updated the prompt markdown doc to match the actual builder and document why these constraints stay prompt-level
  - Extended `test/unit/llm/content-sparkstormer.test.ts` to lock the new diversity guidance into the prompt contract
- Deviations from original plan:
  - The ticket originally assumed the 4 Spark fields and expanded content-kind taxonomy were still missing; reassessment showed they were already implemented in model, schema, parser, prompt contract, and tests
  - The implementation therefore stayed narrower and cleaner than originally described: prompt/doc/test refinement only, with no schema or model changes
- Verification results:
  - `npm run test:unit -- --testPathPatterns="content-sparkstormer"` passed
  - `npm run typecheck` passed
  - `npm run lint` passed
  - `npm test` passed
