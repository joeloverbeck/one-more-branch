# USEINT-002: Error Handler Middleware

## Status

Completed (2026-02-06)

## Summary

Create Express error handling middleware that catches unhandled errors and renders a user-friendly error page.

## Reassessed Assumptions (2026-02-06)

- `src/server/middleware/error-handler.ts` did not exist and needed to be created.
- `src/server/index.ts` mounted middleware/parsers and a placeholder `router`, but did not register an error handler.
- Existing server unit coverage was concentrated in `test/unit/server/index.test.ts`, including a placeholder `GET /` route assertion; this ticket preserved that behavior while adding error-handler coverage.
- Current project import style in source/tests is extensionless TypeScript paths (for example `./routes`), so this ticket keeps extensionless imports.
- Error page EJS templates are not implemented yet (scheduled by USEINT-003), so middleware tests mock `res.render` instead of requiring real template rendering.

## Updated Scope

- Create `src/server/middleware/error-handler.ts` with Express 4-arg error middleware signature.
- Update `src/server/index.ts` to register `errorHandler` after route mounting.
- Add focused unit tests in `test/unit/server/middleware/error-handler.test.ts`.
- Add a narrow app-wiring assertion in `test/unit/server/index.test.ts` that the error handler is registered after router middleware.

## Files Created

- `src/server/middleware/error-handler.ts`
- `test/unit/server/middleware/error-handler.test.ts`

## Files Modified

- `src/server/index.ts`
- `test/unit/server/index.test.ts`

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** create EJS views (error page template is handled in USEINT-003)
- **DO NOT** add route-specific error handling (handled in route tickets)
- **DO NOT** change public server APIs (`createApp`, `startServer`)

## Implementation Details

### `src/server/middleware/error-handler.ts`

Implemented middleware that:

1. Logs the original error with `console.error`.
2. Responds with HTTP 500.
3. Renders `pages/error` with generic, non-sensitive user-facing content.

Render payload:

```typescript
{
  title: 'Error - One More Branch',
  message: 'Something went wrong. Please try again.',
}
```

### `src/server/index.ts`

- Imported `errorHandler` from `./middleware/error-handler`.
- Registered `app.use(errorHandler);` immediately after `app.use('/', router);` so it is mounted after routes.

## Acceptance Criteria

### Tests Implemented

`test/unit/server/middleware/error-handler.test.ts` verifies:

1. `errorHandler` calls `console.error` with the original error.
2. `errorHandler` sets response status to 500.
3. `errorHandler` renders `pages/error`.
4. `errorHandler` passes generic title/message to template.
5. Raw error details are not exposed in rendered payload.

`test/unit/server/index.test.ts` verifies:

6. `createApp()` registers error middleware after router middleware.

### Verification Run

- `npm run typecheck`
- `npm run test:unit -- --testPathPattern=test/unit/server/middleware/error-handler.test.ts`
- `npm run test:unit -- --testPathPattern=test/unit/server/index.test.ts`

## Invariants Preserved

1. **No Sensitive Data Leakage**: User-visible message remains generic and does not include raw error content.
2. **Logging Preserved**: Original error object is logged server-side for debugging.
3. **Middleware Signature**: Uses standard Express error middleware signature (4 parameters).
4. **Status Code**: Returns HTTP 500 for unhandled errors.
5. **Middleware Order**: Error handler is mounted after routes.

## Dependencies

- Depends on USEINT-001 for Express app structure

## Estimated Size

~70 LOC (source + tests)

## Outcome

Originally planned:
- Add error middleware, wire it into app setup, and add focused tests while keeping route/view work out of scope.

Actually changed:
- Created `src/server/middleware/error-handler.ts` with generic 500 render behavior and server-side logging.
- Wired the middleware into `createApp()` in `src/server/index.ts` after route mounting.
- Added new unit coverage in `test/unit/server/middleware/error-handler.test.ts` and strengthened `test/unit/server/index.test.ts` with middleware-order verification.
- Preserved existing placeholder route behavior and all public server APIs.
