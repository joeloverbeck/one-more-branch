# USEINT-009: Entry Point Update

## Status

Completed (2026-02-06)

## Summary

Finalize `src/index.ts` as the runtime bootstrap for configuration loading and server startup.

## Reassessed Assumptions (2026-02-06)

- `src/index.ts` is **not** placeholder code in this repository; it already imports `loadConfig` and `startServer`.
- Server port selection is currently config-driven (`getConfig().server.port` in `src/server/index.ts`), not direct `process.env.PORT` parsing in `src/index.ts`.
- The repository currently has no dedicated unit test for entry-point bootstrap behavior.
- `specs/06-user-interface.md` includes an older snippet showing direct `PORT` parsing in `src/index.ts`, but actual implemented architecture uses centralized config loading first.

## Updated Scope

- Keep config-first bootstrap behavior in `src/index.ts`:
  1. Load configuration first (fail fast on invalid config).
  2. Start server using existing server/config integration.
- Add focused unit tests for entry-point bootstrap behavior.
- Ensure import safety invariant:
  - Importing `src/index.ts` in tests/tools should not auto-start the server.
  - Server should start only when entry point is executed as main.

## Files to Create

- `test/unit/index.test.ts` - Entry-point bootstrap tests

## Files to Modify

- `src/index.ts` - Ensure main-module guard around bootstrap execution

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** modify any files in `src/server/`
- **DO NOT** modify public/ files
- **DO NOT** change server port resolution semantics (remains config-driven)

## Acceptance Criteria

### Tests That Must Pass

`test/unit/index.test.ts` should verify:

1. Bootstrap loads config before starting the server.
2. Importing `src/index.ts` does not auto-start the server.
3. Bootstrap function can be invoked explicitly and calls both `loadConfig` and `startServer`.

### Verification Commands

```bash
npm run test:unit -- --testPathPattern=test/unit/index.test.ts
npm run typecheck
npm run build
```

## Invariants That Must Remain True

1. **Config-First Startup**: Configuration is loaded before server start.
2. **Centralized Port Source**: Port remains sourced via config/server layer, not duplicated in entry point.
3. **Import Safety**: Entry-point module import does not open sockets.
4. **Module Resolution Consistency**: Existing `.js` import specifiers remain intact.

## Dependencies

- Depends on USEINT-001 through USEINT-008 for server/config foundations.

## Estimated Size

~30 LOC (source + test updates)

## Outcome

Originally planned:
- Update placeholder entry point to parse `PORT` directly and call `startServer(PORT)`.

Actually changed:
- Kept the existing config-first architecture and corrected the ticket to that reality.
- Updated `src/index.ts` to export `bootstrap()` and only execute it when run as the main module (`require.main === module`), preventing import-time side effects.
- Added `test/unit/index.test.ts` to verify import safety, explicit bootstrap export, and call order (`loadConfig` before `startServer`).
- Verified with:
  - `npm run test:unit -- --testPathPattern=test/unit/index.test.ts`
  - `npm run typecheck`
  - `npm run build`
