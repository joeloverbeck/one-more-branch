# USEINT-002: Error Handler Middleware

## Summary

Create Express error handling middleware that catches unhandled errors and renders a user-friendly error page.

## Files to Create

- `src/server/middleware/error-handler.ts` - Error handling middleware

## Files to Modify

- `src/server/index.ts` - Add error handler to middleware stack

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** create EJS views (error.ejs is in USEINT-003)
- **DO NOT** add route-specific error handling (handled in route tickets)

## Implementation Details

### `src/server/middleware/error-handler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err);

  res.status(500).render('pages/error', {
    title: 'Error - One More Branch',
    message: 'Something went wrong. Please try again.',
  });
}
```

### Update `src/server/index.ts`

Add after routes:

```typescript
import { errorHandler } from './middleware/error-handler.js';

// ... existing code ...

// Routes
app.use('/', router);

// Error handling (must be last)
app.use(errorHandler);
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/middleware/error-handler.test.ts`:

1. `errorHandler` calls `console.error` with the error
2. `errorHandler` sets response status to 500
3. `errorHandler` renders 'pages/error' template
4. `errorHandler` passes title and message to template
5. Error message does not leak sensitive error details to client

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/middleware/error-handler.test.ts
```

## Invariants That Must Remain True

1. **No Sensitive Data Leakage**: Error messages shown to users are generic, not raw error details
2. **Logging Preserved**: Original error is logged server-side for debugging
3. **Middleware Signature**: Uses standard Express error middleware signature (4 parameters)
4. **Status Code**: Always returns 500 for unhandled errors
5. **Graceful Degradation**: If view rendering fails, response still completes

## Test Implementation Notes

Since the error page view doesn't exist yet (USEINT-003), tests should mock `res.render`:

```typescript
const mockRes = {
  status: jest.fn().mockReturnThis(),
  render: jest.fn(),
};
```

## Dependencies

- Depends on USEINT-001 for Express app structure

## Estimated Size

~50 LOC (source + tests)
