# USEINT-009: Entry Point Update

## Summary

Update the application entry point (`src/index.ts`) to start the Express server instead of the placeholder code.

## Files to Create

None.

## Files to Modify

- `src/index.ts` - Update to start Express server

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** modify any files in `src/server/` (already implemented)
- **DO NOT** modify public/ files

## Implementation Details

### Update `src/index.ts`

Current content (placeholder):
```typescript
// Placeholder - will be replaced with server start
console.log('One More Branch - Coming Soon');
```

Replace with:
```typescript
import { startServer } from './server/index.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

startServer(PORT);
```

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/foundation.test.ts` or create `test/unit/index.test.ts`:

1. Entry point imports startServer from server module
2. Entry point reads PORT from environment variable
3. Entry point defaults to port 3000 if PORT not set
4. Entry point parses PORT as integer

### Integration Verification

After implementation, verify the server starts:

```bash
npm run build
npm start
# Should output: One More Branch running at http://localhost:3000
```

### Verification Commands

```bash
npm run typecheck
npm run build
PORT=4000 node dist/index.js
# Should output: One More Branch running at http://localhost:4000
```

## Invariants That Must Remain True

1. **Environment Variable Support**: PORT can be overridden via environment
2. **Default Port**: Falls back to 3000 if PORT not set
3. **Integer Parsing**: PORT string is parsed to integer
4. **Module Resolution**: Uses .js extension for ESM imports
5. **No Side Effects on Import**: Server only starts when this file is executed as main

## Dependencies

- Depends on USEINT-001 through USEINT-008 for complete server implementation

## Estimated Size

~20 LOC (source + test updates)
