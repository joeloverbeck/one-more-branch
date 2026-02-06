# LLMINT-004: Fallback Text Parser

## Summary

Create the fallback text parser for models that don't support structured outputs. This parses text responses with markers like `NARRATIVE:`, `CHOICES:`, etc.

## Assumption Reassessment (2026-02-06)

- The current repo already defines `GenerationResult` and `LLMError` in `src/llm/types.ts`.
- `src/llm/fallback-parser.ts` does not exist yet.
- Per `specs/04-llm-integration.md`, public API for this module should be:
  - `parseTextResponse(rawResponse: string): GenerationResult`
  - `buildFallbackSystemPromptAddition(): string`
- Helper parser functions are implementation details and should remain non-exported.
- Therefore, helper behavior must be validated through public-function tests instead of direct helper unit tests.

## Dependencies

- **LLMINT-001**: Requires `GenerationResult`, `LLMError` types

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/llm/fallback-parser.ts` | Create |
| `test/unit/llm/fallback-parser.test.ts` | Create |

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify `src/llm/types.ts`, `src/llm/schemas.ts`, `src/llm/prompts.ts`
- **DO NOT** create `src/llm/client.ts` (that's LLMINT-005)
- **DO NOT** use Zod validation here (this is raw text parsing only)
- **DO NOT** export helper parser functions solely for test access

## Implementation Details

### Main Parser Function

```typescript
function parseTextResponse(rawResponse: string): GenerationResult
```

**Logic:**
1. Check for ending: presence of `THE END` without `CHOICES:` section
2. Extract narrative using `extractSection()`
3. Extract choices using `extractChoices()` (empty array if ending)
4. Extract state changes using `extractListSection()`
5. Extract canon facts using `extractListSection()`
6. Extract story arc (optional) using `extractSection()`
7. Validate: non-endings must have ≥2 choices (throw `LLMError` if not)
8. Return `GenerationResult`

### Helper Functions (private)

**extractSection(text, startMarker, endMarker): string**
- Find section between markers
- Handle missing markers gracefully
- For narrative, fall back to text before CHOICES if no NARRATIVE marker

**extractChoices(text): string[]**
- Extract CHOICES section
- Try numbered format: `1. Choice text` or `1) Choice text`
- Try bullet format: `- Choice text` or `* Choice text`
- Fall back to line-by-line parsing

**extractListSection(text, marker): string[]**
- Extract bulleted list from a section
- Filter out empty items and section headers

### Fallback System Prompt Addition

```typescript
function buildFallbackSystemPromptAddition(): string
```

Returns OUTPUT FORMAT instructions to append to system prompt when using text mode:
- NARRATIVE section
- CHOICES section (numbered list)
- STATE_CHANGES section (bullets)
- CANON_FACTS section (bullets)
- THE END alternative for endings
- STORY_ARC for opening pages

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/llm/fallback-parser.test.ts`:

**parseTextResponse behavior tests:**
1. `it('should parse well-formatted response with all sections')`
2. `it('should parse ending response with THE END marker')`
3. `it('should parse response with story arc')`
4. `it('should handle response without section markers')`
5. `it('should throw LLMError for missing choices on non-ending')`
6. `it('should handle empty state changes and canon facts')`
7. `it('should parse numbered choices (1. format)')`
8. `it('should parse numbered choices (1) format)')`
9. `it('should parse bullet choices (- format)')`
10. `it('should parse bullet choices (* format)')`
11. `it('should handle mixed formatting in choices')`
12. `it('should handle missing section end markers')`
13. `it('should extract narrative without explicit NARRATIVE marker')`

**buildFallbackSystemPromptAddition tests:**
14. `it('should include NARRATIVE section instruction')`
15. `it('should include CHOICES section instruction')`
16. `it('should include STATE_CHANGES section instruction')`
17. `it('should include CANON_FACTS section instruction')`
18. `it('should include THE END instruction for endings')`
19. `it('should include STORY_ARC instruction')`

### Invariants That Must Remain True

1. **Choice validation**: Non-endings without ≥2 choices throw `LLMError` with code `MISSING_CHOICES`
2. **Ending detection**: Presence of `THE END` without `CHOICES:` → `isEnding: true`
3. **Error retryable**: `LLMError` thrown for missing choices has `retryable: true`
4. **Graceful degradation**: Parser handles various formatting styles
5. **Public API**: Only parser entrypoints are exported; helpers remain private

### Build Requirements

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run build` succeeds
- `npm run test:unit -- --testPathPattern=fallback-parser` passes

## Estimated Size

~200 lines of TypeScript + ~200 lines of tests

## Status

Completed on 2026-02-06.

## Outcome

Originally planned:
- Add fallback parser and helper-focused tests from the ticket checklist.

Actually changed:
- Added `src/llm/fallback-parser.ts` with only public entrypoints (`parseTextResponse`, `buildFallbackSystemPromptAddition`) and private helpers.
- Added behavior-level tests in `test/unit/llm/fallback-parser.test.ts` to cover helper behavior through public APIs.
- Preserved existing LLM public APIs and did not modify `src/llm/types.ts`, `src/llm/schemas.ts`, or `src/llm/prompts.ts`.
