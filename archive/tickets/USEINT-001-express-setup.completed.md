# USEINT-001: Express App Setup and Configuration

## Status

Completed (2026-02-06)

## Summary

Create the Express app setup with EJS view-engine configuration, static file serving, and route mounting infrastructure.

## Reassessed Assumptions (2026-02-06)

- `src/server/` initially only contained `.gitkeep`; no server bootstrap or routes existed.
- Project source currently uses extensionless TypeScript imports (for example `import { storyEngine } from '../engine'`), not `.js` suffixed imports.
- The project is currently configured without `"type": "module"` in `package.json`, so `import.meta.url` + `fileURLToPath` was unnecessary for this ticket and `__dirname` is valid in current runtime/tests.
- Unit tests live under `test/unit/` with domain subfolders; this ticket creates `test/unit/server/index.test.ts`.
- `src/index.ts` remains a placeholder and stays out of scope for this ticket per `tickets/USEINT-README.md`/`USEINT-009`.

## Updated Scope

- Create `src/server/index.ts` with `createApp()` and `startServer()`.
- Create `src/server/routes/index.ts` with a minimal placeholder root route.
- Add focused unit coverage in `test/unit/server/index.test.ts` for app setup and route wiring.
- Add `ejs` dependency (runtime) because this ticket configures EJS as the view engine.

## Files Created

- `src/server/index.ts`
- `src/server/routes/index.ts`
- `test/unit/server/index.test.ts`

## Files Modified

- `package.json`
- `package-lock.json`

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

- Creates Express app via `createApp()`
- Calls `storyEngine.init()` during app setup
- Configures:
  - `view engine` = `ejs`
  - `views` path to `src/server/views`
  - `express.json()`
  - `express.urlencoded({ extended: true })`
  - static middleware for `public/`
- Mounts `router` at `/`
- Exposes `startServer(port = 3000)`

### `src/server/routes/index.ts`

- Creates route aggregator `router`
- Adds placeholder root route:
  - `GET /` => `200` and `'One More Branch - Coming Soon'`

## Acceptance Criteria

### Tests Implemented

`test/unit/server/index.test.ts` verifies:

1. `createApp()` returns an Express app instance
2. App has view engine set to `'ejs'`
3. App has views directory configured
4. App includes static middleware for the `public` directory
5. App includes JSON body parser middleware
6. App includes URL-encoded body parser middleware
7. Root route responds with 200 status and placeholder text
8. `storyEngine.init()` is invoked during app creation

### Verification Run

- `npm run typecheck`
- `npm run test:unit -- --testPathPattern=test/unit/server/index.test.ts`

## Invariants Preserved

1. **Engine Initialization**: `storyEngine.init()` is called during app creation before request handling
2. **Import Style Consistency**: follows existing extensionless TypeScript imports
3. **Separation of Concerns**: app factory remains separate from server start for testability
4. **Scope Safety**: no model/persistence/llm/engine behavior changes in this ticket

## Dependencies

- `express` (already present)
- `ejs` (added runtime dependency)
- `@types/express` (already present)

## Estimated Size

~120 LOC (source + tests)

## Outcome

Originally planned:
- Add basic Express setup and route scaffolding with initial unit coverage.

Actually changed:
- Implemented `src/server/index.ts` and `src/server/routes/index.ts` with minimal placeholder behavior.
- Added focused unit tests in `test/unit/server/index.test.ts`, including an extra invariant check that `storyEngine.init()` is called during app creation.
- Added `ejs` to runtime dependencies.
- Adjusted the root-route assertion strategy to avoid sandbox socket restrictions by invoking the mounted route handler directly in test code.
