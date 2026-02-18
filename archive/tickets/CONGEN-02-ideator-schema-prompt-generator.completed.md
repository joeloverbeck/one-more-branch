# CONGEN-02: Concept Ideator (Stage 1) — Schema, Prompt, Generator

**Status**: COMPLETED
**Depends on**: CONGEN-01
**Blocks**: CONGEN-05

## Summary

Implement Stage 1 of the concept generation pipeline: the Concept Ideator. This generates 6-8 diverse `ConceptSpec` candidates from minimal user seeds via a single LLM call.

## Files to Create

- `src/llm/schemas/concept-ideator-schema.ts`
- `src/llm/prompts/concept-ideator-prompt.ts`
- `src/llm/concept-ideator.ts`
- `test/unit/llm/concept-ideator.test.ts`

## Files to Touch

- `src/config/stage-model.ts` (add `conceptIdeator` stage key)
- `test/unit/config/stage-model.test.ts` (include `conceptIdeator` in stage coverage)
- `src/logging/prompt-formatter.ts` (add `conceptIdeator` prompt type for logPrompt type safety)
- `test/unit/logging/prompt-formatter.test.ts` (cover new prompt type)

## Assumption Reassessment (Codebase Reality Check)

- `ConceptSpec`, `ConceptIdeatorContext`, and enum/type guards already exist in `src/models/concept-generator.ts` (from CONGEN-01), so this ticket must reuse those contracts directly.
- `getStageModel('conceptIdeator')` is not currently possible because `LlmStage` does not include `conceptIdeator`; this ticket must register it now. Deferring registration to CONGEN-08 would force a fallback branch and weaken stage-model consistency.
- Unit tests for LLM modules in this repo live under `test/unit/llm/`, so ideator tests should follow that convention.
- Existing generator architecture requires: `logPrompt()` before fetch, `withRetry()` wrapping the request, and `LLMError` propagation with parse context. This ticket follows that pattern exactly.

## Out of Scope

- Evaluator and stress-tester (CONGEN-03, CONGEN-04)
- Route handlers and service orchestration (CONGEN-05)
- UI changes (CONGEN-06, CONGEN-07)
- Barrel exports and stage wiring in service/client orchestrators (CONGEN-08+)
- Existing prompt builders, schemas, or generators

## Work Description

### 1. JSON Schema (`concept-ideator-schema.ts`)

Follow the pattern in `src/llm/schemas/spine-schema.ts`:
- Export `CONCEPT_IDEATION_SCHEMA` of type `JsonSchema`
- Top-level: `{ type: "json_schema", json_schema: { name: "concept_ideation", strict: true, schema: { ... } } }`
- Schema requires a `concepts` array of `ConceptSpec`-shaped objects
- All enum fields use inline `"enum": [...]` arrays
- All objects use `additionalProperties: false`
- `actionVerbs` and `settingAxioms` etc. use `"items": { "type": "string" }`

### 2. Prompt Builder (`concept-ideator-prompt.ts`)

Follow the pattern in `src/llm/prompts/spine-prompt.ts`:
- Export `buildConceptIdeatorPrompt(context: ConceptIdeatorContext): ChatMessage[]`
- System prompt establishes role as "narrative concept architect for branching interactive fiction"
- Include all enum values with brief descriptions (taxonomy guidance)
- Include quality anchors from spec section 4.3
- Include diversity constraints (no duplicate genreFrame+conflictAxis, 3+ genreFrames, 3+ conflictAxes)
- Inject `CONTENT_POLICY` via existing constant
- Build tone directive from `genreVibes` + `moodKeywords` if provided
- User prompt: seed fields with clear section headers, only include non-empty fields

### 3. Generator (`concept-ideator.ts`)

Follow the pattern in `src/llm/spine-generator.ts`:
- Export `generateConceptIdeas(context: ConceptIdeatorContext, apiKey: string, options?: Partial<GenerationOptions>): Promise<ConceptIdeationResult>`
- Use `getStageModel('conceptIdeator')` (stage key is added in this ticket)
- Use `withRetry()`, `OPENROUTER_API_URL`, `parseMessageJsonContent`, `readJsonResponse`, `readErrorDetails`
- Parse response: validate each concept has required fields, validate enum values via type guards from CONGEN-01
- Log prompt via `logPrompt()`
- Throw `LLMError` on parse failures

### 4. Response Parser

Within `concept-ideator.ts`, implement `parseConceptIdeationResponse(parsed: unknown): readonly ConceptSpec[]`:
- Validate `concepts` array exists and has 6-8 elements (reject outside range to preserve contract strictness)
- Validate each concept's enum fields via type guards
- Validate string arrays (`actionVerbs`, `settingAxioms`, `constraintSet`, `keyInstitutions`) are non-empty
- Validate `actionVerbs` has 6+ items
- Throw `LLMError` with `STRUCTURE_PARSE_ERROR` code on invalid data

## Acceptance Criteria

### Tests That Must Pass

`test/unit/llm/concept-ideator.test.ts`:

1. **`parseConceptIdeationResponse` with valid data**: Returns array of ConceptSpec with correct fields
2. **`parseConceptIdeationResponse` rejects missing `concepts` array**: Throws LLMError
3. **`parseConceptIdeationResponse` rejects invalid enum values**: Throws LLMError when genreFrame/conflictAxis/etc are invalid
4. **`parseConceptIdeationResponse` rejects empty actionVerbs**: Throws LLMError
5. **`buildConceptIdeatorPrompt` includes all seed fields when provided**: System+user messages contain genre vibes, mood, thematic interests, spark line, content prefs
6. **`buildConceptIdeatorPrompt` omits empty seed fields**: User message doesn't contain sections for undefined/empty seeds
7. **`buildConceptIdeatorPrompt` includes content policy**: System prompt contains content policy text
8. **`generateConceptIdeas` with mocked fetch**: Returns parsed ConceptIdeationResult (mock happy path)
9. **`generateConceptIdeas` handles HTTP errors**: Throws LLMError with retryable flag for 429/5xx
10. **`getStageModel` includes `conceptIdeator`**: Stage model test covers stage resolution for the new stage key

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests break
- Schema uses `strict: true` and `additionalProperties: false` at every object level
- All LLM calls use `withRetry()` wrapper
- Prompt logging via `logPrompt()` is called before the LLM request

## Outcome

- **Completion date**: February 18, 2026
- **What changed**:
  - Added `src/llm/schemas/concept-ideator-schema.ts` with strict JSON schema for `ConceptSpec[]`.
  - Added `src/llm/prompts/concept-ideator-prompt.ts` with taxonomy guidance, quality anchors, diversity constraints, content policy injection, and seed-aware user sections.
  - Added `src/llm/concept-ideator.ts` with `generateConceptIdeas()` and strict `parseConceptIdeationResponse()` validation.
  - Added `test/unit/llm/concept-ideator.test.ts` for parser, prompt, and generator behavior.
  - Updated stage model registration in `src/config/stage-model.ts` and `test/unit/config/stage-model.test.ts`.
  - Extended prompt logging `PromptType` in `src/logging/prompt-formatter.ts` and `test/unit/logging/prompt-formatter.test.ts` to support `conceptIdeator`.
- **Deviations from original plan**:
  - Stage registration was included in this ticket (instead of deferred) to avoid fallback/branching logic and keep architecture consistent.
  - Parser enforces 6-8 concept count as a hard contract (rejects out-of-range) rather than warning-only behavior.
  - Prompt logging type updates were additionally required to keep compile-time prompt-type safety.
- **Verification results**:
  - `npm run test:unit` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
