# STOARCGEN-010: Milestone Generator Prompt + Schema + Parser (Call 2)

**Status**: COMPLETED
**Depends on**: STOARCGEN-008, STOARCGEN-009, STOARCGEN-017
**Blocks**: STOARCGEN-012 (pipeline orchestration)

## Summary

Extract a true Milestone Generator stage from the current one-shot `structure` generation flow. The repo already contains the macro-architecture types and Call 1 prompt/schema/parser work; this ticket is specifically about introducing Call 2 prompt/schema/parser/orchestration so milestones are generated from immutable macro architecture rather than inside the legacy monolithic structure prompt.

## Reassessed Baseline

The original ticket assumptions were stale. Current repository state:

- `MacroArchitectureResult`, `MacroAct`, `AnchorMoments`, `actQuestion`, `exitReversal`, `promiseTargets`, `obligationTargets`, and milestone `exitCondition` already exist in [`src/models/structure-generation.ts`](../src/models/structure-generation.ts).
- Call 1 artifacts already exist:
  - `src/llm/prompts/macro-architecture-prompt.ts`
  - `src/llm/schemas/macro-architecture-schema.ts`
  - `src/llm/macro-architecture-response-parser.ts`
- The active `structure` stage is still architecturally wrong for the intended pipeline: [`src/llm/structure-generator.ts`](../src/llm/structure-generator.ts) still performs a single LLM call using [`src/llm/prompts/structure-prompt.ts`](../src/llm/prompts/structure-prompt.ts), [`src/llm/schemas/structure-schema.ts`](../src/llm/schemas/structure-schema.ts), and [`src/llm/structure-response-parser.ts`](../src/llm/structure-response-parser.ts).
- Existing parser/schema behavior still tolerates migration defaults for fields that are now part of the canonical architecture. This ticket should tighten Call 2 invariants for milestone output rather than preserve the old one-shot compatibility behavior inside the new parser.

## Architectural Rationale

The proposed split is more beneficial than the current architecture.

- The current one-shot prompt mixes macro design and milestone invention in one response, which makes act-level planning easier for the model to drift while it is simultaneously solving local milestone details.
- The current parser/schema are still burdened by migration-era optionality and normalization paths, which is acceptable for the legacy one-shot stage but weakens the intended long-term 3-call architecture.
- A dedicated milestone stage is cleaner and more extensible because it lets Call 1 own macro commitments, Call 2 own milestone realization, and later validation/repair operate on narrower responsibilities.

This ticket should therefore prefer clean separation over preserving the legacy monolith. No aliasing or backward-compatibility shims should be introduced for the new Call 2 artifacts.

## Files to Touch

### New files
- `src/llm/prompts/milestone-generation-prompt.ts` — System + user prompt for milestone generation
- `src/llm/schemas/milestone-generation-schema.ts` — JSON Schema for structured LLM output
- `src/llm/milestone-generation-response-parser.ts` — Parse and validate LLM response

### Modified files
- `src/llm/structure-generator.ts` — Replace the one-shot structure call with macro-call + milestone-call orchestration
- `src/llm/prompts/structure-prompt.ts` — Either retire from the active path or reduce it to legacy/test-only status; do not keep it as the canonical implementation
- `src/config/stage-model.ts` — Add `'macro-architecture'` / `'milestone-generation'` stage entries if the registry does not already express both stages cleanly
- `src/llm/schemas/index.ts` and `src/llm/prompts/index.ts` — Export new Call 2 artifacts as needed
- `test/unit/llm/structure-generator.test.ts` — Update for the new 2-call orchestration within the structure generator

## Detailed Changes

### Prompt design (`milestone-generation-prompt.ts`)

**Input**:
- `MacroArchitectureResult` (output of Call 1) — treated as immutable and already validated
- Original `StructureContext` (same context as Call 1)

**The prompt must instruct the LLM to**:
- Generate 2-4 milestones per act
- Generate milestone fields only; it must not rewrite or reinterpret act-level fields already chosen by Call 1
- Each milestone must include all canonical `GeneratedMilestone` fields, including `exitCondition`
- Act-level fields from Call 1 are **immutable** — the milestone generator cannot modify them
- Every milestone must have a concrete `exitCondition`
- Every escalation/turning_point milestone must trace to a verified setpiece or prove concept-specificity
- Exactly one milestone across all acts must have `isMidpoint: true`, matching `anchorMoments.midpoint` placement
- Milestones must be causally linked (non-empty `causalLink`)

