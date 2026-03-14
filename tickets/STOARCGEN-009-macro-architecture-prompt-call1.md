# STOARCGEN-009: Macro Architecture Prompt + Schema + Parser (Call 1)

**Status**: TODO
**Depends on**: STOARCGEN-008 (new data model fields)
**Blocks**: STOARCGEN-012 (pipeline orchestration)

## Summary

Create the Macro Architecture Designer prompt, JSON schema, and response parser. This is Call 1 of the 3-call pipeline: it forces deliberate macro shape design before any milestone writing.

## Files to Touch

### New files
- `src/llm/prompts/macro-architecture-prompt.ts` — System + user prompt for macro architecture
- `src/llm/schemas/macro-architecture-schema.ts` — JSON Schema for structured LLM output
- `src/llm/macro-architecture-response-parser.ts` — Parse and validate LLM response into `MacroArchitectureResult`

### Modified files
- `src/config/stage-model.ts` — Add `'macro-architecture'` stage model entry
- `src/server/services/generation-progress-service.ts` — Add new progress stage (if stages are enumerated)

## Detailed Changes

### Prompt design (`macro-architecture-prompt.ts`)

**Input context** (same `StructureContext` as today):
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

### Parser (`macro-architecture-response-parser.ts`)

- Validate all required fields present
- Validate act count constraints
- Validate `anchorMoments` references valid act indices
- Return typed `MacroArchitectureResult`

## Out of Scope

- Milestone generation (STOARCGEN-010 — Call 2)
- Validation (STOARCGEN-011 — Call 3)
- Pipeline wiring (STOARCGEN-012)
- Rewrite-specific macro prompt variant (STOARCGEN-013)
- Actually calling this prompt from `structure-generator.ts`

## Acceptance Criteria

### Tests that must pass
- New test: `test/unit/llm/prompts/macro-architecture-prompt.test.ts` — prompt builds valid messages array
- New test: `test/unit/llm/schemas/macro-architecture-schema.test.ts` — schema is valid JSON Schema
- New test: `test/unit/llm/macro-architecture-response-parser.test.ts` — parser correctly transforms valid responses, rejects malformed ones
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Prompt follows existing prompt builder patterns (system + user messages)
- Schema uses `anyOf`/`oneOf` for nullable fields (Anthropic compat)
- Parser throws `LLMError` on malformed responses (consistent with existing parsers)
- Content policy section is injected (existing pattern)
- `MacroArchitectureResult` type matches spec exactly
