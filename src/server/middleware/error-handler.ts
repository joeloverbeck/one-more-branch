import type { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('Unhandled error:', err);

  res.status(500).render('pages/error', {
    title: 'Error - One More Branch',
    message: 'Something went wrong. Please try again.',
  });
}
