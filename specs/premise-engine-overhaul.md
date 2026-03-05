# Premise Engine Overhaul — Narrative Theory Integration

**Status**: PENDING IMPLEMENTATION
**Date**: 2026-03-04
**Scope**: Kernel → Concept → Spine pipeline stages
**Backward Compatibility**: None required

---

## Context

The story generation pipelines produce narratively competent but generically "safe" premises. Four root problems:

1. **Kernels too abstract** — `dramaticThesis`/`antithesis` read like philosophy papers, not story seeds
2. **Concepts lack built-in irony** — `ironicTwist` exists but isn't scored or enforced as a first-class quality gate
3. **Everything feels like a variation** — evolution mutates form (conflict axis, stance) not substance (the core "what if")
4. **No visceral hook** — nothing in the system forces a premise to evoke a specific emotional reaction or generate vivid scenes on contact

Deep research into McKee, Weiland, Truby, Mazin, Vogler, Coyne, and Snyder reveals five missing theoretical pillars that top-tier premises (Back to the Future, The Matrix, Jurassic Park) all share:

- **McKee's Value Spectrum** (4-level value charge: positive → contrary → contradictory → negation of negation)
- **Weiland's Lie/Truth/Ghost** (protagonist believes a Lie, must learn a Truth, rooted in a Ghost wound)
- **Ironic Premise as quality gate** (built-in contradiction that makes the concept self-propelling)
- **Scene-Generative Power** (how many distinct vivid scenes a premise instantly evokes)
- **Want/Need Collision Point** (the explicit moment where pursuing the want blocks the need)

---

## Changes

### 1. StoryKernel Model Expansion

**File**: `src/models/story-kernel.ts`

Add to `StoryKernel` interface:
- `valueSpectrum`: McKee's 4-level value charge object:
  ```ts
  interface ValueSpectrum {
    positive: string;      // e.g. "Love"
    contrary: string;      // e.g. "Indifference"
    contradictory: string; // e.g. "Hate"
    negationOfNegation: string; // e.g. "Self-destructive obsession masked as love"
  }
  ```
- `moralArgument`: string — Truby's explicit moral claim the story makes (e.g. "Unchecked ambition destroys what it claims to protect")

Add new scoring dimensions to `KernelDimensionScores`:
- `ironicPotential`: number (1-5) — Does the thesis contain its own contradiction?
- `viscerality`: number (1-5) — Does reading this kernel evoke a gut reaction?

Also add to `KernelScoreEvidence`:
- `ironicPotential`: readonly string[]
- `viscerality`: readonly string[]

Update `KERNEL_SCORING_WEIGHTS` (rebalance to 100):
```
dramaticClarity: 15 (was 20)
thematicUniversality: 10 (was 15)
generativePotential: 20 (was 25)
conflictTension: 20 (was 25)
emotionalDepth: 10 (was 15)
ironicPotential: 15 (new)
viscerality: 10 (new)
```

Update `KERNEL_PASS_THRESHOLDS`:
```
ironicPotential: 3 (new)
viscerality: 3 (new)
```

Update:
- `isStoryKernel` type guard — validate `valueSpectrum` (object with 4 non-empty string fields) and `moralArgument` (non-empty string)
- `computeKernelOverallScore` — include new weighted dimensions
- `passesKernelThresholds` — include new threshold checks

### 2. Kernel Prompt Changes

**`src/llm/prompts/kernel-ideator-prompt.ts`**:
- Add instructions to generate `valueSpectrum` and `moralArgument`
- Add guidance: "For each kernel, think in terms of McKee's value spectrum: what is the positive value? What is the contrary (the absence)? What is the contradictory (the direct opposition)? What is the negation of negation (the worst form, disguised as the positive)?"
- Emphasize ironic premises: "The best kernels contain a built-in irony — the thesis inherently generates its own opposition"

