# USEINT-001: Express App Setup and Configuration

## Summary

Create the Express.js application setup with EJS templating engine configuration, static file serving, and route mounting infrastructure.

## Files to Create

- `src/server/index.ts` - Express app factory and server start function
- `src/server/routes/index.ts` - Route aggregation (stub routes for now)

## Files to Modify

None.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** modify `src/index.ts` (separate ticket USEINT-009)
- **DO NOT** create route handlers for home/stories/play (separate tickets)
- **DO NOT** create EJS views (separate ticket USEINT-003)
- **DO NOT** create middleware (separate ticket USEINT-002)

## Implementation Details

### `src/server/index.ts`

```typescript
import express, { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router } from './routes/index.js';
import { storyEngine } from '../engine/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Initialize story engine
  storyEngine.init();

  // View engine setup
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '../../public')));

  // Routes
  app.use('/', router);

  return app;
}

export function startServer(port: number = 3000): void {
  const app = createApp();

  app.listen(port, () => {
    console.log(`One More Branch running at http://localhost:${port}`);
  });
}
```

### `src/server/routes/index.ts`

Initial stub that will be extended in subsequent tickets:

```typescript
import { Router } from 'express';

export const router = Router();

// Placeholder - routes will be added in USEINT-004, USEINT-005, USEINT-006
router.get('/', (_req, res) => {
  res.send('One More Branch - Coming Soon');
});
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/index.test.ts`:

1. `createApp()` returns an Express application instance
2. App has view engine set to 'ejs'
3. App has views directory configured
4. App serves static files from public directory
5. App has JSON body parser middleware
6. App has URL-encoded body parser middleware
7. Root route responds with 200 status

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/index.test.ts
```

## Invariants That Must Remain True

1. **Engine Initialization**: `storyEngine.init()` is called before any routes are mounted
2. **Module Resolution**: Uses `.js` extensions for ESM imports
3. **Path Handling**: Uses `fileURLToPath` for __dirname in ESM context
4. **Separation of Concerns**: App factory is separate from server start (testability)
5. **No Side Effects**: `createApp()` has no side effects beyond engine init

## Dependencies

- `express` (already in package.json)
- `ejs` (add to package.json if not present)
- `@types/express` (already in package.json)

## Estimated Size

~100 LOC (source + tests)
