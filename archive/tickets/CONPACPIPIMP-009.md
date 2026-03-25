# CONPACPIPIMP-009: Rewrite Evaluator prompt with anchored rubric for 10 dimensions

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CONPACPIPIMP-008 (score dimensions and redundancyCluster must exist in schema/model)

## Problem

The evaluator prompt's rubric needs a full rewrite to cover the 10 scoring dimensions (replacing the old 8), include anchored exemplars for each score level (0, 3, 5), instruct on `redundancyCluster` usage, and instruct on `tasteAlignment` cross-referencing against the taste profile.

## Assumption Reassessment (2026-03-25)

1. `src/llm/prompts/content-evaluator-prompt.ts` builds the evaluator system prompt with scoring rubric — confirmed.
2. `prompts/content-evaluator-prompt.md` is the human-readable prompt doc — confirmed.
3. The evaluator code path already uses the 10-dimension model (`imageCharge`, `humanAche`, `socialLoadBearing`, `branchingPressure`, `surfaceFreshness`, `deepOriginality`, `sceneBurst`, `structuralIrony`, `tasteAlignment`, `causalSpecificity`) plus `redundancyCluster` — confirmed in prompt/tests/schema.
4. The actual gap is prompt calibration and documentation fidelity, not schema/model migration. The current prompt only provides compressed 0/5-style guidance, does not anchor the middle score explicitly, and does not yet spell out the stronger `tasteAlignment` cross-reference and ontology notes requested by the spec.
5. Existing unit coverage validates parser/schema behavior for the 10-dimension contract, but prompt-string coverage is too shallow for the rubric/doc-sync requirements in this ticket.

## Architecture Check

1. This remains a prompt-and-doc-focused ticket. The data contract work from CONPACPIPIMP-008 is already present, so duplicating model/schema churn here would be architectural noise.
2. A targeted prompt rewrite is more beneficial than broader architectural change here: it improves evaluator calibration without introducing new indirection, aliasing, or compatibility layers.
3. The rubric must stay explicit but compact. Anchoring only 0/3/5 is the right level of specificity; anything more would bloat the prompt without improving the contract.
4. Prompt documentation must be kept in sync with the implementation because this repo treats `prompts/*.md` as the human-readable contract for stage ownership and ontology distinctions.

## What to Change

### 1. Evaluator prompt builder — targeted rubric expansion

Replace the current compressed rubric text with anchored exemplars for all 10 dimensions:

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

Ensure the evaluator prompt and doc contain no lingering mentions of `antiGenericity` or `conceptUtility`.

### 5. Prompt documentation

Update `prompts/content-evaluator-prompt.md` so it matches the implemented prompt contract: anchored rubric, `tasteAlignment` cross-reference guidance, `redundancyCluster` notes, and the current JSON response shape.

### 6. Ontology documentation

Add clarifying comments to `prompts/content-evaluator-prompt.md` about the humanAnchors/humanAnchor/humanAche and choicePressure/branchingPressure distinctions as specified in the pipeline-level ontology documentation section of the spec.

### 7. Prompt coverage tests

Strengthen evaluator prompt tests so this ticket locks in the rubric contract instead of relying on manual inspection.

## Files to Touch

- `src/llm/prompts/content-evaluator-prompt.ts` (modify)
- `prompts/content-evaluator-prompt.md` (modify)

## Out of Scope

- Model/interface changes (already handled by CONPACPIPIMP-008)
- Schema changes unless a prompt/doc discrepancy exposes a genuine contract bug
- Response transformer changes unless tests prove the prompt contract and parser contract drifted
- Persistence changes or upcasters
- UI changes (CONPACPIPIMP-010)
- Other pipeline stage prompts

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: Evaluator prompt string contains all 10 dimension names: `imageCharge`, `humanAche`, `socialLoadBearing`, `branchingPressure`, `surfaceFreshness`, `deepOriginality`, `sceneBurst`, `structuralIrony`, `tasteAlignment`, `causalSpecificity`
2. Unit test: Evaluator prompt string does NOT contain `antiGenericity` or `conceptUtility`
3. Unit test: Evaluator prompt string contains `redundancyCluster` guidance
4. Unit test: Evaluator prompt string contains `tasteAlignment` cross-referencing instruction (e.g., "deepPatterns", "engagementModes")
5. Unit test: Evaluator prompt string contains explicit 0/3/5 anchors for the rubric, including representative phrases for at least `humanAche`, `branchingPressure`, and `tasteAlignment`
6. Prompt doc reflects the same score dimensions and ontology distinctions as the implemented prompt
7. Existing suite: relevant evaluator tests plus full repo verification (`typecheck`, `lint`, `npm test`) — no regressions

### Invariants

1. Prompt includes anchored rubric with 0/3/5 exemplars for each dimension
2. Prompt doc in `prompts/` matches the actual prompt builder output structure
3. Ontology documentation clarifies humanAnchors vs humanAnchor vs humanAche distinctions
4. No new aliases, fallback fields, or backwards-compatibility shims are introduced for evaluator terminology

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-evaluator.test.ts` — strengthen prompt string assertions for all 10 dimensions, anchored 0/3/5 rubric phrases, redundancyCluster guidance, taste profile cross-reference guidance, and absence of old dimensions

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/content-evaluator.test.ts --coverage=false`
2. `npm run typecheck && npm run lint && npm test`

## Outcome

- Completed on 2026-03-25.
- Updated the evaluator prompt with explicit 0/3/5 anchors for all 10 score dimensions, stronger `tasteAlignment` cross-reference guidance, and clearer `redundancyCluster` instructions.
- Updated `prompts/content-evaluator-prompt.md` to match the implemented prompt contract and added the requested ontology notes.
- Strengthened `test/unit/llm/content-evaluator.test.ts` so the rubric contract, overlap guidance, taste-profile cross-reference, and removal of old dimension names are asserted directly.
- Narrowed the actual implementation versus the original ticket wording: no schema/model/parser changes were needed because the 10-dimension evaluator contract from CONPACPIPIMP-008 was already in place.
- Verification: `npm run test:unit -- --runTestsByPath test/unit/llm/content-evaluator.test.ts --coverage=false`, `npm run typecheck`, `npm run lint`, and `npm test` all passed.