**`src/llm/prompts/kernel-evaluator-prompt.ts`**:
- Add `ironicPotential` scoring rubric:
  - 0-1: No irony; thesis and antithesis are externally opposed
  - 2-3: Mild irony; some self-contradicting elements
  - 4-5: Deep irony; the thesis inherently generates its own opposition
- Add `viscerality` scoring rubric:
  - 0-1: Abstract and intellectual; no emotional charge
  - 2-3: Some emotional resonance but could be more vivid
  - 4-5: Immediate gut reaction; evokes fear, desire, outrage, or wonder on contact
- Update `formatWeights()` to include new dimensions

**`src/llm/prompts/kernel-evolver-prompt.ts`**:
- Add new mutation strategies:
  - `irony-injection`: Find the hidden contradiction in the thesis — how does pursuing the value at stake actually undermine it?
  - `fear-transplant`: Replace the opposing force with something the protagonist secretly fears about themselves
  - `moral-inversion`: Flip the moral argument to its dark mirror — what if the antithesis is actually correct?
  - `value-spectrum-deepening`: Push from contrary to negation-of-negation — find the worst disguised form of the value

### 3. Kernel Schema Changes

**`src/llm/schemas/kernel-ideator-schema.ts`**:
- Add `valueSpectrum` object (with `positive`, `contrary`, `contradictory`, `negationOfNegation` string fields) to `KERNEL_SCHEMA`
- Add `moralArgument` string to `KERNEL_SCHEMA`
- Update `required` array

**`src/llm/schemas/kernel-evaluator-schema.ts`**:
- Add `ironicPotential` and `viscerality` to `KERNEL_SCORE_SCHEMA` required/properties
- Add `ironicPotential` and `viscerality` to `KERNEL_SCORE_EVIDENCE_SCHEMA` required/properties

**`src/llm/schemas/kernel-evolver-schema.ts`**:
- Uses `KERNEL_SCHEMA` from ideator — no separate changes needed (inherits automatically)

### 4. ConceptSpec Model Expansion

**File**: `src/models/concept-generator.ts`

Add to `ConceptSpec` interface:
- `protagonistLie`: string — Weiland's Lie the protagonist believes (e.g. "I can control everything if I'm smart enough")
- `protagonistTruth`: string — The Truth they must learn (e.g. "Some things are beyond control, and that's okay")
- `protagonistGhost`: string — The backstory wound that created the Lie (e.g. "Watched helplessly as father's business collapsed")
- `wantNeedCollisionSketch`: string — Brief description of how pursuing the want blocks the need (e.g. "Building the perfect park to prove control, but each safety measure creates new danger")

Add new scoring dimensions to `ConceptDimensionScores`:
- `ironicPremise`: number (1-5) — Does the one-line hook contain a built-in contradiction?
- `sceneGenerativePower`: number (1-5) — How many distinct vivid scenes does this concept instantly evoke?

Also add to `ConceptScoreEvidence`:
- `ironicPremise`: readonly string[]
- `sceneGenerativePower`: readonly string[]

Update `CONCEPT_SCORING_WEIGHTS` (rebalance to 100):
```
hookStrength: 10 (was 15)
conflictEngine: 20 (was 25)
agencyBreadth: 15 (was 20)
noveltyLeverage: 10 (was 12)
llmFeasibility: 20 (was 28)
ironicPremise: 15 (new)
sceneGenerativePower: 10 (new)
```

Update `CONCEPT_PASS_THRESHOLDS`:
```
ironicPremise: 3 (new)
sceneGenerativePower: 3 (new)
```

Update:
- `isConceptSpec` type guard — validate 4 new non-empty string fields
- `computeOverallScore` — include new weighted dimensions
- `passesConceptThresholds` — include new threshold checks

### 5. Concept Prompt Changes

