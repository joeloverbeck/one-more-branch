# LLMINT-006: Barrel Export and Module Integration

## Summary

Create the barrel export file (`src/llm/index.ts`) that re-exports the public LLM API consumed by the rest of the app.

## Dependencies

- **LLMINT-001**: `types.ts` (completed)
- **LLMINT-002**: `schemas.ts` (completed)
- **LLMINT-003**: `content-policy.ts`, `prompts.ts` (completed)
- **LLMINT-004**: `fallback-parser.ts` (completed)
- **LLMINT-005**: `client.ts` (completed)

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/llm/index.ts` | Create |
| `src/llm/.gitkeep` | Delete |
| `test/unit/llm/index.test.ts` | Create |

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** refactor unrelated behavior in individual `src/llm/*.ts` files
- **DO NOT** export internal helper functions via the barrel (example: `truncateText`, `buildFallbackSystemPromptAddition`)

## Implementation Details

### Public API to Export (Barrel Scope)

**Types** (from `types.ts`):
- `GenerationResult`
- `GenerationOptions`
- `OpeningContext`
- `ContinuationContext`
- `ChatMessage`
- `JsonSchema`

**Classes** (from `types.ts`):
- `LLMError`

**Constants** (from `content-policy.ts`):
- `CONTENT_POLICY`

**Schemas** (from `schemas.ts`):
- `STORY_GENERATION_SCHEMA`
- `GenerationResultSchema`

**Functions** (from `schemas.ts`):
- `validateGenerationResponse`
- `isStructuredOutputNotSupported`

**Functions** (from `prompts.ts`):
- `buildOpeningPrompt`
- `buildContinuationPrompt`

**Functions** (from `fallback-parser.ts`):
- `parseTextResponse`

**Functions** (from `client.ts`):
- `generateOpeningPage`
- `generateContinuationPage`
- `validateApiKey`

### Assumptions Reassessed

- `src/llm` implementation files already exist and are unit-tested; this ticket is focused on integration ergonomics (barrel + tests for exports).
- Type exports cannot be meaningfully asserted at runtime; type export coverage is validated through TypeScript compilation and type-usage in tests.
- Existing `fallback-parser.ts` currently exports `buildFallbackSystemPromptAddition` for internal module use and existing tests, but this helper remains out of barrel scope to avoid widening public API.

### File Structure

```typescript
// Types
export type {
  GenerationResult,
  GenerationOptions,
  OpeningContext,
  ContinuationContext,
  ChatMessage,
  JsonSchema,
} from './types.js';

// Classes
export { LLMError } from './types.js';

// Constants
export { CONTENT_POLICY } from './content-policy.js';

// Schemas
export {
  STORY_GENERATION_SCHEMA,
  GenerationResultSchema,
  validateGenerationResponse,
  isStructuredOutputNotSupported,
} from './schemas.js';

// Prompt builders
export {
  buildOpeningPrompt,
  buildContinuationPrompt,
} from './prompts.js';

// Fallback parser
export { parseTextResponse } from './fallback-parser.js';

// Client functions
export {
  generateOpeningPage,
  generateContinuationPage,
  validateApiKey,
} from './client.js';
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/llm/index.test.ts`:

1. Runtime export checks for barrel values/functions:
   - `LLMError`
   - `CONTENT_POLICY`
   - `STORY_GENERATION_SCHEMA`
   - `GenerationResultSchema`
   - `validateGenerationResponse`
   - `isStructuredOutputNotSupported`
   - `buildOpeningPrompt`
   - `buildContinuationPrompt`
   - `parseTextResponse`
   - `generateOpeningPage`
   - `generateContinuationPage`
   - `validateApiKey`
2. Type-usage checks in `index.test.ts` for:
   - `GenerationResult`
   - `GenerationOptions`
   - `OpeningContext`
   - `ContinuationContext`
   - `ChatMessage`
   - `JsonSchema`
3. Negative API surface check:
   - barrel must **not** expose `buildFallbackSystemPromptAddition`

### Invariants That Must Remain True

1. **No internal exports**: Helper functions like `truncateText` must NOT be exported
2. **Type-only exports**: Types use `export type { }` syntax
3. **JS extension**: All imports use `.js` extension for ESM compatibility
4. **No circular imports**: Module graph must be acyclic

### Build Requirements

- `npm run typecheck` passes
- `npx jest --coverage=false --runTestsByPath test/unit/llm/index.test.ts` passes
- `npx jest --coverage=false --runTestsByPath test/unit/llm/index.test.ts test/unit/llm/types.test.ts test/unit/llm/schemas.test.ts test/unit/llm/prompts.test.ts test/unit/llm/fallback-parser.test.ts test/unit/llm/client.test.ts` passes

### Verification

After completion, the following import should work from other modules:

```typescript
import {
  generateOpeningPage,
  generateContinuationPage,
  validateApiKey,
  LLMError,
  type GenerationResult,
  type GenerationOptions,
  type OpeningContext,
  type ContinuationContext,
} from './llm/index.js';
```

## Estimated Size

~50 lines of TypeScript + ~40 lines of tests

## Cleanup

- Delete `src/llm/.gitkeep` (no longer needed once real files exist)

## Status

- [x] Completed

## Outcome

Originally planned:
- Add `src/llm/index.ts`
- Delete `src/llm/.gitkeep`
- Add dedicated barrel export tests

Actually changed:
- Added `src/llm/index.ts` with scoped public exports from `types.ts`, `content-policy.ts`, `schemas.ts`, `prompts.ts`, `fallback-parser.ts`, and `client.ts`
- Added `test/unit/llm/index.test.ts` covering runtime exports, barrel type usage, and non-export of `buildFallbackSystemPromptAddition`
- Deleted `src/llm/.gitkeep`
- Reassessed and documented assumptions to match the implemented LLM module state and realistic type-export testability constraints
