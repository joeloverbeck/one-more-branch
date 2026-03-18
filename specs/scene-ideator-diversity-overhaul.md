# Scene Ideator Diversity Overhaul

**Status**: PENDING IMPLEMENTATION
**Date**: 2026-03-18
**Scope**: `scene-ideator` prompt, schema, parser, validation, prompt docs, and scene-direction option contract
**Backward Compatibility**: Partial. Downstream planner contract can remain stable, but ideator response count and internal option metadata will change.

---

## Context

The current scene ideator is structurally locked to exactly 3 options.

Today, diversity is enforced only by:

- exact option count = 3,
- unique `(scenePurpose, valuePolarityShift)` pairs,
- a soft instruction to maximize `scenePurpose` variety.

That is not enough. In practice, the model can satisfy the contract while still producing the same deeper pattern repeatedly:

- one option darkens the current situation,
- one option improves or redirects it,
- one option introduces irony or transformation,
- all three often orbit the same underlying dramatic move.

This is a prompt-design problem and an architecture problem. The system currently asks the model to "be diverse" without giving it a deterministic diversity frame.

There is also unnecessary prompt-contract drift risk:

- `3` is hard-coded in the prompt source, prompt docs, schema descriptions, parser checks, and tests.
- `prompts/scene-ideator-prompt.md` exists, but `test/unit/llm/prompt-doc-alignment.test.ts` does not currently include the scene ideator in its doc/source contract list.

The result is a brittle setup where both quality and maintainability depend too much on one free-form instruction block.

---

## Goals

- Increase the practical diversity of scene ideas, not just enum diversity.
- Recommend an option count that improves coverage without degrading choice quality.
- Make diversity a first-class deterministic contract, not a vague aspiration.
- Keep the architecture clean, testable, and extensible.
- Preserve the planner contract: the player still selects one scene direction and the planner receives one selected direction.

## Non-Goals

- Do not redesign the page planner.
- Do not redesign the scene-direction renderer UI beyond what higher option counts may require cosmetically.
- Do not introduce hacks like random adjective injection, synonym shuffling, or post-hoc string similarity filtering as the primary diversity strategy.

---

## Recommendation

### 1. Default to 5 scene ideas

The recommended default is **5** options, not 3 and not 6.

Why 5 is the best default:

- It is enough space to cover multiple genuinely different dramatic lanes.
- It avoids the false binary/ternary pattern that 3 options encourages.
- It is still cognitively manageable in the current card-selection UX.
- It increases coverage without paying the full latency/token/choice-overload cost of 6.
- It maps cleanly to a deterministic slate design where each option fills a different narrative lane.

### 2. Architect for a configurable range of 4-6

The system should be designed so the option count is not hard-coded again.

Recommended rule:

- Phase 1 implementation default: `5`
- Supported architecture range: `4-6`
- Future adaptive mode may use `6` for unusually dense continuation states, but that should not be required for the first implementation

This keeps the first implementation disciplined while avoiding another global refactor later.

---

## Root Cause Analysis

The current design underperforms because it treats scene diversity as a property of individual options instead of a property of the **slate**.

Current failures:

1. The model is not assigned distinct narrative lanes per option.
2. The uniqueness check is too shallow.
3. The prompt does not define what counts as "cosmetic variation" versus "meaningfully different."
4. The option count is too low to cover the main dramatic avenues available in a branching scene.
5. The contract is spread across multiple files with repeated hard-coded count literals.

---

## Proposed Architecture

## 1. Introduce a deterministic slate-planning layer

Before prompt assembly, build a **scene idea slate** that decides:

- how many options to request,
- which diversity lanes must be covered,
- which lanes are preferred for the current context,
- which lanes are forbidden or redundant for the current context.

Proposed new internal concept:

```ts
export interface SceneIdeationSlate {
  readonly targetOptionCount: number;
  readonly slots: readonly SceneIdeationSlot[];
}

export interface SceneIdeationSlot {
  readonly index: number;
  readonly lane: SceneIdeaLane;
  readonly rationale: string;
  readonly requiredSignals?: readonly string[];
  readonly discouragedSignals?: readonly string[];
}
```

The prompt builder should no longer say only "generate diverse options." It should say, in effect: generate one option for each preselected slot.

This is the key architectural change.

---

## 2. Make diversity lane-based, not just enum-based

Introduce a new taxonomy for ideation diversity.

Proposed enum:

