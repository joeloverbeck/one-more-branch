# WRIANASPL-09: Create Writer and Analyst Generation Strategies + Client Functions

## Summary

Create the LLM call functions for both writer and analyst: generation strategies (the actual HTTP calls) and client functions (the high-level wrappers with retry and prompt building). This is the "plumbing" that connects prompts and schemas to the OpenRouter API.

## Files to Touch

- `src/llm/writer-generation.ts` — **New file**: `generateWriterWithFallback()` function
- `src/llm/analyst-generation.ts` — **New file**: `generateAnalystWithFallback()` function
- `src/llm/client.ts` — Add `generateWriterPage()` and `generateAnalystEvaluation()` functions

## Out of Scope

- Do NOT modify `generation-strategy.ts` or `generateWithFallback()` — those are preserved for backward compat
- Do NOT modify `generateContinuationPage()` — it is preserved (deprecated)
- Do NOT modify `generateOpeningPage()` or `validateApiKey()`
- Do NOT modify any schema, transformer, or prompt files
- Do NOT update `src/llm/index.ts` exports (that is WRIANASPL-10)
- Do NOT modify `page-service.ts` (that is WRIANASPL-11)

## Implementation Details

### `src/llm/writer-generation.ts`

Follow the exact pattern of `generation-strategy.ts` (`callOpenRouterStructured` + `generateWithFallback`):

```typescript
async function callWriterStructured(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<WriterResult>
```

Differences from `callOpenRouterStructured`:
- Uses `WRITER_GENERATION_SCHEMA` instead of `STORY_GENERATION_SCHEMA`
- Uses `validateWriterResponse()` instead of `validateGenerationResponse()`
- Returns `WriterResult` instead of `ContinuationGenerationResult`

```typescript
export async function generateWriterWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<WriterResult>
```

Same structured-output-not-supported error handling pattern.

### `src/llm/analyst-generation.ts`

Same pattern but for the analyst:

```typescript
async function callAnalystStructured(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<AnalystResult>
```

Differences:
- Uses `ANALYST_SCHEMA` instead of `STORY_GENERATION_SCHEMA`
- Uses `validateAnalystResponse()` instead of `validateGenerationResponse()`
- Returns `AnalystResult`
- Default temperature override: 0.3
- Default maxTokens override: 1024

```typescript
export async function generateAnalystWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<AnalystResult>
```

### `src/llm/client.ts` additions

**New function `generateWriterPage()`:**

```typescript
export async function generateWriterPage(
  context: ContinuationContext,
  options: GenerationOptions,
): Promise<WriterResult>
```

Follows the same pattern as `generateContinuationPage()`:
1. `resolvePromptOptions(options)`
2. `buildContinuationPrompt(context, promptOptions)` — same prompt builder (which now uses writer structure context per WRIANASPL-08)
3. `logPrompt(logger, 'writer', messages)`
4. `withRetry(() => generateWriterWithFallback(messages, resolvedOptions))`

**New function `generateAnalystEvaluation()`:**

```typescript
export async function generateAnalystEvaluation(
  context: AnalystContext,
  options: GenerationOptions,
): Promise<AnalystResult>
```

1. `buildAnalystPrompt(context)` — from `analyst-prompt.ts`
2. `logPrompt(logger, 'analyst', messages)`
3. Override options: `{ ...options, temperature: 0.3, maxTokens: 1024 }`
4. `withRetry(() => generateAnalystWithFallback(messages, analystOptions))`

**Preserve** existing `generateContinuationPage()` unchanged. It still works and may be used elsewhere.

## Acceptance Criteria

### Tests that must pass

- `npm run typecheck` — No type errors
- `npm run build` — Compiles successfully
- All existing `test/unit/llm/client.test.ts` tests still pass (existing functions unchanged)

### Invariants that must remain true

- `generateWithFallback()` in `generation-strategy.ts` is unchanged
- `generateContinuationPage()` in `client.ts` is unchanged (still works, still exported)
- `generateOpeningPage()` in `client.ts` is unchanged
- `validateApiKey()` in `client.ts` is unchanged
- Writer generation uses the same HTTP client (`OPENROUTER_API_URL`), same retry logic, same error handling pattern
- Analyst generation uses temperature 0.3 and maxTokens 1024 by default
