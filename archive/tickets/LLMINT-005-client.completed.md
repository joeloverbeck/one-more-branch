# LLMINT-005: OpenRouter API Client

## Status

Completed on 2026-02-06.

## Summary

Create the OpenRouter API client with structured output support, automatic fallback to text parsing, and retry logic with exponential backoff.

## Reassessed Assumptions (2026-02-06)

- `src/llm/client.ts` does not exist yet in the repository and must be created.
- `test/unit/llm/client.test.ts` does not exist yet and must be created.
- `test/integration/llm/client.test.ts` does not exist yet and must be created if integration coverage is needed.
- Existing dependencies from LLMINT-001..004 are present in `src/llm/` and should be reused as-is.
- This ticket must not require real OpenRouter calls for test execution in CI/local verification.

## Dependencies

- **LLMINT-001**: Types (`ChatMessage`, `GenerationOptions`, `GenerationResult`, `LLMError`, etc.)
- **LLMINT-002**: Schemas (`STORY_GENERATION_SCHEMA`, `validateGenerationResponse`, `isStructuredOutputNotSupported`)
- **LLMINT-003**: Prompts (`buildOpeningPrompt`, `buildContinuationPrompt`)
- **LLMINT-004**: Fallback parser (`parseTextResponse`, `buildFallbackSystemPromptAddition`)

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/llm/client.ts` | Create |
| `test/unit/llm/client.test.ts` | Create |
| `test/integration/llm/client.test.ts` | Create (mocked fetch; no live API calls) |

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify other `src/llm/*.ts` files
- **DO NOT** persist API keys to disk
- **DO NOT** log API keys

## Implementation Details

### Constants

```typescript
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';
```

### Internal Functions

**callOpenRouterStructured(messages, options): Promise<GenerationResult>**
- Make POST request to OpenRouter with `response_format` set to `STORY_GENERATION_SCHEMA`
- Headers: `Content-Type`, `Authorization: Bearer {key}`, `HTTP-Referer`, `X-Title`
- Parse JSON response, validate with Zod via `validateGenerationResponse`
- Handle HTTP errors: 429 and 5xx are retryable
- Throw `LLMError` with appropriate code and retryable flag

**callOpenRouterText(messages, options): Promise<GenerationResult>**
- Append format instructions to system message via `buildFallbackSystemPromptAddition`
- Make POST request WITHOUT `response_format`
- Parse response with `parseTextResponse`

**generateWithFallback(messages, options): Promise<GenerationResult>**
- If `options.forceTextParsing`, use text mode directly
- Otherwise, try structured output first
- If structured output fails with unsupported error, fall back to text mode
- Log warning when falling back

**withRetry<T>(fn, maxRetries=3, baseDelay=1000): Promise<T>**
- Exponential backoff: 1s, 2s, 4s
- Only retry if `LLMError.retryable === true`
- Throw last error after max retries

### Exported Functions

**generateOpeningPage(context, options): Promise<GenerationResult>**
- Build messages with `buildOpeningPrompt`
- Call `withRetry(() => generateWithFallback(messages, options))`

**generateContinuationPage(context, options): Promise<GenerationResult>**
- Build messages with `buildContinuationPrompt`
- Call `withRetry(() => generateWithFallback(messages, options))`

**validateApiKey(apiKey): Promise<boolean>**
- Make minimal request with cheap model (gpt-3.5-turbo, max_tokens: 1)
- Return false only for 401 status
- Return true for 200, 400, or network errors

## Acceptance Criteria

### Unit Tests That Must Pass

Create `test/unit/llm/client.test.ts` (with fetch mocking):

1. `it('should call OpenRouter with correct headers')`
2. `it('should include response_format for structured output')`
3. `it('should use DEFAULT_MODEL when not specified')`
4. `it('should use custom model when provided')`
5. `it('should use default temperature 0.8')`
6. `it('should use default maxTokens 8192')`
7. `it('should throw LLMError with retryable=true for 429')`
8. `it('should throw LLMError with retryable=true for 500')`
9. `it('should throw LLMError with retryable=false for 401')`
10. `it('should throw LLMError for empty response')`
11. `it('should throw LLMError for invalid JSON')`
12. `it('should fall back to text mode when structured output not supported')`
13. `it('should use text mode directly when forceTextParsing=true')`

**withRetry tests:**
14. `it('should retry up to maxRetries times')`
15. `it('should not retry non-retryable errors')`
16. `it('should use exponential backoff')`
17. `it('should succeed if retry succeeds')`

**validateApiKey tests:**
18. `it('should return false for 401 response')`
19. `it('should return true for 200 response')`
20. `it('should return true for 400 response')`
21. `it('should return true for network errors')`

### Integration Tests That Must Pass

Create `test/integration/llm/client.test.ts` with mocked `fetch` only (no `OPENROUTER_TEST_KEY` dependency and no network access):

1. `it('should generate opening page with structured output')`
   - Narrative length >100
   - 2-5 choices
   - isEnding: false
   - storyArc defined and >10 chars

2. `it('should generate continuation page with structured output')`
   - Narrative references the choice made
   - Maintains consistency with provided context

3. `it('should work with text parsing fallback when forced')`
   - forceTextParsing: true still produces valid result

4. `it('should enforce choice constraints via Zod validation')`
   - 2-5 choices, no duplicates

### Invariants That Must Remain True

1. **API key security**: Never logged, never persisted
2. **Retry safety**: Only 429 and 5xx trigger retries
3. **Fallback support**: Automatic fallback to text parsing
4. **Exponential backoff**: 1s → 2s → 4s delays
5. **Response validation**: All responses validated by Zod

### Build Requirements

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run build` succeeds
- `npm run test:unit -- --testPathPattern=client` passes
- `npm run test:integration -- --testPathPattern=client` passes (without API key)

## Scope Clarifications

- Preserve existing public APIs in `src/llm/types.ts`, `src/llm/schemas.ts`, `src/llm/prompts.ts`, and `src/llm/fallback-parser.ts`.
- Keep ticket implementation focused on the new client and its tests; avoid unrelated refactors.

## Estimated Size

~180 lines of TypeScript + ~200 lines unit tests + ~100 lines integration tests

## Outcome

Originally planned:
- Add `src/llm/client.ts` plus unit and integration coverage, with integration tests assuming optional real OpenRouter key usage.

Actually changed:
- Implemented `src/llm/client.ts` with structured-output requests, automatic text fallback, retry/backoff, and API key validation.
- Added `test/unit/llm/client.test.ts` with fetch-mocked coverage for request payloads, fallback, retry behavior, and `validateApiKey`.
- Added `test/integration/llm/client.test.ts` as mocked integration-style tests only (no real OpenRouter calls).
- Updated this ticket assumptions/scope to explicitly disallow network-dependent OpenRouter test execution.