**`src/llm/prompts/concept-ideator-prompt.ts`**:
- Add instructions for `protagonistLie`/`protagonistTruth`/`protagonistGhost`/`wantNeedCollisionSketch`
- Add guidance: "The protagonist's Lie is the false belief that drives their behavior. The Truth is what they must learn. The Ghost is the wound that created the Lie. The want/need collision sketch describes how pursuing the want actively blocks the need."
- When kernel is provided, inject kernel's `valueSpectrum` and `moralArgument` as additional context

**`src/llm/prompts/concept-evaluator-prompt.ts`**:
- Add `ironicPremise` scoring rubric:
  - 0-1: No built-in contradiction; the hook is straightforward
  - 2-3: Some irony present but not load-bearing
  - 4-5: The hook IS a contradiction — it couldn't exist without its ironic core (e.g. "a theme park of resurrected dinosaurs" is inherently ironic)
- Add `sceneGenerativePower` scoring rubric:
  - 0-1: Reading the hook suggests 0-1 distinct scenes
  - 2-3: 2-4 scenes come to mind
  - 4-5: 5+ vivid, distinct scenes flash immediately on reading the hook
- Update `formatWeights()` to include new dimensions

**`src/llm/prompts/concept-evolver-prompt.ts`**:
- Add new mutation strategies:
  - `ghost-deepening`: Make the protagonist's wound more specific and visceral — replace abstract loss with concrete sensory memory
  - `lie-escalation`: Push the Lie to a more extreme, more self-destructive form
  - `irony-sharpening`: Strengthen the built-in contradiction in the hook — the best hooks ARE contradictions
- When kernel is provided, inject kernel's `valueSpectrum` and `moralArgument` as context

**`src/llm/prompts/concept-stress-tester-prompt.ts`**:
- Add stress tests:
  - **Irony Test**: "Does the concept contain a built-in contradiction that creates its own dramatic engine? If you remove the irony, does the concept collapse?"
  - **Dinner Table Test**: "Can you explain this concept at a dinner table and get people excited in 30 seconds? If not, the hook is too abstract."
  - **Scene Flash Test**: "Does reading the hook immediately generate 5+ distinct vivid scenes in your mind? List them. If you can't hit 5, the concept lacks scene-generative power."

**`src/llm/prompts/concept-architect-prompt.ts`**:
- Incorporate Lie/Truth/Ghost into character architecture: "The protagonist's coreFlaw should be a behavioral manifestation of the Lie. Their coreCompetence should be what makes the Lie feel justified."
- When kernel is provided, inject `valueSpectrum` for value grounding

**`src/llm/prompts/concept-engineer-prompt.ts`**:
- Wire protagonist arc fields into engineering: "The pressureSource should exploit the protagonist's Ghost. The deadlineMechanism should force a confrontation between Lie and Truth."
- When kernel is provided, inject `moralArgument` for thematic grounding

**`src/llm/prompts/concept-seeder-prompt.ts`**:
- Seed with Lie/Truth/Ghost archetypes: include guidance for generating these fields at the seed stage
- When kernel is provided, inject `valueSpectrum` and `moralArgument`

**`src/llm/prompts/concept-evolver-seeder-prompt.ts`**:
- Include new mutation strategies (ghost-deepening, lie-escalation, irony-sharpening) in seeder evolution

### 6. Concept Schema Changes

**`src/llm/schemas/concept-ideator-schema.ts`**:
- Add `protagonistLie`, `protagonistTruth`, `protagonistGhost`, `wantNeedCollisionSketch` string fields to `buildConceptSpecSchema()` and deprecated `CONCEPT_SPEC_SCHEMA`
- Add to `required` array

**`src/llm/schemas/concept-evaluator-schema.ts`**:
- Add `ironicPremise` and `sceneGenerativePower` to `SCORE_SCHEMA` required/properties
- Add `ironicPremise` and `sceneGenerativePower` to `SCORE_EVIDENCE_SCHEMA` required/properties

**`src/llm/schemas/concept-evolver-schema.ts`**:
- Uses `buildConceptSpecSchema()` from ideator — inherits automatically

