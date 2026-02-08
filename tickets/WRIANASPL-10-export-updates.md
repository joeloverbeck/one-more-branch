# WRIANASPL-10: Update All Index Exports

## Summary

Update the four index.ts barrel export files to expose all new modules created in tickets WRIANASPL-01 through WRIANASPL-09. This is a mechanical wiring ticket.

## Files to Touch

- `src/llm/index.ts` — Add type and function exports
- `src/llm/schemas/index.ts` — Add schema and transformer exports
- `src/llm/prompts/index.ts` — Add analyst prompt export
- `src/llm/prompts/continuation/index.ts` — Add structure context/evaluation exports

## Out of Scope

- Do NOT modify any implementation files
- Do NOT modify any existing exports (only add new ones)
- Do NOT create any new implementation or test files
- Do NOT modify `src/engine/index.ts`

## Implementation Details

### `src/llm/index.ts`

Add these exports:

```typescript
// New types
export type { WriterResult, AnalystResult, AnalystContext } from './types.js';

// New client functions
export { generateWriterPage, generateAnalystEvaluation } from './client.js';

// New result merger
export { mergeWriterAndAnalystResults } from './result-merger.js';

// New schemas (via schemas/index.ts)
export { WRITER_GENERATION_SCHEMA, ANALYST_SCHEMA, validateWriterResponse, validateAnalystResponse } from './schemas/index.js';
```

### `src/llm/schemas/index.ts`

Add these exports:

```typescript
export { WRITER_GENERATION_SCHEMA } from './writer-schema.js';
export { ANALYST_SCHEMA } from './analyst-schema.js';
export { validateWriterResponse } from './writer-response-transformer.js';
export { validateAnalystResponse } from './analyst-response-transformer.js';
```

### `src/llm/prompts/index.ts`

Add:

```typescript
export { buildAnalystPrompt } from './analyst-prompt.js';
```

### `src/llm/prompts/continuation/index.ts`

Add:

```typescript
export { buildWriterStructureContext, buildAnalystStructureEvaluation } from './story-structure-section.js';
```

## Acceptance Criteria

### Tests that must pass

- `npm run typecheck` — No type errors
- `npm run build` — Compiles successfully
- `test/unit/llm/index.test.ts` — Existing export tests still pass. Consider adding assertions that the new exports are accessible.
- All existing tests pass: `npm run test:unit`

### Invariants that must remain true

- All existing exports are preserved — no removals, no renames
- The existing public API of `src/llm/index.ts` is a superset of what it was before
- Import paths are all `.js` extension (ESM convention used in this project)
