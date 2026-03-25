# CONPACPIPIMP-009: Rewrite Evaluator prompt with anchored rubric for 10 dimensions

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CONPACPIPIMP-008 (score dimensions and redundancyCluster must exist in schema/model)

## Problem

The evaluator prompt's rubric needs a full rewrite to cover the 10 scoring dimensions (replacing the old 8), include anchored exemplars for each score level (0, 3, 5), instruct on `redundancyCluster` usage, and instruct on `tasteAlignment` cross-referencing against the taste profile.

## Assumption Reassessment (2026-03-25)

1. `src/llm/prompts/content-evaluator-prompt.ts` builds the evaluator system prompt with scoring rubric — confirmed.
2. `prompts/content-evaluator-prompt.md` is the human-readable prompt doc — confirmed.
3. The prompt currently describes the 8 old scoring dimensions — confirmed; full rewrite needed.

## Architecture Check

1. Prompt-only change — no model or schema modifications (those are in CONPACPIPIMP-008).
2. The rubric must be comprehensive but not bloated — anchored at 0/3/5 levels only.

## What to Change

### 1. Evaluator prompt builder — full rubric rewrite

Replace the existing scoring rubric with anchored exemplars for all 10 dimensions:

| Dimension | 0 | 3 | 5 |
|-----------|---|---|---|
| `imageCharge` | abstract/generic, no visual | one clear image, competent but not arresting | searing, specific, instantly unforgettable |
| `humanAche` | no human stake inside the weirdness | recognizable emotion, but conventional | gut-level resonance, makes you wince or ache |
| `socialLoadBearing` | isolated gimmick, no social machinery | implies some social consequence | reshapes institutions, incentives, or power structures |
| `branchingPressure` | no dilemma, player has nothing to decide | one clear choice point | every option costs something real, multiple pressure vectors |
| `surfaceFreshness` | stock genre imagery, seen a hundred times | recognizable but with a distinctive twist | never-seen-before surface, can't be mistaken for anything else |
| `deepOriginality` | standard narrative formula underneath | familiar structure with one unusual element | structurally unprecedented, the pattern itself is the invention |
| `sceneBurst` | one-note, abstract, implies nothing concrete | 2-3 distinct scenes visible | rich with implied moments, 5+ scenes practically write themselves |
| `structuralIrony` | straightforward, no contradiction | mild irony or tension | the solution is the problem, the cure is the disease |
| `tasteAlignment` | no connection to the taste profile | plausible match but could fit many profiles | feels tailor-made — instantiates deep patterns, engagement modes, and value tensions from this specific profile |
| `causalSpecificity` | too abstract or decorative to build a story from | workable with effort, mechanisms present but vague | mechanisms so specific they practically generate scenes and choices on their own |

### 2. `tasteAlignment` scoring instructions

Add: "When scoring tasteAlignment, cross-reference the taste profile's deepPatterns, engagementModes, valueTensions, collisionPatterns, and sceneAppetites."

### 3. `redundancyCluster` instructions

Add: "If two packets cover essentially the same territory — similar anomaly, similar social engine, similar emotional core — mark the weaker one with the contentId of the stronger one in redundancyCluster. If the packet is sufficiently distinct, set redundancyCluster to null."

### 4. Remove old dimension references

Remove all mentions of `antiGenericity` and `conceptUtility` from prompt text.

### 5. Prompt documentation

Update `prompts/content-evaluator-prompt.md` — new JSON response shape, full rubric, redundancyCluster notes.

### 6. Ontology documentation

Add clarifying comments to `prompts/content-evaluator-prompt.md` about the humanAnchors/humanAnchor/humanAche and choicePressure/branchingPressure distinctions as specified in the pipeline-level ontology documentation section of the spec.

## Files to Touch

- `src/llm/prompts/content-evaluator-prompt.ts` (modify)
- `prompts/content-evaluator-prompt.md` (modify)

## Out of Scope

- Model/interface changes (CONPACPIPIMP-008)
- Schema changes (CONPACPIPIMP-008)
- Response transformer changes (CONPACPIPIMP-008)
- Persistence upcaster (CONPACPIPIMP-008)
- UI changes (CONPACPIPIMP-010)
- Other pipeline stage prompts

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: Evaluator prompt string contains all 10 dimension names: `imageCharge`, `humanAche`, `socialLoadBearing`, `branchingPressure`, `surfaceFreshness`, `deepOriginality`, `sceneBurst`, `structuralIrony`, `tasteAlignment`, `causalSpecificity`
2. Unit test: Evaluator prompt string does NOT contain `antiGenericity` or `conceptUtility`
3. Unit test: Evaluator prompt string contains `redundancyCluster` guidance
4. Unit test: Evaluator prompt string contains `tasteAlignment` cross-referencing instruction (e.g., "deepPatterns", "engagementModes")
5. Existing suite: `npm test` — no regressions

### Invariants

1. Prompt includes anchored rubric with 0/3/5 exemplars for each dimension
2. Prompt doc in `prompts/` matches the actual prompt builder output structure
3. Ontology documentation clarifies humanAnchors vs humanAnchor vs humanAche distinctions

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-evaluator.test.ts` — add prompt string assertions for all 10 dimensions, redundancyCluster, and absence of old dimensions

### Commands

1. `npm run test:unit -- --testPathPattern="content-evaluator"`
2. `npm run typecheck && npm run lint && npm test`
