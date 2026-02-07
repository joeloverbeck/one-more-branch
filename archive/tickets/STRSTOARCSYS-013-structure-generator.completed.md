# STRSTOARCSYS-013: Structure Generator

## Status
Completed (2026-02-07)

## Summary
Harden and verify the structure generator path that builds the structure prompt, calls OpenRouter, and parses/validates the returned structure payload.

## Reassessed Assumptions (Current Repo Reality)
- `src/llm/structure-generator.ts` already exists and is wired into the app.
- `src/llm/index.ts` already exports `generateStoryStructure` and `StructureGenerationResult`.
- The implementation does not use `callOpenRouter`; it uses direct `fetch` + shared helpers (`readJsonResponse`, `readErrorDetails`, `withRetry`, `resolvePromptOptions`).
- Parsing/validation helpers (`parseStructureResponse`) are private internals, not exported public API.
- Dedicated unit tests for structure generation were missing.
- Canonical spec path is `specs/structured-story-arc-system.md` (not `specs/structure-story-arc-system.md`).

## Updated Scope
1. Keep existing public API unchanged:
- `generateStoryStructure(context, apiKey, options?)`
- `StructureGenerationResult`
2. Add focused unit coverage for structure generation behavior in:
- `test/unit/llm/structure-generator.test.ts`
3. Verify invariants and error behavior through public function behavior (not by exporting internals):
- Exactly 3 acts
- 2-4 beats per act
- Required act/beat fields
- Error mapping to `LLMError` codes
4. Apply only minimal production code changes if tests expose a concrete behavior gap.

## Files Touched
- `test/unit/llm/structure-generator.test.ts` (NEW)

## Out of Scope
- Prompt content rewrites (`src/llm/prompts/structure-prompt.ts`)
- Schema shape changes (`src/llm/schemas/structure-schema.ts`)
- Engine, persistence, or service-layer behavior
- OpenRouter client architecture refactors

## Acceptance Criteria

### Functional
1. Successful generation:
- Builds prompt messages from context
- Calls OpenRouter endpoint with `STRUCTURE_GENERATION_SCHEMA`
- Returns parsed `overallTheme` and `acts`
- Includes `rawResponse`
2. Options behavior:
- Supports custom `model`, `temperature`, `maxTokens`
- Uses defaults when omitted (`temperature=0.8`, `maxTokens=2000`)
3. Parse/validation behavior:
- Rejects invalid JSON with `LLMError` code `INVALID_JSON`
- Rejects malformed structure with `LLMError` code `STRUCTURE_PARSE_ERROR`
- Enforces 3-act and 2-4-beat invariants

### Tests
Added `test/unit/llm/structure-generator.test.ts` covering:
1. success path
2. custom/default options
3. invalid JSON response
4. missing required top-level fields
5. invalid acts count
6. invalid beat count per act
7. missing act/beat required fields
8. empty OpenRouter content handling
9. OpenRouter HTTP error handling

## Dependencies
- STRSTOARCSYS-004 (structure prompt)
- STRSTOARCSYS-012 (structure schema)

## Integration Points
- Called by `src/engine/story-service.ts`
- Uses retry behavior via `withRetry`

## Estimated Scope
Small: test-first verification plus minimal fix-only production edits if needed.

## Outcome
- Completed with **no production-code changes** required in `src/llm/structure-generator.ts`; existing implementation already met behavior/invariant requirements.
- Added dedicated unit coverage to close the test gap and lock in behavior.

### Actual vs Originally Planned
- Originally planned as feature creation (`structure-generator.ts` + barrel export). In reality, both were already implemented.
- Work shifted to assumption correction and verification-focused completion by adding targeted tests for current architecture.