```ts
export type SceneIdeaLane =
  | 'ESCALATION'
  | 'REVELATION'
  | 'RELATIONAL_REALIGNMENT'
  | 'TEMPTATION_OR_OPPORTUNITY'
  | 'CONSEQUENCE_OR_PAYOFF'
  | 'IDENTITY_OR_TRANSFORMATION';
```

Meaning of each lane:

- `ESCALATION`: intensify threat, pressure, urgency, exposure, or cost.
- `REVELATION`: expose new information or radically reframe known information.
- `RELATIONAL_REALIGNMENT`: shift alliance, intimacy, leverage, trust, dependence, or rivalry.
- `TEMPTATION_OR_OPPORTUNITY`: open a path forward that offers advantage, relief, or desire at a price.
- `CONSEQUENCE_OR_PAYOFF`: cash out prior actions, promises, debts, or overdue threads.
- `IDENTITY_OR_TRANSFORMATION`: test role, self-concept, taboo, ritual, ideology, corruption, or becoming.

Important note:

- These are not replacements for `scenePurpose`, `valuePolarityShift`, or `pacingMode`.
- They solve a different problem: ensuring the option slate spans different dramatic engines.

---

## 3. Use 5-lane slates by default

For the first implementation, generate **5** options by selecting **5 distinct lanes**.

Recommended default lane coverage:

- `ESCALATION`
- `REVELATION`
- `RELATIONAL_REALIGNMENT`
- `TEMPTATION_OR_OPPORTUNITY`
- `CONSEQUENCE_OR_PAYOFF`

`IDENTITY_OR_TRANSFORMATION` should remain in the taxonomy, but be used when context strongly supports it. It should replace one of the default lanes when:

- the current beat is strongly introspective or transformational,
- protagonist guidance is identity-heavy,
- a taboo, ritual, corruption, initiation, or metamorphosis pressure is already active,
- the story spine/structure indicates an internal-turn beat.

This avoids forcing "transformation" into every slate while still making that lane available as a first-class option.

---

## 4. Extend the option contract with hidden diversity metadata

Recommended `SceneDirectionOption` expansion:

```ts
export interface SceneDirectionOption {
  readonly scenePurpose: ScenePurpose;
  readonly valuePolarityShift: ValuePolarityShift;
  readonly pacingMode: PacingMode;
  readonly diversityLane: SceneIdeaLane;
  readonly sceneDirection: string;
  readonly dramaticJustification: string;
}
```

Optional future metadata:

```ts
export interface SceneDirectionOption {
  readonly primaryDriver?: 'EXTERNAL_PRESSURE' | 'INFORMATION' | 'RELATIONSHIP' | 'OPPORTUNITY' | 'CONSEQUENCE' | 'IDENTITY';
  readonly anchoredThreadIds?: readonly string[];
}
```

Why include `diversityLane` in the structured output:

- it makes the slate auditable,
- it enables deterministic validation,
- it makes prompt failures easier to debug,
- it supports future analytics and UI experimentation,
- it avoids hiding the most important diversity contract only inside prose instructions.

The planner does not need to consume this field initially.

---

## 5. Replace generic diversity instructions with slot-specific instructions

The prompt should stop asking for "exactly N diverse options" in one undifferentiated block.

Instead, the user prompt should include a slate section like:

```text
IDEATION SLATE:
Generate exactly 5 options.

Option 1 lane: ESCALATION
- Increase active pressure, danger, urgency, or exposure.
- Do not make this a mere tonal darkening of another option.

Option 2 lane: REVELATION
- Introduce new information or a reframe that changes what the player understands.
- Do not make this only a softer version of escalation.

Option 3 lane: RELATIONAL_REALIGNMENT
- Change alliance, trust, leverage, intimacy, rivalry, or dependency.

Option 4 lane: TEMPTATION_OR_OPPORTUNITY
- Offer an attractive path, opening, or advantage that carries cost or compromise.

Option 5 lane: CONSEQUENCE_OR_PAYOFF
- Cash out an overdue thread, promise, prior choice, or accumulated pressure.
```

This is much stronger than a single abstract diversity paragraph.

---

## 6. Define what counts as meaningful distinctness

The prompt and validator should explicitly define invalid diversity.

Two options are **not** meaningfully distinct if they are:

- the same core event with opposite emotional coloring,
- the same confrontation with flipped winner/loser valence,
- the same revelation delivered by a different speaker,
- the same escape/pursuit beat restated with different adjectives,
- one "serious" option plus one "ironic" reskin of the same underlying move.

