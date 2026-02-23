import type { NextFunction, Request, Response } from 'express';

/**
 * Wraps an async route handler to make it fire-and-forget compatible with Express.
 * Express route handlers cannot return promises, so this wrapper explicitly voids
 * the promise to prevent unhandled rejection warnings.
 */
export function wrapAsyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch((error: unknown) => {
      next(error);
    });
  };
}
