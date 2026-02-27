# NARARCAUD-06: Reflection Beat Role

**Status**: COMPLETED
**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A3 — Beat Architecture gaps

## Summary

Add `'reflection'` as a new `BeatRole` value. Reflection beats allow the narrative to pause for thematic deepening without requiring escalation. The analyst should not penalize lack of escalation during reflection beats and should evaluate whether thematic/internal movement occurred.

## Reassessed Assumptions and Scope Corrections

- `src/engine/structure-state.ts` does not branch behavior by beat role today. No reflection-specific progression logic is required there; progression should remain role-agnostic.
- Beat-role validation/parsing is duplicated and must be updated in both:
  - `src/engine/structure-factory.ts`
  - `src/engine/structure-rewriter.ts`
- Current architecture has repeated beat-role allowlists in multiple files. As part of this ticket, centralize beat-role constants in `src/models/story-arc.ts` and consume that source of truth where possible to reduce drift risk.
- Reflection handling belongs in planner/analyst prompt directives and schema/prompt role guidance, not in low-level state progression.

## Files to Touch

- `src/models/story-arc.ts` — add `'reflection'` to `BeatRole`; add canonical `BEAT_ROLES` constant
- `src/llm/schemas/structure-schema.ts` — add `'reflection'` to role enum
- `src/llm/prompts/structure-prompt.ts` — add reflection beat description
- `src/llm/prompts/structure-rewrite-prompt.ts` — same
- `src/engine/structure-factory.ts` — consume canonical beat roles for parsing
- `src/engine/structure-rewriter.ts` — consume canonical beat roles for parsing
- `src/llm/prompts/continuation/story-structure-section.ts` — add reflection quality-check guidance for analyst evaluation
- `src/llm/prompts/sections/planner/continuation-context.ts` — add reflection directive in `buildEscalationDirective`
- `prompts/structure-prompt.md` — update doc
- `prompts/structure-rewrite-prompt.md` — update doc
- `prompts/analyst-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc
- `test/unit/models/story-arc.test.ts` — include `reflection` in role tests
- `test/unit/llm/schemas/structure-schema.test.ts` — include `reflection` enum expectation
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` — reflection directive coverage
- `test/unit/llm/prompts/continuation/story-structure-section.test.ts` — reflection quality-check coverage
- `test/unit/llm/prompts/structure-prompt.test.ts` — role guidance/output shape includes reflection
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts` — role guidance/output shape includes reflection

## Out of Scope

- New fields on StoryBeat
- Crisis type
- Midpoint mechanics
- Gap magnitude

## Acceptance Criteria

- [x] `npm run typecheck` passes with `'reflection'` in BeatRole
- [x] Unit test: structure schema accepts `reflection` role
- [x] Unit test: `buildEscalationDirective` emits reflection-specific directive
- [x] Unit test: analyst structure evaluation emits reflection-specific quality check (thematic/internal movement; no escalation requirement)
- [x] Unit test: role parsing in structure creation/rewrite accepts `reflection` without fallback coercion
- [x] Prompt docs/source alignment tests still pass after role wording updates
- [x] Invariant: Existing beat progression tests still pass

## Outcome

- **Completion date**: 2026-02-27
- **What changed**:
  - Added `reflection` to beat-role model and introduced canonical `BEAT_ROLES` in `src/models/story-arc.ts`.
  - Updated schema role enum and role-field descriptions to include reflection semantics.
  - Removed duplicated role lists in structure parsing paths by consuming canonical roles in:
    - `src/engine/structure-factory.ts`
    - `src/engine/structure-rewriter.ts`
  - Added reflection-specific planner and analyst quality directives in continuation prompt builders.
  - Updated structure/structure-rewrite source prompts and prompt docs to include reflection role and nullability rules for non-escalatory beats.
  - Added/updated unit tests for model roles, schema enum, structure prompt role output, structure rewrite role output, planner reflection directive, and analyst reflection quality check.
- **Deviation from original plan**:
  - Removed planned `structure-state.ts` behavior changes after reassessment (role-agnostic progression remains correct).
  - Added parser-centralization changes (`structure-factory.ts`, `structure-rewriter.ts`) to prevent role-list drift and improve extensibility.
- **Verification results**:
  - `npm run test:unit -- --coverage=false test/unit/models/story-arc.test.ts test/unit/llm/schemas/structure-schema.test.ts test/unit/llm/prompts/structure-prompt.test.ts test/unit/llm/prompts/structure-rewrite-prompt.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/llm/prompts/continuation/story-structure-section.test.ts` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
