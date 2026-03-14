# STOARCGEN-010: Milestone Generator Prompt + Schema + Parser (Call 2)

**Status**: TODO
**Depends on**: STOARCGEN-008, STOARCGEN-009
**Blocks**: STOARCGEN-012 (pipeline orchestration)

## Summary

Create the Milestone Generator prompt, JSON schema, and response parser. This is Call 2 of the 3-call pipeline: it generates 2-4 milestones per act, grounded in the macro architecture constraints from Call 1.

## Files to Touch

### New files
- `src/llm/prompts/milestone-generation-prompt.ts` — System + user prompt for milestone generation
- `src/llm/schemas/milestone-generation-schema.ts` — JSON Schema for structured LLM output
- `src/llm/milestone-generation-response-parser.ts` — Parse and validate LLM response

### Modified files
- `src/config/stage-model.ts` — Add `'milestone-generation'` stage model entry (if needed)

## Detailed Changes

### Prompt design (`milestone-generation-prompt.ts`)

**Input**:
- `MacroArchitectureResult` (output of Call 1) — treated as immutable
- Original `StructureContext` (same context as Call 1)

**The prompt must instruct the LLM to**:
- Generate 2-4 milestones per act
- Each milestone must have all existing fields (renamed from beat) plus new `exitCondition`
- Act-level fields from Call 1 are **immutable** — the milestone generator cannot modify them
- Every milestone must have a concrete `exitCondition`
- Every escalation/turning_point milestone must trace to a verified setpiece or prove concept-specificity
- Exactly one milestone across all acts must have `isMidpoint: true`, matching `anchorMoments.midpoint` placement
- Milestones must be causally linked (non-empty `causalLink`)

**Context injection**:
- Include the full `MacroArchitectureResult` as structured context
- Include `decomposedCharacters`, `decomposedWorld`, `conceptVerification` for specificity
- Include `toneFeel`/`toneAvoid` for tone alignment

### Schema (`milestone-generation-schema.ts`)

JSON Schema for `response_format` producing an array of acts, each containing milestones:
- `acts`: array of objects, each with `milestones` array
- Each milestone matches `GeneratedMilestone` shape (all existing fields + `exitCondition`)

Use `anyOf`/`oneOf` for nullable fields (Anthropic/Bedrock compatibility).

### Parser (`milestone-generation-response-parser.ts`)

- Validate milestone count per act (2-4)
- Validate `exitCondition` non-empty on every milestone
- Validate exactly one `isMidpoint: true` across all milestones
- Validate escalation/turning_point milestones have `escalationType`
- Return typed milestones grouped by act

## Out of Scope

- Macro architecture prompt (STOARCGEN-009 — Call 1)
- Validation stage (STOARCGEN-011 — Call 3)
- Pipeline wiring (STOARCGEN-012)
- Rewrite-specific milestone prompt variant (STOARCGEN-013)
- Modifying the existing `structure-prompt.ts` (it becomes the macro architecture prompt conceptually, but this ticket creates the new milestone-specific prompt)

## Acceptance Criteria

### Tests that must pass
- New test: `test/unit/llm/prompts/milestone-generation-prompt.test.ts` — prompt builds valid messages
- New test: `test/unit/llm/schemas/milestone-generation-schema.test.ts` — schema is valid JSON Schema
- New test: `test/unit/llm/milestone-generation-response-parser.test.ts` — parser handles valid + malformed responses
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Prompt treats `MacroArchitectureResult` act-level fields as immutable context
- Schema produces milestones with all fields from existing `GeneratedMilestone` plus `exitCondition`
- Parser throws `LLMError` on malformed responses
- Content policy section is injected
- Milestone field types match `GeneratedMilestone` interface exactly
