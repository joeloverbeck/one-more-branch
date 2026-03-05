# Narrative Architecture Audit Specification

**Status**: COMPLETED — Premise engine subset extracted to `specs/premise-engine-overhaul.md`; remaining gaps deferred
**Date**: 2026-02-27
**Scope**: Full story generation pipeline (kernel -> concept -> spine -> entity decomposition -> structure -> page generation)

---

## Overview

The story generation pipeline is architecturally strong. The kernel abstraction, concept verification with setpieces, TrackedPromise lifecycle, spine need/want dynamics, and deviation-triggered rewriting are sophisticated and well-engineered.

However, deep analysis against narrative theory (McKee, Snyder, Coyne's Story Grid, Pixar's storytelling rules, Dan Harmon's Story Circle, and interactive fiction research from Crawford/Short/Barlow) reveals **22 gaps** across 7 categories. These range from quick prompt-only additions to major new subsystems.

**Goal**: Strengthen every stage of the pipeline so that generated stories achieve the structural quality of high-concept films (Back to the Future, Jurassic Park, The Matrix) — concepts that sell themselves, architectures that deliver inevitable-feeling escalation, and page-level execution that serves the controlling idea.

**Key Design Decision**: No backward compatibility required. Existing concepts, kernels, and stories have been archived. All new fields are REQUIRED (not optional/nullable), types are strict, and no migration or graceful degradation logic is needed.

---

## Summary of Gaps Found

### A. Beat Architecture (5 gaps)

| ID | Gap | Current State | What's Missing |
|----|-----|--------------|----------------|
| A1 | No crisis type per beat | `StoryBeat` has `role` + `escalationType` | Story Grid: every scene needs BEST_BAD_CHOICE or IRRECONCILABLE_GOODS |
| A2 | No midpoint mechanics | No beat flagged as midpoint | Save the Cat: FALSE_VICTORY or FALSE_DEFEAT at story center |
| A3 | No reflection beat role | `BeatRole` = setup/escalation/turning_point/resolution | Missing "Dark Night of the Soul" — reflective wallowing beat |
| A4 | Single-dimension escalation | One `escalationType` per beat | Real stories escalate on 2+ axes simultaneously |
| A5 | No gap magnitude tracking | Nothing tracks expectation divergence | McKee: results should diverge MORE from protagonist's expectations over time |

### B. Theme Integration (4 gaps)

| ID | Gap | Current State | What's Missing |
|----|-----|--------------|----------------|
| B1 | No explicit antithesis | `StoryKernel` has `dramaticThesis` only | Strongest counter-argument never articulated |
| B2 | No dialectical tracking | No scene-level thesis/antithesis oscillation | Stories should alternate — monotonous thesis-support = no genuine conflict |
| B3 | No thematic web | NPCs have agendas but no thematic stance | Each NPC should embody a different answer to `thematicQuestion` |
| B4 | No scene-level thematic charge | Analyst evaluates many things, not theme service | No flagging of scenes that drift from controlling idea |

### C. Genre & Obligatory Scenes (3 gaps)

| ID | Gap | Current State | What's Missing |
|----|-----|--------------|----------------|
| C1 | `genreFrame` is decorative | Stored on ConceptSpec, never used structurally | Genre should derive required obligatory scenes |
| C2 | No obligatory scene tracking | Nothing registers or tracks genre-mandatory scenes | Thriller needs "hero at mercy of villain"; mystery needs "criminal unmasked" |
| C3 | No genre-to-beats mapping | Genre doesn't inform beat requirements | Genre should constrain what beats MUST exist |

### D. Concept Delivery (3 gaps)

| ID | Gap | Current State | What's Missing |
|----|-----|--------------|----------------|
| D1 | No "promise of the premise" | Concept has `whatIfQuestion` but no delivery tracking | High concepts imply specific scenes — no enforcement they appear |
| D2 | No opening/closing image | Structure has no bookend contract | Save the Cat: first/last images mirror transformation |
| D3 | Setpieces are advisory only | Structure prompt says "at least 3 should trace" — no enforcement | Engine never validates setpiece appearance in structure |

### E. Causal Coherence (2 gaps)

| ID | Gap | Current State | What's Missing |
|----|-----|--------------|----------------|
| E1 | No "because of that" chain | Beats exist independently without causal links | Pixar: each event should CAUSE the next, not just follow it |
| E2 | No retrospective coherence check | No final-act validation | No check that preceding events feel necessary to the climax |

### F. Interactive Narrative (3 gaps)

| ID | Gap | Current State | What's Missing |
|----|-----|--------------|----------------|
| F1 | No delayed consequence system | Choices only register immediate state changes | No queue for consequences triggering 3-5 pages later |
| F2 | No depth vs breadth tracking | Nothing monitors narrative sprawl | No warning when story keeps introducing new elements without deepening existing ones |
| F3 | No information asymmetry tracking | No formal player-vs-NPC knowledge model | Dramatic irony opportunities undetected |

### G. Concept Validation (2 gaps)

| ID | Gap | Current State | What's Missing |
|----|-----|--------------|----------------|
| G1 | No logline compression test | Concept verification has no compression check | Can the concept compress to <=27 words? Formal litmus test |
| G2 | Setpiece causal linkage untested | 6 setpieces listed independently | No check that setpieces form a causal chain, not just 6 cool scenes |

---

## Implementation Plan: 4 Waves

### Wave 1: Quick Wins (Prompt + Small Model Changes, ~S effort each)

All Wave 1 items are independent and can be implemented in parallel.

#### 1.1 Explicit Antithesis on Kernel (B1)

**Files to modify:**
- `src/models/story-kernel.ts` — Add `readonly antithesis: string` to `StoryKernel`
- `src/llm/schemas/kernel-ideator-schema.ts` — Add `antithesis` to schema (required string)
- `prompts/kernel-ideator-prompt.md` — Add instruction: "For each kernel, write an antithesis: the strongest possible argument AGAINST the dramatic thesis. This is what the antagonistic force believes."
- `src/llm/prompts/spine-prompt.ts` — Pass antithesis to spine context
- `src/llm/prompts/structure-prompt.ts` — Pass antithesis to structure context
- `src/llm/prompts/analyst-prompt.ts` — Pass antithesis to analyst context

**Why first**: Antithesis is the foundation for dialectical tracking (B2), thematic charge (B4), and thematic web (B3). Every downstream thematic improvement benefits from it.

**Effort**: S | **Impact**: HIGH

#### 1.2 Scene-Level Thematic Charge in Analyst (B4)

**Files to modify:**
- `src/llm/analyst-types.ts` — Add to `AnalystResult`: `thematicCharge: 'THESIS_SUPPORTING' | 'ANTITHESIS_SUPPORTING' | 'AMBIGUOUS'` and `thematicChargeDescription: string`
- `src/llm/analyst-types.ts` — Add to `AnalystContext`: `thematicQuestion: string`, `antithesis: string`
- `src/llm/schemas/analyst-schema.ts` — Add both fields (required)
- `src/llm/prompts/analyst-prompt.ts` — Add instruction: "Classify whether this scene's events primarily support the dramatic thesis, the antithesis, or remain ambiguous."
- `src/engine/analyst-evaluation.ts` — Thread thematicQuestion and antithesis from story context

**Effort**: S | **Impact**: MEDIUM

#### 1.3 Thematic Stance for NPCs (B3)

**Files to modify:**
- `src/models/decomposed-character.ts` — Add `readonly thematicStance: string` to `DecomposedCharacter`
- `src/llm/schemas/entity-decomposer-schema.ts` — Add `thematicStance` field (required string)
- `prompts/entity-decomposer-prompt.md` — Add instruction: "For each character, write a thematicStance: what this character believes about the story's central thematic question. Each character should embody a different answer."
- `src/llm/prompts/sections/shared/character-formatter.ts` (or equivalent) — Include thematicStance in formatted output

**Effort**: S | **Impact**: MEDIUM

#### 1.4 Setpiece Enforcement in Structure (D3)

**Files to modify:**
- `src/models/story-arc.ts` — Add `readonly setpieceSourceIndex: number | null` to `StoryBeat` (null for beats not sourced from a setpiece)
- `src/llm/schemas/structure-schema.ts` — Add `setpieceSourceIndex` (nullable integer 0-5, required field)
- `src/llm/prompts/structure-prompt.ts` — Strengthen from "at least 3 should trace back" to "at least 4 of the 6 setpieces MUST appear as uniqueScenarioHook sources. For each, set setpieceSourceIndex to the 0-based index of the setpiece used."
- `src/llm/structure-generator.ts` — Add post-validation warning when fewer than 4 setpieces traced

**Effort**: S | **Impact**: MEDIUM

#### 1.5 Causal Linkage Between Beats (E1)

**Files to modify:**
- `src/models/story-arc.ts` — Add `readonly causalLink: string | null` to `StoryBeat` (null for first beat only)
- `src/llm/schemas/structure-schema.ts` — Add `causalLink` (nullable string, required field — null only for first beat)
- `src/llm/prompts/structure-prompt.ts` — Add instruction: "For every beat EXCEPT the first, write a causalLink: one sentence stating which prior beat's outcome CAUSES this beat's situation. Beats connected by 'meanwhile' or 'and then' instead of 'because of that' are a design flaw."
- `src/llm/prompts/structure-rewrite-prompt.ts` — Same instruction for regenerated beats

**Effort**: S | **Impact**: HIGH

---

### Wave 2: Beat Architecture Enrichment (~M effort each)

These add new fields to `StoryBeat` and related types, affecting structure schema, structure prompt, structure rewrite prompt, analyst, and planner.

#### 2.1 Crisis Type Per Beat (A1) — Highest priority in Wave 2

**Files to modify:**
- `src/models/story-arc.ts` — Add `CrisisType = 'BEST_BAD_CHOICE' | 'IRRECONCILABLE_GOODS'`, add `readonly crisisType: CrisisType | null` to `StoryBeat` (null for setup beats)
- `src/llm/schemas/structure-schema.ts` — Add `crisisType` enum (nullable, required field — null for setup beats)
- `src/llm/prompts/structure-prompt.ts` — Add requirement: "For escalation and turning_point beats, specify crisisType. BEST_BAD_CHOICE: all options are costly, pick least bad. IRRECONCILABLE_GOODS: two genuinely good things, can only have one. Resolution beats may also have a crisis if they involve a final choice."
- `src/llm/prompts/sections/planner/continuation-context.ts` — Surface crisis type to planner: "CRISIS TYPE: BEST_BAD_CHOICE — choices offered should feel like costly trade-offs"
- `src/llm/prompts/analyst-prompt.ts` — Analyst evaluates whether delivered choices matched the specified crisis type
- `src/llm/prompts/structure-rewrite-prompt.ts` — Same instructions for regenerated beats

**Effort**: M | **Impact**: HIGH

#### 2.2 Midpoint Mechanics (A2)

**Files to modify:**
- `src/models/story-arc.ts` — Add `readonly isMidpoint: boolean`, `readonly midpointType: 'FALSE_VICTORY' | 'FALSE_DEFEAT' | null` to `StoryBeat` (midpointType null when isMidpoint is false)
- `src/llm/schemas/structure-schema.ts` — Add both fields (required)
- `src/llm/prompts/structure-prompt.ts` — Add requirement: "Flag exactly one beat as isMidpoint: true. This beat should be approximately in the middle of total beat count. Set midpointType to FALSE_VICTORY (protagonist seems to win, but win is hollow) or FALSE_DEFEAT (all seems lost, but defeat contains seed of success). The midpoint should mirror/invert the story's climactic turning point."
- `src/llm/prompts/analyst-prompt.ts` — Evaluate midpoint delivery when reached

**Effort**: M | **Impact**: MEDIUM

#### 2.3 Reflection Beat Role (A3)

**Files to modify:**
- `src/models/story-arc.ts` — Add `'reflection'` to `BeatRole` type
- `src/llm/schemas/structure-schema.ts` — Add to role enum
- `src/llm/prompts/structure-prompt.ts` — Add instruction: "'reflection' beats are moments where the protagonist processes what has happened. They typically appear after a major setback or turning point. No external escalation — the conflict is internal. The protagonist confronts their inner need."
- `src/engine/structure-state.ts` — Handle new role in beat progression logic (no escalation expected)
- `src/llm/prompts/analyst-prompt.ts` — No escalation evaluation for reflection beats; evaluate thematic deepening instead

**Effort**: S | **Impact**: MEDIUM

#### 2.4 Multi-Axis Escalation (A4)

**Files to modify:**
- `src/models/story-arc.ts` — Add `readonly secondaryEscalationType: EscalationType | null` to `StoryBeat` (null when single-axis escalation suffices)
- `src/llm/schemas/structure-schema.ts` — Add `secondaryEscalationType` (nullable, required field)
- `src/llm/prompts/structure-prompt.ts` — Add instruction: "For escalation and turning_point beats, you MAY specify a secondaryEscalationType if the beat escalates on two axes simultaneously."
- `src/llm/prompts/sections/planner/continuation-context.ts` — Surface both escalation types

**Effort**: M | **Impact**: MEDIUM

#### 2.5 Gap Magnitude Tracking (A5) — Lowest priority in Wave 2

**Files to modify:**
- `src/models/story-arc.ts` — Add `readonly expectedGapMagnitude: 'NARROW' | 'MODERATE' | 'WIDE' | 'CHASM' | null` to `StoryBeat` (null for setup beats)
- `src/llm/schemas/structure-schema.ts` — Add `expectedGapMagnitude` (nullable, required field)
- `src/llm/prompts/structure-prompt.ts` — Add instruction: "Assign expectedGapMagnitude per escalation/turning_point beat. Magnitudes should generally INCREASE through the story."
- `src/llm/prompts/analyst-prompt.ts` — Evaluate whether delivered gap matched expectations

**Effort**: M | **Impact**: LOW-MEDIUM

---

### Wave 3: Genre, Theme Tracking, and Concept Delivery (~M-L effort)

#### 3.1 Genre-Driven Obligatory Scene Registry (C1, C2, C3) — Highest priority in Wave 3

**Files to create:**
- `src/models/genre-obligations.ts` — Static registry mapping `GenreFrame` to 3-5 obligatory scene descriptors per genre. Examples:
  - `THRILLER` -> `['hero_at_mercy_of_villain', 'ticking_clock_crisis', 'false_ally_reveal']`
  - `MYSTERY` -> `['red_herring_planted', 'criminal_unmasked', 'detective_synthesis']`
  - `HORROR` -> `['monster_unleashed', 'false_safety', 'final_girl_confrontation']`
  - (All 26 genre frames mapped)

**Files to modify:**
- `src/models/story-arc.ts` — Add `readonly obligatorySceneTag: string | null` to `StoryBeat` (null when not an obligatory scene)
- `src/llm/schemas/structure-schema.ts` — Add `obligatorySceneTag` (nullable string, required field)
- `src/llm/prompts/structure-prompt.ts` — Inject genre's obligatory scene list, require tagging: "The following obligatory scenes are REQUIRED for this genre. At least one beat must be tagged with each. You may combine with existing beat roles."
- `src/llm/structure-generator.ts` — Post-validation: warn if any obligatory scene untagged
- `src/llm/analyst-types.ts` — Add `obligatorySceneFulfilled: string | null` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — Add field (required)
- `src/llm/prompts/analyst-prompt.ts` — Evaluate obligatory scene fulfillment
- `src/llm/prompts/structure-rewrite-prompt.ts` — Preserve fulfilled, require remaining

**Effort**: L | **Impact**: HIGH

#### 3.2 Dialectical Tracking (B2)

**Files to modify:**
- `src/llm/analyst-types.ts` — Add `thematicValence: 'THESIS_SUPPORTING' | 'ANTITHESIS_SUPPORTING' | 'AMBIGUOUS'` to `AnalystResult` (may merge with 1.2's `thematicCharge`)
- `src/models/page.ts` — Add `readonly thematicValence: string` to Page
- `src/engine/continuation-context-builder.ts` — Build `thematicValenceHistory` from ancestor pages
- `src/llm/prompts/sections/planner/continuation-context.ts` — Add "THEMATIC TRAJECTORY" section: "The last N scenes all supported [thesis/antithesis]. Plan a scene that presents the opposing argument through action and consequence."
- `src/persistence/page-serializer.ts` — Serialize new Page field

**Depends on**: 1.1 (antithesis) and 1.2 (thematic charge)

**Effort**: M | **Impact**: MEDIUM

#### 3.3 Promise-of-the-Premise Contract (D1)

**Files to modify:**
- `src/models/concept-generator.ts` — Add `readonly premisePromises: readonly string[]` to `ConceptVerification`
- `src/llm/schemas/concept-verifier-schema.ts` — Add `premisePromises` array (3-5 items, required)
- `prompts/concept-verifier-prompt.md` — Add instruction: "List 3-5 specific scenarios the PREMISE PROMISES the reader will see. These are not beats — they are audience expectations."
- `src/llm/prompts/structure-prompt.ts` — Thread premise promises as constraints
- `src/llm/analyst-types.ts` — Add `premisePromiseFulfilled: string | null` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — Add field (required)
- `src/models/story.ts` — Add `readonly fulfilledPremisePromises: readonly string[]` to Story
- Engine: accumulate fulfilled promises across pages, warn planner when unfulfilled remain in late acts

**Effort**: M | **Impact**: HIGH

#### 3.4 Opening/Closing Image Contract (D2)

**Files to modify:**
- `src/models/story-arc.ts` — Add `readonly openingImage: string`, `readonly closingImage: string` to `StoryStructure`
- `src/llm/schemas/structure-schema.ts` — Add both fields (required strings)
- `src/llm/prompts/structure-prompt.ts` — Add instruction: "Write openingImage and closingImage. These should mirror/contrast each other to show transformation."
- `src/llm/prompts/opening-prompt.ts` — Pass `openingImage` as constraint
- `src/llm/prompts/sections/planner/continuation-context.ts` — When in final resolution beat, pass `closingImage` as target

**Effort**: S | **Impact**: MEDIUM

---

### Wave 4: New Subsystems (~L-XL effort)

#### 4.1 Delayed Consequence System (F1) — Highest impact in Wave 4

**Files to create:**
- `src/models/state/delayed-consequence.ts` — `DelayedConsequence` interface with REQUIRED fields: `id: string`, `description: string`, `triggerCondition: string`, `minPagesDelay: number`, `maxPagesDelay: number`, `currentAge: number`, `triggered: boolean`, `sourcePageId: number`
- `src/engine/consequence-lifecycle.ts` — Age tracking, trigger evaluation, planner injection

**Files to modify:**
- `src/models/page.ts` — Add `readonly accumulatedDelayedConsequences: readonly DelayedConsequence[]` (empty array when none pending)
- `src/llm/schemas/writer-schema.ts` — Add `delayedConsequencesCreated` output (required array, can be empty)
- `src/llm/schemas/analyst-schema.ts` — Add `delayedConsequencesTriggered` evaluation (required array, can be empty)
- `src/llm/prompts/sections/planner/continuation-context.ts` — Add "PENDING CONSEQUENCES" section
- `src/engine/page-builder.ts` — Process consequence lifecycle
- `src/persistence/page-serializer.ts` — Serialize/deserialize

**Effort**: XL | **Impact**: HIGH

#### 4.2 Depth vs Breadth Monitor (F2)

**Files to modify:**
- `src/llm/analyst-types.ts` — Add `narrativeFocus: 'DEEPENING' | 'BROADENING' | 'BALANCED'` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — Add field (required enum)
- `src/llm/prompts/analyst-prompt.ts` — Instruction: "Classify whether this scene primarily introduces new elements (BROADENING) or develops existing threads/relationships (DEEPENING)."
- `src/engine/continuation-context-builder.ts` — Build focus trajectory from ancestors
- `src/llm/prompts/sections/planner/continuation-context.ts` — Warning when 3+ consecutive BROADENING scenes

**Effort**: M | **Impact**: MEDIUM

#### 4.3 Information Asymmetry Tracking (F3)

**Files to create:**
- `src/models/state/knowledge-state.ts` — `KnowledgeAsymmetry` interface with REQUIRED fields: `characterName: string`, `knownFacts: readonly string[]`, `falseBeliefs: readonly string[]`, `secrets: readonly string[]`

**Files to modify:**
- `src/llm/analyst-types.ts` — Add asymmetry detection fields (required)
- `src/llm/schemas/analyst-schema.ts` — Add fields
- `src/llm/prompts/sections/planner/continuation-context.ts` — "DRAMATIC IRONY OPPORTUNITIES" section
- `src/models/page.ts` — Add accumulated knowledge state (required array, can be empty)
- `src/persistence/page-serializer.ts` — Serialize

**Effort**: L | **Impact**: MEDIUM-HIGH

#### 4.4 Concept Validation Improvements (G1, G2)

**Files to modify:**
- `src/models/concept-generator.ts` — Add to `ConceptVerification`: `loglineCompressible: boolean`, `logline: string`, `setpieceCausalChainBroken: boolean`, `setpieceCausalLinks: readonly string[]` (all required)
- `src/llm/schemas/concept-verifier-schema.ts` — Add fields (all required)
- `prompts/concept-verifier-prompt.md` — Add logline compression test: "Compress the concept to <=27 words. If you cannot, set loglineCompressible to false — this indicates the concept may be too diffuse." Add setpiece causal chain test: "For each adjacent pair of setpieces, write a causalLink explaining how one leads to the other. If any link is forced, set setpieceCausalChainBroken to true."

**Effort**: M | **Impact**: LOW-MEDIUM

#### 4.5 Retrospective Coherence Check (E2)

**Files to modify:**
- `src/engine/analyst-evaluation.ts` — Add conditional mode when entering final resolution beat
- `src/llm/analyst-types.ts` — Add `retrospectiveCoherence: boolean`, `coherenceIssues: readonly string[]` (both required; coherenceIssues can be empty array)
- `src/llm/schemas/analyst-schema.ts` — Add fields (required)
- `src/llm/prompts/analyst-prompt.ts` — Final-act instruction: "Review all preceding beat resolutions. Does every major event feel necessary to the current trajectory?"

**Depends on**: 1.5 (causal links) for maximum effectiveness

**Effort**: L | **Impact**: MEDIUM

---

## Dependency Graph

```
Wave 1 (all independent, all parallel):
  1.1 Antithesis  ────────────┐
  1.2 Thematic Charge ────────┤
  1.3 Thematic Web ───────────┤── Feed into Wave 3
  1.4 Setpiece Enforcement    │
  1.5 Causal Linkage ─────────┘── Feeds into 4.5

Wave 2 (all independent of each other, all after Wave 1):
  2.1 Crisis Type
  2.2 Midpoint
  2.3 Reflection Role
  2.4 Multi-Axis Escalation
  2.5 Gap Magnitude

Wave 3 (some internal dependencies):
  3.1 Genre Obligations (independent)
  3.2 Dialectical Tracking (depends on 1.1 + 1.2)
  3.3 Premise Promises (independent)
  3.4 Opening/Closing Image (independent)

Wave 4 (after Waves 1-3 stabilize):
  4.1 Delayed Consequences (independent)
  4.2 Depth/Breadth Monitor (independent)
  4.3 Information Asymmetry (independent)
  4.4 Concept Validation (independent)
  4.5 Retrospective Coherence (benefits from 1.5)
```

### Specific Dependencies

| Item | Depends On | Reason |
|------|-----------|--------|
| 3.2 Dialectical Tracking | 1.1 Antithesis + 1.2 Thematic Charge | Needs antithesis definition and per-scene charge classification |
| 4.5 Retrospective Coherence | 1.5 Causal Linkage | Most effective when causal chain exists to validate |
| All Wave 2 | Wave 1 complete | Wave 1 establishes foundational fields referenced by beat enrichment |
| All Wave 4 | Waves 1-3 stable | Subsystems build on all preceding structural improvements |

---

## Effort & Impact Matrix

| ID | Gap | Effort | Impact | Wave | Priority |
|----|-----|--------|--------|------|----------|
| 1.1 | Explicit antithesis | **S** | **HIGH** | 1 | Critical foundation |
| 1.2 | Scene thematic charge | **S** | MEDIUM | 1 | |
| 1.3 | NPC thematic web | **S** | MEDIUM | 1 | |
| 1.4 | Setpiece enforcement | **S** | MEDIUM | 1 | |
| 1.5 | Causal linkage | **S** | **HIGH** | 1 | Critical foundation |
| 2.1 | Crisis type per beat | **M** | **HIGH** | 2 | Wave 2 priority |
| 2.2 | Midpoint mechanics | **M** | MEDIUM | 2 | |
| 2.3 | Reflection beat role | **S** | MEDIUM | 2 | |
| 2.4 | Multi-axis escalation | **M** | MEDIUM | 2 | |
| 2.5 | Gap magnitude | **M** | LOW-MED | 2 | Deferrable |
| 3.1 | Genre obligations | **L** | **HIGH** | 3 | Wave 3 priority |
| 3.2 | Dialectical tracking | **M** | MEDIUM | 3 | |
| 3.3 | Premise promises | **M** | **HIGH** | 3 | |
| 3.4 | Opening/closing image | **S** | MEDIUM | 3 | |
| 4.1 | Delayed consequences | **XL** | **HIGH** | 4 | Wave 4 priority |
| 4.2 | Depth/breadth monitor | **M** | MEDIUM | 4 | |
| 4.3 | Info asymmetry | **L** | MED-HIGH | 4 | |
| 4.4 | Concept validation | **M** | LOW-MED | 4 | Deferrable |
| 4.5 | Retrospective coherence | **L** | MEDIUM | 4 | |

### Top 5 Highest-Impact Items

1. **1.1 Antithesis** — Foundation for all theme work
2. **1.5 Causal linkage** — Pixar's "because of that" chain
3. **2.1 Crisis type** — Story Grid's most fundamental unit
4. **3.1 Genre obligations** — Makes `genreFrame` actually load-bearing
5. **4.1 Delayed consequences** — The "I thought that was forgotten" moments

---

## Recommended Implementation Order (Within Each Wave)

### Wave 1 (all S, do first to last):
1. **1.1 Antithesis** — unblocks 1.2, 1.3, 3.2
2. **1.5 Causal linkage** — unblocks 4.5
3. **1.2 Thematic charge** — uses antithesis from 1.1
4. **1.3 Thematic web** — uses thematicQuestion context
5. **1.4 Setpiece enforcement** — independent, finishing touch

### Wave 2 (recommended order):
1. **2.3 Reflection role** — smallest, tests beat role expansion
2. **2.1 Crisis type** — highest impact
3. **2.2 Midpoint** — structural awareness
4. **2.4 Multi-axis escalation** — enrichment
5. **2.5 Gap magnitude** — defer if needed

### Wave 3 (recommended order):
1. **3.4 Opening/closing image** — smallest, quick win
2. **3.3 Premise promises** — high impact
3. **3.1 Genre obligations** — largest, most architecturally significant
4. **3.2 Dialectical tracking** — needs 1.1 foundation

### Wave 4 (recommended order):
1. **4.2 Depth/breadth monitor** — medium effort, immediate benefit
2. **4.4 Concept validation** — medium effort, pre-generation quality
3. **4.1 Delayed consequences** — XL but highest impact
4. **4.3 Information asymmetry** — large, complex
5. **4.5 Retrospective coherence** — final polish

---

## Verification Strategy

After each wave:

1. **Type check**: `npm run typecheck` — all new types compile cleanly
2. **Existing tests**: `npm test` — no regressions
3. **Manual story generation**: Create a story through the full pipeline and verify:
   - New fields appear in generated structures (check `logs/` JSONL for prompt outputs)
   - Analyst evaluates new dimensions
   - Planner receives new directives
4. **Prompt doc review**: Verify each modified prompt doc matches its code implementation
5. **Coverage**: `npm run test:coverage` — maintain 70% thresholds

### Per-Gap Verification Checklist

- [ ] New type fields compile with `npm run typecheck`
- [ ] Schema includes new fields as required
- [ ] Prompt text references the new field with clear instructions
- [ ] Context builders thread new data from story/page to prompt
- [ ] Serializer handles new fields
- [ ] At least one unit test exercises the new field
- [ ] JSONL prompt log confirms the field appears in LLM requests
- [ ] Generated story output contains the expected new data

---

## Theoretical References

| Source | Concepts Used |
|--------|--------------|
| Robert McKee, *Story* | Gap between expectation and result; controlling idea; crisis types |
| Blake Snyder, *Save the Cat* | Beat sheet; midpoint; opening/closing image; "promise of the premise" |
| Shawn Coyne, *Story Grid* | Genre obligations; crisis types (best bad choice / irreconcilable goods); escalation tracking |
| Pixar's Storytelling Rules | "Because of that" causal chain; retrospective coherence |
| Dan Harmon, *Story Circle* | Thematic oscillation; want vs need |
| Chris Crawford, *Interactive Storytelling* | Delayed consequences; information asymmetry; depth vs breadth |
| Emily Short | Interactive narrative quality; NPC knowledge models |
| Andrew Barlow | Choice architecture in branching fiction |
