# STOARCGEN-009: Macro Architecture Prompt + Schema + Parser (Call 1)

**Status**: COMPLETED
**Depends on**: STOARCGEN-008 (new data model fields)
**Blocks**: STOARCGEN-012 (pipeline orchestration)

## Summary

Create the Macro Architecture Designer prompt, JSON schema, and response parser as isolated Call 1 artifacts. This ticket does **not** split or rewire the live `structure-*` pipeline yet; it prepares the strict macro layer that STOARCGEN-012 will orchestrate later.

## Reassessed Assumptions

- `MacroArchitectureResult`, `MacroAct`, `AnchorMoments`, and the new act/milestone fields already exist in the current model layer (`src/models/structure-generation.ts`, `src/models/story-arc.ts`). This ticket must consume those types, not redefine them.
- The current production pipeline is still the one-shot `structure-*` path (`src/llm/prompts/structure-prompt.ts`, `src/llm/schemas/structure-schema.ts`, `src/llm/structure-response-parser.ts`, `src/llm/structure-generator.ts`). Replacing or splitting those files in this ticket would create partial architecture drift before the orchestration ticket lands.
- There is no `src/server/services/generation-progress-service.ts` in the repository. Progress tracking lives in `src/server/services/generation-progress.ts`, and generation stage metadata is driven by `src/config/generation-stage-metadata.json`.
- A new stage-model entry is **not** needed yet. `src/config/stage-model.ts` only resolves configured `LlmStage` keys that are actually used by a caller. Since this ticket does not add a runnable macro-architecture generation call, adding `macroArchitecture` to `src/config/llm-stage-registry.ts` and related config/tests would be premature churn.
- Existing `structure-response-parser` behavior intentionally contains backward-compatible defaults for the live one-shot pipeline. This new macro parser should be stricter: no aliasing, no silent shape translation, no compatibility fallback beyond nullable fields explicitly allowed by the schema.

## Architectural Decision

Implement Call 1 as **new standalone files** and keep the current one-shot structure generator untouched for now.

Why this is the better architecture:
- It avoids mixing two incompatible responsibilities into the current `structure-*` files while the system still performs one LLM call.
- It keeps the future 3-call orchestration explicit: Call 1 artifacts are introduced now, then STOARCGEN-010 and STOARCGEN-011 add the other isolated stages, and STOARCGEN-012 wires them together in one pass.
- It prevents temporary aliasing or half-migrated behavior in the production structure path.
- It lets the new parser enforce a clean contract from day one instead of inheriting compatibility compromises from the current parser.

## Files to Touch

### New files
- `src/llm/prompts/macro-architecture-prompt.ts` — System + user prompt for macro architecture
- `src/llm/schemas/macro-architecture-schema.ts` — JSON Schema for structured LLM output
- `src/llm/macro-architecture-response-parser.ts` — Parse and validate LLM response into `MacroArchitectureResult`

