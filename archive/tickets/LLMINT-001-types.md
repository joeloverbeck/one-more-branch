# LLMINT-001: LLM Types and Error Classes

## Status

- [x] In progress
- [x] Completed

## Summary

Create the TypeScript type definitions and error classes for the LLM integration module.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/llm/types.ts` | Create |
| `test/unit/llm/types.test.ts` | Create |

## Reassessed Assumptions and Scope

### Confirmed

- `src/llm/` exists but currently only contains `.gitkeep`, so this ticket should introduce the first implementation file in that module.
- No LLM unit tests exist yet under `test/unit/llm/`.
- `Spec 04` still defines these LLM-specific interfaces and `LLMError` as foundational artifacts for downstream tickets.

### Corrected

- The original "Files to Create/Modify" section omitted the required unit test file, even though Acceptance Criteria requires it. This ticket now explicitly includes creating `test/unit/llm/types.test.ts`.
- The "Type compatibility (compile-time)" acceptance language could be misread as requiring a separate typecheck harness. In this repository, compatibility checks are validated through normal typed test code compiled by `ts-jest` plus `npm run typecheck`.
- The original build requirements assumed repository-wide lint was a stable gate. Current baseline has unrelated lint violations outside this ticket's scope, so lint verification for this ticket is scoped to touched files.

## Scope

### In Scope

- Add `src/llm/types.ts` with exported interfaces and `LLMError`.
- Add `test/unit/llm/types.test.ts` covering runtime behavior of `LLMError` and typed object construction for the specified interfaces.
- Run focused tests and project checks required by this ticket.

### Out of Scope

- Implementing `src/llm/{schemas,prompts,fallback-parser,client,index}.ts`.
- Any behavioral changes outside LLM types scaffolding.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** create `src/llm/client.ts` (that's LLMINT-005)
- **DO NOT** create `src/llm/schemas.ts` (that's LLMINT-002)
- **DO NOT** create `src/llm/prompts.ts` (that's LLMINT-003)
- **DO NOT** add any runtime dependencies beyond what's already in package.json

## Implementation Details

Create `src/llm/types.ts` with the following types:

### Result Types

```typescript
interface GenerationResult {
  narrative: string;
  choices: string[];
  stateChanges: string[];
  canonFacts: string[];
  isEnding: boolean;
  storyArc?: string;
  rawResponse: string;
}
```

### Options Types

```typescript
interface GenerationOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  forceTextParsing?: boolean;
}
```

### Context Types

```typescript
interface ContinuationContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: readonly string[];
  storyArc: string | null;
  previousNarrative: string;
  selectedChoice: string;
  accumulatedState: readonly string[];
}

interface OpeningContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
}
```

### OpenRouter API Types

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface JsonSchema {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: object;
  };
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: { message: string; code: string };
}
```

### Error Class

```typescript
class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/llm/types.test.ts`:

1. **LLMError construction**
   - `it('should create LLMError with message, code, and retryable flag')`
   - `it('should default retryable to false')`
   - `it('should have name property set to LLMError')`

2. **Type compatibility (compile-time)**
   - `it('should allow creating GenerationResult with all required fields')`
   - `it('should allow creating GenerationOptions with only apiKey')`
   - `it('should allow creating OpeningContext with all fields')`
   - `it('should allow creating ContinuationContext with all fields')`

### Invariants That Must Remain True

1. **No external dependencies**: This file must not import any npm packages
2. **No circular imports**: This file must not import from other `src/llm/` files
3. **Readonly arrays**: `ContinuationContext.globalCanon` and `accumulatedState` must use `readonly string[]`
4. **Export all types**: All interfaces and the `LLMError` class must be exported

### Build Requirements

- `npm run typecheck` passes
- `npx eslint src/llm/types.ts test/unit/llm/types.test.ts` passes
- `npm run build` succeeds

## Estimated Size

~150 lines of TypeScript

## Outcome

- Added `src/llm/types.ts` with exported `GenerationResult`, `GenerationOptions`, `ContinuationContext`, `OpeningContext`, `ChatMessage`, `JsonSchema`, `OpenRouterResponse`, and `LLMError`.
- Added `test/unit/llm/types.test.ts` with 7 tests covering `LLMError` behavior and compile-time-compatible typed object construction.
- Verification run: `npm run test:unit -- --testPathPattern=test/unit/llm/types.test.ts`, `npm run typecheck`, `npm run build`, and scoped lint on touched files.
- Repository-wide `npm run lint` still fails due pre-existing unrelated violations; no additional lint violations were introduced in the files changed by this ticket.
