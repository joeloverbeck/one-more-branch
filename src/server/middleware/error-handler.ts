import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../logging/index.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });

  res.status(500).render('pages/error', {
    title: 'Error - One More Branch',
    message: 'Something went wrong. Please try again.',
  });
}