### Modified files
- `src/llm/prompts/index.ts` — Export the new prompt builder
- `src/llm/schemas/index.ts` — Export the new schema
- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` — Register the new schema in compatibility coverage

### Explicitly not in scope for this ticket
- `src/llm/structure-generator.ts`
- `src/llm/prompts/structure-prompt.ts`
- `src/llm/schemas/structure-schema.ts`
- `src/llm/structure-response-parser.ts`
- `src/config/llm-stage-registry.ts`
- `src/config/stage-model.ts`
- `src/config/generation-stage-metadata.json`
- `src/server/services/generation-progress.ts`

## Detailed Changes

### Prompt design (`macro-architecture-prompt.ts`)

**Input context**: reuse the existing `StructureContext` type from `src/llm/prompts/structure-prompt.ts`.
- `spine`, `decomposedCharacters`, `decomposedWorld`, `conceptSpec`, `storyKernel`, `conceptVerification`, `toneFeel`/`toneAvoid`, `startingSituation`

**System prompt must instruct the LLM to**:
- Design overall theme, premise, opening/closing images
- Determine pacing budget (min/max pages)
- Place anchor moments (inciting incident, midpoint, climax, signature scenario)
- Design act frames with distinct dramatic questions (`actQuestion`)
- Assign exit reversals (`exitReversal`) for each non-final act
- Pre-allocate premise promises (`promiseTargets`) and genre obligations (`obligationTargets`)
- Generate initial NPC agendas
- Default to 3 acts; 4-5 acts require explicit justification

**Hard rules to encode in prompt**:
- Midpoint is chosen here, not retrofitted
- Each act must end in a larger turn than the previous
- Every premise promise mapped to at least one act
- Every genre obligation assigned to at least one act
- `signatureScenarioPlacement` explicit when `conceptVerification` provided

**Additional prompt constraints**:
- The prompt must **not** ask for milestones. Call 1 owns macro shape only.
- Reuse the existing structure system-prompt/content-policy pattern so the new prompt stays consistent with the rest of the LLM layer.
- Reuse existing tone/kernel/world/character context formatting where practical, but do not refactor the live structure prompt unless necessary for clarity and low-risk reuse.

### Schema (`macro-architecture-schema.ts`)

JSON Schema for `response_format` matching `MacroArchitectureResult`:
- `overallTheme`: string
- `premise`: string
- `openingImage`: string
- `closingImage`: string
- `pacingBudget`: `{ targetPagesMin, targetPagesMax }`
- `anchorMoments`: nested object with inciting/midpoint/climax/signature
- `initialNpcAgendas`: array (existing NpcAgenda shape)
- `acts`: array of `MacroAct` objects

Use `anyOf`/`oneOf` for nullable fields (Anthropic/Bedrock compatibility).

Schema requirements:
- `acts` must be 3-5 items at the schema level if that can be expressed compatibly; parser must still enforce the same invariant.
- `anchorMoments.signatureScenarioPlacement` must be nullable via `anyOf`/`oneOf`.
- `initialNpcAgendas` should be required and may be an empty array.
- The schema must be added to the Anthropic compatibility coverage test.

### Parser (`macro-architecture-response-parser.ts`)

- Validate all required fields present
- Validate act count constraints
- Validate `anchorMoments` references valid act indices
- Validate `anchorMoments.midpoint.milestoneSlot` is an integer in the expected milestone-slot range for Call 2 planning
- Validate non-final acts have non-empty `exitReversal`
- Validate final act has an empty `exitReversal`
- Validate `promiseTargets` / `obligationTargets` arrays contain only strings
- Throw `LLMError` on malformed responses; do not silently default missing required fields
- Return typed `MacroArchitectureResult`

## Out of Scope

- Milestone generation (STOARCGEN-010 — Call 2)
- Validation (STOARCGEN-011 — Call 3)
- Pipeline wiring (STOARCGEN-012)
- Rewrite-specific macro prompt variant (STOARCGEN-013)
- Actually calling this prompt from `structure-generator.ts`
- Adding new LLM stage keys, stage metadata, or progress stages
- Refactoring the live one-shot structure prompt/schema/parser beyond tiny shared-helper extraction if absolutely necessary

## Acceptance Criteria

### Tests that must pass
- New test: `test/unit/llm/prompts/macro-architecture-prompt.test.ts` — prompt builds valid messages array
- New test: `test/unit/llm/schemas/macro-architecture-schema.test.ts` — schema is valid JSON Schema
- New test: `test/unit/llm/macro-architecture-response-parser.test.ts` — parser correctly transforms valid responses, rejects malformed ones
- Updated test: `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` — includes macro schema
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Prompt follows existing prompt builder patterns (system + user messages)
- Schema uses `anyOf`/`oneOf` for nullable fields (Anthropic compat)
- Parser throws `LLMError` on malformed responses (consistent with existing parsers)
- Content policy section is injected (existing pattern)
- `MacroArchitectureResult` type matches the current codebase model contract

## Outcome

- **Completion date**: 2026-03-14
- **What actually changed**:
  - Added a new standalone Call 1 prompt builder at `src/llm/prompts/macro-architecture-prompt.ts`.
  - Added a new standalone Call 1 schema at `src/llm/schemas/macro-architecture-schema.ts`.
  - Added a new strict Call 1 parser at `src/llm/macro-architecture-response-parser.ts`.
  - Exported the new prompt/schema through existing barrels.
  - Added dedicated unit tests for the new prompt, schema, and parser.
  - Added the new schema to Anthropic compatibility coverage.
- **Deviations from the original plan**:
  - Did **not** modify `src/config/stage-model.ts`; no new LLM stage is needed until orchestration exists.
  - Did **not** modify generation progress services or metadata; there is no standalone Call 1 execution path yet.
  - Did **not** split or replace the live `structure-*` prompt/schema/parser; keeping the production one-shot path intact until STOARCGEN-012 is the cleaner architecture.
- **Verification results**:
  - `npm run test:unit -- --runInBand test/unit/llm/prompts/macro-architecture-prompt.test.ts test/unit/llm/schemas/macro-architecture-schema.test.ts test/unit/llm/macro-architecture-response-parser.test.ts`
  - `npm run typecheck`
  - `npm run lint`