Two options **are** meaningfully distinct when they differ in primary dramatic engine, such as:

- pressure versus disclosure,
- relationship shift versus world-event intrusion,
- temptation versus consequence,
- external danger versus internal identity test.

Prompt rule:

- "A mirrored inversion of another option is invalid. A tonal variant of another option is invalid. A different lane must create a different kind of next scene, not just a different mood."

---

## 7. Strengthen deterministic validation

Replace the current validation rule:

- unique `(scenePurpose, valuePolarityShift)`

With a layered validation policy:

1. Exact option count must match slate target count.
2. `diversityLane` values must be unique within the slate.
3. No two options may share the same `(scenePurpose, valuePolarityShift)` pair.
4. No two options may share the same `(diversityLane, scenePurpose)` pair.
5. If the slate contains `CONSEQUENCE_OR_PAYOFF`, at least one of the following should be referenced in the prompt instructions for that slot:
   - overdue threads,
   - pending promises,
   - unresolved choice fallout,
   - active constraints.

Important:

- Do not try to solve semantic duplication mainly through fuzzy similarity heuristics.
- If additional semantic checks are later added, they should be advisory diagnostics, not the core enforcement mechanism.

---

## Slate Selection Rules

## 1. Opening mode

Opening scenes should still use 5 options.

Recommended lane priorities:

- `ESCALATION`
- `REVELATION`
- `RELATIONAL_REALIGNMENT`
- `TEMPTATION_OR_OPPORTUNITY`
- one of:
  - `CONSEQUENCE_OR_PAYOFF` when the starting situation already implies immediate fallout,
  - `IDENTITY_OR_TRANSFORMATION` when the opening premise is strongly about role, taboo, initiation, or becoming

Opening-mode rule:

- at least one option must foreground the protagonist's social or relational position,
- at least one option must foreground a world/system pressure rather than pure exposition,
- pure exposition should not occupy an entire lane by itself.

## 2. Continuation mode

Continuation scenes should also default to 5 options, but slot selection should become context-aware.

Priority heuristics:

- If there are overdue threads or aged promises, strongly prefer `CONSEQUENCE_OR_PAYOFF`.
- If the player guidance suggests a statement, confession, ultimatum, apology, seduction, or accusation, strongly prefer `RELATIONAL_REALIGNMENT`.
- If the current beat is midpoint/turning-point/reflection, allow `IDENTITY_OR_TRANSFORMATION` to replace `ESCALATION` or `TEMPTATION_OR_OPPORTUNITY`.
- If the current scene state already contains active threats and urgency, avoid overfilling the slate with multiple pressure-adjacent slots.

---

## Prompt Design Changes

## 1. System prompt changes

Keep the existing role framing, but replace the current diversity section with a stronger contract.

Required additions:

- explain that diversity is evaluated across the full slate, not per-option only,
- define lane uniqueness,
- forbid mirrored inversion and cosmetic variants,
- instruct the model to maximize differences in dramatic engine, not merely outcome charge.

Recommended language:

```text
SLATE DIVERSITY RULES:
- Each option is assigned a different diversity lane. Fulfill that lane exactly.
- Do not produce mirrored opposites of the same core event.
- Do not produce tonal variants of the same scenario.
- Different options must open different kinds of next scenes, not merely different emotional outcomes.
```

## 2. User prompt changes

Add a generated `IDEATION SLATE` block that lists the slot assignments.

Also add one instruction that matters a lot:

```text
Use the player's chosen action and current story state as a common starting point, then branch outward into different dramatic engines.
```

That tells the model to stay causally coherent while still branching.

## 3. Field instruction changes

Add:

- `diversityLane`

Update `sceneDirection` instruction:

- require each option to specify a materially different next-scene situation,
- require concrete causal divergence,
- require different leverage, not just different tone.

Update `dramaticJustification` instruction:

- require the justification to explain why this lane serves the story now.

---

## Schema and Type Changes

## 1. New configurable ideation count source

Do not keep hard-coded count literals spread across prompt/schema/parser/tests again.

Introduce one source of truth, for example:

```ts
export const DEFAULT_SCENE_IDEA_COUNT = 5;
export const MIN_SCENE_IDEA_COUNT = 4;
export const MAX_SCENE_IDEA_COUNT = 6;
```

Preferred location:

- a new scene-ideation contract file, not buried in the prompt builder

## 2. Schema update