**`src/llm/schemas/concept-stress-tester-schema.ts`**:
- Uses `CONCEPT_SPEC_SCHEMA` from ideator for `hardenedConcept` — inherits automatically

**`src/llm/schemas/concept-architect-schema.ts`**:
- No changes needed (architect produces character/world fields, not Lie/Truth/Ghost)

**`src/llm/schemas/concept-engineer-schema.ts`**:
- No changes needed (engineer produces engine fields, not Lie/Truth/Ghost)

**`src/llm/schemas/concept-seeder-schema.ts`**:
- No changes needed (seeder produces seed identity fields only; Lie/Truth/Ghost are added at full concept stage)

### 7. StorySpine Model Expansion

**File**: `src/models/story-spine.ts`

Add to `StorySpine` interface:
- `wantNeedCollisionPoint`: string — Explicit description of where want and need collide (e.g. "Act 2 climax: protagonist must choose between the thing they've been chasing and what they actually need")
- `protagonistDeepestFear`: string — What the story drives the character toward (e.g. "Becoming exactly like the father they resent")

### 8. Spine Prompt/Schema Changes

**`src/llm/prompts/spine-prompt.ts`**:
- Add instructions for `wantNeedCollisionPoint` and `protagonistDeepestFear` in FIELD INSTRUCTIONS section
- In `buildKernelGroundingSection()`: inject kernel's `valueSpectrum` and `moralArgument`
- In `buildConceptAnalysisSection()`: inject concept's `protagonistLie`/`protagonistTruth`/`protagonistGhost`/`wantNeedCollisionSketch`

**`src/llm/schemas/spine-schema.ts`**:
- Add `wantNeedCollisionPoint` and `protagonistDeepestFear` string fields to spine option schema
- Add to `required` array

### 9. SavedConcept Validator Updates

**File**: `src/models/saved-concept.ts`

- `isConceptDimensionScores()`: add checks for `ironicPremise` and `sceneGenerativePower` (both `isFiniteScore`)
- `isScoreEvidence()`: add checks for `ironicPremise` and `sceneGenerativePower` (both `isStringArray`)
- `isConceptSpec` is imported from `concept-generator.ts` and already handles validation — no separate changes needed here

### 10. Downstream Context Propagation

These new fields must flow through to downstream stages that receive kernel/concept/spine context.

**`src/llm/prompts/entity-decomposer-prompt.ts`**:
- Receive and inject `protagonistLie`/`protagonistTruth`/`protagonistGhost` from ConceptSpec into character decomposition context
- Guidance: "The protagonist's Lie, Truth, and Ghost should inform how you decompose their personality, relationships, and backstory"

**`src/llm/structure-generator.ts`** (context building):
- Receive and inject `valueSpectrum` from StoryKernel
- Receive and inject `wantNeedCollisionPoint` and `protagonistDeepestFear` from StorySpine

**`src/llm/planner-generation.ts`** (context building):
- Receive and inject `valueSpectrum` from StoryKernel for per-scene value tracking
- Guidance: "Each scene should move along the value spectrum — identify which level (positive/contrary/contradictory/negation-of-negation) the protagonist occupies at scene start vs. end"

---

## File Change Summary

