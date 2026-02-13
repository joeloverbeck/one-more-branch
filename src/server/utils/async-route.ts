import type { Request, Response } from 'express';

/**
 * Wraps an async route handler to make it fire-and-forget compatible with Express.
 * Express route handlers cannot return promises, so this wrapper explicitly voids
 * the promise to prevent unhandled rejection warnings.
 */
export function wrapAsyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    void handler(req, res);
  };
}