Update `src/llm/schemas/scene-ideator-schema.ts`:

- description should no longer say "Exactly 3"
- add `minItems` and `maxItems` or a generated exact count shape if the schema builder becomes parameterized
- add `diversityLane` enum

Recommended direction:

- convert the current constant schema into a schema builder that takes `targetOptionCount` and emits the correct array contract

## 3. Parser update

Update `src/llm/scene-ideator.ts`:

- parser should validate against the requested slate count, not a literal `3`
- `validateDiversity()` should validate lane uniqueness as well as pair uniqueness

## 4. Type update

Update:

- `src/models/scene-direction.ts`
- any derived client/server types if needed

The planner-facing `SelectedSceneDirection` can remain unchanged initially if we want to keep the selected payload minimal. If `diversityLane` is retained on the selected object, the planner may safely ignore it.

---

## Documentation Architecture

The implementation pass must update prompt docs in the same pass.

Required documentation changes:

- `prompts/scene-ideator-prompt.md`
- any scene-ideator-related ownership/scope wording in `prompts/*` that mentions "exactly 3"

Required test hygiene change:

- add scene ideator to `test/unit/llm/prompt-doc-alignment.test.ts`

This repo already has a doc/source alignment pattern. The scene ideator should participate in it.

---

## UI and UX Implications

The current renderer loops over the array and is not inherently limited to 3 cards.

Relevant files:

- `public/js/src/04f-scene-direction-renderer.js`
- `public/js/src/13-scene-ideation-controller.js`

That said, moving to 5 options has UI consequences that should be considered in the implementation pass:

- card density,
- scroll length on smaller screens,
- whether the subtitle should help the player understand the wider slate,
- whether lane badges should remain hidden or become an optional future affordance.

Recommendation:

- do not expose `diversityLane` in the first UI pass,
- do ensure the card grid/layout remains usable with 5 options.

---

## Testing Plan

## 1. Unit tests

Update or add tests for:

- prompt builder includes the requested count and slate block,
- parser accepts the configured count and rejects mismatches,
- diversity validator rejects duplicate lanes,
- diversity validator still rejects duplicate `(scenePurpose, valuePolarityShift)` pairs,
- slot builder chooses correct lanes for opening vs continuation contexts.

Relevant files:

- `test/unit/llm/prompts/scene-ideator-prompt.test.ts`
- `test/unit/llm/scene-ideator.test.ts`

## 2. Documentation alignment

Update:

- `test/unit/llm/prompt-doc-alignment.test.ts`

## 3. Client tests

Only update client tests if they accidentally assume 3 options.

Likely impacted areas:

- `test/unit/client/briefing-page/begin-adventure.test.ts`
- `test/unit/client/play-page/choice-click.test.ts`

The renderer itself already iterates arrays, so these changes should be limited.

---

## Acceptance Criteria

This spec is satisfied when the implementation achieves all of the following:

- Scene ideation defaults to 5 options.
- Option count comes from a single source of truth, not repeated literals.
- Each option is assigned a unique diversity lane.
- The prompt explicitly instructs one slot per lane.
- The parser validates requested count and lane uniqueness.
- The schema includes the lane field and count contract.
- Prompt docs are updated in the same pass.
- Prompt-doc alignment tests include the scene ideator.
- The selected scene direction still feeds the planner cleanly.

Quality acceptance criteria:

- The slate should no longer routinely collapse into "worse / better / ironic variant."
- At least 4 of 5 options should usually represent clearly different dramatic engines when read by a human without referring to enum labels.
- Continuation slates should more often include one option that pays off prior pressure and one that shifts relationship dynamics when context supports them.

---

## Implementation Sequence

1. Add the new scene-ideation contract module for count and lane taxonomy.
2. Add a slate-builder that derives slots from scene context.
3. Update the prompt builder to emit the slate block.
4. Update the schema to use a parameterized count and lane field.
5. Update parser and diversity validation.
6. Update tests.
7. Update `prompts/scene-ideator-prompt.md`.
8. Regenerate `public/js/app.js` only if client-source edits are required during the implementation pass.

---

## Final Recommendation

Implement a **5-option, lane-based scene ideation slate**.

Do not solve this by merely changing `3` to `5` in the prompt. That would increase output volume without fixing the structural reason the options converge.

The clean solution is:

- one configurable count source,
- one deterministic slate planner,
- one explicit lane taxonomy,
- one stronger output contract,
- one validator that enforces slate diversity as a real system invariant.
