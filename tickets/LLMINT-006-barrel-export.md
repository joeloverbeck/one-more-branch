# LLMINT-006: Barrel Export and Module Integration

## Summary

Create the barrel export file (`src/llm/index.ts`) that re-exports all public types, classes, and functions from the LLM module.

## Dependencies

- **LLMINT-001**: types.ts
- **LLMINT-002**: schemas.ts
- **LLMINT-003**: content-policy.ts, prompts.ts
- **LLMINT-004**: fallback-parser.ts
- **LLMINT-005**: client.ts

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/llm/index.ts` | Create |
| `src/llm/.gitkeep` | Delete |

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify the individual `src/llm/*.ts` module files
- **DO NOT** export internal helper functions

## Implementation Details

### Public API to Export

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

1. `it('should export GenerationResult type')`
2. `it('should export GenerationOptions type')`
3. `it('should export OpeningContext type')`
4. `it('should export ContinuationContext type')`
5. `it('should export ChatMessage type')`
6. `it('should export JsonSchema type')`
7. `it('should export LLMError class')`
8. `it('should export CONTENT_POLICY constant')`
9. `it('should export STORY_GENERATION_SCHEMA constant')`
10. `it('should export GenerationResultSchema')`
11. `it('should export validateGenerationResponse function')`
12. `it('should export isStructuredOutputNotSupported function')`
13. `it('should export buildOpeningPrompt function')`
14. `it('should export buildContinuationPrompt function')`
15. `it('should export parseTextResponse function')`
16. `it('should export generateOpeningPage function')`
17. `it('should export generateContinuationPage function')`
18. `it('should export validateApiKey function')`

### Invariants That Must Remain True

1. **No internal exports**: Helper functions like `truncateText` must NOT be exported
2. **Type-only exports**: Types use `export type { }` syntax
3. **JS extension**: All imports use `.js` extension for ESM compatibility
4. **No circular imports**: Module graph must be acyclic

### Build Requirements

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run build` succeeds
- All existing tests continue to pass
- New barrel export tests pass

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