| File | Change Type |
|------|-------------|
| `src/models/story-kernel.ts` | Edit: add `ValueSpectrum`, `moralArgument`, new scores, update guards/weights/thresholds |
| `src/models/concept-generator.ts` | Edit: add Lie/Truth/Ghost, new scores, update guards/weights/thresholds |
| `src/models/saved-concept.ts` | Edit: update validators for new score dimensions |
| `src/models/story-spine.ts` | Edit: add `wantNeedCollisionPoint`, `protagonistDeepestFear` |
| `src/llm/prompts/kernel-ideator-prompt.ts` | Edit: new generation instructions |
| `src/llm/prompts/kernel-evaluator-prompt.ts` | Edit: new scoring rubrics |
| `src/llm/prompts/kernel-evolver-prompt.ts` | Edit: new mutation strategies |
| `src/llm/schemas/kernel-ideator-schema.ts` | Edit: new output fields |
| `src/llm/schemas/kernel-evaluator-schema.ts` | Edit: new score fields |
| `src/llm/prompts/concept-ideator-prompt.ts` | Edit: Lie/Truth/Ghost instructions |
| `src/llm/prompts/concept-evaluator-prompt.ts` | Edit: new scoring rubrics |
| `src/llm/prompts/concept-evolver-prompt.ts` | Edit: new mutation strategies |
| `src/llm/prompts/concept-stress-tester-prompt.ts` | Edit: new stress tests |
| `src/llm/prompts/concept-architect-prompt.ts` | Edit: Lie/Truth/Ghost character grounding |
| `src/llm/prompts/concept-engineer-prompt.ts` | Edit: Lie/Truth/Ghost engine grounding |
| `src/llm/prompts/concept-seeder-prompt.ts` | Edit: Lie/Truth/Ghost seed guidance |
| `src/llm/prompts/concept-evolver-seeder-prompt.ts` | Edit: new mutation strategies |
| `src/llm/schemas/concept-ideator-schema.ts` | Edit: new ConceptSpec fields |
| `src/llm/schemas/concept-evaluator-schema.ts` | Edit: new score dimensions |
| `src/llm/prompts/spine-prompt.ts` | Edit: new fields + upstream context injection |
| `src/llm/schemas/spine-schema.ts` | Edit: new spine fields |
| `src/llm/prompts/entity-decomposer-prompt.ts` | Edit: receive Lie/Truth/Ghost |
| `src/llm/structure-generator.ts` | Edit: receive valueSpectrum, collision point, deepest fear |
| `src/llm/planner-generation.ts` | Edit: receive valueSpectrum |

~24 files total.

---

## Invariants

1. `KERNEL_SCORING_WEIGHTS` values must sum to 100
2. `CONCEPT_SCORING_WEIGHTS` values must sum to 100
3. All new `StoryKernel` fields (`valueSpectrum`, `moralArgument`) are required, not optional
4. All new `ConceptSpec` fields (`protagonistLie`, `protagonistTruth`, `protagonistGhost`, `wantNeedCollisionSketch`) are required, not optional
5. All new `StorySpine` fields (`wantNeedCollisionPoint`, `protagonistDeepestFear`) are required, not optional
6. `ValueSpectrum` must have exactly 4 non-empty string fields
7. `isStoryKernel` must reject kernels missing `valueSpectrum` or `moralArgument`
8. `isConceptSpec` must reject concepts missing Lie/Truth/Ghost fields
9. New kernels must score >= 3 on `ironicPotential` and `viscerality` to pass thresholds
10. New concepts must score >= 3 on `ironicPremise` and `sceneGenerativePower` to pass thresholds
11. Schema `required` arrays must include all new fields
12. Schema `additionalProperties: false` means every new field must be in `properties`
13. Kernel evolver schema inherits from `KERNEL_SCHEMA` — adding fields to ideator schema propagates automatically
14. Concept evolver/stress-tester schemas inherit from `buildConceptSpecSchema()` / `CONCEPT_SPEC_SCHEMA` — adding fields propagates automatically

---

## Verification

1. **Type checking**: `npm run typecheck` passes
2. **Unit tests**: `npm run test:unit` passes — update all kernel/concept/spine test fixtures with new fields
3. **Integration tests**: `npm run test:integration` passes
4. **Manual smoke test**: Create a new story end-to-end; verify kernel output includes `valueSpectrum` and `moralArgument`; verify concept output includes Lie/Truth/Ghost; verify spine includes collision point and deepest fear
5. **Quality gate**: New kernels must score >= 3 on `ironicPotential` and `viscerality` to pass; new concepts must score >= 3 on `ironicPremise` and `sceneGenerativePower` to pass