**Context injection**:
- Include the full `MacroArchitectureResult` as structured context
- Include `decomposedCharacters`, `decomposedWorld`, `conceptVerification` for specificity
- Include `toneFeel`/`toneAvoid` for tone alignment

Implementation note:
- Reuse the shared structure-generation prompt-context builders from `STOARCGEN-017` rather than cloning world/character/spine/kernel/concept section formatting again inside the milestone prompt.
- Reuse the existing macro output as structured context instead of flattening it back into freeform prose where avoidable.

### Schema (`milestone-generation-schema.ts`)

JSON Schema for `response_format` producing an array of acts, each containing milestones:
- `acts`: array of objects, each with `milestones` array
- Each act item should contain only the act identifier/context needed to align milestones back onto the already-generated macro act
- Each milestone matches canonical `GeneratedMilestone` shape

Use `anyOf`/`oneOf` for nullable fields (Anthropic/Bedrock compatibility).

### Parser (`milestone-generation-response-parser.ts`)

- Validate milestone count per act (2-4)
- Validate `exitCondition` non-empty on every milestone
- Validate exactly one `isMidpoint: true` across all milestones
- Validate midpoint location matches `MacroArchitectureResult.anchorMoments.midpoint`
- Validate escalation/turning_point milestones have `escalationType`
- Validate act count matches the macro architecture input and that no act is added/removed
- Return typed milestones grouped by act

## Out of Scope

- Macro architecture prompt/schema/parser creation (already implemented; this ticket should only integrate with them)
- Validation stage (STOARCGEN-011 — Call 3)
- Pipeline wiring (STOARCGEN-012)
- Rewrite-specific milestone prompt variant (STOARCGEN-013)
- Large unrelated refactors of downstream consumers
- Shared prompt-context extraction itself (`STOARCGEN-017`)

## Acceptance Criteria

### Tests that must pass
- New test: `test/unit/llm/prompts/milestone-generation-prompt.test.ts` — prompt builds valid messages
- New test: `test/unit/llm/schemas/milestone-generation-schema.test.ts` — schema is valid JSON Schema
- New test: `test/unit/llm/milestone-generation-response-parser.test.ts` — parser handles valid + malformed responses
- Modified test: `test/unit/llm/structure-generator.test.ts` — structure generator performs macro call first, then milestone call, and merges the results
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Prompt treats `MacroArchitectureResult` act-level fields as immutable context
- Schema produces milestone-only output that can be merged into existing macro acts without allowing act-level rewrites
- Parser throws `LLMError` on malformed responses
- Content policy section is injected
- Milestone field types match `GeneratedMilestone` interface exactly
- The active structure pipeline is cleaner after the change: macro prompt/schema/parser own Call 1; milestone prompt/schema/parser own Call 2; the legacy one-shot artifacts are no longer the canonical generation path

## Outcome

- Completed on 2026-03-14.
- Implemented a real Call 2 split:
  - added `src/llm/prompts/milestone-generation-prompt.ts`
  - added `src/llm/schemas/milestone-generation-schema.ts`
  - added `src/llm/milestone-generation-response-parser.ts`
  - refactored `src/llm/structure-generator.ts` to run macro architecture first and milestone generation second
  - added `macroArchitecture` and `milestoneGeneration` stage keys/config support
  - updated prompt docs so `structure-prompt` is explicitly legacy and the new pipeline ownership is documented
- Actual deviation from the original plan:
  - the ticket originally assumed Call 1 prompt/schema/parser work and the new structure fields were still missing; those were already present
  - instead of creating duplicate macro artifacts, the implementation extracted milestone generation from the one-shot `structure` path and made that split the canonical runtime architecture
  - while closing the ticket, persistence serialization was hardened to normalize missing `anchorMoments` and act-level macro fields when older/incomplete in-memory structures are saved, because full test runs exposed that bug
- Verification:
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
